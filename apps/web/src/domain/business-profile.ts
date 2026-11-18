/** Rules for the workspace identity (Settings ▸ Business profile). Pure; the backend enforces the same. */
import { GST_STATES } from './gst'

export const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/
export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/

export const INDUSTRIES = ['Manufacturing', 'Retail', 'Wholesale & distribution', 'Services', 'Other'] as const

/** States offered for the registered address (retired GST codes are not). */
export const PROFILE_STATES: readonly string[] = GST_STATES.filter((s) => !s.legacy && s.code !== '96' && s.code !== '97').map((s) => s.name)

export const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

export const isValidPostal = (postal: string): boolean => /^[1-9][0-9]{5}$/.test(postal.trim())

/** The PAN is characters 3 to 12 of a GSTIN. */
export const panFromGstin = (gstin: string): string => gstin.slice(2, 12)

/** The two-digit state code a GSTIN starts with, as a state name; null when unknown. */
export function gstinStateName(gstin: string): string | null {
  return GST_STATES.find((s) => s.code === gstin.slice(0, 2))?.name ?? null
}

/** Blocking error for a required text value, or null. */
export const requiredError = (value: string, what: string): string | null => (value.trim() ? null : `Enter ${what}.`)

/** Non-blocking note about the PAN, or null when it is fine or empty. */
export function panWarning(pan: string, gstin: string): string | null {
  if (!pan.trim()) return null
  if (!PAN_PATTERN.test(pan.trim())) return 'A PAN is 5 letters, 4 digits, 1 letter — for example ABCDE1234F.'
  if (GSTIN_PATTERN.test(gstin) && panFromGstin(gstin) !== pan.trim()) return 'This differs from the PAN inside your GSTIN.'
  return null
}

/** Non-blocking note when the registered state and the GSTIN's state code disagree. */
export function stateWarning(region: string, gstin: string): string | null {
  const fromGstin = gstinStateName(gstin)
  if (!fromGstin || !region || fromGstin === region) return null
  return `Your GSTIN is registered in ${fromGstin}.`
}
