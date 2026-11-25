/**
 * Tax codes — national GST rate codes with dated rates (Settings ▸ Finance ▸ Tax codes, and the
 * Shared lists copy). Pure rules; the backend enforces the same. See docs/tax-codes/README.md.
 *
 * Rates are the same in every state; the document engine decides CGST + SGST vs IGST. A code keeps
 * dated rate rows, so a government change is a new row, never an edit of a rate already in effect.
 * Today only charges carry a GST rate (as text: `5%`, `Goods rate`), so "used by" counts charges;
 * items and document lines join when they carry a tax code (gap G-023).
 */
import type { Charge, TaxCode, TaxRateRow } from '@/data/schemas'

export const TAX_CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{1,11}$/
export const GOODS_CODE = 'GOODS'

type Base = Omit<TaxCode, 'createdAt' | 'updatedAt'>
const R = (rate: number, from: string): TaxRateRow => ({ rate, from })
const T = (code: string, name: string, kind: Base['kind'], appliesTo: Base['appliesTo'], rates: TaxRateRow[], desc: string, active: boolean, system: boolean): Base => ({
  code,
  name,
  kind,
  appliesTo,
  rates,
  desc,
  active,
  system,
})

/** The built-in codes and the retired / unused ones the prototype seeds (Kanalora: ceramics, dhoop, packaging at 5% / 18%). */
export const TAX_CODE_DEFAULTS: readonly Base[] = [
  T('GST0', 'GST 0% — nil rated', 'rate', 'Both', [R(0, '2017-07-01')], 'Taxable at a nil rate. Exempt and non-GST goods are set by the line’s tax treatment, not this code.', true, true),
  T('GST5', 'GST 5%', 'rate', 'Both', [R(5, '2017-07-01')], 'Dhoop cones and sambrani (HSN 3307 41), ornamental ceramics (HSN 6913, since GST 2.0), GTA freight under reverse charge.', true, true),
  T('GST18', 'GST 18%', 'rate', 'Both', [R(18, '2017-07-01')], 'Standard rate — courier, transit insurance, loading and most general goods.', true, true),
  T('GST40', 'GST 40% — demerit', 'rate', 'Goods', [R(40, '2025-09-22')], 'Luxury and sin goods under GST 2.0. Not used by Kanalora.', true, true),
  T('GOODS', 'Goods rate', 'goods', 'Services', [], 'For charges billed with goods — freight, packing. The line takes the GST rate of the goods on the same document.', true, true),
  T('GST3', 'GST 3% — precious metals', 'rate', 'Goods', [R(3, '2017-07-01')], 'Gold, silver and jewellery. Not used by Kanalora.', false, false),
  T('GST12', 'GST 12% — retired', 'rate', 'Both', [R(12, '2017-07-01')], 'Slab abolished by GST 2.0 on 22 Sep 2025. Kept for documents dated before then.', false, false),
  T('GST28', 'GST 28% — retired', 'rate', 'Goods', [R(28, '2017-07-01')], 'Slab abolished by GST 2.0 on 22 Sep 2025. Kept for documents dated before then.', false, false),
]

// ── Rates ────────────────────────────────────────────────────────────────────

export const sortedRates = (t: Pick<TaxCode, 'rates'>): TaxRateRow[] =>
  [...t.rates].sort((a, b) => a.from.localeCompare(b.from))

/** The rate row in force on `date` (ISO), or null for the Goods-rate code or before the first row. */
export function taxRateOn(t: Pick<TaxCode, 'kind' | 'rates'>, date: string): TaxRateRow | null {
  if (t.kind === 'goods') return null
  let hit: TaxRateRow | null = null
  for (const row of sortedRates(t)) if (row.from <= date) hit = row
  return hit
}

/** The first scheduled change after `today`, or null. */
export const nextRate = (t: Pick<TaxCode, 'rates'>, today: string): TaxRateRow | null =>
  sortedRates(t).find((r) => r.from > today) ?? null

export const pctText = (n: number): string => `${Math.round(n * 100) / 100}%`

export type RateStatus = 'Current' | 'Past' | 'Scheduled'

/** Where a dated row stands today. */
export function rateStatus(t: Pick<TaxCode, 'rates' | 'kind'>, row: TaxRateRow, today: string): RateStatus {
  if (row.from > today) return 'Scheduled'
  return taxRateOn(t, today)?.from === row.from ? 'Current' : 'Past'
}

/** The Rate column: current rate, a scheduled change, or why there is none. */
export function rateSummary(t: Pick<TaxCode, 'kind' | 'rates'>, today: string, fmt: (iso: string) => string): string {
  if (t.kind === 'goods') return 'Follows the goods'
  const cur = taxRateOn(t, today)
  const next = nextRate(t, today)
  if (!cur) return next ? `Starts ${fmt(next.from)}` : '—'
  return next ? `${pctText(cur.rate)} → ${pctText(next.rate)} from ${fmt(next.from)}` : pctText(cur.rate)
}

// ── Usage ────────────────────────────────────────────────────────────────────

/** Charges store their GST as text until they carry a tax code: `Goods rate` → GOODS, `5%` → GST5. */
export function chargeTaxCode(gst: string): string {
  if (gst === 'Goods rate') return GOODS_CODE
  const m = /^(\d+(?:\.\d+)?)%$/.exec(gst.trim())
  return m ? `GST${m[1]}` : ''
}

export const chargesUsingCode = (code: string, charges: readonly Pick<Charge, 'gst' | 'active'>[]) =>
  charges.filter((c) => chargeTaxCode(c.gst) === code)

export interface TaxCodeUsage {
  charges: number
  activeCharges: number
}

