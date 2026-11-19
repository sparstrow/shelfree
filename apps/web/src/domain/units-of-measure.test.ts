import { afterEach, describe, expect, it } from 'vitest'
import { api } from '@/data/api'
import {
  CommandError,
  bulkRemoveItemUnits,
  restoreItemUnits,
  saveItemWithUnits,
  updateItemUnits,
} from '@/data/api/commands'
import {
  DEFAULT_UNITS,
  type Uom,
  allUnits,
  applyItemUnitSet,
  blankDraft,
  buildItemUnitRows,
  buildItemUnitSummary,
  codeLocked,
  conversionText,
  countByUnit,
  deleteBlockReason,
  draftFromUnit,
  factorFromConv,
  filterUnits,
  fixedSizeInItemBase,
  formatFactor,
  itemMasterPack,
  itemUnitKey,
  itemUomAdd,
  itemUomBaseSize,
  itemUomComputePack,
  itemUomDefault,
  itemUomRemove,
  itemUomSetBase,
  itemUomSetQty,
  itemUomStateFor,
  removeUnitFromItemUom,
  sizeInBase,
  suggestUqc,
  syncItemBaseUnit,
  unitFromDraft,
  uqcLabel,
  validateDraft,
} from './units-of-measure'

const pnl: Uom = { code: 'PNL', name: 'Panel', cat: 'count', uqc: 'NOS', conv: '1 PNL = 1 NOS', sym: '', custom: true }
const rft: Uom = { code: 'RFT', name: 'Running Feet', cat: 'length', uqc: 'OTH', conv: '1 RFT = 0.305 M', sym: 'rft', custom: true }
const all = allUnits([pnl, rft])

