/**
 * Who is signed in and which workspace they are in. Demo values today (the
 * prototype's `meDefaults()` / `wsDefaults()`) with the user's saved settings
 * layered on top; the real backend supplies both from the session and the
 * tenant's settings. No credentials or tokens are ever stored client-side.
 */
import { z } from 'zod'
import { DENSITY_OPTIONS, NOTIFY_CHANNEL_OPTIONS, THEME_OPTIONS, clampAssemblyQty, initials } from '@/domain/personal-preferences'
import { api } from './index'

export const workspaceSchema = z.object({
  name: z.string(),
  legal: z.string(),
  industry: z.string(),
  email: z.string(),
  phone: z.string(),
  addr1: z.string(),
  city: z.string(),
  region: z.string(),
  postal: z.string(),
  country: z.string(),
  gstin: z.string(),
  pan: z.string(),
  currency: z.string(),
  timezone: z.string(),
  dateFmt: z.string(),
  numFmt: z.string(),
  fiscalStart: z.string(),
  weekStart: z.string(),
})
export type Workspace = z.infer<typeof workspaceSchema>

export const meSchema = z.object({
  name: z.string(),
  title: z.string(),
  email: z.string(),
  phone: z.string(),
  avatar: z.string(),
  language: z.string(),
  locale: z.string(),
  defLocation: z.string(),
  /** `?` on a Settings page shows every description inline. Off by default (quiet pages). */
  showSetHelp: z.boolean(),
  // ── Personal settings (run 2.6). One flat record per user; each section saves only its own keys. ──
  /** Appearance. `system` follows the device. */
  theme: z.enum(THEME_OPTIONS),
  /** Default row density of data grids. */
  defDensity: z.enum(DENSITY_OPTIONS),
  /** Notifications. */
  notifyLowStock: z.boolean(),
  notifyPO: z.boolean(),
  notifyMentions: z.boolean(),
  notifyDigest: z.boolean(),
  notifyChannel: z.enum(NOTIFY_CHANNEL_OPTIONS),
  /** Language & region. '' = the workspace format (Settings ▸ Regional & format). */
  dateFmt: z.string(),
  numFmt: z.string(),
  /** Personal defaults. */
  defLanding: z.string(),
  defAssemblyLoc: z.string(),
  defAssemblyQty: z.number().int().min(1),
  showTaxSplit: z.boolean(),
  /** Page search lists recently opened pages when the box is empty (Favorites & views). */
  showRecents: z.boolean(),
  /** Security: a flag only. The password, the second factor and the sessions live with the backend. */
  twoFA: z.boolean(),
})
export type Me = z.infer<typeof meSchema>

const WORKSPACE: Workspace = {
  name: 'Kanalora',
  legal: 'Kanalora Crafts Pvt. Ltd.',
  industry: 'Manufacturing',
  email: 'ops@kanalora.example',
  phone: '+91 90031 44210',
  addr1: 'Kanakaraya Mudali Street',
  city: 'Tiruvannamalai',
  region: 'Tamil Nadu',
  postal: '606601',
  country: 'India',
  gstin: '33ABCDE1234F1Z7',
  pan: 'ABCDE1234F',
  currency: 'INR',
  timezone: 'Asia/Kolkata (IST)',
  dateFmt: 'DD/MM/YYYY',
  numFmt: '12,34,567.89',
  fiscalStart: 'April',
  weekStart: 'Monday',
}

const ME: Me = {
  name: 'Kavitha Elumalai',
  title: 'Finance Manager',
  email: 'kavitha.elumalai@kanalora.example',
  phone: '+91 90031 44378',
  avatar: 'KE',
  language: 'English (India)',
  locale: 'en-IN',
  defLocation: 'TVM-MAIN',
  showSetHelp: false,
  theme: 'dark',
  // The grid has always opened compact; the prototype stored this value but never applied it.
  defDensity: 'compact',
  notifyLowStock: true,
  notifyPO: true,
  notifyMentions: true,
  notifyDigest: false,
  notifyChannel: 'In-app + email',
  dateFmt: '',
  numFmt: '',
  // The prototype's default was Warehouse · Items but only ever applied Departments; the app opens on Purchase Orders.
  defLanding: 'Purchasing · Purchase Orders',
  defAssemblyLoc: '',
  defAssemblyQty: 1,
  showTaxSplit: false,
  showRecents: true,
  twoFA: true,
}

