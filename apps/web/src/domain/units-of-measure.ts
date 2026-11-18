/**
 * Units of measure — the global unit definitions (Settings ▸ Configuration)
 * and derived per-item unit register (Warehouse ▸ Units of Measure).
 * Pure rules, no React or storage: the backend enforces the same ones.
 *
 * Default units ship GST-ready (each mapped to its official UQC code) and are
 * locked. Custom units are the business's own: they can be edited and deleted,
 * unless an item still uses them.
 */
import type { Item, ItemUnitSet } from '@/data/schemas'
import { itemCategoryParent } from '@/domain/item'

export type UomCategoryId = 'count' | 'weight' | 'volume' | 'liquid' | 'length' | 'area'

export interface UomCategory {
  id: UomCategoryId
  name: string
  /** Code of the base unit conversions in this category are measured in. */
  base: string
}

export const UOM_CATEGORIES: readonly UomCategory[] = [
  { id: 'count', name: 'Count', base: 'NOS' },
  { id: 'weight', name: 'Weight', base: 'KG' },
  { id: 'volume', name: 'Volume', base: 'CBM' },
  { id: 'liquid', name: 'Liquid', base: 'LTR' },
  { id: 'length', name: 'Length', base: 'M' },
  { id: 'area', name: 'Area', base: 'SQM' },
]

export interface Uom {
  code: string
  name: string
  cat: UomCategoryId
  /** GST Unique Quantity Code the unit is reported as. */
  uqc: string
  /** `Base unit`, `1 DOZ = 12 NOS`, `Item-defined` or `—`. */
  conv: string
  /** Optional short label shown beside quantities (`kg`). */
  sym: string
  /** True for units the business added; false for the locked defaults. */
  custom: boolean
}

export const UQC_NAMES: Readonly<Record<string, string>> = {
  NOS: 'Numbers', PCS: 'Pieces', PRS: 'Pairs', DOZ: 'Dozen', GRS: 'Gross', SET: 'Sets', BOX: 'Box',
  CTN: 'Cartons', BDL: 'Bundles', PAC: 'Packs', ROL: 'Rolls', BAG: 'Bags', BAL: 'Bale', BTL: 'Bottles',
  BUN: 'Bunches', CAN: 'Cans', DRM: 'Drum', TUB: 'Tubes', TBS: 'Tablets', UNT: 'Units', KGS: 'Kilograms',
  GMS: 'Grams', QTL: 'Quintal', TON: 'Tonnes', MTS: 'Metric Ton', CBM: 'Cubic Metres',
  CCM: 'Cubic Centimetres', MLT: 'Millilitre', KLR: 'Kilolitre', UGS: 'US Gallons', MTR: 'Metres',
  CMS: 'Centimetres', KME: 'Kilometre', SQF: 'Square Feet', SQM: 'Square Metres', SQY: 'Square Yards',
  YDS: 'Yards', GYD: 'Gross Yards', THD: 'Thousands', OTH: 'Others',
}

export const UQC_CODES: readonly string[] = Object.keys(UQC_NAMES)

/** `KGS · Kilograms`; unknown codes show a dash for the name. */
export function uqcLabel(code: string): string {
  return `${code} · ${UQC_NAMES[code] ?? '—'}`
}

const unit = (code: string, name: string, cat: UomCategoryId, uqc: string, conv: string, sym = '—'): Uom => ({
  code,
  name,
  cat,
  uqc,
  conv,
  sym,
  custom: false,
})

