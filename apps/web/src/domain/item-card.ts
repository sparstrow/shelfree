/**
 * Warehouse ▸ Item card domain rules (create / edit item master record).
 * Pure functions only; mirrors the prototype's item card logic.
 * Stock quantities (`locs`) are never edited here — receipts, assembly, and
 * transfers move stock.
 */
import type { Item, Vendor } from '@/data/schemas'
import { SYSTEM_UOMS } from '@/domain/item-profile'
import { int } from '@/lib/format'
import { itemCategoryParent, itemCategoryPathNames, itemMargin } from './item'

export type ItemCardMode = 'new' | 'edit'

export const ITEM_TYPES = ['Inventory', 'Non-inventory', 'Service'] as const
export const COSTING_METHODS = ['FIFO', 'LIFO', 'Average', 'Standard'] as const

const FALLBACK_CATEGORIES = [
  'Sambrani Holder',
  'Combo Pack',
  'Sambrani Cones',
  'Accessory',
  'Ceramic Component',
  'Raw Material',
  'Packaging',
] as const

const GROUP_ORDER: ReadonlyMap<string, number> = new Map([
  ['Finished Goods', 0],
  ['Consumables', 1],
  ['Components', 2],
])

export interface TrackingAxes {
  lot: boolean
  expiry: boolean
  serial: boolean
  barcode: boolean
}

export const ALL_TRACKING_AXES: TrackingAxes = {
  lot: true,
  expiry: true,
  serial: true,
  barcode: true,
}

export interface ItemCardDraft {
  no: string
  desc: string
  category: string
  type: string
  uom: string
  vendor: string
  costing: string
  price: string
  cost: string
  lead: string
  rp: string
  rq: string
  ss: string
  sellable: boolean
  blocked: boolean
  tracksLot: boolean
  tracksExpiry: boolean
  tracksSerial: boolean
  barcode: string
}

export interface SelectOption {
  value: string
  label: string
}

export interface CategoryOptionGroup {
  group: string | null
  categories: string[]
}

function numToStr(value: number | null | undefined): string {
  return value != null && Number.isFinite(value) ? String(value) : ''
}

function parseOptionalNumber(raw: string): number {
  const trimmed = raw.trim()
  if (!trimmed) return 0
  return Number(trimmed)
}

function nonNegWhole(raw: string): number {
  const parsed = parseOptionalNumber(raw)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.round(parsed))
}

/**
 * Next automatic item number: `'ITM'` + zero-padded `(max numeric portion + 1)`.
 * Defaults to `'ITM01001'` when no existing items are present.
 */
export function itemNextNo(items: readonly Pick<Item, 'no'>[]): string {
  const nums = items.map((item) => Number.parseInt(String(item.no).replace(/\D/g, ''), 10) || 0)
  const max = nums.length > 0 ? Math.max(...nums) : 1000
  return 'ITM' + String(max + 1).padStart(5, '0')
}

/** Blank draft for creating a new item, prefilled with the next item number. */
export function blankItemCard(items: readonly Pick<Item, 'no'>[] = []): ItemCardDraft {
  return {
    no: itemNextNo(items),
    desc: '',
    category: '',
    type: 'Inventory',
    uom: 'NOS',
    vendor: '',
    costing: 'FIFO',
    price: '',
    cost: '',
    lead: '',
    rp: '',
    rq: '',
    ss: '',
    sellable: false,
    blocked: false,
    tracksLot: false,
    tracksExpiry: false,
    tracksSerial: false,
    barcode: '',
  }
}

/** Populate an editable draft from a saved item record. */
export function itemToCardDraft(item: Item): ItemCardDraft {
  return {
    no: item.no,
    desc: item.desc,
    category: item.category,
    type: item.type || 'Inventory',
    uom: item.uom || 'NOS',
    vendor: item.vendor || '',
    costing: item.costing || 'FIFO',
    price: numToStr(item.price),
    cost: numToStr(item.cost),
    lead: numToStr(item.lead),
    rp: numToStr(item.rp),
    rq: numToStr(item.rq),
    ss: numToStr(item.ss),
    sellable: Boolean(item.sellable),
    blocked: Boolean(item.blocked),
    tracksLot: Boolean(item.tracksLot),
    tracksExpiry: Boolean(item.tracksExpiry),
    tracksSerial: Boolean(item.tracksSerial),
    barcode: item.barcode || '',
  }
}

