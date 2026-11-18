import type { Customer, CustomerPrice, Item } from '@/data/schemas'
import {
  type CustomerPriceRow,
  type SalesPricingSettings,
  blankCustomerPrice,
  buildListPriceRows,
  commitCustomerPriceCell,
  commitListPrice,
  customerPriceNextNo,
  customerPriceStatus,
  eligibleCustomers,
  isCustomerPriceActiveOn,
  isCustomerPricingEligible,
  normalizeCustomerPrice,
  priceDeltaVsList,
  priceDeltaVsListText,
  resolveCustomerPrice,
  sellableItems,
  startCustomerPriceTier,
  toCustomerPrice,
  validCustomerPrices,
  validateCustomerPrice,
} from './sales-prices'

const TODAY = '2026-11-17'

const cust = (over: Partial<Customer> = {}): Customer => ({
  no: 'CUS00001',
  name: 'Sri Annamalaiyar Pooja Stores',
  contact: 'Ganesan Murthy',
  phone: '+91 94420 11562',
  email: 'orders@annamalaiyarpooja.example',
  city: 'Tiruvannamalai',
  state: 'Tamil Nadu',
  terms: 'NET 15',
  balance: 0,
  creditLimit: 40000,
  overdue: 0,
  status: 'Active',
  lastOrder: '2026-07-30',
  salesRep: 'EMP00016',
  openOrders: 0,
  createdAt: '2025-02-14',
  pricingEligible: true,
  shipTo: [],
  contacts: [],
  ...over,
})

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
  locs: { 'WH-TVM': 10 },
  qtySO: 0,
  qtySupply: 0,
  attrs: {},
  blocked: false,
  sellable: true,
  tracksLot: true,
  tracksExpiry: false,
  tracksSerial: false,
  barcode: '',
  ...over,
})

const priceRow = (over: Partial<CustomerPrice> = {}): CustomerPrice => ({
  id: 'CP00001',
  customer: 'CUS00001',
  item: 'ASH-PWH-18',
  price: 360,
  minQty: 1,
  effFrom: '2026-04-01',
  effTo: '',
  uom: '',
  currency: 'INR',
  note: '',
  ...over,
})

const baseSettings: SalesPricingSettings = {
  enabled: true,
  mode: 'selected',
  newCutoff: '2026-01-01',
  fallbackToList: false,
  blockUnpriced: false,
}

const refs = {
  customers: new Set(['CUS00001', 'CUS00002', 'CUS00003']),
  items: new Set(['ASH-PWH-18', 'ASH-TER-18', 'SBC-CONE-12']),
}

describe('eligibility rules', () => {
  const c1 = cust({ no: 'CUS00001', pricingEligible: true, createdAt: '2023-02-14' })
  const c2 = cust({ no: 'CUS00002', pricingEligible: false, createdAt: '2026-06-01' })

  it('requires enabled=true and respects mode (off | all | selected | newOnly)', () => {
    expect(isCustomerPricingEligible(c1, { ...baseSettings, enabled: false, mode: 'all' })).toBe(false)
    expect(isCustomerPricingEligible(c1, { ...baseSettings, mode: 'off' })).toBe(false)
    expect(isCustomerPricingEligible(c2, { ...baseSettings, mode: 'all' })).toBe(true)
    expect(isCustomerPricingEligible(c1, { ...baseSettings, mode: 'selected' })).toBe(true)
    expect(isCustomerPricingEligible(c2, { ...baseSettings, mode: 'selected' })).toBe(false)
    expect(isCustomerPricingEligible(c1, { ...baseSettings, mode: 'newOnly', newCutoff: '2026-01-01' })).toBe(false)
    expect(isCustomerPricingEligible(c2, { ...baseSettings, mode: 'newOnly', newCutoff: '2026-01-01' })).toBe(true)
    expect(isCustomerPricingEligible(c2, { ...baseSettings, mode: 'newOnly', newCutoff: '' })).toBe(false)
    expect(isCustomerPricingEligible(null, { ...baseSettings, mode: 'all' })).toBe(false)
  })

  it('filters eligibleCustomers', () => {
    expect(eligibleCustomers([c1, c2], { ...baseSettings, mode: 'selected' }).map((c) => c.no)).toEqual(['CUS00001'])
    expect(eligibleCustomers([c1, c2], { ...baseSettings, mode: 'newOnly', newCutoff: '2026-01-01' }).map((c) => c.no)).toEqual(['CUS00002'])
  })
})

