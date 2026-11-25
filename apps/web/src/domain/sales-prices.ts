/**
 * Sales pricing domain rules: list prices, customer-specific price overrides,
 * eligibility modes, quantity-break tiers, effective-date windows, and
 * sales-line price resolution. Pure functions only — mirrors `sp*` and `cp*`
 * in the prototype. See docs/sales-pricing/README.md.
 */
import type { Customer, CustomerPrice, Item } from '@/data/schemas'
import { int } from '@/lib/format'
import { itemCategoryParent } from './item'
import { nextNo } from './numbering'
import { datesOverlap } from './purchase-prices'
import type { Tone } from './status'

export const CUSTOMER_PRICING_MODES = ['off', 'all', 'selected', 'newOnly'] as const
export type CustomerPricingMode = (typeof CUSTOMER_PRICING_MODES)[number]

export interface SalesPricingSettings {
  enabled: boolean
  mode: CustomerPricingMode
  newCutoff: string
  fallbackToList: boolean
  blockUnpriced: boolean
}

/**
 * Default workspace pricing configuration until Settings ▸ Configuration ▸ Sales pricing
 * is ported. Per CLAUDE.md (tiers parked for POC), customer pricing is enabled with
 * `selected` mode matching `seedCustomers().pricingEligible`.
 */
export const DEFAULT_SALES_PRICING_SETTINGS: SalesPricingSettings = {
  enabled: true,
  mode: 'selected',
  newCutoff: '',
  fallbackToList: false,
  blockUnpriced: false,
}

const MODE_LABELS: Record<CustomerPricingMode, string> = {
  off: 'No one',
  all: 'Every customer',
  selected: 'Selected customers',
  newOnly: 'New customers only',
}

export function pricingModeLabel(mode: CustomerPricingMode): string {
  return MODE_LABELS[mode]
}

export function pricingModeNote(settings: SalesPricingSettings, fmtDate: (iso: string) => string): string {
  if (!settings.enabled || settings.mode === 'off') {
    return 'Eligibility is set to “no one”, so every customer is billed the list price. Rows stay on file until you switch the rule on.'
  }
  if (settings.mode === 'all') return 'Every customer may have their own agreed price.'
  if (settings.mode === 'selected') return 'Only hand-picked customers are on customer pricing.'
  return `Only accounts opened on or after ${settings.newCutoff ? fmtDate(settings.newCutoff) : 'the switch'} are on customer pricing.`
}

export function pricingFallbackNote(settings: SalesPricingSettings, label = 'Customer price'): string {
  const lower = label.toLowerCase()
  if (settings.blockUnpriced) return `An item with no ${lower} is blocked on the sales line.`
  if (settings.fallbackToList) return `An item with no ${lower} falls back to the list price.`
  return `An item with no ${lower} comes through unpriced — the seller types a price and the line is marked Manual.`
}

/** Whether a customer is eligible for customer-specific pricing under the active rule. */
export function isCustomerPricingEligible(
  customer: Pick<Customer, 'pricingEligible' | 'createdAt'> | null | undefined,
  settings: SalesPricingSettings = DEFAULT_SALES_PRICING_SETTINGS,
): boolean {
  if (!customer || !settings.enabled) return false
  if (settings.mode === 'all') return true
  if (settings.mode === 'selected') return !!customer.pricingEligible
  if (settings.mode === 'newOnly') {
    return !!settings.newCutoff && String(customer.createdAt ?? '') >= settings.newCutoff
  }
  return false
}

export function eligibleCustomers<T extends Pick<Customer, 'pricingEligible' | 'createdAt'>>(
  customers: readonly T[],
  settings: SalesPricingSettings = DEFAULT_SALES_PRICING_SETTINGS,
): T[] {
  return customers.filter((c) => isCustomerPricingEligible(c, settings))
}

