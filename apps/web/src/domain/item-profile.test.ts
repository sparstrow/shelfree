import { describe, expect, it } from 'vitest'
import { api } from '@/data/api'
import {
  addItemUom,
  buildItemUomSummary,
  computeMasterPack,
  defaultItemUomState,
  itemBomCostDelta,
  itemBomSummary,
  itemOpenPoQty,
  itemOpenPurchaseOrders,
  itemProfileStatus,
  itemPurchaseOrders,
  itemSiteStockBars,
  itemTrackingCards,
  itemValuation,
  removeItemUom,
  setItemUomBase,
  setItemUomQty,
  vendorByName,
} from './item-profile'

const items = await api.items.list()
const warehouses = await api.warehouses.list()
const vendors = await api.vendors.list()
const purchaseOrders = await api.purchaseOrders.list()
const boms = await api.boms.list()
const assemblyOrders = await api.assemblyOrders.list()

const byNo = (no: string) => {
  const found = items.find((i) => i.no === no)
  if (!found) throw new Error(`Missing seed item ${no}`)
  return found
}

describe('item valuation, status and site bars', () => {
  it('computes on hand, available, stock value, retail value and status for ASH-PWH-18', () => {
    const item = byNo('ASH-PWH-18')
    const val = itemValuation(item)
    expect(val.onHand).toBe(93)
    expect(val.committed).toBe(34)
    expect(val.available).toBe(59)
    expect(val.incoming).toBe(40)
    expect(val.stockValue).toBe(93 * 145)
    expect(val.retailValue).toBe(93 * 399)
    expect(val.margin).toBeCloseTo((399 - 145) / 399, 6)
    expect(val.reorderNeeded).toBe(false)
    expect(val.status).toBe('Healthy')
  })

  it('overrides stock status with Blocked when item.blocked is true', () => {
    const item = { ...byNo('ASH-PWH-18'), blocked: true }
    expect(itemProfileStatus(item)).toBe('Blocked')
  })

  it('flags reorderNeeded when available falls at or below reorder point', () => {
    const item = byNo('CMB-BLK-12')
    const val = itemValuation(item)
    expect(val.available).toBe(6)
    expect(val.reorderPoint).toBe(20)
    expect(val.reorderNeeded).toBe(true)
  })

  it('builds site stock rows labelled by warehouse short name with proportional bar widths', () => {
    const bars = itemSiteStockBars(byNo('ASH-PWH-18'), warehouses)
    expect(bars.map((b) => ({ short: b.short, qty: b.qty, pct: b.pct }))).toEqual([
      { short: 'Main', qty: 59, pct: 100 },
      { short: 'Assembly unit', qty: 20, pct: 34 },
      { short: 'Chennai DC', qty: 14, pct: 24 },
    ])
  })

  it('builds tracking empty-state cards from item tracking flags', () => {
    expect(itemTrackingCards(byNo('ASH-PWH-18')).map((c) => c.title)).toEqual(['Lots'])
    expect(itemTrackingCards(byNo('SBC-CONE-12')).map((c) => c.title)).toEqual(['Lots & expiry'])
    expect(itemTrackingCards(byNo('PKG-BOX-STD'))).toEqual([])
    expect(
      itemTrackingCards({ tracksLot: false, tracksExpiry: false, tracksSerial: true }).map((c) => c.title),
    ).toEqual(['Serial numbers'])
  })
})

describe('item purchasing and vendor resolution', () => {
  it('resolves preferred vendor record by display name', () => {
    const vendor = vendorByName(byNo('RM-LID-PWH').vendor, vendors)
    expect(vendor?.no).toBe('V00001')
    expect(vendorByName('', vendors)).toBeUndefined()
  })

  it('collects purchase orders referencing an item newest first and separates open POs', () => {
    const all = itemPurchaseOrders('RM-LID-PWH', purchaseOrders, vendors)
    expect(all.map((p) => p.no)).toEqual(['PO00001', 'PO00009'])
    expect(all[0]).toMatchObject({
      vendorNo: 'V00001',
      vendorName: 'Kailash Ceramics Works',
      qty: 200,
      open: true,
    })

    const open = itemOpenPurchaseOrders('RM-LID-PWH', purchaseOrders, vendors)
    expect(open).toHaveLength(2)
    expect(itemOpenPoQty(open)).toBe(300)

    expect(itemOpenPurchaseOrders('PKG-FOAM-INS', purchaseOrders, vendors)).toEqual([])
  })
})

