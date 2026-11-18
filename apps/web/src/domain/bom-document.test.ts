import { describe, expect, it } from 'vitest'
import { api } from '@/data/api'
import { bomSchema } from '@/data/schemas'
import {
  applyBomCostToItem,
  bomAddLine,
  bomCostDelta,
  bomCycle,
  bomMoveLine,
  bomNextNo,
  bomRemoveLine,
  bomSaveDraftError,
  bomSetField,
  bomSetLine,
  bomToggleSub,
  bomTree,
  bomValidate,
  newBom,
  prepareBomActivate,
  prepareBomArchive,
  prepareBomSave,
} from './bom-document'
import { bomRollup } from './production'

const items = await api.items.list()
const boms = await api.boms.list()
const today = '2026-08-01'

describe('BOM document numbering, blank creation, and field edits', () => {
  it('computes the next BOM number and builds a schema-valid blank draft', () => {
    const next = bomNextNo(boms)
    expect(next).toBe('BOM00010')

    const blank = newBom(next, today)
    expect(bomSchema.parse(blank)).toMatchObject({
      no: 'BOM00010',
      parentItem: '',
      kind: 'assembly',
      version: 'v1',
      status: 'draft',
      effectiveFrom: today,
      effectiveTo: null,
      outputQty: 1,
      uom: 'NOS',
    })

    const prefilled = newBom(next, today, { parentItem: 'SBC-CONE-12', items })
    expect(prefilled.parentItem).toBe('SBC-CONE-12')
    expect(prefilled.parentDesc).toContain('Sambrani Dhoop Cones')
    expect(prefilled.uom).toBe('BOX')
  })

  it('updates header fields and clamps numeric fields', () => {
    let draft = newBom('BOM00010', today)
    draft = bomSetField(draft, 'parentItem', 'ASH-PWH-18', items)
    expect(draft.parentDesc).toBe('Arunachala Mountain Sambrani Holder, Pearl White')
    expect(draft.uom).toBe('NOS')

    draft = bomSetField(draft, 'outputQty', 0, items)
    expect(draft.outputQty).toBe(1)

    draft = bomSetField(draft, 'labourCost', -5, items)
    expect(draft.labourCost).toBe(0)

    draft = bomSetField(draft, 'effectiveTo', '', items)
    expect(draft.effectiveTo).toBeNull()

    draft = bomSetField(draft, 'parentItem', '', items)
    expect(draft.parentDesc).toBe('')
    expect(draft.uom).toBe('NOS')
  })
})

describe('BOM lines, move, and sub-assembly tree', () => {
  it('adds, edits, moves, and removes lines while maintaining 10-step line numbers', () => {
    let draft = newBom('BOM00010', today, { parentItem: 'ASH-STAND-WD', items })
    draft = bomAddLine(draft, 'RM-LID-PWH', items)
    draft = bomAddLine(draft, 'RM-BASE-STD', items)
    draft = bomAddLine(draft, 'RM-GASKET', items)

    expect(draft.lines.map((l) => [l.lineNo, l.item])).toEqual([
      [10, 'RM-LID-PWH'],
      [20, 'RM-BASE-STD'],
      [30, 'RM-GASKET'],
    ])

    draft = bomSetLine(draft, 1, 'qtyPer', '2.5')
    draft = bomSetLine(draft, 1, 'scrapPct', '4')
    expect(draft.lines[1]).toMatchObject({ qtyPer: 2.5, scrapPct: 4 })

    draft = bomMoveLine(draft, 2, -1)
    expect(draft.lines.map((l) => [l.lineNo, l.item])).toEqual([
      [10, 'RM-LID-PWH'],
      [20, 'RM-GASKET'],
      [30, 'RM-BASE-STD'],
    ])

    // Out-of-bounds move is a no-op
    expect(bomMoveLine(draft, 0, -1).lines.map((l) => l.item)).toEqual([
      'RM-LID-PWH',
      'RM-GASKET',
      'RM-BASE-STD',
    ])

    draft = bomRemoveLine(draft, 0)
    expect(draft.lines.map((l) => [l.lineNo, l.item])).toEqual([
      [10, 'RM-GASKET'],
      [20, 'RM-BASE-STD'],
    ])
  })

  it('toggles sub-assembly expansion and builds the indented tree', () => {
    const combo = boms.find((b) => b.no === 'BOM00004')!
    const collapsed = bomTree(combo, boms, today, {})
    expect(collapsed).toHaveLength(3)
    expect(collapsed[0]).toMatchObject({ depth: 0, hasSub: true, open: false, subKey: 'BOM00004/ASH-PWH-18' })

    const expandedMap = bomToggleSub({}, collapsed[0].subKey)
    expect(expandedMap['BOM00004/ASH-PWH-18']).toBe(true)

    const expanded = bomTree(combo, boms, today, expandedMap)
    expect(expanded.length).toBeGreaterThan(3)
    expect(expanded[0]).toMatchObject({ depth: 0, open: true })
    expect(expanded[1]).toMatchObject({ depth: 1, lineIndex: -1 })
    expect(expanded[1].line.item).toBe('RM-LID-PWH')
    // 1.01 parent required * 1 qtyPer * 1.03 scrap = 1.0403 -> 1.04
    expect(expanded[1].required).toBe(1.04)
  })
})