export const DEFAULT_UNITS: readonly Uom[] = [
  unit('NOS', 'Numbers', 'count', 'NOS', 'Base unit'),
  unit('PCS', 'Pieces', 'count', 'PCS', '1 PCS = 1 NOS'),
  unit('PR', 'Pair', 'count', 'PRS', '1 PR = 2 NOS'),
  unit('DOZ', 'Dozen', 'count', 'DOZ', '1 DOZ = 12 NOS'),
  unit('GRS', 'Gross', 'count', 'GRS', '1 GRS = 144 NOS'),
  unit('SET', 'Set', 'count', 'SET', 'Item-defined'),
  unit('BOX', 'Box', 'count', 'BOX', 'Item-defined'),
  unit('CTN', 'Carton', 'count', 'CTN', 'Item-defined'),
  unit('BDL', 'Bundle', 'count', 'BDL', 'Item-defined'),
  unit('PKT', 'Pack', 'count', 'PAC', 'Item-defined'),
  unit('KG', 'Kilogram', 'weight', 'KGS', 'Base unit', 'kg'),
  unit('G', 'Gram', 'weight', 'GMS', '1000 G = 1 KG', 'g'),
  unit('MG', 'Milligram', 'weight', 'OTH', '1000 MG = 1 G', 'mg'),
  unit('QTL', 'Quintal', 'weight', 'QTL', '1 QTL = 100 KG'),
  unit('TON', 'Tonne', 'weight', 'TON', '1 TON = 1000 KG', 't'),
  unit('CBM', 'Cubic Metre', 'volume', 'CBM', 'Base unit', 'm³'),
  unit('CFT', 'Cubic Feet', 'volume', 'OTH', '1 CBM = 35.31 CFT', 'ft³'),
  unit('CCM', 'Cubic Centimetre', 'volume', 'CCM', '1 CBM = 1,000,000 CCM', 'cc'),
  unit('LTR', 'Litre', 'liquid', 'OTH', 'Base unit', 'L'),
  unit('ML', 'Millilitre', 'liquid', 'MLT', '1000 ML = 1 LTR', 'ml'),
  unit('KL', 'Kilolitre', 'liquid', 'KLR', '1 KL = 1000 LTR', 'kl'),
  unit('M', 'Metre', 'length', 'MTR', 'Base unit', 'm'),
  unit('MM', 'Millimetre', 'length', 'OTH', '1000 MM = 1 M', 'mm'),
  unit('CM', 'Centimetre', 'length', 'CMS', '100 CM = 1 M', 'cm'),
  unit('KM', 'Kilometre', 'length', 'KME', '1 KM = 1000 M', 'km'),
  unit('FT', 'Feet', 'length', 'OTH', '1 M = 3.281 FT', 'ft'),
  unit('IN', 'Inch', 'length', 'OTH', '1 IN = 25.4 MM', 'in'),
  unit('RMT', 'Running Metre', 'length', 'MTR', '1 RMT = 1 M', 'rmt'),
  unit('YD', 'Yard', 'length', 'YDS', '1 YD = 0.914 M', 'yd'),
  unit('SQM', 'Square Metre', 'area', 'SQM', 'Base unit', 'm²'),
  unit('SQF', 'Square Feet', 'area', 'SQF', '1 SQM = 10.76 SQF', 'ft²'),
  unit('SQY', 'Square Yard', 'area', 'SQY', '1 SQY = 0.836 SQM', 'yd²'),
  unit('SQCM', 'Square Centimetre', 'area', 'OTH', '10,000 SQCM = 1 SQM', 'cm²'),
  unit('SQMM', 'Square Millimetre', 'area', 'OTH', '1,000,000 SQMM = 1 SQM', 'mm²'),
]

export const categoryName = (id: string): string => UOM_CATEGORIES.find((c) => c.id === id)?.name ?? id

export const baseUnitFor = (id: string): string => UOM_CATEGORIES.find((c) => c.id === id)?.base ?? ''

/** The UQC a new unit of this category starts with. */
export function suggestUqc(cat: string): string {
  const by: Record<string, string> = { count: 'NOS', weight: 'KGS', volume: 'CBM', liquid: 'OTH', length: 'MTR', area: 'SQM' }
  return by[cat] ?? 'OTH'
}

/** 12 → `12`, 0.30479 → `0.305`, 1234.5 → `1,234.5` (en-IN, at most three decimals). */
export function formatFactor(n: number): string {
  return (Math.round(n * 1000) / 1000).toLocaleString('en-IN')
}

/** The stored conversion text for a unit: `1 PNL = 12 NOS`, or `—` for a standalone unit. */
export function conversionText(code: string, factor: number | null, cat: string): string {
  return factor !== null && factor > 0 ? `1 ${code} = ${formatFactor(factor)} ${baseUnitFor(cat)}` : '—'
}

/** The number after `=` in a stored conversion (`1 PNL = 12 NOS` → `12`), or '' when there is none. */
export function factorFromConv(conv: string): string {
  if (!conv.includes('=')) return ''
  const hit = /=\s*([\d.,]+)/.exec(conv)
  return hit ? hit[1].replaceAll(',', '') : ''
}

function parseSide(side: string): { num: number; unit: string } | null {
  const tokens = side.trim().split(' ').filter(Boolean)
  if (tokens.length < 2) return null
  const num = Number.parseFloat(tokens[0].replaceAll(',', ''))
  return num > 0 ? { num, unit: tokens[tokens.length - 1].toUpperCase() } : null
}