/** Filter out orphan price rows whose customer or item no longer exists in masters (`cpAll`). */
export function validCustomerPrices(
  prices: readonly CustomerPrice[],
  customers: readonly Pick<Customer, 'no'>[],
  items: readonly Pick<Item, 'no'>[],
): CustomerPrice[] {
  if (!items.length) return [...prices]
  const itemSet = new Set(items.map((i) => i.no))
  const custSet = customers.length ? new Set(customers.map((c) => c.no)) : null
  return prices.filter((r) => itemSet.has(r.item) && (!custSet || custSet.has(r.customer)))
}

/** Whether a price row's effective date range includes `date` (`YYYY-MM-DD`). */
export function isCustomerPriceActiveOn(row: Pick<CustomerPrice, 'effFrom' | 'effTo'>, date: string): boolean {
  return (!row.effFrom || row.effFrom <= date) && (!row.effTo || row.effTo >= date)
}

export type CustomerPriceStatus = 'Active' | 'Scheduled' | 'Expired'

/** Scheduled (starts after today) · Expired (ended before today) · Active. */
export function customerPriceStatus(
  row: Pick<CustomerPrice, 'effFrom' | 'effTo'>,
  today: string,
): CustomerPriceStatus {
  if (row.effFrom && row.effFrom > today) return 'Scheduled'
  if (row.effTo && row.effTo < today) return 'Expired'
  return 'Active'
}

export type CustomerPriceType = 'list' | 'customer' | 'break' | 'manual' | 'blocked' | 'none'

export const CUSTOMER_PRICE_TYPE_META: Record<CustomerPriceType, { label: string; tone: Tone }> = {
  list: { label: 'List', tone: 'neutral' },
  customer: { label: 'Customer', tone: 'ok' },
  break: { label: 'Quantity break', tone: 'info' },
  manual: { label: 'Manual', tone: 'warn' },
  blocked: { label: 'Blocked', tone: 'bad' },
  none: { label: '—', tone: 'neutral' },
}

export interface ResolvedCustomerPrice {
  price: number | null
  type: CustomerPriceType
  label: string
  tone: Tone
  listPrice: number
  row?: CustomerPrice
  why: string
}

export interface ResolveCustomerPriceInput {
  customer: Pick<Customer, 'no' | 'pricingEligible' | 'createdAt'> | null | undefined
  item: Pick<Item, 'no' | 'price' | 'uom'> | null | undefined
  prices: readonly CustomerPrice[]
  qty: number
  date: string
  settings?: SalesPricingSettings
  label?: string
}

/**
 * Single pricing resolution function (`cpResolve`):
 * 1. Unknown item → `none`.
 * 2. Ineligible customer → list price (`List`).
 * 3. Eligible customer → highest `minQty ≤ qty` active on `date` (`Quantity break` or `Customer`).
 * 4. No matching row → `Blocked` if `blockUnpriced`, else list price (`List`) if `fallbackToList`, else unpriced (`Manual`).
 */
