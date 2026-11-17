import type { PurchaseOrder, PurchasePrice, PurchaseReceipt, Vendor } from '@/data/schemas'
import {
  applyVendorForm,
  gstinFormatError,
  normalizeVendorForm,
  validateVendorForm,
  vendorActivity,
  vendorGstEffect,
  vendorGstReview,
  vendorLastOrderDate,
  vendorLocation,
  vendorSavedNote,
  vendorStats,
  vendorSupply,
  vendorStatus,
  vendorSuppliesLabel,
  vendorToForm,
} from './vendor'

describe('vendorStatus', () => {
  it('returns Active when blocked is empty or missing, and Blocked otherwise', () => {
    expect(vendorStatus({ blocked: '' })).toBe('Active')
    expect(vendorStatus({})).toBe('Active')
    expect(vendorStatus(null)).toBe('Active')
    expect(vendorStatus({ blocked: 'All' })).toBe('Blocked')
    expect(vendorStatus({ blocked: 'Payment' })).toBe('Blocked')
  })
})

describe('vendorSuppliesLabel', () => {
  it('maps goods, services and both to display labels', () => {
    expect(vendorSuppliesLabel({ supplies: 'goods' })).toBe('Goods')
    expect(vendorSuppliesLabel({ supplies: 'services' })).toBe('Services')
    expect(vendorSuppliesLabel({ supplies: 'both' })).toBe('Goods + services')
    expect(vendorSuppliesLabel(undefined)).toBe('Goods')
  })
})

describe('vendorLocation', () => {
  it('formats City, State or whichever side is present', () => {
    expect(vendorLocation({ city: 'Vellore', state: 'Tamil Nadu' })).toBe('Vellore, Tamil Nadu')
    expect(vendorLocation({ city: 'Vellore', state: '' })).toBe('Vellore')
    expect(vendorLocation({ city: '', state: 'Tamil Nadu' })).toBe('Tamil Nadu')
    expect(vendorLocation({ city: '', state: '' })).toBe('')
    expect(vendorLocation(null)).toBe('')
  })
})

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

const order = (over: Partial<PurchaseOrder> = {}): PurchaseOrder => ({
  no: 'PO00001',
  vendor: 'V00001',
  orderDate: '2026-07-12',
  expectedDate: '2026-08-02',
  location: 'TVM-MAIN',
  status: 'Issued',
  buyer: null,
  notes: '',
  lines: [{ item: 'RM-LID-PWH', desc: 'Lid', qty: 100, uom: 'NOS', unitCost: 50 }],
  ...over,
})

const receipt = (over: Partial<PurchaseReceipt> = {}): PurchaseReceipt => ({
  no: 'GRN00001',
  po: 'PO00001',
  vendor: 'V00001',
  receiptDate: '2026-08-01',
  location: 'TVM-MAIN',
  status: 'Posted',
  receivedBy: null,
  vendorDocNo: 'CH-7',
  notes: '',
  postedAt: '2026-08-01T10:00:00',
  lines: [{ item: 'RM-LID-PWH', desc: 'Lid', uom: 'NOS', qtyOrdered: 100, qtyReceived: 40, qtyRejected: 5, rejectReason: '', unitCost: 50 }],
  ...over,
})

const ws = { taxCalc: 'line', roundTotal: true } as const

describe('vendorStats', () => {
  it('counts on-time receipts, open value and late open orders for the vendor only', () => {
    const orders = [
      order(),
      order({ no: 'PO00002', expectedDate: '2026-07-01' }),
      order({ no: 'PO00003', vendor: 'V00002' }),
      order({ no: 'PO00004', status: 'Draft' }),
    ]
    const receipts = [receipt(), receipt({ no: 'GRN00002', vendor: 'V00002', po: 'PO00003' })]
    const s = vendorStats('V00001', orders, receipts, '2026-07-20')
    expect(s.orders).toHaveLength(3)
    expect(s.open.map((p) => p.no)).toEqual(['PO00001', 'PO00002'])
    // PO00001 has 40 of 100 received (60 left at 50) + PO00002 untouched (100 at 50).
    expect(s.openValue).toBe(60 * 50 + 100 * 50)
    expect(s.lateOpen).toBe(1)
    expect(s.taxPending).toBe(3)
    expect(s.timed).toBe(1)
    expect(s.onTime).toBe(1)
    expect(s.onTimePct).toBe(100)
    expect(s.rejectedQty).toBe(5)
  })

  it('has no on-time percentage before any posted receipt', () => {
    const s = vendorStats('V00001', [order()], [receipt({ status: 'Draft' })], '2026-07-20')
    expect(s.onTimePct).toBeNull()
  })
})

