/**
 * GST registrations (Settings ▸ Workspace ▸ GST registrations): the business's own GSTINs, one
 * per state it operates in. Rules for saving, cancelling, the primary registration and how
 * locations read them. Pure functions only; the backend enforces the same.
 * See docs/gst-registrations/README.md.
 *
 * A registration's state is the first two digits of its GSTIN. A location's registration is the
 * active Normal (not Casual) registration of its state — never stored on the location.
 */
import type { GstRegistration, Warehouse } from '@/data/schemas'
import { type GstState, gstStateByCode } from './gst'
import { checkGstin } from './gst-states'
import { fiscalYearLabel } from './regional'

export const GST_SCHEME_OPTIONS = [
  { value: 'Regular', label: 'Regular' },
  { value: 'Composition', label: 'Composition' },
] as const
export const GST_REG_TYPE_OPTIONS = [
  { value: 'Normal', label: 'Normal' },
  { value: 'Casual', label: 'Casual (temporary)' },
] as const
export const GST_FILING_OPTIONS = [
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Quarterly', label: 'Quarterly (QRMP)' },
] as const

/** A GST invoice number is at most 16 characters; 4 of them are the running number. */
export const INVOICE_NUMBER_MAX = 16
/** Casual registration: 90 days, plus one 90-day extension. */
export const CASUAL_MAX_DAYS = 180
export const DEFAULT_EWAY_MIN = 50000

export const isActive = (r: Pick<GstRegistration, 'status'>): boolean => r.status !== 'Cancelled'
export const isCasual = (r: Pick<GstRegistration, 'regType'>): boolean => r.regType === 'Casual'

/** The state a registration is in (from the GSTIN prefix), or null. */
export const registrationState = (r: Pick<GstRegistration, 'gstin'> | null | undefined): GstState | null =>
  r ? gstStateByCode(String(r.gstin || '').slice(0, 2)) : null

export const activeRegistrations = (list: readonly GstRegistration[]): GstRegistration[] => list.filter(isActive)

/** The primary registration: the flagged active one, else the first active Normal one. */
export function primaryRegistration(list: readonly GstRegistration[]): GstRegistration | null {
  const active = activeRegistrations(list)
  return active.find((r) => r.primary) ?? active.find((r) => !isCasual(r)) ?? null
}

/** An active Normal registration covers a state (other than `exceptId`). */
export const stateCovered = (list: readonly GstRegistration[], code: string, exceptId?: string): boolean =>
  list.some((r) => r.id !== exceptId && isActive(r) && !isCasual(r) && r.gstin.slice(0, 2) === code)

/** The registration a site files under: the active Normal registration of its state. */
export function registrationForSite(list: readonly GstRegistration[], site: Pick<Warehouse, 'country' | 'state'>): GstRegistration | null {
  if (site.country && site.country !== 'IN') return null
  return list.find((r) => isActive(r) && !isCasual(r) && r.gstin.slice(0, 2) === site.state) ?? null
}

const isIndianTradingSite = (w: Pick<Warehouse, 'country' | 'status' | 'state'>): boolean =>
  (!w.country || w.country === 'IN') && w.status !== 'inactive' && !!w.state

/** The sites that file under a registration: non-inactive Indian sites in its state (none for Casual or Cancelled). */
export function registrationSites<W extends Pick<Warehouse, 'country' | 'status' | 'state'>>(r: GstRegistration, sites: readonly W[]): W[] {
  if (!isActive(r) || isCasual(r)) return []
  return sites.filter((w) => isIndianTradingSite(w) && w.state === r.gstin.slice(0, 2))
}

export interface RegistrationGap {
  state: GstState
  sites: Warehouse[]
}

/** States with a trading site but no active Normal registration, one entry per state. */
export function registrationGaps(list: readonly GstRegistration[], sites: readonly Warehouse[]): RegistrationGap[] {
  const byState = new Map<string, Warehouse[]>()
  for (const w of sites) {
    if (!isIndianTradingSite(w) || stateCovered(list, w.state)) continue
    byState.set(w.state, [...(byState.get(w.state) ?? []), w])
  }
  const out: RegistrationGap[] = []
  for (const [code, group] of byState) {
    const state = gstStateByCode(code)
    if (state) out.push({ state, sites: group })
  }
  return out.sort((a, b) => a.state.code.localeCompare(b.state.code))
}

/** The sentence under a gap banner. */
export function gapText(gap: RegistrationGap): string {
  const names = gap.sites.map((s) => s.name)
  const who = names.length === 1 ? `${names[0]} is` : names.length === 2 ? `${names[0]} and ${names[1]} are` : `${names.length} locations are`
  return `${who} in ${gap.state.name}, which has no active GST registration.`
}

