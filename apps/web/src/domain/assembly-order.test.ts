import { describe, expect, it } from 'vitest'
import { api } from '@/data/api'
import {
  DEFAULT_PRODUCTION_SETTINGS,
  aoApplyItem,
  aoCancelOrder,
  aoFinish,
  aoNextNo,
  aoReleaseOrder,
  aoReopenOrder,
  aoSaveError,
  aoSetQuantity,
  aoStartOrder,
  newAssemblyOrder,
} from './assembly-order'
import { mainLocationId } from './production'

const items = await api.items.list()
const boms = await api.boms.list()
const orders = await api.assemblyOrders.list()
const warehouses = await api.warehouses.list()
const mainLoc = mainLocationId(warehouses)

describe('assembly order creation, BOM explosion, and rescaling', () => {
  it('picks the next AO number and creates a draft order', () => {
    expect(aoNextNo(orders)).toBe('AO00007')
    const draft = newAssemblyOrder(orders, '2026-08-02')
    expect(draft.no).toBe('AO00007')
    expect(draft.status).toBe('draft')
    expect(draft.qty).toBe(1)
    expect(draft.location).toBe('WH-TVM')
    expect(draft.dueDate).toBe('2026-08-09')
    expect(aoSaveError(draft)).toBe('Choose the item to assemble.')
  })

  it('explodes the active BOM when picking an item and rescales lines when qty changes', () => {
    const item = items.find((i) => i.no === 'ASH-PWH-18')!
    const blank = newAssemblyOrder(orders, '2026-08-02')
    const picked = aoApplyItem(blank, item, boms, '2026-08-02')

    expect(picked.item).toBe('ASH-PWH-18')
    expect(picked.bomId).toBe('BOM00001')
    expect(picked.bomVersion).toBe('v2')
    expect(picked.lines).toHaveLength(6)
    expect(picked.lines[0].item).toBe('RM-LID-PWH')
    expect(picked.lines[0].qtyRequired).toBe(1.03)
    expect(picked.lines[5].item).toBe('PKG-CARE-CARD')
    expect(picked.lines[5].qtyRequired).toBe(0.005)

    const bom = boms.find((b) => b.no === picked.bomId)
    const scaled = aoSetQuantity(picked, 10, bom)
    expect(scaled.qty).toBe(10)
    expect(scaled.lines[0].qtyRequired).toBe(10.3)
    expect(scaled.lines[2].qtyRequired).toBe(10.1)
    expect(scaled.lines[3].qtyRequired).toBe(0.2)
    expect(scaled.lines[5].qtyRequired).toBe(0.05)

    // Proportional fallback without passing the BOM matches as well.
    const proportional = aoSetQuantity(picked, 10)
    expect(proportional.lines[0].qtyRequired).toBe(10.3)
    expect(proportional.lines[5].qtyRequired).toBe(0.05)
  })

  it('clears BOM snapshot when an item has no active BOM', () => {
    const item = items.find((i) => i.no === 'ASH-STAND-WD')! // Only has a draft BOM (BOM00008)
    const draft = aoApplyItem(newAssemblyOrder(orders, '2026-08-02'), item, boms, '2026-08-02')
    expect(draft.bomId).toBe('')
    expect(draft.lines).toEqual([])
  })
})

