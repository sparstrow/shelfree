/**
 * Vendor price list rules. A vendor + item can have several rows: quantity
 * tiers (minQty) and date ranges. See docs/purchase-prices/README.md and
 * docs/superpowers/specs/2026-10-17-purchase-prices.md.
 *
 * A price "change" never edits history — it ends the old row the day before
 * the new one starts. The server must enforce every rule here.
 */
import type { PurchasePrice } from '@/data/schemas'
import { nextNo } from './numbering'

const isActiveOn = (row: PurchasePrice, date: string) =>
  (!row.effFrom || row.effFrom <= date) && (!row.effTo || row.effTo >= date)

/** Price rows for a vendor + item that are active on a date, lowest tier first. */
export function activePriceRows(
  prices: readonly PurchasePrice[],
  vendor: string,
  item: string,
  date: string,
): PurchasePrice[] {
  return prices
    .filter((r) => r.vendor === vendor && r.item === item && r.price != null && isActiveOn(r, date))
    .sort((a, b) => (Number(a.minQty) || 1) - (Number(b.minQty) || 1))
}

export type PriceResolution =
  | { status: 'noPrice'; tiers: PurchasePrice[]; min: number }
  | { status: 'belowMoq'; tiers: PurchasePrice[]; min: number; next: PurchasePrice }
  | { status: 'ok'; tiers: PurchasePrice[]; min: number; row: PurchasePrice; price: number; next: PurchasePrice | null }

/**
 * The price a vendor charges for a quantity on a date: the tier with the
 * largest minQty that is ≤ qty. No active rows → `noPrice`; every tier above
 * the quantity → `belowMoq` (min = the lowest tier's minQty).
 */
export function resolvePrice(
  prices: readonly PurchasePrice[],
  vendor: string,
  item: string,
  qty: number,
  date: string,
): PriceResolution {
  const tiers = vendor && item ? activePriceRows(prices, vendor, item, date) : []
  if (!tiers.length) return { status: 'noPrice', tiers, min: 1 }
  const q = Number(qty) || 0
  const min = Number(tiers[0].minQty) || 1
  let row: PurchasePrice | null = null
  for (const tier of tiers) if ((Number(tier.minQty) || 1) <= q) row = tier
  if (!row) return { status: 'belowMoq', tiers, min, next: tiers[0] }
  return {
    status: 'ok',
    tiers,
    min,
    row,
    price: Number(row.price) || 0,
    next: tiers.find((t) => (Number(t.minQty) || 1) > q) ?? null,
  }
}

/** Items a vendor has at least one active price for on a date. */
export function vendorPricedItems(prices: readonly PurchasePrice[], vendor: string, date: string): Set<string> {
  return new Set(prices.filter((r) => r.vendor === vendor && r.price != null && isActiveOn(r, date)).map((r) => r.item))
}

export function purchasePriceNextNo(prices: readonly Pick<PurchasePrice, 'no'>[]): string {
  return nextNo(
    'PP',
    prices.map((p) => p.no),
  )
}

// ── Price list page: status, editing, change price, tiers ────────────────────

export type PriceStatus = 'Active' | 'Expiring' | 'Scheduled' | 'Expired'

/** A price row that ends within this many days is "Expiring" (prototype setting `ppExpiringDays`). */
export const PRICE_EXPIRING_DAYS = 30

/** `YYYY-MM-DD` plus `n` days (calendar arithmetic, no time zone). */
export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d + n)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Scheduled (starts after today) · Expired (ended) · Expiring (ends within the window) · Active. */
export function priceStatus(
  row: Pick<PurchasePrice, 'effFrom' | 'effTo'>,
  today: string,
  windowDays = PRICE_EXPIRING_DAYS,
): PriceStatus {
  if (row.effFrom && row.effFrom > today) return 'Scheduled'
  if (row.effTo && row.effTo < today) return 'Expired'
  if (row.effTo && row.effTo <= addDays(today, windowDays)) return 'Expiring'
  return 'Active'
}

/** Percent the price is above (+) or below (−) the item's standard cost, 1 dp; null when it can't be compared. */
export function priceVsCost(price: number | string, itemCost: number): number | null {
  if (!(itemCost > 0) || price === '' || Number.isNaN(Number(price))) return null
  return Math.round(((Number(price) - itemCost) / itemCost) * 1000) / 10
}

export function priceVsCostText(price: number | string, itemCost: number): string {
  const v = priceVsCost(price, itemCost)
  if (v === null) return '—'
  if (v === 0) return 'Same'
  return (v > 0 ? '+' : '−') + Math.abs(v) + '%'
}

/** Two rows cover a common day (empty from = always, empty to = open-ended). */
export function datesOverlap(
  a: Pick<PurchasePrice, 'effFrom' | 'effTo'>,
  b: Pick<PurchasePrice, 'effFrom' | 'effTo'>,
): boolean {
  return (a.effFrom || '0000') <= (b.effTo || '9999') && (b.effFrom || '0000') <= (a.effTo || '9999')
}

