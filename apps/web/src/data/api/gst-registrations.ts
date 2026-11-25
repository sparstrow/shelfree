/**
 * Commands behind Settings ▸ Workspace ▸ GST registrations. Each function is one future backend
 * endpoint (see docs/gst-registrations/README.md). They enforce the rules in
 * `domain/gst-registrations` and keep the workspace's `gstin` (Business profile) as a read mirror
 * of the primary registration.
 */
import { api } from '@/data/api'
import { CommandError } from '@/data/api/commands'
import { sessionApi } from '@/data/api/session'
import { settingsApi } from '@/data/api/settings'
import { type GstRegistration, gstRegistrationSchema } from '@/data/schemas'
import {
  applyCancel,
  applyMakePrimary,
  applyReactivate,
  applyRemove,
  applySave,
  cancelBlockReason,
  deleteBlockReason,
  makePrimaryBlockReason,
  normalizeRegistration,
  primaryRegistration,
  reactivateBlockReason,
  validateRegistration,
} from '@/domain/gst-registrations'
import { todayLocal } from '@/lib/format'

const firstError = (errors: Record<string, string>): string | undefined => Object.values(errors)[0]

/** Write only what changed between two lists, then mirror the primary GSTIN onto the workspace. */
async function commit(before: readonly GstRegistration[], after: readonly GstRegistration[]): Promise<void> {
  const now = new Date().toISOString()
  const prev = new Map(before.map((r) => [r.id, r]))
  const changed = after
    .filter((r) => JSON.stringify(prev.get(r.id)) !== JSON.stringify(r))
    .map((r) => gstRegistrationSchema.parse({ ...r, createdAt: r.createdAt ?? prev.get(r.id)?.createdAt ?? now, updatedAt: now }))
  if (changed.length > 0) await api.gstRegistrations.upsertMany(changed)
  const keep = new Set(after.map((r) => r.id))
  for (const r of before) if (!keep.has(r.id)) await api.gstRegistrations.remove(r.id)
  const primary = primaryRegistration(after)
  const ws = await sessionApi.workspace()
  const mirror = primary?.gstin ?? ''
  if (ws.gstin !== mirror) await sessionApi.updateWorkspace({ ...ws, gstin: mirror })
}

async function load(id: string) {
  const [all, sites] = await Promise.all([api.gstRegistrations.list(), api.warehouses.list()])
  const reg = all.find((r) => r.id === id)
  if (!reg) throw new CommandError('Registration not found.')
  return { all, sites, reg }
}

/** Create or update a registration: `POST /gst-registrations`, `PATCH /gst-registrations/{id}` (the GSTIN never changes). */
export async function saveGstRegistration(input: GstRegistration): Promise<GstRegistration> {
  const [all, ws, settings] = await Promise.all([api.gstRegistrations.list(), sessionApi.workspace(), settingsApi.get()])
  const original = all.find((r) => r.id === input.id) ?? null
  const candidate = normalizeRegistration(original ? { ...input, gstin: original.gstin } : input)
  const problem = firstError(
    validateRegistration(candidate, {
      mode: original ? 'edit' : 'new',
      others: all.filter((r) => r.id !== candidate.id),
      original,
      pan: ws.pan,
      today: todayLocal(),
      fiscalStart: settings.regional.fiscalStart,
    }),
  )
  if (problem) throw new CommandError(problem)
  const saved: GstRegistration = {
    ...candidate,
    id: original?.id ?? `REG-${Date.now().toString(36).toUpperCase()}`,
    status: original?.status ?? 'Active',
    cancelledOn: original?.cancelledOn ?? '',
  }
  await commit(all, applySave(all, saved))
  return saved
}

/** Make a registration the primary one: `POST /gst-registrations/{id}/make-primary`. */
export async function makeGstRegistrationPrimary(id: string): Promise<void> {
  const { all, reg } = await load(id)
  const reason = makePrimaryBlockReason(reg)
  if (reason) throw new CommandError(reason)
  await commit(all, applyMakePrimary(all, id))
}

/** Cancel a registration (kept, dimmed): `POST /gst-registrations/{id}/cancel`. */
export async function cancelGstRegistration(id: string): Promise<void> {
  const { all, sites, reg } = await load(id)
  const reason = cancelBlockReason(reg, all, sites)
  if (reason) throw new CommandError(reason)
  await commit(all, applyCancel(all, id, todayLocal()))
}

/** Reactivate a cancelled registration: `POST /gst-registrations/{id}/reactivate`. */
export async function reactivateGstRegistration(id: string): Promise<void> {
  const { all, reg } = await load(id)
  const reason = reactivateBlockReason(reg, all)
  if (reason) throw new CommandError(reason)
  await commit(all, applyReactivate(all, id))
}

/** Delete a registration: `DELETE /gst-registrations/{id}`. */
export async function deleteGstRegistration(id: string): Promise<void> {
  const { all, sites, reg } = await load(id)
  const reason = deleteBlockReason(reg, all, sites)
  if (reason) throw new CommandError(reason)
  await commit(all, applyRemove(all, id))
}

/** Put a deleted registration back (Undo), exactly as it was. */
export async function restoreGstRegistration(reg: GstRegistration): Promise<void> {
  const all = await api.gstRegistrations.list()
  if (all.some((r) => r.id === reg.id)) return
  await commit(all, applySave(all, reg))
}