describe('units of measure', () => {
  it('every default unit has a UQC code and a conversion text', () => {
    expect(DEFAULT_UNITS.length).toBe(34)
    expect(new Set(DEFAULT_UNITS.map((u) => u.code)).size).toBe(34)
    expect(DEFAULT_UNITS.every((u) => !u.custom && u.uqc && u.conv)).toBe(true)
  })

  it('formats conversions and labels', () => {
    expect(conversionText('BX12', 12, 'count')).toBe('1 BX12 = 12 NOS')
    expect(conversionText('PNL', null, 'count')).toBe('—')
    expect(conversionText('PNL', 0, 'count')).toBe('—')
    expect(formatFactor(0.30479)).toBe('0.305')
    expect(formatFactor(1234.5)).toBe('1,234.5')
    expect(uqcLabel('KGS')).toBe('KGS · Kilograms')
    expect(uqcLabel('ZZZ')).toBe('ZZZ · —')
    expect(suggestUqc('weight')).toBe('KGS')
    expect(suggestUqc('nope')).toBe('OTH')
  })

  it('reads the factor back out of a stored conversion', () => {
    expect(factorFromConv('1 RFT = 0.305 M')).toBe('0.305')
    expect(factorFromConv('1 CCM = 1,000,000 X')).toBe('1000000')
    expect(factorFromConv('Item-defined')).toBe('')
    expect(factorFromConv('—')).toBe('')
  })

  it('works out the size in base units, following chains', () => {
    expect(sizeInBase('NOS', all)).toBe(1)
    expect(sizeInBase('DOZ', all)).toBe(12)
    expect(sizeInBase('G', all)).toBeCloseTo(0.001)
    expect(sizeInBase('MG', all)).toBeCloseTo(0.000001)
    expect(sizeInBase('RFT', all)).toBeCloseTo(0.305)
    expect(sizeInBase('BOX', all)).toBeNull()
    expect(sizeInBase('NOPE', all)).toBeNull()
  })

  it('stops on a circular conversion chain', () => {
    const a: Uom = { ...pnl, code: 'AAA', conv: '1 AAA = 2 BBB' }
    const b: Uom = { ...pnl, code: 'BBB', conv: '1 BBB = 2 AAA' }
    expect(sizeInBase('AAA', [a, b])).toBeNull()
  })

  it('validates a draft: required, format, duplicates, factor', () => {
    expect(validateDraft(blankDraft(), all, null)).toEqual({
      code: 'Enter a short code (e.g. PNL).',
      name: 'Enter a name for the unit.',
    })
    expect(validateDraft({ ...blankDraft(), code: 'pnl', name: 'x' }, all, null).code).toMatch(/already exists/)
    expect(validateDraft({ ...blankDraft(), code: 'pnl', name: 'x' }, all, 'PNL').code).toBeUndefined()
    expect(validateDraft({ ...blankDraft(), code: 'TOO LONG CODE', name: 'x' }, all, null).code).toMatch(/Letters and numbers/)
    expect(validateDraft({ ...blankDraft(), code: 'BX', name: 'Box', factor: '-2' }, all, null).factor).toBeDefined()
    expect(validateDraft({ ...blankDraft(), code: 'BX', name: 'Box', factor: 'abc' }, all, null).factor).toBeDefined()
    expect(validateDraft({ ...blankDraft(), code: 'BX', name: 'Box', factor: '12', sym: 'x' }, all, null)).toEqual({})
  })

  it('builds a custom unit from a draft and back', () => {
    const u = unitFromDraft({ code: ' bx12 ', name: ' Box of 12 ', cat: 'count', uqc: 'BOX', factor: '12', sym: ' bx ' })
    expect(u).toEqual({ code: 'BX12', name: 'Box of 12', cat: 'count', uqc: 'BOX', conv: '1 BX12 = 12 NOS', sym: 'bx', custom: true })
    expect(draftFromUnit(u)).toEqual({ code: 'BX12', name: 'Box of 12', cat: 'count', uqc: 'BOX', factor: '12', sym: 'bx' })
    expect(unitFromDraft({ ...blankDraft(), code: 'one', name: 'One' }).conv).toBe('—')
  })

  it('blocks deleting a default unit or one items still use', () => {
    expect(deleteBlockReason(DEFAULT_UNITS[0], 0)).toMatch(/locked/)
    expect(deleteBlockReason(pnl, 1)).toBe('1 item uses PNL. Change its unit first.')
    expect(deleteBlockReason(pnl, 3)).toBe('3 items use PNL. Change their unit first.')
    expect(deleteBlockReason(pnl, 0)).toBeNull()
  })

  it('fixes the code once an item uses the unit', () => {
    expect(codeLocked(0)).toBe(false)
    expect(codeLocked(2)).toBe(true)
  })

  it('filters by category and by code, name, UQC or category', () => {
    expect(filterUnits(all, { cat: 'area', query: '' })).toHaveLength(5)
    expect(filterUnits(all, { cat: 'all', query: 'panel' }).map((u) => u.code)).toEqual(['PNL'])
    expect(filterUnits(all, { cat: 'all', query: 'kgs' }).map((u) => u.code)).toEqual(['KG'])
    expect(filterUnits(all, { cat: 'length', query: 'rft' }).map((u) => u.code)).toEqual(['RFT'])
  })

  it('counts items per unit', () => {
    expect(countByUnit([{ uom: 'NOS' }, { uom: 'NOS' }, { uom: 'KG' }]).get('NOS')).toBe(2)
  })
})