describe('vendorSupply', () => {
  const items = [
    { no: 'RM-LID', vendor: 'Kailash Ceramics Works' },
    { no: 'RM-BASE', vendor: 'Someone else' },
    { no: 'RM-OLD', vendor: '' },
  ]
  const price = (item: string, effTo = ''): PurchasePrice => ({
    no: 'PP1', vendor: 'V00001', item, vendorItemNo: '', minQty: 1, price: 10, currency: 'INR',
    leadDays: null, effFrom: '', effTo, note: '', createdAt: '', updatedAt: '',
  })

  it('unions preferred, priced and ordered items that exist, and counts the preferred and priced ones', () => {
    const orders = [order({ lines: [{ item: 'RM-BASE', desc: '', qty: 1, uom: 'NOS', unitCost: 1 }, { item: 'GONE', desc: '', qty: 1, uom: 'NOS', unitCost: 1 }] })]
    const s = vendorSupply({ no: 'V00001', name: 'Kailash Ceramics Works' }, items, [price('RM-LID'), price('RM-OLD', '2026-01-01'), price('NOPE')], orders, '2026-07-20')
    expect(s).toEqual({ total: 3, preferred: 1, priced: 1 })
  })

  it('is empty for a vendor with nothing linked', () => {
    expect(vendorSupply({ no: 'V00009', name: 'New' }, items, [], [], '2026-07-20')).toEqual({ total: 0, preferred: 0, priced: 0 })
  })
})

describe('vendorLastOrderDate', () => {
  it('ignores cancelled orders and is empty when there are none', () => {
    expect(vendorLastOrderDate([])).toBe('')
    expect(
      vendorLastOrderDate([order({ orderDate: '2026-07-01' }), order({ orderDate: '2026-09-01', status: 'Cancelled' })]),
    ).toBe('2026-07-01')
  })
})

describe('vendorActivity', () => {
  it('lists newest first with orders, receipts, rejections and GST changes', () => {
    const v = vendor({
      gstRegLog: [{ at: '2026-09-28T09:00:00', from: 'regular', to: 'composition', gstinFrom: 'X', gstinTo: 'X', openPOs: 0, by: 'Asha' }],
    })
    const stats = vendorStats('V00001', [order()], [receipt()], '2026-07-20')
    const feed = vendorActivity(v, stats, '2026-07-20')
    expect(feed[0]).toMatchObject({ text: 'GST registration changed', meta: 'Regular → Composition' })
    expect(feed.map((e) => e.text)).toEqual(
      expect.arrayContaining(['Vendor added', 'Last purchase order', 'Last goods receipt posted', '5 units rejected on receipt']),
    )
    expect(feed.at(-1)?.text).toBe('Vendor added')
  })

  it('notes blocking', () => {
    const feed = vendorActivity(vendor({ blocked: 'All' }), vendorStats('V00001', [], [], '2026-10-01'), '2026-10-01')
    expect(feed[0]).toMatchObject({ text: 'Blocked for all transactions', date: '2026-10-01' })
  })
})

describe('vendorGstEffect', () => {
  it('describes each registration type', () => {
    expect(vendorGstEffect('regular')).toContain('credit claimed')
    expect(vendorGstEffect('composition')).toContain('no credit')
    expect(vendorGstEffect('sez')).toContain('customs')
  })
})

describe('gstinFormatError', () => {
  it('accepts a well-formed GSTIN and explains problems otherwise', () => {
    expect(gstinFormatError('33AAFCK5100M1Z0')).toBe('')
    expect(gstinFormatError(' 33aafck5100m1z0 ')).toBe('')
    expect(gstinFormatError('')).toContain('Enter the GSTIN')
    expect(gstinFormatError('33AAFCK5100')).toContain('15 characters')
    expect(gstinFormatError('99AAFCK5100M1Z0')).toContain('state code')
  })
})

describe('validateVendorForm', () => {
  const form = vendorToForm(vendor(), ws)

  it('passes a valid form', () => {
    expect(validateVendorForm(form, vendor())).toEqual({})
  })

  it('requires a name, a non-negative budget and a valid GSTIN for registered types', () => {
    const errors = validateVendorForm({ ...form, name: '  ', budgetedAmount: '-5', gstin: 'bad' }, vendor())
    expect(Object.keys(errors).sort()).toEqual(['budgetedAmount', 'gstin', 'name'])
  })

  it('does not ask for a GSTIN from unregistered or overseas vendors', () => {
    expect(validateVendorForm({ ...form, gstRegType: 'unregistered', gstin: '' }, vendor())).toEqual({})
    expect(validateVendorForm({ ...form, gstRegType: 'overseas', gstin: '' }, vendor({ country: 'China' }))).toEqual({})
  })

  it('refuses an overseas vendor whose country is India', () => {
    expect(validateVendorForm({ ...form, gstRegType: 'overseas', gstin: '' }, vendor()).gstRegType).toContain('country')
    expect(validateVendorForm({ ...form, gstRegType: 'overseas', gstin: '' }, vendor({ country: '' })).gstRegType).toBeDefined()
  })
})

