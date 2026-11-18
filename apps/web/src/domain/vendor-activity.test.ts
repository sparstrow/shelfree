import type { Employee, Item, PurchaseOrder, PurchasePrice, PurchaseReceipt, Vendor } from '@/data/schemas'
import { vendorStats } from './vendor'
import {
  addDaysIso,
  daysBetween,
  formatDeliveryDelta,
  purchasePriceStatus,
  vendorItemsSupplied,
  vendorOrderGroup,
  vendorOrderRows,
  vendorPerformance,
  vendorReceiptRows,
} from './vendor-activity'

const vendor = (over: Partial<Vendor> = {}): Vendor => ({
  no: 'V00001',
  name: 'Kailash Ceramics Works',
  name2: '',
  category: 'Ceramic Manufacturing',
  contact: '',
  email: '',
  phone: '',
  addr1: '',
  addr2: '',
  city: 'Vellore',
  state: 'Tamil Nadu',
  zip: '',
  country: 'India',
  respCenter: '',
  locationCode: '',
  blocked: '',
  paymentMethod: 'EFT',
  paymentTerms: 'NET 30',
  currency: 'INR',
  balance: 0,
  balanceDue: 0,
  budgetedAmount: 250000,
  overdue: 0,
  outstandingOrders: 0,
  vendorSince: '2022-11-08',
  hist: { quotes: 0, orders: 0, invoices: 0, returnOrders: 0, creditMemos: 0, pstdReceipts: 0, pstdInvoices: 0 },
  subInfo: { sub: false },
  purchasePerson: 'EMP00007',
  supplies: 'goods',
  gstRegType: 'regular',
  gstin: '33AAFCK5100M1Z0',
  contacts: [],
  ...over,
})

const item = (over: Partial<Item> = {}): Pick<Item, 'no' | 'desc' | 'uom' | 'vendor' | 'lead'> => ({
  no: 'RM-LID-PWH',
  desc: 'Ceramic Mountain Lid, Pearl White',
  uom: 'NOS',
  vendor: 'Kailash Ceramics Works',
  lead: 21,
  ...over,
})

const price = (over: Partial<PurchasePrice> = {}): PurchasePrice => ({
  no: 'PP00001',
  vendor: 'V00001',
  item: 'RM-LID-PWH',
  vendorItemNo: '',
  minQty: 1,
  price: 62,
  currency: 'INR',
  leadDays: 21,
  effFrom: '2026-07-05',
  effTo: '',
  note: '',
  createdAt: '2026-10-17T09:00:00.000Z',
  updatedAt: '2026-10-17T09:00:00.000Z',
  ...over,
})

const order = (over: Partial<PurchaseOrder> = {}): PurchaseOrder => ({
  no: 'PO00001',
  vendor: 'V00001',
  orderDate: '2026-07-12',
  expectedDate: '2026-08-02',
  location: 'TVM-MAIN',
  status: 'Issued',
  buyer: 'EMP00007',
  notes: '',
  lines: [{ item: 'RM-LID-PWH', desc: 'Lid', qty: 100, uom: 'NOS', unitCost: 62 }],
  ...over,
})

const receipt = (over: Partial<PurchaseReceipt> = {}): PurchaseReceipt => ({
  no: 'GRN00001',
  po: 'PO00001',
  vendor: 'V00001',
  receiptDate: '2026-07-22',
  location: 'TVM-MAIN',
  status: 'Posted',
  receivedBy: 'EMP00007',
  vendorDocNo: 'KCW-1187',
  notes: '',
  postedAt: '2026-07-22T10:30:00.000Z',
  lines: [
    {
      item: 'RM-LID-PWH',
      desc: 'Lid',
      uom: 'NOS',
      qtyOrdered: 100,
      qtyReceived: 74,
      qtyRejected: 6,
      rejectReason: 'Kiln cracks',
      unitCost: 62,
    },
  ],
  ...over,
})

const employees: Pick<Employee, 'id' | 'name'>[] = [
  { id: 'EMP00007', name: 'Kavitha Elumalai' },
  { id: 'EMP00020', name: 'Praveen Kumar' },
]

describe('date helpers', () => {
  it('adds days and calculates differences without timezone drift', () => {
    expect(addDaysIso('2026-07-25', 10)).toBe('2026-08-04')
    expect(addDaysIso('bad', 5)).toBe('')
    expect(daysBetween('2026-07-11', '2026-07-22')).toBe(11)
    expect(daysBetween('2026-07-29', '2026-07-22')).toBe(-7)
    expect(daysBetween('', '2026-07-22')).toBeNull()
  })
})