/**
 * How many base units one `code` holds (1 for the base unit), following chained
 * conversions; null when the unit has no fixed conversion or the chain is broken.
 */
export function sizeInBase(code: string, units: readonly Uom[], seen: ReadonlySet<string> = new Set()): number | null {
  if (seen.has(code)) return null
  const u = units.find((x) => x.code === code)
  if (!u) return null
  const base = baseUnitFor(u.cat)
  if (code === base || u.conv.trim().toLowerCase() === 'base unit') return 1
  const sides = u.conv.trim().split('=')
  if (sides.length !== 2) return null
  const left = parseSide(sides[0])
  const right = parseSide(sides[1])
  if (!left || !right) return null
  let other: string
  let per: number
  if (left.unit === code) {
    other = right.unit
    per = right.num / left.num
  } else if (right.unit === code) {
    other = left.unit
    per = left.num / right.num
  } else return null
  if (other === base) return per
  const rest = sizeInBase(other, units, new Set(seen).add(code))
  return rest === null ? null : per * rest
}

/** What the New / Edit unit form holds. */
export interface UomDraft {
  code: string
  name: string
  cat: UomCategoryId
  uqc: string
  /** Base units in one of this unit; blank for a standalone unit. */
  factor: string
  sym: string
}

export const blankDraft = (): UomDraft => ({ code: '', name: '', cat: 'count', uqc: 'NOS', factor: '', sym: '' })

export function draftFromUnit(u: Uom): UomDraft {
  return { code: u.code, name: u.name, cat: u.cat, uqc: u.uqc, factor: factorFromConv(u.conv), sym: u.sym === '—' ? '' : u.sym }
}

export const normalizeCode = (code: string): string => code.trim().toUpperCase()

/** Field errors by key; empty when the draft can be saved. `editing` is the code being edited (null when new). */
export function validateDraft(draft: UomDraft, all: readonly Uom[], editing: string | null): Record<string, string> {
  const errors: Record<string, string> = {}
  const code = normalizeCode(draft.code)
  if (!code) errors.code = 'Enter a short code (e.g. PNL).'
  else if (!/^[A-Z0-9]{1,8}$/.test(code)) errors.code = 'Letters and numbers only, up to 8 characters.'
  else if (all.some((u) => u.code === code && u.code !== editing)) errors.code = `Code ${code} already exists. Pick another.`
  if (!draft.name.trim()) errors.name = 'Enter a name for the unit.'
  if (draft.factor.trim() !== '') {
    const f = Number(draft.factor)
    if (!Number.isFinite(f) || f <= 0) errors.factor = 'Enter a number above zero, or leave blank.'
  }
  if (draft.sym.trim().length > 6) errors.sym = 'Up to 6 characters.'
  return errors
}

/** The custom unit a valid draft describes. */
export function unitFromDraft(draft: UomDraft): Uom {
  const code = normalizeCode(draft.code)
  const f = draft.factor.trim() === '' ? null : Number(draft.factor)
  return { code, name: draft.name.trim(), cat: draft.cat, uqc: draft.uqc, conv: conversionText(code, f, draft.cat), sym: draft.sym.trim(), custom: true }
}

/** Why a unit cannot be deleted, or null when it can. `itemsUsing` = items whose unit is this one. */
export function deleteBlockReason(u: Uom, itemsUsing: number): string | null {
  if (!u.custom) return 'Default units are locked so GST reporting stays correct.'
  if (itemsUsing > 0) return `${itemsUsing} ${itemsUsing === 1 ? 'item uses' : 'items use'} ${u.code}. Change ${itemsUsing === 1 ? 'its' : 'their'} unit first.`
  return null
}

/** Items refer to a unit by code, so the code is fixed once an item uses it. */
export const codeLocked = (itemsUsing: number): boolean => itemsUsing > 0

export function filterUnits(units: readonly Uom[], opts: { cat: string; query: string }): Uom[] {
  const q = opts.query.trim().toLowerCase()
  return units.filter((u) => {
    if (opts.cat !== 'all' && u.cat !== opts.cat) return false
    if (!q) return true
    return `${u.code} ${u.name} ${u.uqc} ${categoryName(u.cat)}`.toLowerCase().includes(q)
  })
}

