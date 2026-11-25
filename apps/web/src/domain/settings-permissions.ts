/**
 * Pure access rules for Settings areas (`workspace`, `module`, `shared`, `personal`).
 * No React, DOM, or storage — the backend enforces the same checks per endpoint.
 *
 * Role mapping (`DemoRole` + `User` record):
 * - `role` uses the app's `DemoRole` values (`'owner' | 'admin' | 'member'`, see `app/stores/ui.ts`):
 *   - `'owner'` and `'admin'` have full view and edit access to Workspace settings,
 *     whole Shared lists, all Module settings, and Personal settings (regardless of
 *     per-module overrides on `user`).
 *   - `'member'` cannot view or edit Workspace settings or whole Shared lists; Personal
 *     settings are always viewable and editable; Module settings depend on the signed-in
 *     `User` record: viewing requires `user.perms[moduleId]` to be `'read'` or `'write'`
 *     (not `'none'`), and editing also requires `user.settings[moduleId] === true`.
 */
import type { User } from '@/data/schemas'

/** Mirrors `DemoRole` in `app/stores/ui.ts` (defined locally so `domain/` stays pure). */
export type SettingsRole = 'owner' | 'admin' | 'member'

export type SettingsAreaKind = 'workspace' | 'module' | 'shared' | 'personal'

export interface SettingsActor {
  role: SettingsRole
  user?: Pick<User, 'perms' | 'settings'> | null
}

function isOwnerOrAdmin(role: SettingsRole): boolean {
  return role === 'owner' || role === 'admin'
}

function hasModuleAccess(user: Pick<User, 'perms'> | null | undefined, moduleId?: string): boolean {
  if (!user || !moduleId) return false
  const level = user.perms?.[moduleId]
  return level === 'read' || level === 'write'
}

/** Whether the actor may open and read a settings area. */
export function canViewArea(actor: SettingsActor, kind: SettingsAreaKind, moduleId?: string): boolean {
  if (kind === 'personal') return true
  if (isOwnerOrAdmin(actor.role)) return true
  if (kind === 'module') return hasModuleAccess(actor.user, moduleId)
  return false
}

/** Whether the actor may modify and save settings in an area. */
export function canEditArea(actor: SettingsActor, kind: SettingsAreaKind, moduleId?: string): boolean {
  if (kind === 'personal') return true
  if (isOwnerOrAdmin(actor.role)) return true
  if (kind === 'module') {
    if (!moduleId || !actor.user) return false
    return hasModuleAccess(actor.user, moduleId) && actor.user.settings?.[moduleId] === true
  }
  return false
}