/** Why a location can't be Active (or move to this state) without a registration, or null. */
export function locationRegistrationError(
  site: Pick<Warehouse, 'country' | 'status' | 'state'>,
  list: readonly GstRegistration[],
): string | null {
  if (site.status !== 'active' || (site.country && site.country !== 'IN') || !site.state) return null
  if (stateCovered(list, site.state)) return null
  const name = gstStateByCode(site.state)?.name ?? 'this state'
  return `${name} has no active GST registration — add one in Settings ▸ GST registrations first, or keep the site Setting up.`
}

/** `TN/{FY}/` for a GSTIN's state; '' when the prefix isn't a state. */
export function suggestSeries(gstin: string): string {
  const state = /^\d{2}/.test(gstin) ? gstStateByCode(gstin.slice(0, 2)) : null
  return state && state.type !== 'foreign' ? `${state.abbr}/{FY}/` : ''
}

/** The first invoice number a prefix produces: `TN/2026-27/0001`. */
export function seriesText(prefix: string, fiscalLabel: string): string {
  return `${String(prefix || '').toUpperCase().replace(/\{FY\}/g, fiscalLabel)}0001`
}

/** A new registration's starting values. */
export function blankRegistration(opts: { legal: string; trade: string; hasPrimary: boolean; gstinPrefix?: string }): GstRegistration {
  const prefix = opts.gstinPrefix ?? ''
  return {
    id: '',
    gstin: prefix,
    legal: opts.legal,
    trade: opts.trade,
    scheme: 'Regular',
    regType: 'Normal',
    validFrom: '',
    validTo: '',
    registeredOn: '',
    filing: 'Quarterly',
    eInvoice: false,
    ewayMin: DEFAULT_EWAY_MIN,
    series: suggestSeries(prefix),
    addr1: '',
    city: '',
    postal: '',
    primary: !opts.hasPrimary,
    status: 'Active',
    cancelledOn: '',
  }
}

/** The first registration, from the workspace identity (Business profile) — `REG-TN` for Tamil Nadu. */
export function seedRegistration(ws: { gstin: string; legal: string; name: string; addr1: string; city: string; postal: string }): GstRegistration {
  const state = gstStateByCode(ws.gstin.slice(0, 2))
  const abbr = state?.abbr ?? 'TN'
  return {
    id: `REG-${abbr}`,
    gstin: ws.gstin,
    legal: ws.legal,
    trade: ws.name,
    scheme: 'Regular',
    regType: 'Normal',
    validFrom: '',
    validTo: '',
    registeredOn: '2021-06-14',
    filing: 'Quarterly',
    eInvoice: false,
    ewayMin: DEFAULT_EWAY_MIN,
    series: `${abbr}/{FY}/`,
    addr1: ws.addr1,
    city: ws.city,
    postal: ws.postal,
    primary: true,
    status: 'Active',
    cancelledOn: '',
    createdAt: '2026-09-25T09:00:00.000Z',
    updatedAt: '2026-09-25T09:00:00.000Z',
  }
}

export const normalizeGstin = (value: string): string => value.toUpperCase().replace(/\s+/g, '').slice(0, 15)

/** Trim, upper-case and clear what doesn't apply (Casual dates, Composition's filing and e-invoice). */
export function normalizeRegistration(d: GstRegistration): GstRegistration {
  const composition = d.scheme === 'Composition'
  const casual = d.regType === 'Casual'
  return {
    ...d,
    gstin: normalizeGstin(d.gstin),
    legal: d.legal.trim(),
    trade: d.trade.trim(),
    validFrom: casual ? d.validFrom : '',
    validTo: casual ? d.validTo : '',
    filing: composition ? 'Quarterly' : d.filing === 'Monthly' ? 'Monthly' : 'Quarterly',
    eInvoice: composition ? false : !!d.eInvoice,
    ewayMin: Math.trunc(Number(d.ewayMin)),
    series: d.series.trim().toUpperCase().replace(/\s+/g, ''),
    addr1: d.addr1.trim(),
    city: d.city.trim(),
    postal: d.postal.trim(),
    primary: !casual && !!d.primary,
  }
}

export interface ValidateRegistrationContext {
  mode: 'new' | 'edit'
  /** Every other registration (not the one being saved). */
  others: readonly GstRegistration[]
  /** The saved record when editing. */
  original: GstRegistration | null
  /** Business profile PAN; '' when none is set. */
  pan: string
  /** ISO date of today. */
  today: string
  /** Financial year start month name (Regional & format), for the invoice-number length check. */
  fiscalStart: string
  /** The date the financial year label is taken at. */
  now?: Date
}