describe('assembly order lifecycle transitions', () => {
  it('enforces release guards including allowShortRelease', () => {
    const noBom = aoApplyItem(
      newAssemblyOrder(orders, '2026-08-02'),
      items.find((i) => i.no === 'ASH-STAND-WD')!,
      boms,
      '2026-08-02',
    )
    const blockedNoBom = aoReleaseOrder(noBom, items, mainLoc)
    expect(blockedNoBom.ok).toBe(false)

    // AO00001 has a shortage on ASH-PWH-18 (40.4 req vs 25 net available); turn it into a draft first.
    const shortDraft = { ...orders.find((o) => o.no === 'AO00001')!, status: 'draft' as const }
    const allowed = aoReleaseOrder(shortDraft, items, mainLoc, { allowShortRelease: true })
    expect(allowed.ok).toBe(true)
    if (allowed.ok) {
      expect(allowed.order.status).toBe('released')
      expect(allowed.shortages.length).toBeGreaterThan(0)
    }

    const refused = aoReleaseOrder(shortDraft, items, mainLoc, { allowShortRelease: false })
    expect(refused.ok).toBe(false)
    if (!refused.ok) expect(refused.error).toContain('Releasing with shortages is switched off')
  })

  it('handles start, cancel, and admin-gated reopen', () => {
    const ao3 = orders.find((o) => o.no === 'AO00003')! // draft
    expect(aoStartOrder(ao3).ok).toBe(false)

    const rel = aoReleaseOrder(ao3, items, mainLoc)
    expect(rel.ok).toBe(true)
    if (!rel.ok) return

    const started = aoStartOrder(rel.order)
    expect(started.ok).toBe(true)
    if (started.ok) expect(started.order.status).toBe('inProgress')

    const cancelled = aoCancelOrder(ao3)
    expect(cancelled.ok).toBe(true)
    if (cancelled.ok) expect(cancelled.order.status).toBe('cancelled')

    const finished = orders.find((o) => o.no === 'AO00004')!
    expect(aoCancelOrder(finished).ok).toBe(false)
    expect(aoReopenOrder(finished, false).ok).toBe(false)

    const reopened = aoReopenOrder(finished, true)
    expect(reopened.ok).toBe(true)
    if (reopened.ok) expect(reopened.order.status).toBe('inProgress')
  })
})