/** Item count per unit code. */
/**
 * How many items use each unit — as base (`item.uom`) or as any unit in the item's stored unit set
 * (pack units). An item counts once per unit.
 */
export function countByUnit(
  items: readonly { no?: string; uom: string }[],
  sets: readonly { itemNo: string; list: readonly string[] }[] = [],
): Map<string, number> {
  const listOf = new Map(sets.map((s) => [s.itemNo, s.list]))
  const out = new Map<string, number>()
  for (const i of items) {
    const codes = new Set([i.uom, ...((i.no !== undefined && listOf.get(i.no)) || [])].filter(Boolean))
    for (const c of codes) out.set(c, (out.get(c) ?? 0) + 1)
  }
  return out
}

/** Defaults first, then the business's own units. */
export const allUnits = (custom: readonly Uom[]): Uom[] => [...DEFAULT_UNITS, ...custom]

// ── Warehouse ▸ Units of Measure (per-item unit register) ────────────────────

export type ItemUnitRole = 'Base' | 'Master pack' | 'Pack unit'

export interface ItemUomEntry {
  list: string[]
  base: string
  qty?: Record<string, number>
}

export type ItemUomUpdateResult =
  | { ok: false; error: string }
  | { ok: true; unitSet: ItemUnitSet }

export interface ItemUnitTabRow {
  code: string
  name: string
  catName: string
  uqc: string
  base: string
  qtyInBase: number | null
  isBase: boolean
  isFixed: boolean
  role: ItemUnitRole
}

export interface ItemUnitTabSummary {
  base: string
  pack: string
  packLabel: string
  packSize: number | null
  rows: ItemUnitTabRow[]
  availableToAdd: Uom[]
}

export interface ItemUnitRow {
  /** Composite row key: `"<itemNo> · <code>"`. */
  no: string
  itemNo: string
  itemDesc: string
  /** Top-level item category name. */
  category: string
  code: string
  name: string
  cat: UomCategoryId | ''
  catName: string
  uqc: string
  base: string
  qtyInBase: number | null
  fixed: boolean
  role: ItemUnitRole
  source: 'System' | 'Custom'
}

/** Composite row key for one item × unit row (`<itemNo> · <code>`). */
export function itemUnitKey(itemNo: string, code: string): string {
  return `${itemNo} · ${code}`
}

/**
 * Fixed conversion factor for `code` expressed in the item's `base` unit when both
 * share a measurement category and convert to that category's base; otherwise null.
 */
export function fixedSizeInItemBase(code: string, base: string, units: readonly Uom[]): number | null {
  if (!code || !base || code === base) return null
  const codeDef = units.find((u) => u.code === code)
  const baseDef = units.find((u) => u.code === base)
  if (!codeDef || !baseDef || codeDef.cat !== baseDef.cat) return null
  const codeSize = sizeInBase(code, units)
  const baseSize = sizeInBase(base, units)
  if (codeSize === null || baseSize === null || baseSize <= 0) return null
  return Number((codeSize / baseSize).toPrecision(12))
}

/** Default per-item unit set seeded from `item.uom` (base unit only). */
export function itemUomDefault(itemNo: string, baseUom: string): ItemUnitSet {
  const base = normalizeCode(baseUom)
  return {
    itemNo,
    list: base ? [base] : [],
    base,
    pack: '',
    qty: {},
  }
}

/** Conversion factor of `code` in `set.base` units (`1` for base, fixed or manual `> 0`, else null). */
export function itemUomBaseSize(
  set: Pick<ItemUnitSet, 'base' | 'qty'>,
  code: string,
  units: readonly Uom[] = DEFAULT_UNITS,
): number | null {
  if (!code) return null
  if (code === set.base) return 1
  const fixed = fixedSizeInItemBase(code, set.base, units)
  if (fixed !== null) return fixed
  const manual = set.qty[code]
  return manual !== undefined && Number.isFinite(manual) && manual > 0 ? manual : null
}

/** Automatically derive the master pack as the non-base unit holding the most base units (> 1). */
export function itemUomComputePack(
  set: Pick<ItemUnitSet, 'list' | 'base' | 'qty'>,
  units: readonly Uom[] = DEFAULT_UNITS,
): string {
  if (!set.base) return ''
  let best = ''
  let bestSize = 1
  for (const code of set.list) {
    if (code === set.base) continue
    const size = itemUomBaseSize(set, code, units)
    if (size !== null && size > bestSize) {
      bestSize = size
      best = code
    }
  }
  return best
}