const daysBetween = (from: string, to: string): number =>
  Math.round((new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86_400_000) + 1

/** Field errors for a registration being saved (empty when valid). Keys are editor field keys. */
export function validateRegistration(draft: GstRegistration, ctx: ValidateRegistrationContext): Record<string, string> {
  const errors: Record<string, string> = {}
  const { others, today } = ctx
  const pan = ctx.pan.trim().toUpperCase()

  if (ctx.mode === 'new') {
    const g = draft.gstin
    const check = checkGstin(g)
    if (!g) errors.gstin = 'Enter the GSTIN from your registration certificate.'
    else if (check.status === 'empty' || check.status === 'partial' || g.length < 15) errors.gstin = 'A GSTIN has 15 characters.'
    else if (check.status === 'invalid') errors.gstin = check.error
    else if (check.state.legacy) errors.gstin = `State code ${check.state.code} is retired — ${check.state.note.replace(/^Retired — /, '')}.`
    else if (check.typo) errors.gstin = 'The last character doesn’t check out — re-check the GSTIN on your certificate.'
    else if (others.some((r) => r.gstin === g)) errors.gstin = 'This GSTIN is already on the list.'
    else if (pan && check.pan !== pan) {
      errors.gstin = `The PAN inside this GSTIN (${check.pan}) isn’t your business PAN (${pan}). All your registrations share one PAN.`
    }
  }

  const state = gstStateByCode(draft.gstin.slice(0, 2))
  if (!errors.gstin && state && draft.status !== 'Cancelled' && draft.regType !== 'Casual') {
    const clash = others.find((r) => isActive(r) && !isCasual(r) && r.gstin.slice(0, 2) === state.code)
    if (clash) {
      errors.gstin = `You already have an active registration in ${state.name} (${clash.gstin}). One regular registration per state — choose Casual for a temporary one.`
    }
  }

  if (!draft.legal.trim()) errors.legal = 'Enter the legal name as on the certificate.'
  if (draft.registeredOn && draft.registeredOn > today) errors.registeredOn = 'Can’t be in the future.'

  if (draft.regType === 'Casual') {
    if (!draft.validFrom || !draft.validTo) errors.validTo = 'Enter both dates — a casual registration runs for a fixed period.'
    else if (draft.validTo < draft.validFrom) errors.validTo = 'The end date is before the start date.'
    else {
      const days = daysBetween(draft.validFrom, draft.validTo)
      if (days > CASUAL_MAX_DAYS) errors.validTo = `That’s ${days} days. A casual registration runs up to 90 days, plus one 90-day extension.`
    }
  }

  const series = draft.series.trim().toUpperCase()
  if (!series) errors.series = 'Enter a prefix — invoices from this registration start with it.'
  else if (!/^[A-Z0-9/-]*$/.test(series.replace(/\{FY\}/g, ''))) errors.series = 'Use letters, digits, “/”, “-” and {FY} only.'
  else if (seriesText(series, fiscalYearLabel(ctx.now ?? new Date(), ctx.fiscalStart)).length > INVOICE_NUMBER_MAX) {
    errors.series = `Too long — a GST invoice number is at most ${INVOICE_NUMBER_MAX} characters, and 4 are the running number.`
  } else {
    const dup = others.find((r) => isActive(r) && r.series.toUpperCase() === series)
    if (dup) errors.series = `Already used by ${dup.gstin} — each registration numbers its own invoices.`
  }

  if (!Number.isInteger(Number(draft.ewayMin)) || Number(draft.ewayMin) < 0) errors.ewayMin = 'Enter a whole rupee amount.'
  if (draft.postal && !/^\d{6}$/.test(draft.postal)) errors.postal = 'A PIN code has 6 digits.'

  if (ctx.mode === 'edit' && ctx.original?.primary && !draft.primary && !others.some((r) => r.primary && isActive(r))) {
    errors.primary = 'Make another registration primary instead — you always need one.'
  }
  return errors
}

/** Why a registration can't be cancelled (or, when active, deleted), or null. */
export function cancelBlockReason(r: GstRegistration, list: readonly GstRegistration[], sites: readonly Pick<Warehouse, 'name' | 'country' | 'status' | 'state'>[]): string | null {
  if (r.primary && isActive(r)) return 'This is your primary registration — make another one primary first.'
  const state = registrationState(r)
  const mine = registrationSites(r, sites)
  if (mine.length > 0 && state && !stateCovered(list, state.code, r.id)) {
    return `${mine.length === 1 ? `${mine[0].name} is` : `${mine.length} locations are`} in ${state.name} and would be left without a registration.`
  }
  return null
}

/** Why a registration can't be deleted, or null. A cancelled one can always be deleted here (the backend also checks documents). */
export function deleteBlockReason(r: GstRegistration, list: readonly GstRegistration[], sites: readonly Pick<Warehouse, 'name' | 'country' | 'status' | 'state'>[]): string | null {
  return isActive(r) ? cancelBlockReason(r, list, sites) : null
}

/** Why a cancelled registration can't be reactivated, or null. */
export function reactivateBlockReason(r: GstRegistration, list: readonly GstRegistration[]): string | null {
  const state = registrationState(r)
  if (!isCasual(r) && state && stateCovered(list, state.code, r.id)) return `Another active registration already covers ${state.name}.`
  return null
}

/** Why a registration can't be made primary, or null. */
export function makePrimaryBlockReason(r: GstRegistration): string | null {
  if (r.primary && isActive(r)) return 'Already primary.'
  if (!isActive(r)) return 'It’s cancelled.'
  if (isCasual(r)) return 'Casual registrations can’t be primary.'
  return null
}

/** Guarantee one primary: when none is left, the first active Normal registration becomes it. */
export function ensurePrimary(list: readonly GstRegistration[]): GstRegistration[] {
  if (list.some((r) => r.primary && isActive(r))) return [...list]
  const first = list.find((r) => isActive(r) && !isCasual(r))
  return first ? list.map((r) => (r.id === first.id ? { ...r, primary: true } : r)) : [...list]
}

/** The list after saving `rec` (insert or replace): a primary record clears the others' flag. */
export function applySave(list: readonly GstRegistration[], rec: GstRegistration): GstRegistration[] {
  const exists = list.some((r) => r.id === rec.id)
  let next = exists ? list.map((r) => (r.id === rec.id ? rec : r)) : [...list, rec]
  if (rec.primary) next = next.map((r) => (r.id === rec.id ? r : { ...r, primary: false }))
  return ensurePrimary(next)
}

export const applyMakePrimary = (list: readonly GstRegistration[], id: string): GstRegistration[] =>
  list.map((r) => ({ ...r, primary: r.id === id }))

export const applyCancel = (list: readonly GstRegistration[], id: string, today: string): GstRegistration[] =>
  ensurePrimary(list.map((r) => (r.id === id ? { ...r, status: 'Cancelled', cancelledOn: today, primary: false } : r)))

export const applyReactivate = (list: readonly GstRegistration[], id: string): GstRegistration[] =>
  ensurePrimary(list.map((r) => (r.id === id ? { ...r, status: 'Active', cancelledOn: '' } : r)))

export const applyRemove = (list: readonly GstRegistration[], id: string): GstRegistration[] =>
  ensurePrimary(list.filter((r) => r.id !== id))

/** Order of the list: primary first, then active by GSTIN, then cancelled. */
export function orderRegistrations<T extends Pick<GstRegistration, 'status' | 'primary' | 'gstin'>>(list: readonly T[]): T[] {
  const rank = (r: T) => (!isActive(r) ? 2 : r.primary ? 0 : 1)
  return [...list].sort((a, b) => rank(a) - rank(b) || a.gstin.localeCompare(b.gstin))
}

/** `Primary` / `Registered` when an active Normal registration is in the state, else ''. */
export function stateRegistrationBadge(list: readonly GstRegistration[], stateCode: string): 'Primary' | 'Registered' | '' {
  const hit = list.filter((r) => isActive(r) && !isCasual(r) && r.gstin.slice(0, 2) === stateCode)
  if (hit.length === 0) return ''
  return hit.some((r) => r.primary) ? 'Primary' : 'Registered'
}

/** Trading sites (non-inactive, Indian) per state code. */
export function siteCountsByState(sites: readonly Pick<Warehouse, 'country' | 'status' | 'state'>[]): Map<string, number> {
  const out = new Map<string, number>()
  for (const w of sites) if (isIndianTradingSite(w)) out.set(w.state, (out.get(w.state) ?? 0) + 1)
  return out
}

/**
 * How tax splits for a party in `theirs`, read from the business's registrations (G-025): the same
 * state as one of our active registrations is CGST + SGST (or UTGST); otherwise IGST against the
 * primary registration's state. With no registrations at all it falls back on `fallback` (the
 * Business profile state).
 */
export function registrationSplit(
  list: readonly GstRegistration[],
  theirs: GstState,
  fallback: GstState | null,
  splitText: (s: GstState) => string,
): { same: boolean; text: string } {
  const covered = list.some((r) => isActive(r) && !isCasual(r) && r.gstin.slice(0, 2) === theirs.code)
  if (covered) return { same: true, text: `Same state as your registration → ${splitText(theirs)}` }
  const ours = registrationState(primaryRegistration(list)) ?? fallback
  if (!ours) return { same: false, text: 'Set your business state to see the split.' }
  if (ours.code === theirs.code) return { same: true, text: `Same state as you → ${splitText(theirs)}` }
  return { same: false, text: `${ours.abbr} → ${theirs.abbr} · IGST` }
}