describe('warehouse item unit register', () => {
  it('builds one base row per seeded item with category parent and definition lookup', async () => {
    const items = await api.items.list()
    const custom = await api.unitsOfMeasure.list()
    const rows = buildItemUnitRows(items, allUnits(custom))
    expect(rows).toHaveLength(items.length)

    const ash = rows.find((r) => r.no === itemUnitKey('ASH-PWH-18', 'NOS'))
    expect(ash).toMatchObject({
      no: 'ASH-PWH-18 · NOS',
      itemNo: 'ASH-PWH-18',
      category: 'Finished Goods',
      code: 'NOS',
      name: 'Numbers',
      catName: 'Count',
      uqc: 'NOS',
      base: 'NOS',
      qtyInBase: 1,
      fixed: true,
      role: 'Base',
      source: 'System',
    })

    // Seed item RM-CONE-BULK uses KGS, which is not a code in DEFAULT_UNITS (KG is), so falls back to — / OTH.
    const bulk = rows.find((r) => r.no === 'RM-CONE-BULK · KGS')
    expect(bulk).toMatchObject({
      code: 'KGS',
      name: '—',
      catName: '—',
      uqc: 'OTH',
      base: 'KGS',
      qtyInBase: 1,
      fixed: false,
      role: 'Base',
      source: 'System',
    })
  })

  it('derives master pack, fixed/manual/missing conversions, custom source, and base promotion on remove', () => {
    const sampleItems = [
      { no: 'ASH-PWH-18', desc: 'Holder', category: 'Sambrani Holder', uom: 'NOS' },
      { no: 'EMPTY-1', desc: 'Cleared', category: 'Packaging', uom: '' },
    ]
    const itemUoms = {
      'ASH-PWH-18': { list: ['NOS', 'DOZ', 'BOX', 'PNL'], base: 'NOS', qty: { BOX: 24 } },
    }
    const rows = buildItemUnitRows(sampleItems, all, itemUoms)
    expect(rows).toHaveLength(4)

    expect(rows.find((r) => r.code === 'NOS')).toMatchObject({ role: 'Base', qtyInBase: 1 })
    expect(rows.find((r) => r.code === 'DOZ')).toMatchObject({ role: 'Pack unit', qtyInBase: 12, fixed: true })
    expect(rows.find((r) => r.code === 'BOX')).toMatchObject({ role: 'Master pack', qtyInBase: 24, fixed: false })
    expect(rows.find((r) => r.code === 'PNL')).toMatchObject({ role: 'Pack unit', qtyInBase: 1, fixed: true, source: 'Custom' })

    // Missing manual conversion yields qtyInBase: null.
    const missingRows = buildItemUnitRows(
      [{ no: 'ASH-PWH-18', desc: 'Holder', category: 'Sambrani Holder', uom: 'NOS' }],
      all,
      { 'ASH-PWH-18': { list: ['NOS', 'CTN'], base: 'NOS', qty: {} } },
    )
    expect(missingRows.find((r) => r.code === 'CTN')).toMatchObject({ qtyInBase: null, role: 'Pack unit', fixed: false })

    // Explicitly stored empty list stays empty rather than falling back to item.uom.
    expect(itemUomStateFor(sampleItems[0], { 'ASH-PWH-18': { list: [], base: '', qty: {} } })).toEqual({
      list: [],
      base: '',
      qty: {},
    })
    expect(itemMasterPack({ list: ['NOS', 'DOZ', 'BOX'], base: 'NOS', qty: { BOX: 24 } }, all)).toBe('BOX')

    // Removing the base unit promotes the first remaining unit and drops its qty entry.
    expect(removeUnitFromItemUom({ list: ['NOS', 'DOZ', 'BOX'], base: 'NOS', qty: { BOX: 24 } }, 'NOS')).toEqual({
      list: ['DOZ', 'BOX'],
      base: 'DOZ',
      qty: { BOX: 24 },
    })
    expect(removeUnitFromItemUom({ list: ['NOS'], base: 'NOS', qty: {} }, 'NOS')).toEqual({
      list: [],
      base: '',
      qty: {},
    })
  })
})