/** Normalize whitespace, case of `no`, and fallback defaults on a card draft. */
export function normalizeItemCard(
  draft: ItemCardDraft,
  mode: ItemCardMode,
  lockedNo?: string,
): ItemCardDraft {
  return {
    ...draft,
    no: mode === 'edit' ? (lockedNo ?? draft.no).trim() : draft.no.trim().toUpperCase(),
    desc: draft.desc.trim(),
    category: draft.category.trim(),
    type: draft.type.trim() || 'Inventory',
    uom: draft.uom.trim() || 'NOS',
    vendor: draft.vendor.trim(),
    costing: draft.costing.trim() || 'FIFO',
    price: draft.price.trim(),
    cost: draft.cost.trim(),
    lead: draft.lead.trim(),
    rp: draft.rp.trim(),
    rq: draft.rq.trim(),
    ss: draft.ss.trim(),
    barcode: draft.barcode.trim(),
  }
}

const NON_NEG_FIELDS: ReadonlyArray<{
  key: 'price' | 'cost' | 'lead' | 'rp' | 'rq' | 'ss'
  label: string
}> = [
  { key: 'price', label: 'Unit price' },
  { key: 'cost', label: 'Unit cost' },
  { key: 'lead', label: 'Lead time' },
  { key: 'rp', label: 'Reorder point' },
  { key: 'rq', label: 'Reorder qty' },
  { key: 'ss', label: 'Safety stock' },
]

/**
 * Validate a draft before saving. Returns a user-facing error message or `null`.
 * Uses the prototype's messages for required fields and duplicate item number,
 * plus non-negative numeric guards.
 */
export function validateItemCard(
  draft: ItemCardDraft,
  existingItems: readonly Pick<Item, 'no'>[],
  mode: ItemCardMode,
  lockedNo?: string,
): string | null {
  const norm = normalizeItemCard(draft, mode, lockedNo)

  if (!norm.no) return 'An item no. is required — it is the record key.'
  if (!norm.desc) return 'A description is required.'
  if (!norm.category) return 'Choose a category for this item.'
  if (mode === 'new' && existingItems.some((item) => item.no.toUpperCase() === norm.no)) {
    return `Item no. “${norm.no}” already exists. Pick another.`
  }

  for (const field of NON_NEG_FIELDS) {
    const value = parseOptionalNumber(norm[field.key])
    if (!Number.isFinite(value)) return `${field.label} must be a valid number.`
    if (value < 0) return `${field.label} cannot be negative.`
  }

  return null
}

/**
 * Produce the persisted `Item` record for a valid draft.
 * Preserves stock (`locs`), demand/supply (`qtySO`, `qtySupply`), custom `attrs`,
 * and any tracking fields whose capability axis is disabled.
 */
export function buildItemCardSave(
  draft: ItemCardDraft,
  options: {
    mode: ItemCardMode
    existing?: Item
    axes?: TrackingAxes
  },
): Item {
  const { mode, existing, axes = ALL_TRACKING_AXES } = options
  const norm = normalizeItemCard(draft, mode, existing?.no)

  const price = Math.max(0, parseOptionalNumber(norm.price))
  const cost = Math.max(0, parseOptionalNumber(norm.cost))

  const base: Pick<Item, 'locs' | 'qtySO' | 'qtySupply' | 'attrs'> = existing
    ? {
        locs: { ...existing.locs },
        qtySO: existing.qtySO,
        qtySupply: existing.qtySupply,
        attrs: { ...existing.attrs },
      }
    : {
        locs: {},
        qtySO: 0,
        qtySupply: 0,
        attrs: {},
      }

  return {
    no: norm.no,
    desc: norm.desc,
    category: norm.category,
    type: norm.type,
    uom: norm.uom,
    vendor: norm.vendor,
    costing: norm.costing,
    price,
    cost,
    lead: nonNegWhole(norm.lead),
    rp: nonNegWhole(norm.rp),
    rq: nonNegWhole(norm.rq),
    ss: nonNegWhole(norm.ss),
    sellable: Boolean(norm.sellable),
    blocked: Boolean(norm.blocked),
    tracksLot: axes.lot ? Boolean(norm.tracksLot) : Boolean(existing?.tracksLot),
    tracksExpiry: axes.expiry ? Boolean(norm.tracksExpiry) : Boolean(existing?.tracksExpiry),
    tracksSerial: axes.serial ? Boolean(norm.tracksSerial) : Boolean(existing?.tracksSerial),
    barcode: axes.barcode ? norm.barcode : (existing?.barcode ?? ''),
    ...base,
  }
}