export function taxCodeUsage(code: string, charges: readonly Pick<Charge, 'gst' | 'active'>[]): TaxCodeUsage {
  const used = chargesUsingCode(code, charges)
  return { charges: used.length, activeCharges: used.filter((c) => c.active !== false).length }
}

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`

export function taxCodeDeleteBlock(t: Pick<TaxCode, 'system'>, usage: TaxCodeUsage): string | null {
  if (t.system) return 'Built-in code — deactivate it instead if you don’t use it.'
  if (usage.charges) return `Used by ${plural(usage.charges, 'charge')} — move ${usage.charges === 1 ? 'it' : 'them'} to another code first.`
  return null
}

export function taxCodeDeactivateBlock(usage: TaxCodeUsage): string | null {
  if (!usage.activeCharges) return null
  return `Used by ${plural(usage.activeCharges, 'active charge')} — move ${usage.activeCharges === 1 ? 'it' : 'them'} to another code first.`
}

// ── Editing ──────────────────────────────────────────────────────────────────

/** A rate row while editing. `rate` is text while typing; `locked` rows started before today. */
export interface RateDraft {
  rate: number | string
  from: string
  locked: boolean
}

export type TaxCodeDraft = Omit<TaxCode, 'rates' | 'createdAt' | 'updatedAt'> & { rates: RateDraft[] }

export const draftRates = (t: Pick<TaxCode, 'rates'>, today: string, mode: 'edit' | 'new'): RateDraft[] =>
  sortedRates(t).map((r) => ({ rate: r.rate, from: r.from, locked: mode === 'edit' && r.from < today }))

const addDay = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

/** A blank rate-change row: starts today, or the day after the last locked row if that is later. */
export function newRateRow(rows: readonly RateDraft[], today: string): RateDraft {
  const lastLocked = rows.filter((r) => r.locked).map((r) => r.from).sort().pop() ?? ''
  return { rate: '', from: lastLocked >= today ? addDay(lastLocked) : today, locked: false }
}

export function blankTaxCode(today: string): TaxCodeDraft {
  return {
    code: '',
    name: '',
    kind: 'rate',
    appliesTo: 'Both',
    rates: [{ rate: '', from: today, locked: false }],
    desc: '',
    active: true,
    system: false,
  }
}

export function normalizeTaxCode(d: TaxCodeDraft): TaxCodeDraft {
  return { ...d, code: d.code.trim().toUpperCase(), name: d.name.trim().replace(/\s+/g, ' '), desc: d.desc.trim() }
}

const RATE_TEXT = /^\d{1,3}(\.\d{1,2})?$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export interface TaxCodeContext {
  mode: 'edit' | 'new'
  today: string
  /** The saved record when editing. */
  original?: Pick<TaxCode, 'active'> | null
  usage: TaxCodeUsage
  /** `fmtDate`, for "Must start after …". */
  fmt: (iso: string) => string
}

/**
 * Errors by key: `code`, `name`, `active`, `rates` (summary) and per-row `rates.<i>.rate` / `rates.<i>.from`.
 * `others` excludes the code being edited.
 */
export function validateTaxCode(
  draft: TaxCodeDraft,
  others: readonly Pick<TaxCode, 'code' | 'name'>[],
  ctx: TaxCodeContext,
): Record<string, string> {
  const e: Record<string, string> = {}
  const d = normalizeTaxCode(draft)
  if (ctx.mode === 'new') {
    if (!TAX_CODE_PATTERN.test(d.code)) e.code = 'Use 2–12 letters, digits or hyphens.'
    else if (others.some((t) => t.code === d.code)) e.code = 'Another tax code already uses this code.'
  }
  if (!d.name) e.name = 'Enter a name.'
  else if (others.some((t) => t.name.toLowerCase() === d.name.toLowerCase())) e.name = 'Another tax code already has this name.'

  if (d.kind === 'rate') {
    const seen = new Set<string>()
    const lastLocked = d.rates.filter((r) => r.locked).map((r) => r.from).sort().pop() ?? ''
    d.rates.forEach((r, i) => {
      if (r.locked) {
        seen.add(r.from)
        return
      }
      const text = String(r.rate ?? '').trim()
      if (text === '' || !RATE_TEXT.test(text) || Number(text) > 100) e[`rates.${i}.rate`] = 'Enter 0–100, up to 2 decimals.'
      if (!ISO_DATE.test(r.from)) e[`rates.${i}.from`] = 'Pick the date it starts.'
      else if (seen.has(r.from)) e[`rates.${i}.from`] = 'Another rate starts on this date.'
      else if (ctx.mode === 'edit' && r.from < ctx.today) e[`rates.${i}.from`] = 'Can’t start in the past — documents already use the current rate.'
      else if (lastLocked && r.from <= lastLocked) e[`rates.${i}.from`] = `Must start after ${ctx.fmt(lastLocked)}.`
      seen.add(r.from)
    })
    if (!d.rates.length) e.rates = 'Add at least one rate.'
    else if (Object.keys(e).some((k) => k.startsWith('rates.'))) e.rates = 'Fix the highlighted rates.'
  }
  if (!d.active && ctx.mode === 'edit' && ctx.original?.active !== false) {
    const why = taxCodeDeactivateBlock(ctx.usage)
    if (why) e.active = why
  }
  return e
}

/** The stored record from a validated draft. A goods code never carries rates. */
export function toTaxCode(draft: TaxCodeDraft, stamps: { createdAt: string; updatedAt: string }): TaxCode {
  const d = normalizeTaxCode(draft)
  const rates = d.kind === 'goods' ? [] : d.rates.map((r) => ({ rate: Number(r.rate), from: r.from })).sort((a, b) => a.from.localeCompare(b.from))
  return { code: d.code, name: d.name, kind: d.kind, appliesTo: d.appliesTo, rates, desc: d.desc, active: d.active, system: d.system, ...stamps }
}