export function resolveCustomerPrice({
  customer,
  item,
  prices,
  qty,
  date,
  settings = DEFAULT_SALES_PRICING_SETTINGS,
  label = 'Customer price',
}: ResolveCustomerPriceInput): ResolvedCustomerPrice {
  if (!item) {
    return {
      price: null,
      type: 'none',
      label: CUSTOMER_PRICE_TYPE_META.none.label,
      tone: CUSTOMER_PRICE_TYPE_META.none.tone,
      listPrice: 0,
      why: 'Unknown item.',
    }
  }
  const listPrice = Number(item.price) || 0
  if (!customer || !isCustomerPricingEligible(customer, settings)) {
    return {
      price: listPrice,
      type: 'list',
      label: CUSTOMER_PRICE_TYPE_META.list.label,
      tone: CUSTOMER_PRICE_TYPE_META.list.tone,
      listPrice,
      why: settings.enabled
        ? 'This customer is not on customer-specific pricing, so the list price applies.'
        : 'Every customer pays the list price.',
    }
  }

  const q = Math.max(1, Number(qty) || 1)
  const matching = prices
    .filter(
      (r) =>
        r.customer === customer.no &&
        r.item === item.no &&
        isCustomerPriceActiveOn(r, date) &&
        (Number(r.minQty) || 1) <= q,
    )
    .sort((a, b) => (Number(b.minQty) || 1) - (Number(a.minQty) || 1))

  if (matching.length > 0) {
    const row = matching[0]
    const isBreak = (Number(row.minQty) || 1) > 1
    const type: CustomerPriceType = isBreak ? 'break' : 'customer'
    return {
      price: Number(row.price),
      type,
      label: CUSTOMER_PRICE_TYPE_META[type].label,
      tone: CUSTOMER_PRICE_TYPE_META[type].tone,
      listPrice,
      row,
      why: isBreak
        ? `Bulk tier from ${int(row.minQty)} ${item.uom || 'units'} up.`
        : 'Agreed price for this customer.',
    }
  }

  const lower = label.toLowerCase()
  if (settings.blockUnpriced) {
    return {
      price: null,
      type: 'blocked',
      label: CUSTOMER_PRICE_TYPE_META.blocked.label,
      tone: CUSTOMER_PRICE_TYPE_META.blocked.tone,
      listPrice,
      why: `No ${lower} on file, and this workspace blocks unpriced items.`,
    }
  }
  if (settings.fallbackToList) {
    return {
      price: listPrice,
      type: 'list',
      label: CUSTOMER_PRICE_TYPE_META.list.label,
      tone: CUSTOMER_PRICE_TYPE_META.list.tone,
      listPrice,
      why: `No ${lower} on file — falling back to the list price.`,
    }
  }
  return {
    price: null,
    type: 'manual',
    label: CUSTOMER_PRICE_TYPE_META.manual.label,
    tone: CUSTOMER_PRICE_TYPE_META.manual.tone,
    listPrice,
    why: `No ${lower} on file. Type the price on the line to sell.`,
  }
}

// ── List prices set (`spRows`) ───────────────────────────────────────────────

export type ListPriceStatus = 'Priced' | 'No price' | 'Below cost'

export interface ListPriceRow {
  no: string
  desc: string
  category: string
  uom: string
  cost: number
  price: number
  margin: number | null
  markup: number | null
  custCount: number
  priceState: ListPriceStatus
}

/** Build the List prices grid dataset rows from live items + valid customer prices. */
export function buildListPriceRows(
  items: readonly Item[],
  customerPrices: readonly CustomerPrice[],
  customers: readonly Pick<Customer, 'no'>[] = [],
  /** Leaf → parent category names from Settings ▸ Item categories; omit for the built-in tree. */
  categoryParents?: Readonly<Record<string, string>>,
): ListPriceRow[] {
  const valid = validCustomerPrices(customerPrices, customers, items)
  const countByItem = new Map<string, number>()
  for (const r of valid) {
    countByItem.set(r.item, (countByItem.get(r.item) ?? 0) + 1)
  }

  return items.map((it) => {
    const price = Number(it.price) || 0
    const cost = Number(it.cost) || 0
    return {
      no: it.no,
      desc: it.desc,
      category: itemCategoryParent(it.category, categoryParents),
      uom: it.uom || '',
      cost,
      price,
      margin: price > 0 ? Math.round(((price - cost) / price) * 100) : null,
      markup: cost > 0 && price > 0 ? Math.round(((price - cost) / cost) * 100) : null,
      custCount: countByItem.get(it.no) ?? 0,
      priceState: price <= 0 ? 'No price' : price < cost ? 'Below cost' : 'Priced',
    }
  })
}

export type ListPriceCommit =
  | { kind: 'saved'; item: Item }
  | { kind: 'unchanged' }
  | { kind: 'error'; message: string }

/** Validate and apply an in-grid edit to an item's list price (`item.price`). */
export function commitListPrice(item: Item, value: string): ListPriceCommit {
  const trimmed = value.trim()
  if (trimmed === '') return { kind: 'error', message: 'Enter a price of 0 or more.' }
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { kind: 'error', message: 'Enter a price of 0 or more.' }
  }
  const rounded = Math.round(parsed * 100) / 100
  if (rounded === (Number(item.price) || 0)) return { kind: 'unchanged' }
  return { kind: 'saved', item: { ...item, price: rounded } }
}