describe('validCustomerPrices and row status', () => {
  it('filters out orphaned rows whose customer or item no longer exists', () => {
    const rows = [
      priceRow({ id: 'CP00001', customer: 'CUS00001', item: 'ASH-PWH-18' }),
      priceRow({ id: 'CP00002', customer: 'CUS99999', item: 'ASH-PWH-18' }),
      priceRow({ id: 'CP00003', customer: 'CUS00001', item: 'MISSING' }),
    ]
    const valid = validCustomerPrices(rows, [cust()], [item()])
    expect(valid.map((r) => r.id)).toEqual(['CP00001'])
  })

  it('classifies Active, Scheduled and Expired rows relative to today', () => {
    expect(customerPriceStatus(priceRow(), TODAY)).toBe('Active')
    expect(customerPriceStatus(priceRow({ effFrom: '', effTo: '' }), TODAY)).toBe('Active')
    expect(customerPriceStatus(priceRow({ effFrom: TODAY }), TODAY)).toBe('Active')
    expect(customerPriceStatus(priceRow({ effTo: TODAY }), TODAY)).toBe('Active')
    expect(customerPriceStatus(priceRow({ effFrom: '2026-11-18' }), TODAY)).toBe('Scheduled')
    expect(customerPriceStatus(priceRow({ effTo: '2026-11-16' }), TODAY)).toBe('Expired')
    expect(isCustomerPriceActiveOn(priceRow({ effFrom: '2026-04-01', effTo: '2026-11-17' }), TODAY)).toBe(true)
    expect(isCustomerPriceActiveOn(priceRow({ effFrom: '2026-04-01', effTo: '2026-11-16' }), TODAY)).toBe(false)
  })
})

describe('resolveCustomerPrice', () => {
  const cElig = cust({ no: 'CUS00001', pricingEligible: true })
  const cInelig = cust({ no: 'CUS00003', pricingEligible: false })
  const holder = item({ no: 'ASH-PWH-18', price: 399, uom: 'NOS' })
  const itOther = item({ no: 'SBC-CONE-12', price: 69, uom: 'BOX' })

  const prices: CustomerPrice[] = [
    priceRow({ id: 'CP00001', customer: 'CUS00001', item: 'ASH-PWH-18', minQty: 1, price: 360 }),
    priceRow({ id: 'CP00002', customer: 'CUS00001', item: 'ASH-PWH-18', minQty: 50, price: 340 }),
    priceRow({ id: 'CP00003', customer: 'CUS00001', item: 'ASH-PWH-18', minQty: 100, price: 320, effFrom: '2027-01-01' }),
    priceRow({ id: 'CP00004', customer: 'CUS00001', item: 'ASH-PWH-18', minQty: 10, price: 300, effTo: '2026-06-30' }),
    priceRow({ id: 'CP00005', customer: 'CUS00003', item: 'ASH-PWH-18', minQty: 1, price: 350 }),
  ]

  it('returns none when item is unknown', () => {
    expect(resolveCustomerPrice({ customer: cElig, item: null, prices, qty: 1, date: TODAY }).type).toBe('none')
  })

  it('returns list price for ineligible customers even if a row is on file', () => {
    const r = resolveCustomerPrice({ customer: cInelig, item: holder, prices, qty: 1, date: TODAY, settings: baseSettings })
    expect(r).toMatchObject({ price: 399, type: 'list', label: 'List', listPrice: 399 })
  })

  it('picks the highest active tier <= qty and ignores scheduled/expired tiers', () => {
    const r1 = resolveCustomerPrice({ customer: cElig, item: holder, prices, qty: 24, date: TODAY, settings: baseSettings })
    expect(r1).toMatchObject({ price: 360, type: 'customer', label: 'Customer', listPrice: 399 })

    const r2 = resolveCustomerPrice({ customer: cElig, item: holder, prices, qty: 100, date: TODAY, settings: baseSettings })
    expect(r2).toMatchObject({ price: 340, type: 'break', label: 'Quantity break', listPrice: 399 })
    expect(r2.why).toContain('Bulk tier from 50 NOS up')

    const rExpiredDate = resolveCustomerPrice({ customer: cElig, item: holder, prices, qty: 15, date: '2026-05-01', settings: baseSettings })
    expect(rExpiredDate).toMatchObject({ price: 300, type: 'break' })
  })

  it('applies fallback / block / manual rules when an eligible customer has no matching price', () => {
    const manual = resolveCustomerPrice({
      customer: cElig,
      item: itOther,
      prices,
      qty: 1,
      date: TODAY,
      settings: { ...baseSettings, fallbackToList: false, blockUnpriced: false },
    })
    expect(manual).toMatchObject({ price: null, type: 'manual', label: 'Manual', listPrice: 69 })

    const fallback = resolveCustomerPrice({
      customer: cElig,
      item: itOther,
      prices,
      qty: 1,
      date: TODAY,
      settings: { ...baseSettings, fallbackToList: true, blockUnpriced: false },
    })
    expect(fallback).toMatchObject({ price: 69, type: 'list', label: 'List', listPrice: 69 })

    const blocked = resolveCustomerPrice({
      customer: cElig,
      item: itOther,
      prices,
      qty: 1,
      date: TODAY,
      settings: { ...baseSettings, fallbackToList: true, blockUnpriced: true },
    })
    expect(blocked).toMatchObject({ price: null, type: 'blocked', label: 'Blocked', listPrice: 69 })
  })

  it('treats an agreed price of 0 as a valid resolved price', () => {
    const r = resolveCustomerPrice({
      customer: cElig,
      item: itOther,
      prices: [priceRow({ item: 'SBC-CONE-12', price: 0 })],
      qty: 1,
      date: TODAY,
      settings: baseSettings,
    })
    expect(r).toMatchObject({ price: 0, type: 'customer' })
  })
})

