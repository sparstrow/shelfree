import type { Item, PurchaseOrder, PurchaseReceipt, Warehouse } from '@/data/schemas'
import {
  isItemLowStock,
  itemAvailable,
  itemCategoryParent,
  itemCategoryPath,
  itemCategorySub,
  itemCommitted,
  itemDeleteBlockedReason,
  itemLowStockFlag,
  itemMargin,
  itemOnHand,
  itemPrimarySite,
  itemSiteRows,
  itemSiteSpread,
  itemStockStatus,
  warehouseShortName,
} from './item'

const item = (over: Partial<Item> = {}): Item => ({
  no: 'ASH-PWH-18',
  desc: 'Arunachala Mountain Sambrani Holder, Pearl White',
  category: 'Sambrani Holder',
  type: 'Inventory',
  uom: 'NOS',
  vendor: '',
  cost: 145,
  price: 399,
  lead: 12,
  rp: 40,
  rq: 80,
  ss: 8,
  costing: 'FIFO',
  locs: { 'WH-TVM': 59, 'WH-ASSY': 20, 'WH-CHN': 14 },
  qtySO: 34,
  qtySupply: 40,
  attrs: {},
  blocked: false,
  sellable: true,
  tracksLot: true,
  tracksExpiry: false,
  tracksSerial: false,
  barcode: '8904210000000',
  ...over,
})

const wh = (over: Partial<Warehouse> = {}): Warehouse => ({
  id: 'WH-TVM',
  name: 'Tiruvannamalai — Main',
  code: 'TVM-MAIN',
  type: 'mixed',
  addr: '',
  city: 'Tiruvannamalai',
  state: '33',
  zip: '606601',
  country: 'IN',
  area: 6200,
  status: 'active',
  pobStatus: 'principal',
  managerEmpId: 'EMP00003',
  operatorVendorId: '',
  ...over,
})

describe('item stock quantities', () => {
  it('sums locs for onHand and subtracts qtySO for available', () => {
    const it = item()
    expect(itemOnHand(it)).toBe(93)
    expect(itemCommitted(it)).toBe(34)
    expect(itemAvailable(it)).toBe(59)
  })

  it('handles empty locs and allows negative available when oversold', () => {
    const it = item({ locs: {}, qtySO: 5 })
    expect(itemOnHand(it)).toBe(0)
    expect(itemAvailable(it)).toBe(-5)
  })
})

describe('low-stock and stock status', () => {
  it('flags low stock when onHand <= rp (boundary inclusive)', () => {
    expect(isItemLowStock(item({ locs: { 'WH-TVM': 40 }, rp: 40 }))).toBe(true)
    expect(isItemLowStock(item({ locs: { 'WH-TVM': 41 }, rp: 40 }))).toBe(false)
    expect(itemLowStockFlag(item({ locs: { 'WH-TVM': 40 }, rp: 40 }))).toContain('40')
    expect(itemLowStockFlag(item({ locs: { 'WH-TVM': 41 }, rp: 40 }))).toBeNull()
  })

  it('derives Out of stock when available <= 0, Low stock when <= rp, otherwise Healthy', () => {
    expect(itemStockStatus(item({ locs: { 'WH-TVM': 30 }, qtySO: 30, rp: 10 }))).toBe('Out of stock')
    expect(itemStockStatus(item({ locs: { 'WH-TVM': 30 }, qtySO: 35, rp: 10 }))).toBe('Out of stock')
    expect(itemStockStatus(item({ locs: { 'WH-TVM': 30 }, qtySO: 10, rp: 30 }))).toBe('Low stock')
    expect(itemStockStatus(item({ locs: { 'WH-TVM': 93 }, qtySO: 34, rp: 40 }))).toBe('Healthy')
  })
})

describe('item margin', () => {
  it('computes (price - cost) / price when price > 0, and null otherwise', () => {
    expect(itemMargin({ price: 200, cost: 150 })).toBeCloseTo(0.25)
    expect(itemMargin({ price: 0, cost: 62 })).toBeNull()
  })
})

