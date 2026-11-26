/**
 * Personal settings (Settings ▸ Personal): the pure rules for one user's own preferences — options, defaults,
 * validation, and the resolvers that decide whether a personal value or the workspace value applies.
 * No React, no browser APIs; the backend enforces the same checks on `PATCH /me/settings`.
 * See docs/personal-settings/README.md.
 */
import type { RegionalSettings } from './regional'

// ── Appearance ───────────────────────────────────────────────────────────────
export const THEME_OPTIONS = ['dark', 'light', 'system'] as const
export type ThemePref = (typeof THEME_OPTIONS)[number]
export const THEME_LABELS: Readonly<Record<ThemePref, string>> = { dark: 'Dark', light: 'Light', system: 'Match my device' }

/** The theme to draw: `system` follows the device's colour scheme. */
export function resolveTheme(pref: string, systemDark: boolean): 'dark' | 'light' {
  if (pref === 'light') return 'light'
  if (pref === 'system') return systemDark ? 'dark' : 'light'
  return 'dark'
}

/** What the account-menu shortcut switches to: the opposite of what is on screen now. */
export const oppositeTheme = (shown: 'dark' | 'light'): 'dark' | 'light' => (shown === 'dark' ? 'light' : 'dark')

export const DENSITY_OPTIONS = ['compact', 'comfortable'] as const
export type DensityPref = (typeof DENSITY_OPTIONS)[number]
export const DENSITY_LABELS: Readonly<Record<DensityPref, string>> = { compact: 'Compact', comfortable: 'Comfortable' }

// ── Notifications ────────────────────────────────────────────────────────────
export const NOTIFY_CHANNEL_OPTIONS = ['In-app only', 'In-app + email', 'Email only'] as const

// ── Language & region ────────────────────────────────────────────────────────
export const LANGUAGE_OPTIONS = ['English (US)', 'English (UK)', 'English (India)', 'Hindi', 'Français', 'Deutsch', 'Español'] as const
export const LOCALE_OPTIONS = ['en-IN', 'en-US', 'en-GB', 'hi-IN', 'fr-FR', 'de-DE', 'es-ES'] as const
/** The empty string means "use the workspace's Regional & format value". */
export const USE_WORKSPACE = ''

export interface PersonalRegional {
  /** '' = the workspace date format. */
  dateFmt: string
  /** '' = the workspace number format. */
  numFmt: string
}

/**
 * The date and number format that applies to this user: their own choice when they made one, otherwise the
 * workspace's (Settings ▸ Regional & format). Currency, time zone and the financial year are never personal.
 */
export function resolveRegional(workspace: RegionalSettings, personal: Partial<PersonalRegional> | undefined): RegionalSettings {
  return {
    ...workspace,
    dateFmt: personal?.dateFmt ? personal.dateFmt : workspace.dateFmt,
    numFmt: personal?.numFmt ? personal.numFmt : workspace.numFmt,
  }
}

// ── Personal defaults ────────────────────────────────────────────────────────
export const DEPARTMENTS_LANDING = 'Departments'
/** Where the app opens, as the prototype lists them. Departments only opens while that page is on. */
export const LANDING_OPTIONS = [
  DEPARTMENTS_LANDING,
  'Home · Dashboard',
  'Warehouse · Items',
  'Purchasing · Purchase Orders',
  'Sales · Customers',
] as const

export type LandingTarget = { kind: 'departments' } | { kind: 'page'; module: string; slug: string }

/** The route a landing choice opens; null for anything unknown (the app default applies). */
export function landingTarget(label: string): LandingTarget | null {
  if (!(LANDING_OPTIONS as readonly string[]).includes(label)) return null
  if (label === DEPARTMENTS_LANDING) return { kind: 'departments' }
  const [moduleName, pageName] = label.split(' · ')
  return { kind: 'page', module: moduleName.toLowerCase(), slug: pageName.toLowerCase().replace(/[^a-z0-9]+/g, '-') }
}

export const MIN_ASSEMBLY_QTY = 1

/** Whole number of at least 1 (the prototype clamps; a blank or text value becomes 1). */
export function clampAssemblyQty(value: unknown): number {
  const n = Math.floor(Number(value))
  return Number.isFinite(n) && n >= MIN_ASSEMBLY_QTY ? n : MIN_ASSEMBLY_QTY
}

/** Where a new assembly order is built and how many it starts with: the user's default, else the workspace's. */
export function resolveAssemblyDefaults(
  personal: { defAssemblyLoc?: string; defAssemblyQty?: number } | undefined,
  workspaceOutputLoc: string,
): { location: string; qty: number } {
  return {
    location: personal?.defAssemblyLoc ? personal.defAssemblyLoc : workspaceOutputLoc,
    qty: clampAssemblyQty(personal?.defAssemblyQty),
  }
}

// ── Profile ──────────────────────────────────────────────────────────────────
export interface ProfileValues {
  name: string
  title: string
  email: string
  phone: string
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE = /^\+?[0-9][0-9 ()-]{5,18}$/

/** Blocking errors by key; empty when the profile can be saved. */
export function validateProfile(values: ProfileValues): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!values.name.trim()) errors.name = 'Enter your name.'
  else if (values.name.trim().length > 80) errors.name = 'Keep the name to 80 characters.'
  if (!values.email.trim()) errors.email = 'Enter your email.'
  else if (!EMAIL.test(values.email.trim())) errors.email = 'Enter a valid email address.'
  if (values.phone.trim() && !PHONE.test(values.phone.trim())) errors.phone = 'Enter a valid phone number, for example +91 90031 44378.'
  return errors
}

export function normalizeProfile(values: ProfileValues): ProfileValues {
  return {
    name: values.name.trim().replace(/\s+/g, ' '),
    title: values.title.trim(),
    email: values.email.trim().toLowerCase(),
    phone: values.phone.trim(),
  }
}

/** Up to two capitals for the avatar circle. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  const letters = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0]
  return letters.toUpperCase()
}

// ── Security ─────────────────────────────────────────────────────────────────
export const MIN_PASSWORD_LENGTH = 10

export interface PasswordForm {
  current: string
  next: string
  confirm: string
}

/** Blocking errors by key for a password change. The backend checks the same rules (and the current password). */
export function validatePasswordChange(form: PasswordForm): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.current) errors.current = 'Enter your current password.'
  if (form.next.length < MIN_PASSWORD_LENGTH) errors.next = `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  else if (!/[a-z]/.test(form.next) || !/[A-Z]/.test(form.next) || !/[0-9]/.test(form.next)) {
    errors.next = 'Mix upper case, lower case and a number.'
  } else if (form.next === form.current) errors.next = 'Choose a password you have not used here.'
  if (!errors.next && form.confirm !== form.next) errors.confirm = form.confirm ? 'The two passwords do not match.' : 'Enter the new password again.'
  return errors
}
