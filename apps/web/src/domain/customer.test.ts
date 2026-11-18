import type { Customer, CustomerPrice, Item, SalesInvoice, SalesOrder } from '@/data/schemas'
import {
  applyCustomerForm,
  customerActivity,
  customerAging,
  customerDeleteBlockedReason,
  customerDocStatusTone,
  customerDocuments,
  customerKpis,
  customerLocation,
  customerOrderTotal,
  customerStatus,
  customerToForm,
  deleteCustomerShipTo,
  normalizeCustomerForm,
  setDefaultCustomerShipTo,
  toggleCustomerCreditHold,
  upsertCustomerShipTo,
  validateCustomerForm,
  validateCustomerShipTo,
} from './customer'

const customer = (over: Partial<Customer> = {}): Customer => ({
  no: 'CUS00001',
  name: 'Sri Annamalaiyar Pooja Stores',
  contact: 'Ganesan Murthy',
  phone: '+91 94420 11562',
  email: 'orders@annamalaiyarpooja.example',
  city: 'Tiruvannamalai',
  state: 'Tamil Nadu',
  terms: 'NET 15',
  balance: 13176,
  creditLimit: 40000,
  overdue: 0,
  status: 'Active',
  lastOrder: '2026-07-30',
  salesRep: 'EMP00016',
  openOrders: 2,
  createdAt: '2023-02-14',
  pricingEligible: true,
  gstin: '33AABCS1001K1Z1',
  creditHold: false,
  riskNote: '',
  shipTo: [{ id: 'CUS00001-S1', label: 'Main store', address: 'Tiruvannamalai, Tamil Nadu', isDefault: true }],
  contacts: [],
  ...over,
})

const order = (over: Partial<SalesOrder> = {}): SalesOrder => ({
  no: 'SO00014',
  customer: 'Sri Annamalaiyar Pooja Stores',
  orderDate: '2026-07-30',
  shipDate: '2026-07-31',
  location: 'TVM-MAIN',
  status: 'Shipped',
  lines: [
    ['ASH-PWH-18', 24],
    ['SBC-CONE-12', 40],
  ],
  ...over,
})

const invoice = (over: Partial<SalesInvoice> = {}): SalesInvoice => ({
  no: 'INV00010',
  customer: 'Sri Annamalaiyar Pooja Stores',
  invDate: '2026-07-30',
  dueDate: '2026-08-14',
  amount: 13176,
  status: 'Open',
  ...over,
})

describe('customerStatus', () => {
  it('returns the customer status or derives from creditHold when absent', () => {
    expect(customerStatus({ status: 'Active' })).toBe('Active')
    expect(customerStatus({ status: 'On hold' })).toBe('On hold')
    expect(customerStatus({ status: 'Prospect' })).toBe('Prospect')
    expect(customerStatus({ creditHold: true })).toBe('On hold')
    expect(customerStatus({ creditHold: false })).toBe('Active')
    expect(customerStatus(null)).toBe('Active')
  })
})

describe('customerLocation', () => {
  it('formats City, State or whichever side is present', () => {
    expect(customerLocation({ city: 'Tiruvannamalai', state: 'Tamil Nadu' })).toBe('Tiruvannamalai, Tamil Nadu')
    expect(customerLocation({ city: 'Tiruvannamalai', state: '' })).toBe('Tiruvannamalai')
    expect(customerLocation({ city: '', state: 'Tamil Nadu' })).toBe('Tamil Nadu')
    expect(customerLocation({ city: '', state: '' })).toBe('')
    expect(customerLocation(null)).toBe('')
  })
})

describe('customerDeleteBlockedReason', () => {
  it('blocks deletion when openOrders > 0 or balance is non-zero', () => {
    const msg = 'This customer has open orders or a balance — put it on hold instead'
    expect(customerDeleteBlockedReason({ openOrders: 1, balance: 0 })).toBe(msg)
    expect(customerDeleteBlockedReason({ openOrders: 0, balance: 500 })).toBe(msg)
    expect(customerDeleteBlockedReason({ openOrders: 0, balance: -100 })).toBe(msg)
    expect(customerDeleteBlockedReason({ openOrders: 0, balance: 0 })).toBeNull()
    expect(customerDeleteBlockedReason({})).toBeNull()
    expect(customerDeleteBlockedReason(null)).toBeNull()
  })
})

describe('customerKpis', () => {
  it('computes KPI figures and non-negative credit headroom', () => {
    expect(customerKpis(customer())).toEqual({
      balance: 13176,
      creditLimit: 40000,
      creditHold: false,
      overdue: 0,
      openOrders: 2,
      headroom: 26824,
    })
    expect(customerKpis(customer({ balance: 50000, creditLimit: 40000, creditHold: true, overdue: 10000 })).headroom).toBe(0)
    expect(customerKpis(null)).toEqual({
      balance: 0,
      creditLimit: 0,
      creditHold: false,
      overdue: 0,
      openOrders: 0,
      headroom: 0,
    })
  })
})