// ── Customer price rows: numbering, tiers, editing, validation ───────────────

export function sellableItems<T extends Pick<Item, 'price'>>(items: readonly T[]): T[] {
  return items.filter((i) => (Number(i.price) || 0) > 0)
}

export function customerPriceNextNo(rows: readonly Pick<CustomerPrice, 'id'>[]): string {
  return nextNo(
    'CP',
    rows.map((r) => r.id),
  )
}

/** Percent difference vs the item's list price, 1 dp; null when list price is 0 or price is blank. */
export function priceDeltaVsList(price: number | string, listPrice: number): number | null {
  if (!(listPrice > 0) || price === '' || Number.isNaN(Number(price))) return null
  return Math.round(((Number(price) - listPrice) / listPrice) * 1000) / 10
}

export function priceDeltaVsListText(price: number | string, listPrice: number): string {
  const delta = priceDeltaVsList(price, listPrice)
  if (delta === null) return '—'
  if (delta === 0) return 'Same'
  return (delta > 0 ? '+' : '−') + Math.abs(delta) + '%'
}

export type CustomerPriceRow = Omit<CustomerPrice, 'minQty' | 'price'> & {
  minQty: number | string
  price: number | string
}

export function blankCustomerPrice(
  rows: readonly Pick<CustomerPrice, 'id'>[],
  today: string,
  defaults?: { customer?: string; item?: string },
): CustomerPriceRow {
  return {
    id: customerPriceNextNo(rows),
    customer: defaults?.customer ?? '',
    item: defaults?.item ?? '',
    price: '',
    minQty: 1,
    effFrom: today,
    effTo: '',
    uom: '',
    currency: 'INR',
    note: '',
  }
}

/** Next quantity tier for the same customer + item: 2× highest existing minQty, 95% of row price. */
export function startCustomerPriceTier(
  row: Pick<CustomerPrice, 'customer' | 'item' | 'effFrom' | 'effTo' | 'uom' | 'currency'> & {
    price: number | string
  },
  rows: readonly (Pick<CustomerPrice, 'id' | 'customer' | 'item'> & { minQty: number | string })[],
): CustomerPriceRow {
  const tiers = rows
    .filter((r) => r.customer === row.customer && r.item === row.item)
    .map((r) => Number(r.minQty) || 1)
  const minQty = Math.max(1, ...tiers) * 2
  const basePrice = Number(row.price) || 0
  return {
    id: customerPriceNextNo(rows),
    customer: row.customer,
    item: row.item,
    minQty,
    price: Math.round(basePrice * 0.95 * 100) / 100,
    effFrom: row.effFrom,
    effTo: row.effTo,
    uom: row.uom || '',
    currency: row.currency || 'INR',
    note: '',
  }
}

/** Trim text and coerce numeric inputs before validation/save (blank qty → NaN so validation rejects it). */
export function normalizeCustomerPrice(d: CustomerPriceRow): CustomerPriceRow {
  const blank = (v: unknown) => v === '' || v == null
  const parsedPrice = blank(d.price) ? '' : Number(d.price)
  return {
    ...d,
    note: String(d.note ?? '').trim(),
    currency: d.currency || 'INR',
    uom: d.uom || '',
    minQty: blank(d.minQty) ? Number.NaN : Number(d.minQty),
    price:
      parsedPrice === ''
        ? ''
        : Number.isFinite(parsedPrice)
          ? Math.round(parsedPrice * 100) / 100
          : Number.NaN,
    effFrom: d.effFrom || '',
    effTo: d.effTo || '',
  }
}

export interface CustomerPriceRefs {
  customers: ReadonlySet<string>
  items: ReadonlySet<string>
}