describe('list-price set and inline list price commit', () => {
  const items = [
    item({ no: 'ASH-PWH-18', cost: 145, price: 399, category: 'Sambrani Holder' }),
    item({ no: 'ASH-BELOW', cost: 200, price: 150, category: 'Sambrani Holder' }),
    item({ no: 'RM-LID-PWH', cost: 62, price: 0, sellable: false, category: 'Ceramic Component' }),
  ]

  it('computes margin, markup, priceState, category parent and agreed-price counts', () => {
    const rows = buildListPriceRows(
      items,
      [priceRow({ item: 'ASH-PWH-18' }), priceRow({ id: 'CP00002', item: 'ASH-PWH-18', minQty: 50 })],
      [cust()],
    )
    expect(rows[0]).toMatchObject({
      no: 'ASH-PWH-18',
      category: 'Finished Goods',
      margin: 64,
      markup: 175,
      custCount: 2,
      priceState: 'Priced',
    })
    expect(rows[1]).toMatchObject({ no: 'ASH-BELOW', margin: -33, priceState: 'Below cost', custCount: 0 })
    expect(rows[2]).toMatchObject({ no: 'RM-LID-PWH', margin: null, markup: null, priceState: 'No price' })
  })

  it('filters sellableItems by positive list price', () => {
    expect(sellableItems(items).map((i) => i.no)).toEqual(['ASH-PWH-18', 'ASH-BELOW'])
  })

  it('commits list price edits and rejects blanks or negatives', () => {
    expect(commitListPrice(items[0], '399')).toEqual({ kind: 'unchanged' })
    expect(commitListPrice(items[0], '')).toEqual({ kind: 'error', message: 'Enter a price of 0 or more.' })
    expect(commitListPrice(items[0], '-5')).toEqual({ kind: 'error', message: 'Enter a price of 0 or more.' })
    const saved = commitListPrice(items[0], '425.556')
    expect(saved).toMatchObject({ kind: 'saved', item: { no: 'ASH-PWH-18', price: 425.56 } })
  })
})

