/**
 * Units of measure — the global unit definitions (Settings ▸ Configuration).
 * Pure rules, no React or storage: the backend enforces the same ones.
 *
 * Default units ship GST-ready (each mapped to its official UQC code) and are
 * locked. Custom units are the business's own: they can be edited and deleted,
 * unless an item still uses them.
 */

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
export function countByUnit(items: readonly { uom: string }[]): Map<string, number> {
  const out = new Map<string, number>()
  for (const i of items) out.set(i.uom, (out.get(i.uom) ?? 0) + 1)
  return out
}

/** Defaults first, then the business's own units. */
export const allUnits = (custom: readonly Uom[]): Uom[] => [...DEFAULT_UNITS, ...custom]