/** Field errors by key (empty = valid). `others` excludes the row being edited. */
export function validateCustomerPrice(
  d: CustomerPriceRow,
  others: readonly CustomerPrice[],
  refs: CustomerPriceRefs,
): Record<string, string> {
  const errors: Record<string, string> = {}
  const minQty = Number(d.minQty)
  const price = d.price === '' ? Number.NaN : Number(d.price)

  if (!d.customer) errors.customer = 'Pick a customer.'
  else if (!refs.customers.has(d.customer)) errors.customer = 'This customer no longer exists.'

  if (!d.item) errors.item = 'Pick an item.'
  else if (!refs.items.has(d.item)) errors.item = 'This item no longer exists.'

  if (!(Number.isInteger(minQty) && minQty >= 1)) errors.minQty = 'Use a whole number, 1 or more.'
  if (!(Number.isFinite(price) && price >= 0)) errors.price = 'Enter a price of 0 or more.'
  if (d.effFrom && d.effTo && d.effTo < d.effFrom) errors.effTo = 'Ends before it starts.'

  if (!errors.customer && !errors.item && !errors.minQty && !errors.effFrom && !errors.effTo) {
    const probe = { effFrom: d.effFrom, effTo: d.effTo }
    const hit = others.find(
      (o) =>
        o.customer === d.customer &&
        o.item === d.item &&
        (Number(o.minQty) || 1) === minQty &&
        datesOverlap(o, probe),
    )
    if (hit) {
      errors.minQty = `Overlaps ${hit.id} (same customer, item and qty on these dates).`
    }
  }
  return errors
}

export function toCustomerPrice(d: CustomerPriceRow): CustomerPrice {
  const price = Number(d.price)
  return {
    id: d.id,
    customer: d.customer,
    item: d.item,
    minQty: Number(d.minQty),
    price: Number.isFinite(price) ? Math.round(price * 100) / 100 : 0,
    effFrom: d.effFrom || '',
    effTo: d.effTo || '',
    uom: d.uom || '',
    currency: d.currency || 'INR',
    note: d.note || '',
  }
}

export const CUSTOMER_PRICE_EDITABLE_KEYS = ['minQty', 'price', 'effFrom', 'effTo', 'note'] as const
export type CustomerPriceEditableKey = (typeof CUSTOMER_PRICE_EDITABLE_KEYS)[number]

export type CustomerPriceCellCommit =
  | { kind: 'saved'; row: CustomerPrice }
  | { kind: 'error'; message: string }
  | { kind: 'unchanged' }

/** Apply an in-place edit to one customer-price cell using the drawer's validation rules. */
export function commitCustomerPriceCell(
  row: CustomerPrice,
  key: CustomerPriceEditableKey,
  value: string,
  others: readonly CustomerPrice[],
  refs: CustomerPriceRefs,
): CustomerPriceCellCommit {
  if (String(row[key] ?? '') === value) return { kind: 'unchanged' }
  const draft = normalizeCustomerPrice({ ...row, [key]: value })
  const errors = validateCustomerPrice(draft, others, refs)
  const message = errors[key] ?? Object.values(errors)[0]
  if (message) return { kind: 'error', message }
  const saved = toCustomerPrice(draft)
  if (saved[key] === row[key]) return { kind: 'unchanged' }
  return { kind: 'saved', row: saved }
}

// ── Settings ▸ Sales pricing ─────────────────────────────────────────────────

/**
 * Settings as saved from Sales pricing. Switching to "new customers only" stamps the
 * cut-off with today: accounts opened from then on are eligible, everyone already on the
 * books is not. Any other change leaves the cut-off as it was.
 */
export function applyPricingSettingsChange(
  prev: SalesPricingSettings,
  next: SalesPricingSettings,
  today: string,
): SalesPricingSettings {
  if (next.mode === 'newOnly' && prev.mode !== 'newOnly') return { ...next, newCutoff: today }
  return next
}

/** Why the "block the item" switch is not in use right now, or null. */
export function pricingBlockUnusedNote(settings: Pick<SalesPricingSettings, 'fallbackToList'>): string | null {
  return settings.fallbackToList ? 'Not used while the fallback above is on — there is always a price to fall back to.' : null
}
