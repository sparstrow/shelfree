/**
 * Who is signed in and which workspace they are in. Demo values today (the
 * prototype's `meDefaults()` / `wsDefaults()`) with the user's saved settings
 * layered on top; the real backend supplies both from the session and the
 * tenant's settings. No credentials or tokens are ever stored client-side.
 */
import { z } from 'zod'

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
  defLocation: 'TVM-Main',
  showSetHelp: false,
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

export const sessionApi = {
  workspace: (): Promise<Workspace> => Promise.resolve(readStored(WORKSPACE_KEY, workspaceSchema, WORKSPACE)),
  /** Settings ▸ Business profile. Backend: `PATCH /workspace`, owner / admin only. */
  updateWorkspace: (next: Workspace): Promise<Workspace> => {
    const parsed = workspaceSchema.parse(next)
    writeStored(WORKSPACE_KEY, parsed)
    return Promise.resolve(parsed)
  },
  me: (): Promise<Me> => Promise.resolve(readStored(ME_KEY, meSchema, ME)),
  /** My settings. Backend: `PATCH /me/settings`. */
  updateMe: (next: Me): Promise<Me> => {
    const parsed = meSchema.parse(next)
    writeStored(ME_KEY, parsed)
    return Promise.resolve(parsed)
  },
}
