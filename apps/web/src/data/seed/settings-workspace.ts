/** Seed rows for the Workspace settings lists (run 2.5a): the business's GST registrations. */
import { workspaceSnapshot } from '@/data/api/session'
import type { GstRegistration } from '@/data/schemas'
import { seedRegistration } from '@/domain/gst-registrations'

/**
 * One registration, taken from the Business profile (its GSTIN, legal name and address) — there is no
 * second source. Tamil Nadu (state code 33) for Kanalora.
 */
export function seedGstRegistrations(): GstRegistration[] {
  return [seedRegistration(workspaceSnapshot())]
}