describe('item BOMs and assembly orders', () => {
  it('summarises versions, rolled-up cost, where-used and assembly orders for ASH-PWH-18', () => {
    const summary = itemBomSummary(
      byNo('ASH-PWH-18'),
      boms,
      items,
      assemblyOrders,
      warehouses,
      '2026-08-01',
    )
    expect(summary.activeBom?.no).toBe('BOM00001')
    expect(summary.versions.map((v) => ({ no: v.no, status: v.statusLabel, isActive: v.isActive }))).toEqual([
      { no: 'BOM00001', status: 'Active', isActive: true },
      { no: 'BOM00007', status: 'Archived', isActive: false },
    ])
    expect(summary.rollup).not.toBeNull()
    expect(summary.costDeltaText).toBeTruthy()
    expect(summary.whereUsed.map((w) => ({ bomNo: w.bomNo, parent: w.parentItem }))).toEqual([
      { bomNo: 'BOM00004', parent: 'CMB-PWH-12' },
    ])
    expect(summary.assemblyOrders.map((a) => ({ no: a.no, role: a.role, open: a.open }))).toEqual([
      { no: 'AO00002', role: 'Builds item', open: true },
      { no: 'AO00001', role: 'Uses item', open: true },
    ])
    expect(summary.openAssemblyOrders).toHaveLength(2)
  })

  it('flags sub-assembly components inside parent BOM lines', () => {
    const summary = itemBomSummary(
      byNo('CMB-PWH-12'),
      boms,
      items,
      assemblyOrders,
      warehouses,
      '2026-08-01',
    )
    const holderLine = summary.lines.find((l) => l.item === 'ASH-PWH-18')
    expect(holderLine?.isSubAssembly).toBe(true)
    const coneLine = summary.lines.find((l) => l.item === 'SBC-CONE-12')
    expect(coneLine?.isSubAssembly).toBe(true)
  })

  it('compares rolled-up cost to item cost on file', () => {
    expect(itemBomCostDelta(100, 100)).toBe('Matches the item cost on file.')
    expect(itemBomCostDelta(112, 100)).toContain('above the item cost on file.')
    expect(itemBomCostDelta(88, 100)).toContain('below the item cost on file.')
    expect(itemBomCostDelta(100, 0)).toBeNull()
  })
})

describe('per-item units of measure and auto master pack', () => {
  it('derives the largest pack unit automatically as Master pack', () => {
    let state = defaultItemUomState('NOS')
    expect(buildItemUomSummary(state).pack).toBe('')

    state = addItemUom(state, 'DOZ')
    let summary = buildItemUomSummary(state)
    expect(summary.pack).toBe('DOZ')
    expect(summary.packSize).toBe(12)
    expect(summary.rows.find((r) => r.code === 'DOZ')).toMatchObject({
      isFixed: true,
      qtyInBase: 12,
      role: 'Master pack',
    })

    state = addItemUom(state, 'CTN')
    state = setItemUomQty(state, 'CTN', 48)
    summary = buildItemUomSummary(state)
    expect(computeMasterPack(state)).toBe('CTN')
    expect(summary.packLabel).toBe('Carton (CTN)')
    expect(summary.packSize).toBe(48)
    expect(summary.rows.find((r) => r.code === 'DOZ')?.role).toBe('Pack unit')
    expect(summary.rows.find((r) => r.code === 'CTN')?.role).toBe('Master pack')
  })

  it('handles metric fixed pairs and base promotion on removal', () => {
    let state = addItemUom(defaultItemUomState('KGS'), 'GMS')
    let summary = buildItemUomSummary(state)
    expect(summary.pack).toBe('')
    expect(summary.rows.find((r) => r.code === 'GMS')).toMatchObject({
      isFixed: true,
      qtyInBase: 0.001,
    })

    state = setItemUomBase(state, 'GMS')
    summary = buildItemUomSummary(state)
    expect(summary.base).toBe('GMS')
    expect(summary.rows.find((r) => r.code === 'KGS')?.qtyInBase).toBe(1000)

    state = removeItemUom(state, 'GMS')
    expect(state.base).toBe('KGS')
    expect(state.list).toEqual(['KGS'])
  })
})