/** Clean an item unit set (deduplicate codes, align base, drop stale qty entries, recompute pack). */
export function itemUomNormalize(
  set: ItemUnitSet,
  units: readonly Uom[] = DEFAULT_UNITS,
): ItemUnitSet {
  const list: string[] = []
  const seen = new Set<string>()
  for (const raw of set.list) {
    const code = normalizeCode(raw)
    if (code && !seen.has(code)) {
      seen.add(code)
      list.push(code)
    }
  }
  const normBase = normalizeCode(set.base)
  const base = normBase && list.includes(normBase) ? normBase : (list[0] ?? '')
  const qty: Record<string, number> = {}
  for (const [rawCode, val] of Object.entries(set.qty)) {
    const code = normalizeCode(rawCode)
    if (!code || !seen.has(code) || code === base) continue
    if (fixedSizeInItemBase(code, base, units) !== null) continue
    if (Number.isFinite(val) && val > 0) qty[code] = val
  }
  const next: ItemUnitSet = { itemNo: set.itemNo, list, base, pack: '', qty }
  next.pack = itemUomComputePack(next, units)
  return next
}

/** Validate an explicit unit set against the per-item invariants and recompute its master pack. */
export function itemUomValidate(
  set: ItemUnitSet,
  units: readonly Uom[] = DEFAULT_UNITS,
): ItemUomUpdateResult {
  const list: string[] = []
  const seen = new Set<string>()
  for (const raw of set.list) {
    const code = normalizeCode(raw)
    if (!code) return { ok: false, error: 'Unit code cannot be empty.' }
    if (seen.has(code)) return { ok: false, error: `${code} is already on this item.` }
    seen.add(code)
    list.push(code)
  }
  const base = normalizeCode(set.base)
  if (list.length === 0) {
    if (base) return { ok: false, error: 'Base unit must be empty when the item has no units.' }
  } else if (!base || !seen.has(base)) {
    return { ok: false, error: 'Base unit must be one of the units on this item.' }
  }
  const qty: Record<string, number> = {}
  for (const [rawCode, val] of Object.entries(set.qty)) {
    const code = normalizeCode(rawCode)
    if (!seen.has(code)) return { ok: false, error: `${code || rawCode} is not on this item.` }
    if (code === base) return { ok: false, error: 'Base unit always has conversion 1.' }
    if (fixedSizeInItemBase(code, base, units) !== null) {
      return { ok: false, error: `${code} has a fixed conversion from Settings.` }
    }
    if (!Number.isFinite(val) || val <= 0) {
      return { ok: false, error: 'Enter a conversion factor above zero.' }
    }
    qty[code] = val
  }
  const next: ItemUnitSet = { itemNo: set.itemNo, list, base, pack: '', qty }
  next.pack = itemUomComputePack(next, units)
  return { ok: true, unitSet: next }
}

/** Attach a unit code to an item (rejects duplicates; promotes to base if the item had none). */
export function itemUomAdd(
  set: ItemUnitSet,
  code: string,
  units: readonly Uom[] = DEFAULT_UNITS,
): ItemUomUpdateResult {
  const norm = normalizeCode(code)
  if (!norm) return { ok: false, error: 'Choose a unit to add.' }
  if (set.list.includes(norm)) return { ok: false, error: `${norm} is already on this item.` }
  const next: ItemUnitSet = {
    itemNo: set.itemNo,
    list: [...set.list, norm],
    base: set.base || norm,
    pack: '',
    qty: { ...set.qty },
  }
  next.pack = itemUomComputePack(next, units)
  return { ok: true, unitSet: next }
}

/**
 * Remove a unit from an item's unit set: promotes the next remaining unit to base
 * if the base was removed, clears `pack` and the unit's `qty`, and recomputes master pack.
 */
export function itemUomRemove(
  set: ItemUnitSet,
  code: string,
  units: readonly Uom[] = DEFAULT_UNITS,
): ItemUomUpdateResult {
  const norm = normalizeCode(code)
  if (!norm || !set.list.includes(norm)) {
    return { ok: false, error: `${norm || code} is not on this item.` }
  }
  const list = set.list.filter((c) => c !== norm)
  const base = set.base === norm ? (list[0] ?? '') : set.base
  const qty = { ...set.qty }
  delete qty[norm]
  if (base) delete qty[base]
  const next: ItemUnitSet = { itemNo: set.itemNo, list, base, pack: '', qty }
  next.pack = itemUomComputePack(next, units)
  return { ok: true, unitSet: next }
}

