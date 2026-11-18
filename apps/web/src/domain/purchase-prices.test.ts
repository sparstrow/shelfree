import type { PurchasePrice } from '@/data/schemas'
import {
  type PriceRow,
  activePriceRows,
  addDays,
  blankPrice,
  commitPriceCell,
  datesOverlap,
  duplicatePrice,
  normalizePrice,
  priceOnChange,
  priceStatus,
  priceVsCost,
  priceVsCostText,
  pricesToSave,
  purchasePriceNextNo,
  resolvePrice,
  startPriceChange,
  startPriceForItem,
  startPriceTier,
  toPurchasePrice,
  unpricedItems,
  validatePrice,
  vendorPriceRows,
  vendorPricedItems,
} from './purchase-prices'

const TODAY = '2026-11-17'
const fmt = (iso: string) => `<${iso}>`

const row = (o: Partial<PurchasePrice> = {}): PurchasePrice => ({
  no: 'PP00001',
  vendor: 'V1',
  item: 'IT-A',
  vendorItemNo: '',
  minQty: 1,
  price: 100,
  currency: 'INR',
  leadDays: 7,
  effFrom: '2026-01-01',
  effTo: '',
  note: '',
  createdAt: '',
  updatedAt: '',
  ...o,
})

const refs = { vendors: new Set(['V1', 'V2']), items: new Set(['IT-A', 'IT-B']) }

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
  })
})

describe('priceStatus', () => {
  it('is Active when open-ended and started', () => {
    expect(priceStatus(row(), TODAY)).toBe('Active')
    expect(priceStatus(row({ effFrom: '' }), TODAY)).toBe('Active')
  })
  it('is Scheduled when it starts after today (not when it starts today)', () => {
    expect(priceStatus(row({ effFrom: '2026-11-18' }), TODAY)).toBe('Scheduled')
    expect(priceStatus(row({ effFrom: TODAY }), TODAY)).toBe('Active')
  })
  it('is Expired the day after it ends, still current on its last day', () => {
    expect(priceStatus(row({ effTo: '2026-11-16' }), TODAY)).toBe('Expired')
    expect(priceStatus(row({ effTo: TODAY }), TODAY)).toBe('Expiring')
  })
  it('is Expiring within the window, Active beyond it', () => {
    expect(priceStatus(row({ effTo: '2026-12-17' }), TODAY)).toBe('Expiring')
    expect(priceStatus(row({ effTo: '2026-12-18' }), TODAY)).toBe('Active')
    expect(priceStatus(row({ effTo: '2026-12-18' }), TODAY, 31)).toBe('Expiring')
  })
  it('Scheduled wins over an end date', () => {
    expect(priceStatus(row({ effFrom: '2027-01-01', effTo: '2027-02-01' }), TODAY)).toBe('Scheduled')
  })
})

describe('priceVsCost', () => {
  it('is the percent against the item cost, to one decimal', () => {
    expect(priceVsCost(110, 100)).toBe(10)
    expect(priceVsCost(95.55, 100)).toBe(-4.5)
    expect(priceVsCostText(110, 100)).toBe('+10%')
    expect(priceVsCostText(90, 100)).toBe('−10%')
    expect(priceVsCostText(100, 100)).toBe('Same')
  })
  it('is blank without a comparable cost or price', () => {
    expect(priceVsCost(10, 0)).toBeNull()
    expect(priceVsCost('', 100)).toBeNull()
    expect(priceVsCostText('', 100)).toBe('—')
  })
})

describe('datesOverlap', () => {
  it('treats empty bounds as unbounded and ends as inclusive', () => {
    expect(datesOverlap({ effFrom: '', effTo: '' }, { effFrom: '2026-05-01', effTo: '' })).toBe(true)
    expect(datesOverlap({ effFrom: '2026-01-01', effTo: '2026-03-31' }, { effFrom: '2026-03-31', effTo: '' })).toBe(true)
    expect(datesOverlap({ effFrom: '2026-01-01', effTo: '2026-03-30' }, { effFrom: '2026-03-31', effTo: '' })).toBe(false)
  })
})