/**
 * A price row while it is being edited: numbers may still be text or blank.
 * `_replaces` marks "Change price" — the row (by no.) this one supersedes.
 */
export type PriceRow = Omit<PurchasePrice, 'minQty' | 'price' | 'leadDays'> & {
  minQty: number | string
  price: number | string
  leadDays: number | string | null
  _replaces?: string
}

export function blankPrice(rows: readonly Pick<PurchasePrice, 'no'>[], today: string): PriceRow {
  return {
    no: purchasePriceNextNo(rows),
    vendor: '',
    item: '',
    vendorItemNo: '',
    minQty: 1,
    price: '',
    currency: 'INR',
    leadDays: null,
    effFrom: today,
    effTo: '',
    note: '',
    createdAt: '',
    updatedAt: '',
  }
}

/** Copy for "another vendor": new number, vendor and code cleared. */
export function duplicatePrice(row: PriceRow, rows: readonly Pick<PurchasePrice, 'no'>[]): PriceRow {
  return {
    ...row,
    no: purchasePriceNextNo(rows),
    vendor: '',
    vendorItemNo: '',
    note: '',
    createdAt: '',
    updatedAt: '',
    _replaces: undefined,
  }
}

export interface PriceRefs {
  vendors: ReadonlySet<string>
  items: ReadonlySet<string>
}

/** Picking an item fills a blank lead time from the item's own. */
export function priceOnChange(draft: PriceRow, key: string, itemLead: (itemNo: string) => number | null): PriceRow {
  if (key !== 'item' || (draft.leadDays !== '' && draft.leadDays != null)) return draft
  const lead = itemLead(draft.item)
  return lead == null ? draft : { ...draft, leadDays: lead }
}

/** Trim text, turn numeric text into numbers (blank from-qty → NaN so validation rejects it). */
export function normalizePrice(d: PriceRow): PriceRow {
  const blank = (v: unknown) => v === '' || v == null
  return {
    ...d,
    vendorItemNo: String(d.vendorItemNo ?? '').trim(),
    note: String(d.note ?? '').trim(),
    currency: 'INR',
    minQty: blank(d.minQty) ? Number.NaN : Number(d.minQty),
    price: blank(d.price) ? '' : Number(d.price),
    leadDays: blank(d.leadDays) ? null : Number(d.leadDays),
    effFrom: d.effFrom || '',
    effTo: d.effTo || '',
  }
}

/** Field errors by key (empty = valid). `others` = every row except the one being saved. */
export function validatePrice(
  d: PriceRow,
  others: readonly PurchasePrice[],
  refs: PriceRefs,
  fmt: (iso: string) => string,
): Record<string, string> {
  const errors: Record<string, string> = {}
  const minQty = Number(d.minQty)
  const price = d.price === '' ? Number.NaN : Number(d.price)
  const lead = d.leadDays == null || d.leadDays === '' ? null : Number(d.leadDays)
  if (!d.vendor) errors.vendor = 'Pick a vendor.'
  else if (!refs.vendors.has(d.vendor)) errors.vendor = 'This vendor no longer exists.'
  if (!d.item) errors.item = 'Pick an item.'
  else if (!refs.items.has(d.item)) errors.item = 'This item no longer exists.'
  if (!(Number.isInteger(minQty) && minQty >= 1)) errors.minQty = 'Use a whole number, 1 or more.'
  if (!(price >= 0)) errors.price = 'Enter a price of 0 or more.'
  if (lead !== null && !(Number.isInteger(lead) && lead >= 0)) errors.leadDays = 'Whole days, 0 or more.'
  if (d.effFrom && d.effTo && d.effTo < d.effFrom) errors.effTo = 'Ends before it starts.'

  let rest = others
  if (d._replaces) {
    const old = others.find((x) => x.no === d._replaces)
    if (old) {
      if (!d.effFrom || (old.effFrom && d.effFrom <= old.effFrom)) {
        errors.effFrom = `Start after ${fmt(old.effFrom)}, when the current price began.`
      } else {
        const ends = addDays(d.effFrom, -1)
        rest = others.map((x) => (x.no === old.no ? { ...x, effTo: ends } : x))
      }
    }
  }
  if (!errors.vendor && !errors.item && !errors.minQty && !errors.effFrom && !errors.effTo) {
    const probe = { effFrom: d.effFrom, effTo: d.effTo }
    const hit = rest.find(
      (o) => o.vendor === d.vendor && o.item === d.item && Number(o.minQty) === minQty && datesOverlap(o, probe),
    )
    if (hit) {
      errors.minQty = `Overlaps ${hit.no} (same vendor, item and qty on these dates). End that row first, or use Change price.`
    }
  }
  return errors
}