describe('item category hierarchy', () => {
  it('resolves parent, sub-category and full path for nested categories', () => {
    expect(itemCategoryParent('Sambrani Holder')).toBe('Finished Goods')
    expect(itemCategorySub('Sambrani Holder')).toBe('Sambrani Holder')
    expect(itemCategoryPath('Sambrani Holder')).toBe('Finished Goods › Sambrani Holder')
    expect(itemCategoryParent('Raw Material')).toBe('Components')
    expect(itemCategorySub('Raw Material')).toBe('Raw Material')
  })

  it('returns the category as parent with empty sub-category for roots and unknown leaves', () => {
    expect(itemCategoryParent('Packaging')).toBe('Packaging')
    expect(itemCategorySub('Packaging')).toBe('')
    expect(itemCategoryPath('Packaging')).toBe('Packaging')
    expect(itemCategoryParent('Custom')).toBe('Custom')
    expect(itemCategorySub('Custom')).toBe('')
  })

  it('guards against cycles in custom parent maps', () => {
    expect(itemCategoryPath('A', ' › ', { A: 'B', B: 'A' })).toBe('B › A')
  })
})

describe('item warehouses & site stock', () => {
  const sites = [
    wh({ id: 'WH-TVM', code: 'TVM-MAIN', name: 'Tiruvannamalai — Main', status: 'active' }),
    wh({ id: 'WH-ASSY', code: 'TVM-ASSY', name: 'Assembly unit', status: 'active' }),
    wh({ id: 'WH-OLD', code: 'OLD', name: 'Old Shed', status: 'inactive' }),
  ]

  it('extracts short warehouse names from em-dash titles', () => {
    expect(warehouseShortName('Tiruvannamalai — Main')).toBe('Main')
    expect(warehouseShortName('Assembly unit')).toBe('Assembly unit')
  })

  it('lists every active site (even empty) and inactive sites only when stocked', () => {
    expect(itemSiteRows(item({ locs: { 'WH-TVM': 10, 'WH-ASSY': 25 } }), sites).map((s) => s.id)).toEqual([
      'WH-TVM',
      'WH-ASSY',
    ])
    expect(itemSiteRows(item({ locs: { 'WH-TVM': 10, 'WH-OLD': 3 } }), sites).map((s) => s.id)).toEqual([
      'WH-TVM',
      'WH-ASSY',
      'WH-OLD',
    ])
  })

  it('picks the highest-stock site as primary and counts stocked sites', () => {
    const it = item({ locs: { 'WH-TVM': 10, 'WH-ASSY': 25 } })
    expect(itemPrimarySite(it, sites)?.short).toBe('Assembly unit')
    expect(itemSiteSpread(it, sites)).toBe(2)
    expect(itemPrimarySite(item({ locs: {} }), sites)).toBeNull()
  })
})

describe('item delete guard', () => {
  const po = (items: string[]): Pick<PurchaseOrder, 'lines'> => ({
    lines: items.map((code) => ({ item: code, desc: code, qty: 10, uom: 'NOS', unitCost: 50 })),
  })
  const grn = (items: string[]): Pick<PurchaseReceipt, 'lines'> => ({
    lines: items.map((code) => ({
      item: code,
      desc: code,
      uom: 'NOS',
      qtyOrdered: 10,
      qtyReceived: 10,
      qtyRejected: 0,
      rejectReason: '',
      unitCost: 50,
    })),
  })

  it('blocks deleting when the item has stock on hand or appears on a PO or receipt', () => {
    const msg = 'This item has stock or is on purchase documents — block it instead'
    expect(itemDeleteBlockedReason(item({ locs: { 'WH-TVM': 1 } }), [], [])).toBe(msg)
    expect(itemDeleteBlockedReason(item({ locs: {} }), [po(['ASH-PWH-18'])], [])).toBe(msg)
    expect(itemDeleteBlockedReason(item({ locs: {} }), [], [grn(['ASH-PWH-18'])])).toBe(msg)
  })

  it('allows deleting an item with zero stock and no PO or receipt lines', () => {
    expect(itemDeleteBlockedReason(item({ locs: {} }), [po(['OTHER'])], [grn(['OTHER'])])).toBeNull()
  })
})