describe('customerActivity', () => {
  it('lists account opening, last order and credit hold newest first', () => {
    const feed = customerActivity(customer({ creditHold: true }), [
      order(),
      order({ no: 'SO00001', orderDate: '2026-06-01' }),
      order({ no: 'SO00099', customer: 'Someone Else', orderDate: '2026-08-01' }),
    ])
    expect(feed).toHaveLength(3)
    expect(feed.map((e) => e.text)).toContain('Put on credit hold')
    expect(feed.find((e) => e.text === 'Last order placed')).toMatchObject({ date: '2026-07-30', meta: 'SO00014' })
    expect(feed.at(-1)).toMatchObject({ text: 'Account opened', date: '2023-02-14' })
  })
})

describe('customerOrderTotal / customerDocuments / customerDocStatusTone', () => {
  const items: Pick<Item, 'no' | 'price'>[] = [
    { no: 'ASH-PWH-18', price: 399 },
    { no: 'SBC-CONE-12', price: 69 },
  ]

  it('calculates order totals from item list prices', () => {
    expect(customerOrderTotal(order(), items)).toBe(24 * 399 + 40 * 69)
    expect(customerOrderTotal(order({ lines: [['MISSING', 5]] }), items)).toBe(0)
  })

  it('resolves agreed customer prices and quantity tiers when customerPrices are passed', () => {
    const prices: CustomerPrice[] = [
      { id: 'CP1', customer: 'CUS00001', item: 'ASH-PWH-18', price: 360, minQty: 1, effFrom: '2026-04-01', effTo: '', uom: '', currency: 'INR', note: '' },
      { id: 'CP2', customer: 'CUS00001', item: 'ASH-PWH-18', price: 340, minQty: 50, effFrom: '2026-04-01', effTo: '', uom: '', currency: 'INR', note: '' },
    ]
    // 24 < 50 -> ₹360; SBC-CONE-12 has no override -> list ₹69
    expect(customerOrderTotal(order(), items, { customer: customer(), prices })).toBe(24 * 360 + 40 * 69)
    // 60 >= 50 -> bulk tier ₹340
    expect(customerOrderTotal(order({ lines: [['ASH-PWH-18', 60]] }), items, { customer: customer(), prices })).toBe(60 * 340)
    // Ineligible customer -> falls back to list ₹399
    expect(customerOrderTotal(order(), items, { customer: customer({ pricingEligible: false }), prices })).toBe(24 * 399 + 40 * 69)
    // customerDocuments applies the same resolved price
    const docs = customerDocuments(customer(), [order()], [], items, prices)
    expect(docs[0].amount).toBe(24 * 360 + 40 * 69)
  })

  it('merges orders and invoices for the customer only, sorted newest first', () => {
    const docs = customerDocuments(
      customer(),
      [order({ orderDate: '2026-07-10' }), order({ no: 'SO99999', customer: 'Other' })],
      [invoice({ invDate: '2026-07-30' }), invoice({ no: 'INV99999', customer: 'Other' })],
      items,
    )
    expect(docs.map((d) => [d.kind, d.no, d.amount])).toEqual([
      ['Invoice', 'INV00010', 13176],
      ['Order', 'SO00014', 12336],
    ])
  })

  it('maps sales document statuses to tones', () => {
    expect(customerDocStatusTone('Shipped')).toBe('ok')
    expect(customerDocStatusTone('Invoiced')).toBe('ok')
    expect(customerDocStatusTone('Paid')).toBe('ok')
    expect(customerDocStatusTone('Open')).toBe('info')
    expect(customerDocStatusTone('Overdue')).toBe('bad')
    expect(customerDocStatusTone('Draft')).toBe('neutral')
  })
})