describe('BOM cycle detection, validation, and status transitions', () => {
  it('detects direct and indirect cycles with the prototype chain message', () => {
    const holder = boms.find((b) => b.no === 'BOM00001')!
    expect(bomCycle(holder.parentItem, holder.lines, boms, today)).toBeNull()

    const direct = bomAddLine(holder, 'ASH-PWH-18', items)
    expect(bomCycle(direct.parentItem, direct.lines, boms, today)).toBe('ASH-PWH-18 → ASH-PWH-18')

    const indirect = bomAddLine(holder, 'CMB-PWH-12', items)
    expect(bomCycle(indirect.parentItem, indirect.lines, boms, today)).toBe(
      'ASH-PWH-18 → CMB-PWH-12 → ASH-PWH-18',
    )
    expect(bomValidate(indirect, boms, today)).toBe(
      'This would make the item part of itself: ASH-PWH-18 → CMB-PWH-12 → ASH-PWH-18',
    )
  })

  it('enforces prototype validation messages and non-auto-archiving active date rules', () => {
    let draft = newBom('BOM00010', today)
    expect(bomSaveDraftError(draft, boms, today)).toBe('Choose the item this BOM makes.')
    expect(bomValidate(draft, boms, today)).toBe('Choose the item this BOM makes.')

    draft = bomSetField(draft, 'parentItem', 'ASH-PWH-18', items)
    // Saving a draft with no lines is allowed once parentItem is chosen, unless a cycle exists
    expect(bomSaveDraftError(draft, boms, today)).toBe('')
    expect(bomValidate(draft, boms, today)).toBe('Add at least one component.')

    draft = bomAddLine(draft, 'RM-GASKET', items)
    draft = bomSetLine(draft, 0, 'qtyPer', '0')
    expect(bomValidate(draft, boms, today)).toBe('Every component needs a quantity greater than zero.')

    draft = bomSetLine(draft, 0, 'qtyPer', '1')
    draft = bomAddLine(draft, 'RM-GASKET', items)
    expect(bomValidate(draft, boms, today)).toBe(
      'Component RM-GASKET is listed twice — combine the lines instead.',
    )

    draft = bomRemoveLine(draft, 1)
    // Activating over BOM00001 (active from 2026-04-01, open-ended) clashes instead of auto-archiving
    expect(bomValidate({ ...draft, status: 'active' }, boms, today)).toBe(
      'Another active BOM (BOM00001 · v2) already covers these dates. Archive it or set an end date first.',
    )

    // Non-overlapping past window does not clash
    const nonOverlapping = {
      ...draft,
      status: 'active' as const,
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-03-31',
    }
    expect(bomValidate(nonOverlapping, boms, today)).toBe('')

    // Draft with a cycle is rejected even on Save
    const cycleDraft = bomAddLine(draft, 'CMB-PWH-12', items)
    expect(bomSaveDraftError(cycleDraft, boms, today)).toBe(
      'This would make the item part of itself: ASH-PWH-18 → CMB-PWH-12 → ASH-PWH-18',
    )
  })

  it('prepares save, activate, and archive transitions and applies cost to item', () => {
    const draft = boms.find((b) => b.no === 'BOM00008')!
    const nowIso = '2026-08-01T12:00:00'

    expect(prepareBomSave(draft, nowIso)).toMatchObject({ status: 'draft', updatedAt: nowIso })
    expect(prepareBomActivate(draft, nowIso)).toMatchObject({ status: 'active', updatedAt: nowIso })
    expect(prepareBomArchive(draft, today, nowIso)).toMatchObject({
      status: 'archived',
      effectiveTo: today,
      updatedAt: nowIso,
    })

    const archivedWithEnd = boms.find((b) => b.no === 'BOM00007')!
    expect(prepareBomArchive(archivedWithEnd, today, nowIso).effectiveTo).toBe('2026-03-31')

    const holderBom = boms.find((b) => b.no === 'BOM00001')!
    const holderItem = items.find((i) => i.no === 'ASH-PWH-18')!
    const rollup = bomRollup(holderBom, boms, items, today)
    expect(bomCostDelta(rollup.unit, holderItem)).toEqual({
      text: '+₹7.88 vs item cost',
      tone: 'warn',
    })

    const updatedItem = applyBomCostToItem(holderItem, rollup.unit)
    expect(updatedItem.cost).toBe(152.88)
    expect(bomCostDelta(rollup.unit, updatedItem)).toEqual({
      text: 'Matches the item cost',
      tone: 'ok',
    })
  })
})