describe('resolvePrice and tiers', () => {
  const rows = [
    row({ no: 'PP1', minQty: 1, price: 100 }),
    row({ no: 'PP2', minQty: 10, price: 90 }),
    row({ no: 'PP3', minQty: 50, price: 80 }),
    row({ no: 'PP4', minQty: 1, price: 70, effFrom: '2027-01-01' }),
    row({ no: 'PP5', item: 'IT-B', minQty: 5, price: 20 }),
    row({ no: 'PP6', minQty: 1, price: 60, effTo: '2026-01-31' }),
  ]
  it('picks the largest tier at or below the quantity', () => {
    const r = resolvePrice(rows, 'V1', 'IT-A', 49, TODAY)
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.price).toBe(90)
      expect(r.row.no).toBe('PP2')
      expect(r.next?.no).toBe('PP3')
    }
  })
  it('takes the top tier with no next tier', () => {
    const r = resolvePrice(rows, 'V1', 'IT-A', 500, TODAY)
    expect(r.status === 'ok' && r.price).toBe(80)
    expect(r.status === 'ok' && r.next).toBeNull()
  })
  it('ignores scheduled and expired rows', () => {
    expect(activePriceRows(rows, 'V1', 'IT-A', TODAY).map((r) => r.no)).toEqual(['PP1', 'PP2', 'PP3'])
    expect(activePriceRows(rows, 'V1', 'IT-A', '2026-01-15').map((r) => r.no)).toEqual(['PP1', 'PP6', 'PP2', 'PP3'])
  })
  it('reports below the minimum quantity', () => {
    const r = resolvePrice(rows, 'V1', 'IT-B', 2, TODAY)
    expect(r.status).toBe('belowMoq')
    if (r.status === 'belowMoq') expect(r.min).toBe(5)
  })
  it('reports no price for an unknown vendor, item or blank ids', () => {
    expect(resolvePrice(rows, 'V9', 'IT-A', 5, TODAY).status).toBe('noPrice')
    expect(resolvePrice(rows, '', 'IT-A', 5, TODAY).status).toBe('noPrice')
    expect(resolvePrice(rows, 'V1', '', 5, TODAY).status).toBe('noPrice')
  })
  it('a price of 0 is still a price', () => {
    const r = resolvePrice([row({ price: 0 })], 'V1', 'IT-A', 1, TODAY)
    expect(r.status === 'ok' && r.price).toBe(0)
  })
  it('vendorPricedItems lists items priced on the date', () => {
    expect([...vendorPricedItems(rows, 'V1', TODAY)].sort()).toEqual(['IT-A', 'IT-B'])
    expect([...vendorPricedItems([row({ effTo: '2026-01-31' })], 'V1', TODAY)]).toEqual([])
  })
  it('vendorPriceRows filters to one vendor and sorts by item, tier qty, and start date', () => {
    const mixed = [
      row({ no: 'PP-C', vendor: 'V1', item: 'IT-B', minQty: 1, effFrom: '2026-02-01' }),
      row({ no: 'PP-A2', vendor: 'V1', item: 'IT-A', minQty: 10, effFrom: '2026-01-01' }),
      row({ no: 'PP-OTHER', vendor: 'V2', item: 'IT-A', minQty: 1 }),
      row({ no: 'PP-A1-NEW', vendor: 'V1', item: 'IT-A', minQty: 1, effFrom: '2026-06-01' }),
      row({ no: 'PP-A1-OLD', vendor: 'V1', item: 'IT-A', minQty: 1, effFrom: '2026-01-01' }),
    ]
    expect(vendorPriceRows(mixed, 'V1').map((r) => r.no)).toEqual(['PP-A1-OLD', 'PP-A1-NEW', 'PP-A2', 'PP-C'])
  })
})