describe('vendorToForm / normalizeVendorForm', () => {
  it('shows workspace tax values while inheriting and the vendor values when overridden', () => {
    expect(vendorToForm(vendor(), { taxCalc: 'rate', roundTotal: false })).toMatchObject({
      taxRules: 'workspace',
      taxCalc: 'rate',
      roundTotal: 'no',
    })
    expect(vendorToForm(vendor({ taxCalcOverride: true, taxCalc: 'rate', roundTotal: false }), ws)).toMatchObject({
      taxRules: 'vendor',
      taxCalc: 'rate',
      roundTotal: 'no',
    })
  })

  it('trims and upper-cases typed values', () => {
    const f = normalizeVendorForm({ ...vendorToForm(vendor(), ws), name: '  Acme ', gstin: ' 33aafck 5100m1z0' })
    expect(f.name).toBe('Acme')
    expect(f.gstin).toBe('33AAFCK5100M1Z0')
  })
})

describe('vendorGstReview', () => {
  const form = vendorToForm(vendor(), ws)
  it('only warns when the type changes while orders are open', () => {
    expect(vendorGstReview(vendor(), form, 3)).toBe('')
    expect(vendorGstReview(vendor(), { ...form, gstRegType: 'composition' }, 0)).toBe('')
    expect(vendorGstReview(vendor(), { ...form, gstRegType: 'composition' }, 1)).toMatch(/^1 open purchase order uses Regular\. It switches to Composition/)
    expect(vendorGstReview(vendor(), { ...form, gstRegType: 'composition' }, 2)).toMatch(/^2 open purchase orders use Regular\. They switch/)
  })
})

describe('applyVendorForm', () => {
  const ctx = { openOrders: 2, by: 'Asha', now: '2026-11-17T10:00:00' }
  const base = vendorToForm(vendor(), ws)

  it('writes the edited fields and a budget number', () => {
    const next = applyVendorForm(vendor(), { ...base, category: 'Ceramics', budgetedAmount: '1000.5' }, ctx)
    expect(next.category).toBe('Ceramics')
    expect(next.budgetedAmount).toBe(1000.5)
    expect(next.gstRegLog).toBeUndefined()
  })

  it('logs a registration change and clears the GSTIN for unregistered vendors', () => {
    const next = applyVendorForm(vendor(), { ...base, gstRegType: 'unregistered' }, ctx)
    expect(next.gstin).toBe('')
    expect(next.gstRegLog).toEqual([
      { at: ctx.now, from: 'regular', to: 'unregistered', gstinFrom: '33AAFCK5100M1Z0', gstinTo: '', openPOs: 2, by: 'Asha' },
    ])
  })

  it('stores vendor-specific tax rules, or drops them when inheriting', () => {
    const custom = applyVendorForm(vendor(), { ...base, taxRules: 'vendor', taxCalc: 'rate', roundTotal: 'no' }, ctx)
    expect(custom).toMatchObject({ taxCalcOverride: true, taxCalc: 'rate', roundTotal: false })
    const back = applyVendorForm(custom, { ...vendorToForm(custom, ws), taxRules: 'workspace' }, ctx)
    expect(back.taxCalcOverride).toBe(false)
    expect(back.taxCalc).toBeUndefined()
    expect(back.roundTotal).toBeUndefined()
  })

  it('leaves tax rules alone for vendors that do not charge GST', () => {
    const v = vendor({ taxCalcOverride: true, taxCalc: 'rate', roundTotal: false })
    const next = applyVendorForm(v, { ...vendorToForm(v, ws), gstRegType: 'composition', taxRules: 'workspace' }, ctx)
    expect(next.taxCalcOverride).toBe(true)
    expect(next.taxCalc).toBe('rate')
  })
})

describe('vendorSavedNote', () => {
  it('mentions a changed registration or tax method, otherwise nothing', () => {
    const a = vendor()
    expect(vendorSavedNote(a, { ...a, category: 'X' }, ws)).toBe('')
    expect(vendorSavedNote(a, { ...a, gstRegType: 'composition' }, ws)).toContain('now composition')
    expect(vendorSavedNote(a, { ...a, taxCalcOverride: true, taxCalc: 'rate' }, ws)).toContain('new tax calculation')
  })
})
