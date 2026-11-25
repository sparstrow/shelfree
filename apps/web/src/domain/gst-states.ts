/**
 * States & territories — the official GST state codes (GSTIN digits 1–2) as a reference list,
 * plus the GSTIN check. Pure rules; the backend enforces the same. See docs/states/README.md.
 * The table itself is `GST_STATES` in `domain/gst.ts` (also the seed of the `gstStates` collection).
 */
import type { Customer, Vendor } from '@/data/schemas'
import { type GstState, type GstStateType, gstStateByCode, gstStateByName } from './gst'

export const GST_STATE_TYPE_LABELS: Readonly<Record<GstStateType, string>> = {
  state: 'State',
  'ut-leg': 'UT with legislature',
  ut: 'UT without legislature',
  other: 'Other territory',
  foreign: 'Outside India',
}

export const stateTypeLabel = (s: Pick<GstState, 'type'>): string => GST_STATE_TYPE_LABELS[s.type] ?? '—'

/** What the same-state tax splits into for a state. */
export function stateSplitText(s: Pick<GstState, 'type' | 'ut'> | null | undefined): string {
  if (!s) return '—'
  if (s.type === 'foreign') return 'IGST only'
  return s.ut ? 'CGST + UTGST' : 'CGST + SGST'
}

/** Sort order of the list: current codes first, then by code. */
export function sortStates<T extends Pick<GstState, 'code' | 'legacy'>>(states: readonly T[]): T[] {
  return [...states].sort((a, b) => Number(a.legacy) - Number(b.legacy) || a.code.localeCompare(b.code))
}

export interface PartyCount {
  vendors: number
  customers: number
}

/** Vendors and customers whose address state is each state, keyed by state code. */
export function partyCounts(
  vendors: readonly Pick<Vendor, 'state'>[],
  customers: readonly Pick<Customer, 'state'>[],
): Map<string, PartyCount> {
  const out = new Map<string, PartyCount>()
  const add = (name: string, key: keyof PartyCount) => {
    const hit = gstStateByName(name)
    if (!hit) return
    const cur = out.get(hit.code) ?? { vendors: 0, customers: 0 }
    cur[key] += 1
    out.set(hit.code, cur)
  }
  vendors.forEach((v) => add(v.state, 'vendors'))
  customers.forEach((c) => add(c.state, 'customers'))
  return out
}

export function partiesText(p: PartyCount | undefined): string {
  if (!p) return ''
  const parts: string[] = []
  if (p.vendors) parts.push(`${p.vendors} ${p.vendors === 1 ? 'vendor' : 'vendors'}`)
  if (p.customers) parts.push(`${p.customers} ${p.customers === 1 ? 'customer' : 'customers'}`)
  return parts.join(' and ')
}

const CHECK_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** The mod-36 check character (15th) a GSTIN should carry, from its first 14 characters. */
export function gstinCheckChar(gstin: string): string {
  let sum = 0
  for (let i = 0; i < 14; i++) {
    const product = CHECK_ALPHABET.indexOf(gstin[i] ?? '0') * (i % 2 ? 2 : 1)
    sum += Math.floor(product / 36) + (product % 36)
  }
  return CHECK_ALPHABET[(36 - (sum % 36)) % 36]
}

const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/

export type GstinCheck =
  | { status: 'empty' }
  | { status: 'invalid'; error: string; state?: GstState }
  | { status: 'partial'; state: GstState; message: string }
  | { status: 'valid'; state: GstState; pan: string; warning: string; typo: boolean }

/** Check what was typed in the "Check a GSTIN" box. A bad check character is a warning, never a block. */
export function checkGstin(input: string): GstinCheck {
  const g = input.trim().toUpperCase().replace(/\s+/g, '')
  if (!g) return { status: 'empty' }
  if (g.length < 2) {
    return /^\d$/.test(g) ? { status: 'empty' } : { status: 'invalid', error: 'A GSTIN starts with a two-digit state code.' }
  }
  const lead = /^\d{2}/.test(g)
  const state = lead ? gstStateByCode(g.slice(0, 2)) : null
  if (!state || state.type === 'foreign') {
    return {
      status: 'invalid',
      error: lead
        ? `“${g.slice(0, 2)}” isn’t a GST state code — a GSTIN starts with one of the codes in the list.`
        : 'A GSTIN starts with a two-digit state code.',
    }
  }
  if (g.length < 15) return { status: 'partial', state, message: `Keep typing — ${g.length} of 15 characters.` }
  if (!GSTIN_PATTERN.test(g)) {
    return {
      status: 'invalid',
      state,
      error: 'Not a valid GSTIN — expected state code, 10-character PAN, entity number, “Z”, then a check character.',
    }
  }
  if (state.legacy) return { status: 'valid', state, pan: g.slice(2, 12), warning: `${state.note}.`, typo: false }
  const typo = gstinCheckChar(g) !== g[14]
  return {
    status: 'valid',
    state,
    pan: g.slice(2, 12),
    warning: typo ? 'The last character doesn’t check out — probably a typo. Confirm the GSTIN with the party.' : '',
    typo,
  }
}

/** How tax splits between our state and the GSTIN's state. */
export function gstinSplit(ours: GstState | null | undefined, theirs: GstState): { same: boolean; text: string } {
  if (!ours) return { same: false, text: 'Set your business state to see the split.' }
  if (ours.code === theirs.code) return { same: true, text: `Same state as you → ${stateSplitText(theirs)}` }
  return { same: false, text: `${ours.abbr} → ${theirs.abbr} · IGST` }
}