describe('numbering and blanks', () => {
  it('takes the next PP number', () => {
    expect(purchasePriceNextNo([])).toBe('PP00001')
    expect(purchasePriceNextNo([row({ no: 'PP00014' }), row({ no: 'PP00003' })])).toBe('PP00015')
  })
  it('blank price starts today with qty 1 and no price', () => {
    const b = blankPrice([row()], TODAY)
    expect(b).toMatchObject({ no: 'PP00002', vendor: '', item: '', minQty: 1, price: '', effFrom: TODAY, effTo: '', currency: 'INR' })
  })
  it('duplicate clears vendor, code and note', () => {
    const d = duplicatePrice({ ...row({ vendorItemNo: 'X1', note: 'q' }), _replaces: 'PP9' }, [row()])
    expect(d).toMatchObject({ no: 'PP00002', vendor: '', vendorItemNo: '', note: '', item: 'IT-A', price: 100 })
    expect(d._replaces).toBeUndefined()
  })
  it('picking an item fills a blank lead time only', () => {
    const lead = (n: string) => (n === 'IT-A' ? 12 : null)
    expect(priceOnChange({ ...blankPrice([], TODAY), item: 'IT-A' }, 'item', lead).leadDays).toBe(12)
    expect(priceOnChange({ ...blankPrice([], TODAY), item: 'IT-A', leadDays: 3 }, 'item', lead).leadDays).toBe(3)
    expect(priceOnChange({ ...blankPrice([], TODAY), item: 'IT-B' }, 'item', lead).leadDays).toBeNull()
    expect(priceOnChange({ ...blankPrice([], TODAY), item: 'IT-A' }, 'price', lead).leadDays).toBeNull()
  })
})

describe('normalizePrice', () => {
  it('converts numeric text and trims', () => {
    const n = normalizePrice({ ...row(), minQty: '10', price: '12.5', leadDays: '4', vendorItemNo: '  AB ', note: ' hi ' })
    expect(n).toMatchObject({ minQty: 10, price: 12.5, leadDays: 4, vendorItemNo: 'AB', note: 'hi' })
  })
  it('keeps blanks blank (qty becomes NaN to fail validation)', () => {
    const n = normalizePrice({ ...row(), minQty: '', price: '', leadDays: '' })
    expect(Number.isNaN(n.minQty)).toBe(true)
    expect(n.price).toBe('')
    expect(n.leadDays).toBeNull()
  })
})