describe('item unit set rules and sync helpers', () => {
  it('adds units with duplicate check, sets qty with validation, and derives master pack', () => {
    let set = itemUomDefault('ASH-PWH-18', 'nos')
    expect(set).toEqual({ itemNo: 'ASH-PWH-18', list: ['NOS'], base: 'NOS', pack: '', qty: {} })

    const dup = itemUomAdd(set, 'NOS', all)
    expect(dup.ok).toBe(false)

    const addedDoz = itemUomAdd(set, 'DOZ', all)
    expect(addedDoz.ok).toBe(true)
    if (!addedDoz.ok) return
    set = addedDoz.unitSet
    expect(set.pack).toBe('DOZ')

    const addedBox = itemUomAdd(set, 'BOX', all)
    expect(addedBox.ok).toBe(true)
    if (!addedBox.ok) return
    set = addedBox.unitSet

    // Invalid conversions are refused.
    expect(itemUomSetQty(set, 'BOX', 0, all).ok).toBe(false)
    expect(itemUomSetQty(set, 'BOX', -4, all).ok).toBe(false)
    expect(itemUomSetQty(set, 'BOX', 'abc', all).ok).toBe(false)
    expect(itemUomSetQty(set, 'NOS', 12, all).ok).toBe(false)
    expect(itemUomSetQty(set, 'DOZ', 24, all).ok).toBe(false)

    const withBox = itemUomSetQty(set, 'BOX', 24, all)
    expect(withBox.ok).toBe(true)
    if (!withBox.ok) return
    set = withBox.unitSet
    expect(set.pack).toBe('BOX')
    expect(itemUomComputePack(set, all)).toBe('BOX')

    const summary = buildItemUnitSummary(set, all)
    expect(summary.packLabel).toBe('Box (BOX)')
    expect(summary.packSize).toBe(24)
    expect(summary.availableToAdd.some((u) => u.code === 'PNL')).toBe(true)
    expect(summary.availableToAdd.some((u) => u.code === 'BOX')).toBe(false)

    // Clearing BOX qty falls back to DOZ as master pack.
    const cleared = itemUomSetQty(set, 'BOX', null, all)
    expect(cleared.ok).toBe(true)
    if (cleared.ok) expect(cleared.unitSet.pack).toBe('DOZ')
  })

  it('computes fixed conversions relative to the active base and prevents cross-category fixed guesses', () => {
    expect(fixedSizeInItemBase('G', 'KG', all)).toBe(0.001)
    expect(fixedSizeInItemBase('KG', 'G', all)).toBe(1000)
    expect(fixedSizeInItemBase('PNL', 'NOS', all)).toBe(1)
    expect(fixedSizeInItemBase('KG', 'NOS', all)).toBeNull()
    expect(fixedSizeInItemBase('DOZ', 'BOX', all)).toBeNull()

    let set = itemUomDefault('RM-CONE-BULK', 'KG')
    const addedG = itemUomAdd(set, 'G', all)
    expect(addedG.ok).toBe(true)
    if (!addedG.ok) return
    set = addedG.unitSet
    // G is 0.001 KG (<= 1), so it is not promoted to Master pack.
    expect(set.pack).toBe('')
    expect(itemUomBaseSize(set, 'G', all)).toBe(0.001)

    const asG = itemUomSetBase(set, 'G', all)
    expect(asG.ok).toBe(true)
    if (!asG.ok) return
    expect(asG.unitSet.base).toBe('G')
    expect(asG.unitSet.pack).toBe('KG')
    expect(itemUomBaseSize(asG.unitSet, 'KG', all)).toBe(1000)

    expect(itemUomSetBase(set, 'DOZ', all).ok).toBe(false)
  })

  it('promotes the next unit on base removal, clears pack and qty, and aligns item.uom via one helper', async () => {
    const items = await api.items.list()
    const item = items.find((it) => it.no === 'ASH-PWH-18')!

    let set = itemUomDefault(item.no, item.uom)
    set = (itemUomAdd(set, 'DOZ', all) as { ok: true; unitSet: typeof set }).unitSet
    set = (itemUomAdd(set, 'BOX', all) as { ok: true; unitSet: typeof set }).unitSet
    set = (itemUomSetQty(set, 'BOX', 24, all) as { ok: true; unitSet: typeof set }).unitSet

    // Removing base NOS promotes DOZ to base and keeps BOX as master pack.
    const removedBase = itemUomRemove(set, 'NOS', all)
    expect(removedBase.ok).toBe(true)
    if (!removedBase.ok) return
    expect(removedBase.unitSet).toEqual({
      itemNo: 'ASH-PWH-18',
      list: ['DOZ', 'BOX'],
      base: 'DOZ',
      pack: 'BOX',
      qty: { BOX: 24 },
    })

    const aligned = applyItemUnitSet(item, removedBase.unitSet)
    expect(aligned.item.uom).toBe('DOZ')
    expect(aligned.unitSet.base).toBe('DOZ')

    // Removing the master pack clears pack when no other pack unit > 1 remains.
    const removedPack = itemUomRemove(removedBase.unitSet, 'BOX', all)
    expect(removedPack.ok).toBe(true)
    if (!removedPack.ok) return
    expect(removedPack.unitSet).toEqual({
      itemNo: 'ASH-PWH-18',
      list: ['DOZ'],
      base: 'DOZ',
      pack: '',
      qty: {},
    })

    // Syncing from an item card edit attaches the new base unit and keeps both aligned.
    const cardSync = syncItemBaseUnit({ ...item, uom: 'PCS' }, removedPack.unitSet, all)
    expect(cardSync.item.uom).toBe('PCS')
    expect(cardSync.unitSet).toEqual({
      itemNo: 'ASH-PWH-18',
      list: ['PCS', 'DOZ'],
      base: 'PCS',
      pack: 'DOZ',
      qty: {},
    })
  })
})

