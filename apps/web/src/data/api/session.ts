/**
 * Who is signed in and which workspace they are in. Static demo values today
 * (the prototype's `meDefaults()` / `wsDefaults()`); the real backend supplies
 * these from the session. No credentials or tokens are ever stored client-side.
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
}

export const sessionApi = {
  workspace: (): Promise<Workspace> => Promise.resolve(workspaceSchema.parse(WORKSPACE)),
  me: (): Promise<Me> => Promise.resolve(meSchema.parse(ME)),
}