const WORKSPACE_KEY = 'shelfree.v2.workspace'
const ME_KEY = 'shelfree.v2.me'

/** Saved values on top of the demo ones. */
function readStored<S extends z.ZodType>(key: string, schema: S, base: z.infer<S>): z.infer<S> {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return schema.parse({ ...(base as object), ...(JSON.parse(raw) as object) }) as z.infer<S>
  } catch {
    // Unreadable or outdated: fall back to the demo values.
  }
  return schema.parse(base) as z.infer<S>
}

function writeStored(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage unavailable: the change lasts for this session only.
  }
}

/** The workspace identity as stored right now, read synchronously (seed data for collections that start from it). */
export const workspaceSnapshot = (): Workspace => readStored(WORKSPACE_KEY, workspaceSchema, WORKSPACE)

/** The theme the first React build kept in the UI preferences (`shelfree.v2.ui`), used until the user saves one. */
function legacyTheme(): Me['theme'] | null {
  try {
    const t = (JSON.parse(localStorage.getItem('shelfree.v2.ui') ?? '{}') as { state?: { theme?: unknown } }).state?.theme
    return t === 'light' || t === 'dark' ? t : null
  } catch {
    return null
  }
}

function readMe(): Me {
  let stored: Partial<Me> = {}
  try {
    stored = JSON.parse(localStorage.getItem(ME_KEY) ?? '{}') as Partial<Me>
  } catch {
    // Unreadable: demo values.
  }
  const base = stored.theme ? ME : { ...ME, theme: legacyTheme() ?? ME.theme }
  return readStored(ME_KEY, meSchema, base)
}

/** The signed-in user's preferences as stored right now, read synchronously (pre-paint theme, grid density). */
export const meSnapshot = (): Me => readMe()

/** Keep the People ▸ Users record in step with the profile (same person, one set of details). */
async function mirrorProfileToUser(before: Me, after: Me): Promise<void> {
  if (before.name === after.name && before.email === after.email) return
  const users = await api.users.list()
  const mine = users.find((u) => u.email.trim().toLowerCase() === before.email.trim().toLowerCase())
  if (mine) await api.users.upsert({ ...mine, name: after.name, email: after.email })
}

export const sessionApi = {
  workspace: (): Promise<Workspace> => Promise.resolve(readStored(WORKSPACE_KEY, workspaceSchema, WORKSPACE)),
  /** Settings ▸ Business profile. Backend: `PATCH /workspace`, owner / admin only. */
  updateWorkspace: (next: Workspace): Promise<Workspace> => {
    const parsed = workspaceSchema.parse(next)
    writeStored(WORKSPACE_KEY, parsed)
    return Promise.resolve(parsed)
  },
  me: (): Promise<Me> => Promise.resolve(readMe()),
  /**
   * My settings, saved at block level: only the keys in `patch` change, on top of what is stored now, so one
   * section's save never overwrites another's. A profile change is mirrored to the matching People ▸ Users record.
   * Backend: `PATCH /me/settings` (the user comes from the session, never from the body).
   */
  patchMe: async (patch: Partial<Me>): Promise<Me> => {
    const before = readMe()
    const merged: Me = { ...before, ...patch }
    if ('name' in patch) merged.avatar = initials(merged.name)
    if ('defAssemblyQty' in patch) merged.defAssemblyQty = clampAssemblyQty(merged.defAssemblyQty)
    const parsed = meSchema.parse(merged)
    writeStored(ME_KEY, parsed)
    await mirrorProfileToUser(before, parsed)
    return parsed
  },
}