describe('itemUnits store and atomic commands', () => {
  afterEach(async () => {
    await Promise.all([api.itemUnits.reset(), api.items.reset()])
  })

  it('seeds one base-only unit set per seeded item', async () => {
    const [items, sets] = await Promise.all([api.items.list(), api.itemUnits.list()])
    expect(sets).toHaveLength(items.length)
    for (const item of items) {
      const set = sets.find((s) => s.itemNo === item.no)
      expect(set).toEqual({
        itemNo: item.no,
        list: [item.uom],
        base: item.uom,
        pack: '',
        qty: {},
      })
    }
  })

  it('persists unit edits and keeps item.uom in step on base changes, bulk remove, undo, and item save', async () => {
    await updateItemUnits('ASH-PWH-18', { type: 'add', code: 'BOX' })
    const afterQty = await updateItemUnits('ASH-PWH-18', { type: 'setQty', code: 'BOX', qty: 24 })
    expect(afterQty.unitSet.pack).toBe('BOX')
    expect(afterQty.item.uom).toBe('NOS')

    // Changing base updates both itemUnits and item.uom.
    const afterBase = await updateItemUnits('ASH-PWH-18', { type: 'setBase', code: 'BOX' })
    expect(afterBase.unitSet.base).toBe('BOX')
    expect(afterBase.item.uom).toBe('BOX')
    expect((await api.items.get('ASH-PWH-18'))?.uom).toBe('BOX')
    expect((await api.itemUnits.get('ASH-PWH-18'))?.base).toBe('BOX')

    // Invalid command fails without partial writes.
    await expect(updateItemUnits('ASH-PWH-18', { type: 'setQty', code: 'NOS', qty: 0 })).rejects.toThrow(CommandError)
    expect((await api.items.get('ASH-PWH-18'))?.uom).toBe('BOX')

    // Bulk removing both units on ASH-PWH-18 clears both list and item.uom; restore puts them back.
    const bulk = await bulkRemoveItemUnits([
      { itemNo: 'ASH-PWH-18', code: 'BOX' },
      { itemNo: 'ASH-PWH-18', code: 'NOS' },
    ])
    expect(bulk.updated[0].unitSet.list).toEqual([])
    expect((await api.items.get('ASH-PWH-18'))?.uom).toBe('')

    await restoreItemUnits(bulk.previousSets)
    expect((await api.items.get('ASH-PWH-18'))?.uom).toBe('BOX')
    expect((await api.itemUnits.get('ASH-PWH-18'))?.list).toEqual(['NOS', 'BOX'])

    // Saving a new item through saveItemWithUnits creates its unit set too.
    const sample = (await api.items.get('ASH-PWH-18'))!
    const created = await saveItemWithUnits({ ...sample, no: 'ASH-NEW-1', uom: 'DOZ' })
    expect(created.unitSet).toEqual({
      itemNo: 'ASH-NEW-1',
      list: ['DOZ'],
      base: 'DOZ',
      pack: '',
      qty: {},
    })
    expect((await api.itemUnits.get('ASH-NEW-1'))?.base).toBe('DOZ')
  })
})

describe('countByUnit with stored unit sets', () => {
  it('counts pack units once per item alongside the base unit', () => {
    const items = [
      { no: 'A', uom: 'NOS' },
      { no: 'B', uom: 'NOS' },
    ]
    const sets = [
      { itemNo: 'A', list: ['NOS', 'BOX'] },
      { itemNo: 'B', list: ['NOS'] },
    ]
    const used = countByUnit(items, sets)
    expect(used.get('NOS')).toBe(2)
    expect(used.get('BOX')).toBe(1)
  })
})