describe('customerAging', () => {
  it('buckets unpaid invoices by days past due and excludes paid ones', () => {
    const invoices: SalesInvoice[] = [
      invoice({ no: 'INV1', dueDate: '2026-08-20', amount: 1000, status: 'Open' }), // current (-5d)
      invoice({ no: 'INV2', dueDate: '2026-08-05', amount: 2000, status: 'Open' }), // 10d -> 1–30
      invoice({ no: 'INV3', dueDate: '2026-07-01', amount: 3000, status: 'Overdue' }), // 45d -> 31–60
      invoice({ no: 'INV4', dueDate: '2026-06-01', amount: 4000, status: 'Overdue' }), // 75d -> 61–90
      invoice({ no: 'INV5', dueDate: '2026-04-01', amount: 5000, status: 'Overdue' }), // 136d -> 90+
      invoice({ no: 'INV6', dueDate: '2026-04-01', amount: 9000, status: 'Paid' }), // ignored in aging
      invoice({ no: 'INV7', customer: 'Other', dueDate: '2026-04-01', amount: 8000, status: 'Overdue' }),
    ]
    const summary = customerAging(customer(), invoices, '2026-08-15')
    expect(summary.invoiceCount).toBe(6)
    expect(summary.openTotal).toBe(15000)
    expect(summary.buckets).toEqual([
      { label: 'Current', amount: 1000, pct: 20, isOverdue: false },
      { label: '1–30 days', amount: 2000, pct: 40, isOverdue: true },
      { label: '31–60 days', amount: 3000, pct: 60, isOverdue: true },
      { label: '61–90 days', amount: 4000, pct: 80, isOverdue: true },
      { label: '90+ days', amount: 5000, pct: 100, isOverdue: true },
    ])
  })
})

describe('customerToForm / normalizeCustomerForm / validateCustomerForm / applyCustomerForm', () => {
  it('normalises whitespace and upper-cases GSTIN', () => {
    const form = normalizeCustomerForm({
      ...customerToForm(customer()),
      name: '  Sri Pooja  ',
      city: '  Vellore ',
      gstin: ' 33aabcs 1001k1z1 ',
      creditLimit: ' 45000 ',
    })
    expect(form.name).toBe('Sri Pooja')
    expect(form.city).toBe('Vellore')
    expect(form.gstin).toBe('33AABCS1001K1Z1')
    expect(form.creditLimit).toBe('45000')
  })

  it('requires a name, non-negative credit limit and valid optional GSTIN', () => {
    const base = customerToForm(customer())
    expect(validateCustomerForm(base)).toEqual({})
    expect(validateCustomerForm({ ...base, gstin: '' })).toEqual({})

    const errs = validateCustomerForm({ ...base, name: '   ', creditLimit: '-10', gstin: '123' })
    expect(Object.keys(errs).sort()).toEqual(['creditLimit', 'gstin', 'name'])
    expect(validateCustomerForm({ ...base, gstin: '99AABCS1001K1Z1' }).gstin).toContain('state code')
  })

  it('applies form values back onto the customer record', () => {
    const next = applyCustomerForm(customer(), {
      ...customerToForm(customer()),
      name: 'Updated Store',
      terms: 'NET 30',
      creditLimit: '50000',
      city: 'Chennai',
      state: 'Tamil Nadu',
      gstin: '',
      salesRep: '',
    })
    expect(next.name).toBe('Updated Store')
    expect(next.terms).toBe('NET 30')
    expect(next.creditLimit).toBe(50000)
    expect(next.city).toBe('Chennai')
    expect(next.gstin).toBe('')
    expect(next.salesRep).toBe('')
  })
})

describe('ship-to rules & credit hold', () => {
  it('validates ship-to label', () => {
    expect(validateCustomerShipTo({ id: '', label: '  ', address: 'X' })).toEqual({ label: 'Label is required.' })
    expect(validateCustomerShipTo({ id: '', label: 'Stall', address: '' })).toEqual({})
  })

  it('adds, updates, sets default and promotes on delete', () => {
    const initial = customer().shipTo
    const added = upsertCustomerShipTo(initial, { id: '', label: '  Girivalam stall  ', address: ' Road 1 ' }, 'CUS00001-S2')
    expect(added).toHaveLength(2)
    expect(added[1]).toEqual({ id: 'CUS00001-S2', label: 'Girivalam stall', address: 'Road 1', isDefault: false })

    const updated = upsertCustomerShipTo(added, { id: 'CUS00001-S2', label: 'Stall 2', address: 'Road 2' }, 'unused')
    expect(updated[1]).toEqual({ id: 'CUS00001-S2', label: 'Stall 2', address: 'Road 2', isDefault: false })

    const defaulted = setDefaultCustomerShipTo(updated, 'CUS00001-S2')
    expect(defaulted.map((s) => s.isDefault)).toEqual([false, true])

    const afterDelete = deleteCustomerShipTo(defaulted, 'CUS00001-S2')
    expect(afterDelete).toHaveLength(1)
    expect(afterDelete[0].isDefault).toBe(true)

    const firstAdded = upsertCustomerShipTo([], { id: '', label: 'Main', address: 'Addr' }, 'S1')
    expect(firstAdded[0].isDefault).toBe(true)
  })

  it('toggles credit hold', () => {
    const held = toggleCustomerCreditHold(customer({ creditHold: false }))
    expect(held.creditHold).toBe(true)
    expect(toggleCustomerCreditHold(held).creditHold).toBe(false)
  })
})