/**
 * Category groups for the Category `<select>`, derived from existing items plus
 * known catalog categories until a dedicated `itemCategories` store lands.
 */
export function itemCardCategoryGroups(
  items: readonly Pick<Item, 'category'>[],
  currentCategory = '',
): CategoryOptionGroup[] {
  const all = new Set<string>(FALLBACK_CATEGORIES)
  for (const item of items) {
    const trimmed = item.category.trim()
    if (trimmed) all.add(trimmed)
  }
  const currentTrimmed = currentCategory.trim()
  if (currentTrimmed) all.add(currentTrimmed)

  const grouped = new Map<string | null, string[]>()
  for (const cat of all) {
    const path = itemCategoryPathNames(cat)
    const group = path.length > 1 ? itemCategoryParent(cat) : null
    const list = grouped.get(group) ?? []
    list.push(cat)
    grouped.set(group, list)
  }

  return Array.from(grouped.entries())
    .map(([group, categories]) => ({
      group,
      categories: categories.slice().sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => {
      if (a.group == null && b.group == null) return 0
      if (a.group == null) return 1
      if (b.group == null) return -1
      const oa = GROUP_ORDER.get(a.group) ?? 99
      const ob = GROUP_ORDER.get(b.group) ?? 99
      return oa !== ob ? oa - ob : a.group.localeCompare(b.group)
    })
}

/** Options for the Unit of measure `<select>`. */
export function itemCardUomOptions(currentUom = ''): SelectOption[] {
  const options: SelectOption[] = SYSTEM_UOMS.map((u) => ({
    value: u.code,
    label: `${u.code} · ${u.name}`,
  }))
  const trimmed = currentUom.trim()
  if (trimmed && !SYSTEM_UOMS.some((u) => u.code === trimmed)) {
    options.push({ value: trimmed, label: trimmed })
  }
  return options
}

/** Options for the Preferred vendor `<select>`, sorted alphabetically by name. */
export function itemCardVendorOptions(
  vendors: readonly Pick<Vendor, 'name'>[],
  currentVendor = '',
): SelectOption[] {
  const names = new Set<string>()
  for (const vendor of vendors) {
    const trimmed = vendor.name.trim()
    if (trimmed) names.add(trimmed)
  }
  const currentTrimmed = currentVendor.trim()
  if (currentTrimmed) names.add(currentTrimmed)

  return [
    { value: '', label: 'No preferred vendor' },
    ...Array.from(names)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ value: name, label: name })),
  ]
}

/** Live margin summary derived from draft `price` and `cost` inputs. */
export function itemCardMarginInfo(
  priceRaw: string,
  costRaw: string,
): { ratio: number | null; unitMargin: number } {
  const priceParsed = parseOptionalNumber(priceRaw)
  const costParsed = parseOptionalNumber(costRaw)
  const price = Number.isFinite(priceParsed) ? Math.max(0, priceParsed) : 0
  const cost = Number.isFinite(costParsed) ? Math.max(0, costParsed) : 0
  return {
    ratio: itemMargin({ price, cost }),
    unitMargin: price - cost,
  }
}

/** Reorder hint beneath the Purchasing & Replenishment fields. */
export function itemCardReorderHint(rpRaw: string, uom = 'NOS'): string {
  const rp = nonNegWhole(rpRaw)
  if (rp > 0) {
    return `Replenishment is suggested once available stock falls to ${int(rp)} ${uom || 'NOS'}.`
  }
  return 'Leave the reorder point at 0 to keep this item out of replenishment suggestions.'
}