/** The stored row for a validated draft (numbers, no editing marker). */
export function toPurchasePrice(d: PriceRow): PurchasePrice {
  const { _replaces: _drop, ...rest } = d
  return {
    ...rest,
    minQty: Number(d.minQty),
    price: Number(d.price),
    leadDays: d.leadDays == null || d.leadDays === '' ? null : Number(d.leadDays),
  }
}

/**
 * Rows to write when a draft is saved: the new row, plus — for "Change price" —
 * the superseded row ended the day before this one starts.
 */
export function pricesToSave(
  draft: PriceRow,
  rows: readonly PurchasePrice[],
  now: string,
): { saved: PurchasePrice; ended: PurchasePrice | null } {
  const saved = toPurchasePrice(draft)
  const old = draft._replaces ? rows.find((r) => r.no === draft._replaces) : undefined
  return { saved, ended: old ? { ...old, effTo: addDays(saved.effFrom, -1), updatedAt: now } : null }
}

export type ChangePriceStart =
  | { kind: 'draft'; draft: PriceRow }
  | { kind: 'ended'; title: string; reason: string }
  | { kind: 'scheduled'; title: string; reason: string }

/**
 * "Change price": a new row starting today that replaces `row`. Not for rows
 * that already ended (add a new row) or have not started (edit them directly).
 */
export function startPriceChange(
  row: PurchasePrice,
  rows: readonly PurchasePrice[],
  today: string,
  fmt: (iso: string) => string,
): ChangePriceStart {
  if (row.effTo && row.effTo < today) {
    return { kind: 'ended', title: 'This price has already ended', reason: 'Add a new row with N, or duplicate it.' }
  }
  if (row.effFrom && row.effFrom >= today) {
    return { kind: 'scheduled', title: 'Not in force yet', reason: `It starts ${fmt(row.effFrom)} — edit it directly.` }
  }
  return {
    kind: 'draft',
    draft: {
      ...row,
      no: purchasePriceNextNo(rows),
      price: '',
      effFrom: today,
      effTo: '',
      note: '',
      createdAt: '',
      updatedAt: '',
      _replaces: row.no,
    },
  }
}

/** "Add quantity tier": same vendor + item, a higher from-quantity (10, then doubling). */
export function startPriceTier(row: PurchasePrice, rows: readonly PurchasePrice[]): PriceRow {
  const maxQ = Math.max(
    1,
    ...rows.filter((x) => x.vendor === row.vendor && x.item === row.item).map((x) => Number(x.minQty) || 1),
  )
  return {
    ...row,
    no: purchasePriceNextNo(rows),
    minQty: maxQ < 10 ? 10 : maxQ * 2,
    price: '',
    note: '',
    createdAt: '',
    updatedAt: '',
    _replaces: undefined,
  }
}

/** A blank price for an item, with its preferred vendor and lead time filled in. */
export function startPriceForItem(
  item: { no: string; lead: number | null | undefined },
  vendorNo: string,
  rows: readonly Pick<PurchasePrice, 'no'>[],
  today: string,
): PriceRow {
  return { ...blankPrice(rows, today), item: item.no, vendor: vendorNo, leadDays: item.lead ?? null }
}

/**
 * Purchasable items without a vendor price: not made in-house (no active BOM)
 * and with no price row that is current or scheduled.
 */
export function unpricedItems<T extends { no: string }>(
  items: readonly T[],
  prices: readonly PurchasePrice[],
  hasActiveBom: (itemNo: string) => boolean,
  today: string,
): T[] {
  const priced = new Set(prices.filter((r) => !(r.effTo && r.effTo < today)).map((r) => r.item))
  return items.filter((i) => !hasActiveBom(i.no) && !priced.has(i.no))
}

export const PRICE_EDITABLE_KEYS = ['vendorItemNo', 'minQty', 'price', 'leadDays', 'effFrom', 'effTo', 'note'] as const
export type PriceEditableKey = (typeof PRICE_EDITABLE_KEYS)[number]

/** Result of an in-grid edit of one cell. */
export type CellCommit =
  | { kind: 'saved'; row: PurchasePrice }
  | { kind: 'error'; message: string }
  | { kind: 'unchanged' }

/** Apply a typed value to one cell, with the same validation as the drawer. */
export function commitPriceCell(
  row: PurchasePrice,
  key: PriceEditableKey,
  value: string,
  others: readonly PurchasePrice[],
  refs: PriceRefs,
  now: string,
  fmt: (iso: string) => string,
): CellCommit {
  if (String(row[key] ?? '') === value) return { kind: 'unchanged' }
  const draft = normalizePrice({ ...row, [key]: value })
  const errors = validatePrice(draft, others, refs, fmt)
  const message = errors[key] ?? Object.values(errors)[0]
  if (message) return { kind: 'error', message }
  return { kind: 'saved', row: { ...toPurchasePrice(draft), updatedAt: now } }
}