describe('validatePrice', () => {
  const ok = (o: Partial<PriceRow> = {}) => normalizePrice({ ...row({ no: 'PP00009', effFrom: '2026-06-01' }), ...o })
  it('accepts a valid row', () => {
    expect(validatePrice(ok({ vendor: 'V2' }), [row()], refs, fmt)).toEqual({})
  })
  it('requires vendor, item, qty and price', () => {
    const e = validatePrice(ok({ vendor: '', item: '', minQty: '', price: '' }), [], refs, fmt)
    expect(e).toEqual({
      vendor: 'Pick a vendor.',
      item: 'Pick an item.',
      minQty: 'Use a whole number, 1 or more.',
      price: 'Enter a price of 0 or more.',
    })
  })
  it('rejects deleted vendors or items', () => {
    const e = validatePrice(ok({ vendor: 'V9', item: 'ZZ' }), [], refs, fmt)
    expect(e.vendor).toBe('This vendor no longer exists.')
    expect(e.item).toBe('This item no longer exists.')
  })
  it('rejects fractional or zero qty, negative price, bad lead time', () => {
    expect(validatePrice(ok({ minQty: 2.5 }), [], refs, fmt).minQty).toBeDefined()
    expect(validatePrice(ok({ minQty: 0 }), [], refs, fmt).minQty).toBeDefined()
    expect(validatePrice(ok({ price: -1 }), [], refs, fmt).price).toBeDefined()
    expect(validatePrice(ok({ price: 0 }), [], refs, fmt).price).toBeUndefined()
    expect(validatePrice(ok({ leadDays: 1.5 }), [], refs, fmt).leadDays).toBe('Whole days, 0 or more.')
    expect(validatePrice(ok({ leadDays: -2 }), [], refs, fmt).leadDays).toBeDefined()
    expect(validatePrice(ok({ leadDays: null }), [], refs, fmt).leadDays).toBeUndefined()
  })
  it('rejects an end before the start', () => {
    expect(validatePrice(ok({ effFrom: '2026-06-02', effTo: '2026-06-01' }), [], refs, fmt).effTo).toBe('Ends before it starts.')
  })
  it('rejects an overlapping row for the same vendor, item and qty', () => {
    const e = validatePrice(ok(), [row({ no: 'PP00001' })], refs, fmt)
    expect(e.minQty).toContain('Overlaps PP00001')
  })
  it('allows the same vendor and item at another qty, vendor or non-overlapping dates', () => {
    expect(validatePrice(ok({ minQty: 10 }), [row()], refs, fmt)).toEqual({})
    expect(validatePrice(ok({ vendor: 'V2' }), [row()], refs, fmt)).toEqual({})
    expect(validatePrice(ok({ effFrom: '2026-06-01' }), [row({ effTo: '2026-05-31' })], refs, fmt)).toEqual({})
  })
  it('change price: must start after the old row started, and may overlap the old row it ends', () => {
    const old = row({ no: 'PP00001', effFrom: '2026-01-01' })
    const change = ok({ _replaces: 'PP00001', effFrom: '2026-11-17' })
    expect(validatePrice(change, [old], refs, fmt)).toEqual({})
    const early = validatePrice(ok({ _replaces: 'PP00001', effFrom: '2026-01-01' }), [old], refs, fmt)
    expect(early.effFrom).toBe('Start after <2026-01-01>, when the current price began.')
    const blank = validatePrice(ok({ _replaces: 'PP00001', effFrom: '' }), [old], refs, fmt)
    expect(blank.effFrom).toBeDefined()
  })
})

describe('change price, tiers, saving', () => {
  const rows = [row({ no: 'PP00001', effFrom: '2026-01-01' }), row({ no: 'PP00002', minQty: 10, effFrom: '2026-01-01' })]
  it('starts a change today, replacing the row', () => {
    const r = startPriceChange(rows[0], rows, TODAY, fmt)
    expect(r.kind).toBe('draft')
    if (r.kind === 'draft') {
      expect(r.draft).toMatchObject({ no: 'PP00003', price: '', effFrom: TODAY, effTo: '', _replaces: 'PP00001', vendor: 'V1', item: 'IT-A' })
    }
  })
  it('refuses to change an ended price', () => {
    expect(startPriceChange(row({ effTo: '2026-11-16' }), rows, TODAY, fmt).kind).toBe('ended')
    // ends today is still in force
    expect(startPriceChange(row({ effTo: TODAY }), rows, TODAY, fmt).kind).toBe('draft')
  })
  it('sends a not-yet-started price to direct editing', () => {
    const r = startPriceChange(row({ effFrom: '2026-12-01' }), rows, TODAY, fmt)
    expect(r.kind).toBe('scheduled')
    if (r.kind === 'scheduled') expect(r.reason).toContain('<2026-12-01>')
    expect(startPriceChange(row({ effFrom: TODAY }), rows, TODAY, fmt).kind).toBe('scheduled')
  })
  it('adds a tier: 10 first, then double the highest', () => {
    expect(startPriceTier(rows[0], [rows[0]]).minQty).toBe(10)
    expect(startPriceTier(rows[0], rows).minQty).toBe(20)
    expect(startPriceTier(rows[0], [...rows, row({ no: 'PP00003', minQty: 20 })]).minQty).toBe(40)
    expect(startPriceTier(rows[0], rows).price).toBe('')
  })
  it('a price for an item takes its vendor and lead time', () => {
    expect(startPriceForItem({ no: 'IT-B', lead: 9 }, 'V2', rows, TODAY)).toMatchObject({ item: 'IT-B', vendor: 'V2', leadDays: 9, effFrom: TODAY })
    expect(startPriceForItem({ no: 'IT-B', lead: undefined }, '', rows, TODAY)).toMatchObject({ vendor: '', leadDays: null })
  })
  it('saving a change ends the old row the day before', () => {
    const r = startPriceChange(rows[0], rows, TODAY, fmt)
    if (r.kind !== 'draft') throw new Error('expected draft')
    const draft = normalizePrice({ ...r.draft, price: '120' })
    const { saved, ended } = pricesToSave(draft, rows, '2026-11-17T10:00:00.000Z')
    expect(saved.price).toBe(120)
    expect('_replaces' in saved).toBe(false)
    expect(ended).toMatchObject({ no: 'PP00001', effTo: '2026-11-16', updatedAt: '2026-11-17T10:00:00.000Z' })
  })
  it('a plain save ends nothing', () => {
    expect(pricesToSave(normalizePrice({ ...blankPrice(rows, TODAY), vendor: 'V1', item: 'IT-B', price: 5 }), rows, 'now').ended).toBeNull()
  })
  it('toPurchasePrice yields numbers and null lead time', () => {
    const p = toPurchasePrice({ ...blankPrice(rows, TODAY), vendor: 'V1', item: 'IT-A', price: '4', minQty: '2', leadDays: '' })
    expect(p).toMatchObject({ price: 4, minQty: 2, leadDays: null })
  })
})

