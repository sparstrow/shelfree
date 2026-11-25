/**
 * Team & roles — role definitions (a role's default module access) and who holds each role.
 * Pure rules (no React, no storage); the backend enforces the same. See docs/team-roles/README.md.
 *
 * A role definition is what a role *starts* a person with (new user, or "Apply <role> defaults").
 * Each person keeps their own module access in People ▸ Users; editing a role never rewrites them.
 */
import type { RoleDef, User } from '@/data/schemas'
import {
  PEOPLE_MODULES,
  PERM_LEVELS,
  ROLE_PRESETS,
  type PeopleModuleKey,
  SETTINGS_AREA_MODULES,
  USER_ROLES,
  type UserRole,
  normalizePerms,
  permLevel,
  roleDefaultSettings,
} from './people'

export const ROLE_DESC_MAX = 140

/** What each built-in role is for (the prototype's role cards, for the roles People ▸ Users has). */
export const ROLE_DESCRIPTIONS: Readonly<Record<UserRole, string>> = {
  Admin: 'Manage all data and workspace settings.',
  Manager: 'Approve and edit within assigned modules.',
  Warehouse: 'Receive, move and count stock; run assembly.',
  Sales: 'Sales orders, customers and prices.',
  Purchasing: 'Purchase orders, vendors and receipts.',
  Finance: 'Books, tax and bank accounts; read access elsewhere.',
  Viewer: 'Look but not change; no admin settings.',
}

/** Admin always has full access — it is what keeps a workspace reachable. */
export const LOCKED_ROLE = 'Admin'

export const ADMIN_LOCKED_REASON = 'Admin always has full access to every module and its settings.'

/** The role definitions Shelfree starts with: the built-in presets. */
export function defaultRoleDefs(): RoleDef[] {
  return USER_ROLES.map((id) => {
    const perms = { ...ROLE_PRESETS[id] }
    return {
      id,
      desc: ROLE_DESCRIPTIONS[id],
      perms,
      settings: roleDefaultSettings(id, perms),
    }
  })
}

/** Trim the description; fill every module's access; "manage settings" only where it can apply. */
export function normalizeRoleDef(def: RoleDef): RoleDef {
  const perms = normalizePerms(def.perms)
  const settings: Record<string, boolean> = {}
  for (const mod of PEOPLE_MODULES) {
    settings[mod.key] =
      SETTINGS_AREA_MODULES.has(mod.key) && permLevel(perms, mod.key) !== 'none' && def.settings?.[mod.key] === true
  }
  return { ...def, desc: def.desc.trim(), perms, settings }
}

/** Field errors by key; empty when valid. */
export function validateRoleDef(def: RoleDef): Record<string, string> {
  const err: Record<string, string> = {}
  if (def.desc.trim().length > ROLE_DESC_MAX) err.desc = `Keep it to ${ROLE_DESC_MAX} characters.`
  for (const mod of PEOPLE_MODULES) {
    const v = def.perms[mod.key]
    if (v !== undefined && !(PERM_LEVELS as readonly string[]).includes(v)) err.perms = `Pick none, read or write for ${mod.label}.`
  }
  if (def.id === LOCKED_ROLE) {
    const full = PEOPLE_MODULES.every((m) => permLevel(def.perms, m.key) === 'write')
    if (!full) err.perms = ADMIN_LOCKED_REASON
  }
  return err
}

/** Why a role can't be edited, or null. */
export function roleEditBlock(def: Pick<RoleDef, 'id'>): string | null {
  return def.id === LOCKED_ROLE ? ADMIN_LOCKED_REASON : null
}

export interface RoleHolders {
  count: number
  /** Names, in the order the users are stored. */
  names: string[]
}

/** Who holds each role, worked out from the users (never stored). Suspended users still hold the role. */
export function roleHolders(users: readonly Pick<User, 'role' | 'name'>[]): Map<string, RoleHolders> {
  const out = new Map<string, RoleHolders>()
  for (const u of users) {
    const row = out.get(u.role) ?? { count: 0, names: [] }
    row.count += 1
    row.names.push(u.name)
    out.set(u.role, row)
  }
  return out
}

export function peopleLabel(count: number): string {
  return `${count} ${count === 1 ? 'person' : 'people'}`
}

const LEVEL_WORD = { write: 'Full', read: 'View', none: 'None' } as const

/** The prototype's permission matrix cell: Full / View / None. */
export function levelWord(perms: Record<string, string> | undefined, key: PeopleModuleKey): 'Full' | 'View' | 'None' {
  return LEVEL_WORD[permLevel(perms, key)]
}
