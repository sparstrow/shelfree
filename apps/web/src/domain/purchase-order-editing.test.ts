import { DEFAULT_SETTINGS, type Settings } from '@/data/api/settings'
import type { Item, PurchaseOrder, PurchasePrice, Vendor, Warehouse } from '@/data/schemas'
import { vendorGstTag, vendorGstType, vendorTaxState } from './gst'
import {
  canIssue,
  compositionInterState,
  lineIssues,
  newOrderLine,
  priceGuardMessage,
  repriceOrder,
  stampTax,
  taxNote,
} from './purchase-order-editing'
import { resolvePrice } from './purchase-prices'

const price = (over: Partial<PurchasePrice>): PurchasePrice => ({
  no: 'PP00001',
  vendor: 'V00001',
  item: 'RM-LID',
  vendorItemNo: '',
  minQty: 1,
  price: 62,
  currency: 'INR',
  leadDays: 21,
  effFrom: '2026-01-01',
  effTo: '',
  note: '',
  createdAt: '',
  updatedAt: '',
  ...over,
})

const prices = [
  price({ no: 'PP00001', minQty: 50, price: 62 }),
  price({ no: 'PP00002', minQty: 100, price: 58 }),
  price({ no: 'PP00003', item: 'RM-BASE', minQty: 1, price: 41, effTo: '2026-06-30' }),
]

const po = (over: Partial<PurchaseOrder> = {}): PurchaseOrder => ({
  no: 'PO00011',
  vendor: 'V00001',
  orderDate: '2026-07-12',
  expectedDate: '',
  location: 'TVM-MAIN',
  status: 'Draft',
  buyer: null,
  notes: '',
  lines: [{ item: 'RM-LID', desc: 'Lid', qty: 120, uom: 'NOS', unitCost: 0 }],
  ...over,
})

const ctx = { prices, settings: DEFAULT_SETTINGS }
const vendor = (over: Partial<Vendor> = {}) =>
  ({ no: 'V00001', name: 'Kailash Ceramics Works', gstRegType: 'regular', gstin: '33AAFCK5100M1Z0', state: 'Tamil Nadu', ...over }) as Vendor

describe('price resolution', () => {
  it('picks the largest tier at or below the quantity', () => {
    expect(resolvePrice(prices, 'V00001', 'RM-LID', 120, '2026-07-12')).toMatchObject({ status: 'ok', price: 58, min: 50 })
    expect(resolvePrice(prices, 'V00001', 'RM-LID', 60, '2026-07-12')).toMatchObject({ status: 'ok', price: 62 })
  })
  it('reports below-minimum and no-price', () => {
    expect(resolvePrice(prices, 'V00001', 'RM-LID', 10, '2026-07-12')).toMatchObject({ status: 'belowMoq', min: 50 })
    expect(resolvePrice(prices, 'V00001', 'RM-BASE', 10, '2026-07-12').status).toBe('noPrice') // expired
    expect(resolvePrice(prices, 'V00002', 'RM-LID', 10, '2026-07-12').status).toBe('noPrice')
  })
})

describe('pricing order lines', () => {
  it('re-prices drafts only', () => {
    expect(repriceOrder(po(), ctx).lines[0].unitCost).toBe(58)
    expect(repriceOrder(po({ status: 'Issued' }), ctx).lines[0].unitCost).toBe(0)
  })
  it('leaves costs alone when the lock setting is off', () => {
    const unlocked: Settings = { ...DEFAULT_SETTINGS, purchasing: { ...DEFAULT_SETTINGS.purchasing, lockCostToPriceList: false } }
    expect(repriceOrder(po(), { prices, settings: unlocked }).lines[0].unitCost).toBe(0)
  })
  it('starts a new line at the minimum quantity and its price', () => {
    const item = { no: 'RM-LID', desc: 'Lid', uom: 'NOS', cost: 70 } as Item
    expect(newOrderLine(item, po(), ctx)).toMatchObject({ qty: 50, unitCost: 62 })
  })
  it('flags and explains line problems', () => {
    const bad = po({
      lines: [
        { item: 'RM-LID', desc: 'Lid', qty: 10, uom: 'NOS', unitCost: 62 },
        { item: 'RM-BASE', desc: 'Base', qty: 5, uom: 'NOS', unitCost: 41 },
      ],
    })
    expect(lineIssues(bad, ctx).map((x) => x.issue.kind)).toEqual(['belowMoq', 'noPrice'])
    expect(priceGuardMessage(bad, 'Kailash Ceramics Works', ctx)).toBe(
      '1 line has no active price from Kailash Ceramics Works and 1 line is below the vendor’s minimum qty. Fix or remove them to save.',
    )
    expect(priceGuardMessage(po(), 'x', ctx)).toBeNull()
  })
})

describe('GST rules', () => {
  const sites = [{ code: 'TVM-MAIN', state: '33' }, { code: 'BLR', state: '29' }] as Warehouse[]
  it('derives type, tag and state', () => {
    expect(vendorGstType(vendor({ gstRegType: undefined, gstin: '' }))).toBe('unregistered')
    expect(vendorGstTag(vendor({ gstRegType: 'composition' }))).toBe('Composition · no GST')
    expect(vendorTaxState(vendor())?.name).toBe('Tamil Nadu')
  })
  it('detects a composition vendor shipping to another state', () => {
    const comp = vendor({ gstRegType: 'composition' })
    expect(compositionInterState(po(), comp, sites, DEFAULT_SETTINGS)).toBeNull()
    const other = compositionInterState(po({ location: 'BLR' }), comp, sites, DEFAULT_SETTINGS)
    expect(other).toMatchObject({ vendorState: 'Tamil Nadu', shipState: 'Karnataka', block: false })
    const blocking: Settings = { ...DEFAULT_SETTINGS, tax: { ...DEFAULT_SETTINGS.tax, compInterState: 'block' } }
    const blocked = compositionInterState(po({ location: 'BLR' }), comp, sites, blocking)
    expect(canIssue(po({ location: 'BLR' }), blocked)).toBe(false)
    expect(canIssue(po(), null)).toBe(true)
    expect(canIssue(po({ lines: [] }), null)).toBe(false)
  })
  it('stamps the tax method and notices when it goes stale', () => {
    const stamped = stampTax(po(), vendor(), DEFAULT_SETTINGS)
    expect(stamped).toMatchObject({ taxCalc: 'line', roundTotal: true, taxCalcSrc: 'workspace', vendorTaxStateCode: '33' })
    expect(taxNote(stamped, vendor(), DEFAULT_SETTINGS).stale).toBe(false)
    const changed: Settings = { ...DEFAULT_SETTINGS, tax: { ...DEFAULT_SETTINGS.tax, taxCalc: 'rate' } }
    expect(taxNote(stamped, vendor(), changed).stale).toBe(true)
    expect(stampTax(stamped, undefined, DEFAULT_SETTINGS).taxCalc).toBeUndefined()
  })
})