describe('purchasePriceStatus', () => {
  it('classifies Scheduled, Expired, Expiring and Active rows', () => {
    expect(purchasePriceStatus({ effFrom: '2026-08-01', effTo: '' }, '2026-07-20')).toBe('Scheduled')
    expect(purchasePriceStatus({ effFrom: '2026-01-01', effTo: '2026-07-19' }, '2026-07-20')).toBe('Expired')
    expect(purchasePriceStatus({ effFrom: '2026-01-01', effTo: '2026-08-19' }, '2026-07-20', 30)).toBe('Expiring')
    expect(purchasePriceStatus({ effFrom: '2026-01-01', effTo: '2026-08-20' }, '2026-07-20', 30)).toBe('Active')
    expect(purchasePriceStatus({ effFrom: '', effTo: '' }, '2026-07-20')).toBe('Active')
  })
})

describe('vendorItemsSupplied', () => {
  const items = [
    item({ no: 'RM-LID-PWH', desc: 'Pearl White Lid', lead: 21 }),
    item({ no: 'SBC-ASHTRAY', desc: 'Spare Tray', lead: 14 }),
    item({ no: 'RM-GASKET', desc: 'Gasket Ring', vendor: 'Vellore Silicone Components', lead: 10 }),
  ]

  it('combines price tiers, preferred items without prices, and last ordered dates', () => {
    const prices = [
      price({ no: 'PP1', item: 'RM-LID-PWH', minQty: 1, price: 62 }),
      price({ no: 'PP2', item: 'RM-LID-PWH', minQty: 100, price: 58 }),
      price({ no: 'PP3', item: 'RM-GASKET', effTo: '2026-07-01', price: 3.2 }),
      price({ no: 'PP4', item: 'DELETED-ITEM', price: 99 }),
    ]
    const orders = [
      order({ no: 'PO1', orderDate: '2026-07-12', lines: [{ item: 'RM-LID-PWH', desc: '', qty: 50, uom: 'NOS', unitCost: 62 }] }),
      order({ no: 'PO2', orderDate: '2026-07-20', status: 'Cancelled', lines: [{ item: 'RM-LID-PWH', desc: '', qty: 50, uom: 'NOS', unitCost: 62 }] }),
      order({ no: 'PO3', orderDate: '2026-07-11', lines: [{ item: 'RM-GASKET', desc: '', qty: 500, uom: 'NOS', unitCost: 3.2 }] }),
    ]

    const hidden = vendorItemsSupplied(vendor(), items, prices, orders, '2026-07-25')
    expect(hidden.itemCount).toBe(3)
    expect(hidden.expiredCount).toBe(1)
    expect(hidden.rows.map((r) => [r.itemNo, r.minQty, r.status, r.preferred, r.lastOrdered])).toEqual([
      ['RM-GASKET', null, 'No price', false, '2026-07-11'],
      ['RM-LID-PWH', 1, 'Active', true, '2026-07-12'],
      ['RM-LID-PWH', 100, 'Active', true, '2026-07-12'],
      ['SBC-ASHTRAY', null, 'No price', true, ''],
    ])

    const shown = vendorItemsSupplied(vendor(), items, prices, orders, '2026-07-25', { includeExpired: true })
    expect(shown.rows.some((r) => r.key === 'PP3' && r.status === 'Expired')).toBe(true)
  })
})

describe('vendorOrderRows', () => {
  it('filters to the vendor, sorts newest first, counts groups, and computes progress + receive eligibility', () => {
    const orders = [
      order({ no: 'PO00001', orderDate: '2026-07-12', expectedDate: '2026-08-02', status: 'Issued' }),
      order({ no: 'PO00002', orderDate: '2026-07-14', expectedDate: '2026-07-27', status: 'Draft' }),
      order({ no: 'PO00003', orderDate: '2026-07-10', expectedDate: '2026-07-15', status: 'Received' }),
      order({ no: 'PO00004', orderDate: '2026-07-08', expectedDate: '2026-07-12', status: 'Cancelled' }),
      order({ no: 'PO00005', vendor: 'V00002', orderDate: '2026-07-15' }),
    ]
    const receipts = [receipt({ po: 'PO00001', status: 'Posted' }), receipt({ no: 'GRN00002', po: 'PO00001', status: 'Draft' })]

    expect(vendorOrderGroup({ status: 'Draft' })).toBe('open')
    expect(vendorOrderGroup({ status: 'Closed' })).toBe('done')
    expect(vendorOrderGroup({ status: 'Cancelled' })).toBe('cancelled')

    const all = vendorOrderRows(vendor(), orders, receipts, employees, '2026-08-05', 'all')
    expect(all.counts).toEqual({ all: 4, open: 2, done: 1, cancelled: 1 })
    expect(all.rows.map((r) => r.no)).toEqual(['PO00002', 'PO00001', 'PO00003', 'PO00004'])
    expect(all.rows[1]).toMatchObject({
      no: 'PO00001',
      late: true,
      receivedQty: 74,
      orderedQty: 100,
      receivedPct: 74,
      buyerName: 'Kavitha Elumalai',
      total: 6200,
      canReceive: true,
    })
    expect(all.rows[0].late).toBe(false)
    expect(all.rows[0].canReceive).toBe(false)

    const blockedAll = vendorOrderRows(vendor({ blocked: 'All' }), orders, receipts, employees, '2026-08-05', 'open')
    expect(blockedAll.rows.map((r) => r.no)).toEqual(['PO00002', 'PO00001'])
    expect(blockedAll.rows.every((r) => !r.canReceive)).toBe(true)
  })
})