describe('customer price numbering, tiers, vs-list delta, and validation', () => {
  it('computes next CP id, vs list delta, blank and quantity tier rows', () => {
    expect(customerPriceNextNo([])).toBe('CP00001')
    expect(customerPriceNextNo([priceRow({ id: 'CP00011' }), priceRow({ id: 'CP00003' })])).toBe('CP00012')

    expect(priceDeltaVsList(360, 400)).toBe(-10)
    expect(priceDeltaVsListText(360, 400)).toBe('−10%')
    expect(priceDeltaVsListText(440, 400)).toBe('+10%')
    expect(priceDeltaVsListText(400, 400)).toBe('Same')
    expect(priceDeltaVsListText('', 400)).toBe('—')
    expect(priceDeltaVsListText(100, 0)).toBe('—')

    const b = blankCustomerPrice([priceRow()], TODAY, { customer: 'CUS00002' })
    expect(b).toMatchObject({ id: 'CP00002', customer: 'CUS00002', item: '', minQty: 1, price: '', effFrom: TODAY })

    const tier = startCustomerPriceTier(priceRow({ price: 360 }), [
      priceRow({ id: 'CP00001', minQty: 1 }),
      priceRow({ id: 'CP00002', minQty: 25 }),
    ])
    expect(tier).toMatchObject({ id: 'CP00003', customer: 'CUS00001', item: 'ASH-PWH-18', minQty: 50, price: 342 })
  })

  it('normalizes and validates required fields, ranges, dates and overlaps', () => {
    const empty = validateCustomerPrice(
      normalizeCustomerPrice({ ...blankCustomerPrice([], TODAY), minQty: '', price: '' }),
      [],
      refs,
    )
    expect(empty).toEqual({
      customer: 'Pick a customer.',
      item: 'Pick an item.',
      minQty: 'Use a whole number, 1 or more.',
      price: 'Enter a price of 0 or more.',
    })

    const badRef = validateCustomerPrice(
      normalizeCustomerPrice({ ...blankCustomerPrice([], TODAY), customer: 'CUS9', item: 'BAD', price: '10' }),
      [],
      refs,
    )
    expect(badRef.customer).toBe('This customer no longer exists.')
    expect(badRef.item).toBe('This item no longer exists.')

    const badDates = validateCustomerPrice(
      normalizeCustomerPrice({
        ...blankCustomerPrice([], TODAY),
        customer: 'CUS00001',
        item: 'ASH-PWH-18',
        price: 350,
        effFrom: '2026-06-02',
        effTo: '2026-06-01',
      }),
      [],
      refs,
    )
    expect(badDates.effTo).toBe('Ends before it starts.')

    const overlap = validateCustomerPrice(
      normalizeCustomerPrice({
        ...blankCustomerPrice([priceRow()], TODAY),
        customer: 'CUS00001',
        item: 'ASH-PWH-18',
        minQty: 1,
        price: 350,
        effFrom: '2026-05-01',
      }),
      [priceRow()],
      refs,
    )
    expect(overlap.minQty).toContain('Overlaps CP00001')

    const nonOverlap: CustomerPriceRow = normalizeCustomerPrice({
      ...blankCustomerPrice([priceRow()], TODAY),
      customer: 'CUS00001',
      item: 'ASH-PWH-18',
      minQty: 1,
      price: 350,
      effFrom: '2026-01-01',
      effTo: '2026-03-31',
    })
    expect(validateCustomerPrice(nonOverlap, [priceRow()], refs)).toEqual({})
    expect(toCustomerPrice(nonOverlap)).toMatchObject({ minQty: 1, price: 350, effFrom: '2026-01-01', effTo: '2026-03-31' })
  })

  it('commits inline cell edits and refuses invalid or overlapping values', () => {
    const rows = [priceRow(), priceRow({ id: 'CP00002', minQty: 50, price: 340 })]
    const others = [rows[1]]

    expect(commitCustomerPriceCell(rows[0], 'price', '360', others, refs)).toEqual({ kind: 'unchanged' })
    expect(commitCustomerPriceCell(rows[0], 'price', '360.00', others, refs)).toEqual({ kind: 'unchanged' })
    expect(commitCustomerPriceCell(rows[0], 'price', '-1', others, refs)).toEqual({
      kind: 'error',
      message: 'Enter a price of 0 or more.',
    })
    expect(commitCustomerPriceCell(rows[0], 'minQty', '50', others, refs)).toEqual({
      kind: 'error',
      message: 'Overlaps CP00002 (same customer, item and qty on these dates).',
    })
    const saved = commitCustomerPriceCell(rows[0], 'price', '355.5', others, refs)
    expect(saved).toMatchObject({ kind: 'saved', row: { id: 'CP00001', price: 355.5 } })
    const clearedEnd = commitCustomerPriceCell(
      priceRow({ effTo: '2026-12-31' }),
      'effTo',
      '',
      others,
      refs,
    )
    expect(clearedEnd).toMatchObject({ kind: 'saved', row: { effTo: '' } })
  })
})