describe('assembly order finish maths', () => {
  it('completes a full finish and updates component & output stock at the order location', () => {
    const ashItem = items.find((i) => i.no === 'ASH-PWH-18')!
    const draft = aoSetQuantity(
      aoApplyItem(newAssemblyOrder(orders, '2026-08-02'), ashItem, boms, '2026-08-02'),
      10,
      boms.find((b) => b.no === 'BOM00001'),
    )
    const started = { ...draft, status: 'inProgress' as const }

    const res = aoFinish({ order: started, qtyFinished: 10, items, warehouses, mainLocId: mainLoc })
    expect(res.ok).toBe(true)
    if (!res.ok) return

    expect(res.completed).toBe(true)
    expect(res.order.status).toBe('finished')
    expect(res.order.qtyFinished).toBe(10)
    expect(res.order.lines[0].qtyConsumed).toBe(10.3)
    expect(res.order.lines[5].qtyConsumed).toBe(0.05)

    const updatedOut = res.updatedItems.find((i) => i.no === 'ASH-PWH-18')!
    const updatedLid = res.updatedItems.find((i) => i.no === 'RM-LID-PWH')!
    expect(updatedOut.locs['WH-TVM']).toBe(59 + 10)
    expect(updatedLid.locs['WH-TVM']).toBe(182 - 10.3)
    // Other warehouses untouched
    expect(updatedOut.locs['WH-ASSY']).toBe(ashItem.locs['WH-ASSY'])
  })

  it('supports sequential partial finishes until completion and blocks over-finishing', () => {
    const ao2 = orders.find((o) => o.no === 'AO00002')! // qty 60, qtyFinished 24, inProgress
    const step1 = aoFinish({ order: ao2, qtyFinished: 10, items, warehouses, mainLocId: mainLoc })
    expect(step1.ok).toBe(true)
    if (!step1.ok) return

    expect(step1.completed).toBe(false)
    expect(step1.order.status).toBe('inProgress')
    expect(step1.order.qtyFinished).toBe(34)

    const over = aoFinish({ order: step1.order, qtyFinished: 30, items, warehouses, mainLocId: mainLoc })
    expect(over.ok).toBe(false)

    // Simulate remaining stock state for step 2
    const itemsAfterStep1 = items.map(
      (it) => step1.updatedItems.find((u) => u.no === it.no) ?? it,
    )
    const step2 = aoFinish({
      order: step1.order,
      qtyFinished: 26,
      items: itemsAfterStep1,
      warehouses,
      mainLocId: mainLoc,
    })
    expect(step2.ok).toBe(true)
    if (!step2.ok) return

    expect(step2.completed).toBe(true)
    expect(step2.order.status).toBe('finished')
    expect(step2.order.qtyFinished).toBe(60)
  })

  it('respects manual consumption overrides and allowOverConsume setting', () => {
    const ashItem = items.find((i) => i.no === 'ASH-PWH-18')!
    const draft = aoSetQuantity(
      aoApplyItem(newAssemblyOrder(orders, '2026-08-02'), ashItem, boms, '2026-08-02'),
      10,
      boms.find((b) => b.no === 'BOM00001'),
    )
    const inProgress = { ...draft, status: 'inProgress' as const }

    const disallowedOver = aoFinish({
      order: inProgress,
      qtyFinished: 10,
      consumed: { 'RM-LID-PWH': 12 },
      items,
      warehouses,
      mainLocId: mainLoc,
      cfg: { manualConsumption: true, allowOverConsume: false },
    })
    expect(disallowedOver.ok).toBe(false)

    const negative = aoFinish({
      order: inProgress,
      qtyFinished: 10,
      consumed: { 'RM-LID-PWH': -1 },
      items,
      warehouses,
      mainLocId: mainLoc,
      cfg: { ...DEFAULT_PRODUCTION_SETTINGS, manualConsumption: true },
    })
    expect(negative.ok).toBe(false)

    const allowedOver = aoFinish({
      order: inProgress,
      qtyFinished: 10,
      consumed: { 'RM-LID-PWH': 12 },
      items,
      warehouses,
      mainLocId: mainLoc,
      cfg: { manualConsumption: true, allowOverConsume: true },
    })
    expect(allowedOver.ok).toBe(true)
    if (allowedOver.ok) {
      expect(allowedOver.order.lines[0].qtyConsumed).toBe(12)
      const lid = allowedOver.updatedItems.find((i) => i.no === 'RM-LID-PWH')!
      expect(lid.locs['WH-TVM']).toBe(182 - 12)
    }
  })

  it('refuses finish all-or-nothing when any component is short at the order site', () => {
    // AO00005 needs 25.25 x ASH-BLK-18 at WH-TVM (on hand 22, qtySO 24 -> 0 net available).
    const ao5 = orders.find((o) => o.no === 'AO00005')!
    const started = aoStartOrder(ao5)
    expect(started.ok).toBe(true)
    if (!started.ok) return

    const res = aoFinish({ order: started.order, qtyFinished: 25, items, warehouses, mainLocId: mainLoc })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error).toContain('ASH-BLK-18')
      expect(res.error).toContain('Short')
    }

    // Even when earlier lines have sufficient stock (SBC-CONE-12 has plenty on AO00001),
    // a shortage on another component refuses the entire finish without returning partial item deltas.
    const ao1 = orders.find((o) => o.no === 'AO00001')!
    const ao1Started = aoStartOrder(ao1)
    expect(ao1Started.ok).toBe(true)
    if (!ao1Started.ok) return

    const ao1Res = aoFinish({
      order: ao1Started.order,
      qtyFinished: 40, // ASH-PWH-18 net available is 25 vs 40.4 needed
      items,
      warehouses,
      mainLocId: mainLoc,
    })
    expect(ao1Res.ok).toBe(false)
  })
})

describe('aoFinish consumption overrides', () => {
  it('ignores per-component overrides when manual consumption is off', async () => {
    const { api } = await import('@/data/api')
    const [orders, items, warehouses] = await Promise.all([api.assemblyOrders.list(), api.items.list(), api.warehouses.list()])
    const base = orders.find((o) => o.lines.length > 0)!
    const order = { ...base, status: 'inProgress' as const, qtyFinished: 0 }
    const zero = Object.fromEntries(order.lines.map((l) => [l.item, 0]))
    const auto = aoFinish({ order, qtyFinished: 1, items, warehouses })
    const forced = aoFinish({ order, qtyFinished: 1, consumed: zero, items, warehouses })
    expect(auto.ok).toBe(forced.ok)
    expect(forced).toEqual(auto)
  })
})