describe('vendorReceiptRows', () => {
  it('filters to the vendor, sorts newest first, counts statuses, and computes quantities/value', () => {
    const receipts = [
      receipt({ no: 'GRN00004', receiptDate: '2026-07-22', status: 'Posted' }),
      receipt({ no: 'GRN00005', receiptDate: '2026-09-18', status: 'Draft', vendorDocNo: '' }),
      receipt({ no: 'GRN00003', vendor: 'V00002', receiptDate: '2026-07-06', status: 'Posted' }),
    ]
    const all = vendorReceiptRows('V00001', receipts, 'all')
    expect(all.counts).toEqual({ all: 2, Draft: 1, Posted: 1, Cancelled: 0 })
    expect(all.rows.map((r) => r.no)).toEqual(['GRN00005', 'GRN00004'])
    expect(all.rows[1]).toMatchObject({
      no: 'GRN00004',
      received: 74,
      rejected: 6,
      value: 74 * 62,
      vendorDocNo: 'KCW-1187',
    })

    const postedOnly = vendorReceiptRows('V00001', receipts, 'Posted')
    expect(postedOnly.rows.map((r) => r.no)).toEqual(['GRN00004'])
  })
})

describe('vendorPerformance & formatDeliveryDelta', () => {
  it('computes deliveries, scorecard figures, and quality rejections', () => {
    const v = vendor({ subInfo: { sub: true, ops: ['Glazing'], wc: 'CER-01', cost: 58, lead: 21 } })
    const orders = [
      order({ no: 'PO00002', orderDate: '2026-07-11', expectedDate: '2026-07-29', status: 'Partially received' }),
      order({ no: 'PO00001', orderDate: '2026-07-12', expectedDate: '2026-08-02', status: 'Issued' }),
    ]
    const receipts = [receipt({ no: 'GRN00004', po: 'PO00002', receiptDate: '2026-07-22', status: 'Posted' })]
    const stats = vendorStats('V00001', orders, receipts, '2026-08-05')
    const perf = vendorPerformance(v, stats, [item()])

    expect(perf.deliveries).toEqual([
      { no: 'GRN00004', expectedDate: '2026-07-29', receiptDate: '2026-07-22', deltaDays: -7 },
    ])
    expect(formatDeliveryDelta(-7)).toBe('7 days early')
    expect(formatDeliveryDelta(-1)).toBe('1 day early')
    expect(formatDeliveryDelta(0)).toBe('On the day')
    expect(formatDeliveryDelta(1)).toBe('1 day late')
    expect(formatDeliveryDelta(3)).toBe('3 days late')
    expect(formatDeliveryDelta(null)).toBe('—')

    expect(perf.onTime).toBe(1)
    expect(perf.timed).toBe(1)
    expect(perf.onTimePct).toBe(100)
    expect(perf.avgLeadDays).toBe(11)
    expect(perf.quotedLeadDays).toBe(21)
    expect(perf.receivedQty).toBe(74)
    expect(perf.rejectedQty).toBe(6)
    expect(perf.rejectionPct).toBeCloseTo((6 / 80) * 100, 5)
    expect(perf.lateOpenOrders).toBe(2)
    expect(perf.qualityLog).toEqual([
      {
        key: 'GRN00004:RM-LID-PWH:0',
        receiptNo: 'GRN00004',
        date: '2026-07-22',
        item: 'RM-LID-PWH',
        qty: 6,
        uom: 'NOS',
        reason: 'Kiln cracks',
      },
    ])
  })

  it('falls back to preferred item lead times and returns null metrics when no posted receipts exist', () => {
    const v = vendor({ subInfo: { sub: false } })
    const stats = vendorStats('V00001', [], [], '2026-08-05')
    const perf = vendorPerformance(v, stats, [item({ lead: 6 }), item({ no: 'X2', lead: 8 })])
    expect(perf.deliveries).toEqual([])
    expect(perf.qualityLog).toEqual([])
    expect(perf.onTimePct).toBeNull()
    expect(perf.avgLeadDays).toBeNull()
    expect(perf.quotedLeadDays).toBe(7)
    expect(perf.rejectionPct).toBeNull()
  })
})