/** Switch the item's base unit to another unit already attached to the item. */
export function itemUomSetBase(
  set: ItemUnitSet,
  code: string,
  units: readonly Uom[] = DEFAULT_UNITS,
): ItemUomUpdateResult {
  const norm = normalizeCode(code)
  if (!norm || !set.list.includes(norm)) {
    return { ok: false, error: `Add ${norm || 'the unit'} to this item before setting it as base.` }
  }
  const qty = { ...set.qty }
  delete qty[norm]
  const next: ItemUnitSet = {
    itemNo: set.itemNo,
    list: [...set.list],
    base: norm,
    pack: '',
    qty,
  }
  next.pack = itemUomComputePack(next, units)
  return { ok: true, unitSet: next }
}

/** Set or clear the manual conversion factor for a non-fixed unit on the item. */
export function itemUomSetQty(
  set: ItemUnitSet,
  code: string,
  qtyValue: number | string | null,
  units: readonly Uom[] = DEFAULT_UNITS,
): ItemUomUpdateResult {
  const norm = normalizeCode(code)
  if (!norm || !set.list.includes(norm)) {
    return { ok: false, error: `${norm || code} is not on this item.` }
  }
  if (norm === set.base) return { ok: false, error: 'Base unit always has conversion 1.' }
  if (fixedSizeInItemBase(norm, set.base, units) !== null) {
    return { ok: false, error: `${norm} has a fixed conversion from Settings.` }
  }
  const qty = { ...set.qty }
  if (qtyValue === null || (typeof qtyValue === 'string' && qtyValue.trim() === '')) {
    delete qty[norm]
  } else {
    const num = typeof qtyValue === 'number' ? qtyValue : Number(qtyValue.trim())
    if (!Number.isFinite(num) || num <= 0) {
      return { ok: false, error: 'Enter a conversion factor above zero.' }
    }
    qty[norm] = num
  }
  const next: ItemUnitSet = {
    itemNo: set.itemNo,
    list: [...set.list],
    base: set.base,
    pack: '',
    qty,
  }
  next.pack = itemUomComputePack(next, units)
  return { ok: true, unitSet: next }
}

/**
 * Keep `item.uom` equal to the unit set's base unit, returning both updated
 * records together without mutating the inputs.
 */
export function applyItemUnitSet(
  item: Item,
  unitSet: ItemUnitSet,
): { item: Item; unitSet: ItemUnitSet } {
  const nextItem = item.uom === unitSet.base ? item : { ...item, uom: unitSet.base }
  return { item: nextItem, unitSet }
}

/**
 * Sync an existing (or new) unit set when an item is created or its base unit is
 * changed on the item card, returning both aligned records.
 */
export function syncItemBaseUnit(
  item: Item,
  existingSet: ItemUnitSet | null | undefined,
  units: readonly Uom[] = DEFAULT_UNITS,
): { item: Item; unitSet: ItemUnitSet } {
  const base = normalizeCode(item.uom)
  if (!existingSet) {
    return applyItemUnitSet(item, itemUomDefault(item.no, base))
  }
  const current = itemUomNormalize(existingSet, units)
  if (!base) {
    return applyItemUnitSet(item, { itemNo: item.no, list: [], base: '', pack: '', qty: {} })
  }
  const list = current.list.includes(base) ? [...current.list] : [base, ...current.list]
  const qty = { ...current.qty }
  delete qty[base]
  const nextSet: ItemUnitSet = { itemNo: item.no, list, base, pack: '', qty }
  nextSet.pack = itemUomComputePack(nextSet, units)
  return applyItemUnitSet(item, nextSet)
}