describe('unpricedItems', () => {
  const items = [{ no: 'A' }, { no: 'B' }, { no: 'C' }, { no: 'D' }]
  const prices = [
    row({ item: 'A' }),
    row({ no: 'PP2', item: 'B', effTo: '2026-01-31' }), // expired → still unpriced
    row({ no: 'PP3', item: 'C', effFrom: '2027-01-01' }), // scheduled → counts as priced
  ]
  it('skips manufactured items and items with a current or scheduled price', () => {
    expect(unpricedItems(items, prices, (n) => n === 'D', TODAY).map((i) => i.no)).toEqual(['B'])
    expect(unpricedItems(items, prices, () => false, TODAY).map((i) => i.no)).toEqual(['B', 'D'])
  })
})

describe('commitPriceCell (inline edit)', () => {
  const rows = [row({ no: 'PP00001' }), row({ no: 'PP00002', minQty: 10, price: 90 })]
  const commit = (key: Parameters<typeof commitPriceCell>[1], value: string, target = rows[0]) =>
    commitPriceCell(target, key, value, rows.filter((r) => r.no !== target.no), refs, 'NOW', fmt)

  it('saves a valid price and stamps updatedAt', () => {
    const r = commit('price', '105.5')
    expect(r.kind).toBe('saved')
    if (r.kind === 'saved') expect(r.row).toMatchObject({ price: 105.5, updatedAt: 'NOW', no: 'PP00001' })
  })
  it('does nothing when the value is unchanged', () => {
    expect(commit('price', '100').kind).toBe('unchanged')
    expect(commit('leadDays', '7').kind).toBe('unchanged')
    expect(commit('effTo', '').kind).toBe('unchanged')
  })
  it('refuses invalid values with the field message', () => {
    expect(commit('price', '')).toEqual({ kind: 'error', message: 'Enter a price of 0 or more.' })
    expect(commit('price', '-3')).toEqual({ kind: 'error', message: 'Enter a price of 0 or more.' })
    expect(commit('minQty', '1.5')).toEqual({ kind: 'error', message: 'Use a whole number, 1 or more.' })
    expect(commit('effTo', '2025-12-31')).toEqual({ kind: 'error', message: 'Ends before it starts.' })
  })
  it('refuses an edit that makes it overlap another tier row', () => {
    const r = commit('minQty', '10')
    expect(r.kind === 'error' && r.message).toContain('Overlaps PP00002')
  })
  it('clearing an optional cell saves it blank', () => {
    const r = commit('leadDays', '')
    expect(r.kind === 'saved' && r.row.leadDays).toBeNull()
    const s = commit('effTo', '2026-12-31')
    expect(s.kind === 'saved' && s.row.effTo).toBe('2026-12-31')
  })
})