/** Build the derived summary, table rows, master pack, and addable units for the Item profile tab. */
export function buildItemUnitSummary(
  set: ItemUnitSet,
  units: readonly Uom[] = DEFAULT_UNITS,
): ItemUnitTabSummary {
  const normalized = itemUomNormalize(set, units)
  const byCode = new Map(units.map((u) => [u.code, u]))
  const pack = normalized.pack
  const packDef = pack ? byCode.get(pack) : undefined
  const packSize = pack ? itemUomBaseSize(normalized, pack, units) : null

  const rows: ItemUnitTabRow[] = normalized.list.map((code) => {
    const def = byCode.get(code)
    const isBase = code === normalized.base
    const fixed = isBase ? null : fixedSizeInItemBase(code, normalized.base, units)
    const manual = normalized.qty[code]
    const qtyInBase = isBase
      ? 1
      : fixed !== null
        ? fixed
        : manual !== undefined && Number.isFinite(manual) && manual > 0
          ? manual
          : null
    const role: ItemUnitRole = isBase ? 'Base' : code === pack ? 'Master pack' : 'Pack unit'
    return {
      code,
      name: def?.name ?? '—',
      catName: def?.cat ? categoryName(def.cat) : '—',
      uqc: def?.uqc || 'OTH',
      base: normalized.base,
      qtyInBase,
      isBase,
      isFixed: fixed !== null,
      role,
    }
  })

  const attached = new Set(normalized.list)
  const availableToAdd = units.filter((u) => !attached.has(u.code))

  return {
    base: normalized.base,
    pack,
    packLabel: pack ? (packDef ? `${packDef.name} (${pack})` : pack) : '',
    packSize,
    rows,
    availableToAdd,
  }
}

/** Resolve an item's unit list and base unit (stored per-item map, falling back to `item.uom`). */
export function itemUomStateFor(
  item: Pick<Item, 'no' | 'uom'>,
  itemUoms?: Readonly<Record<string, ItemUomEntry>>,
): { list: string[]; base: string; qty: Record<string, number> } {
  if (itemUoms && Object.prototype.hasOwnProperty.call(itemUoms, item.no)) {
    const stored = itemUoms[item.no]
    return {
      list: [...(stored.list ?? [])],
      base: stored.base || '',
      qty: { ...(stored.qty ?? {}) },
    }
  }
  const base = (item.uom || '').trim()
  return { list: base ? [base] : [], base, qty: {} }
}

/** Automatically derive the master pack as the non-base unit holding the most base units (> 1). */
export function itemMasterPack(state: ItemUomEntry, units: readonly Uom[]): string {
  return itemUomComputePack({ list: state.list, base: state.base, qty: state.qty ?? {} }, units)
}

/** Build one register row per item × unit from items, global unit definitions, and optional per-item UoMs. */
export function buildItemUnitRows(
  items: readonly Pick<Item, 'no' | 'desc' | 'category' | 'uom'>[],
  units: readonly Uom[],
  itemUoms?: Readonly<Record<string, ItemUomEntry>>,
): ItemUnitRow[] {
  const byCode = new Map(units.map((u) => [u.code, u]))
  const rows: ItemUnitRow[] = []
  for (const it of items) {
    const u = itemUomStateFor(it, itemUoms)
    const pack = itemMasterPack(u, units)
    for (const code of u.list) {
      const def = byCode.get(code)
      const isBase = u.base === code
      const isPack = pack === code
      const fixed = isBase ? sizeInBase(code, units) : fixedSizeInItemBase(code, u.base, units)
      const manual = u.qty[code]
      const qtyInBase = isBase
        ? 1
        : fixed !== null
          ? fixed
          : manual !== undefined && Number.isFinite(manual) && manual > 0
            ? manual
            : null
      rows.push({
        no: itemUnitKey(it.no, code),
        itemNo: it.no,
        itemDesc: it.desc,
        category: itemCategoryParent(it.category),
        code,
        name: def?.name ?? '—',
        cat: def?.cat ?? '',
        catName: def?.cat ? categoryName(def.cat) : '—',
        uqc: def?.uqc || 'OTH',
        base: u.base || '',
        qtyInBase,
        fixed: fixed !== null,
        role: isBase ? 'Base' : isPack ? 'Master pack' : 'Pack unit',
        source: def?.custom ? 'Custom' : 'System',
      })
    }
  }
  return rows
}

/** Remove one unit from an item's UoM state, promoting the first remaining unit if the base was removed. */
export function removeUnitFromItemUom(
  state: ItemUomEntry,
  code: string,
): { list: string[]; base: string; qty: Record<string, number> } {
  if (!state.list.includes(code)) {
    return { list: [...state.list], base: state.base, qty: { ...(state.qty ?? {}) } }
  }
  const list = state.list.filter((c) => c !== code)
  const base = state.base === code ? (list[0] ?? '') : state.base
  const qty = { ...(state.qty ?? {}) }
  delete qty[code]
  if (base) delete qty[base]
  return { list, base, qty }
}
