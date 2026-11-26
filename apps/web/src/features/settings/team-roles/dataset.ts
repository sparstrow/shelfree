import type { Dataset, GridColumn } from '@/components/data-grid/model'
import type { RoleDef } from '@/data/schemas'
import { PEOPLE_MODULES, accessSummary } from '@/domain/people'
import { levelWord } from '@/domain/roles'
import { EM_DASH } from '@/lib/format'

/** A role definition plus who holds it (worked out from the users, never stored). */
export type RoleRow = RoleDef & { people: number; members: { id: string; name: string }[] }

export const toRoleDef = (r: RoleRow): RoleDef => ({
  id: r.id,
  desc: r.desc,
  perms: r.perms,
  settings: r.settings,
  ...(r.updatedAt ? { updatedAt: r.updatedAt } : {}),
})

const col = (key: string, label: string, width: number, extra: Partial<GridColumn> = {}): GridColumn => ({
  key,
  label,
  width,
  min: Math.min(width, 80),
  visible: true,
  align: 'left',
  type: 'text',
  sortable: true,
  ...extra,
})

const MODULE_PREFIX = 'm:'

export function teamRolesDataset(): Dataset<RoleRow> {
  const raw = (r: RoleRow, key: string): string | number => {
    if (key.startsWith(MODULE_PREFIX)) {
      return levelWord(r.perms, key.slice(MODULE_PREFIX.length) as (typeof PEOPLE_MODULES)[number]['key'])
    }
    switch (key) {
      case 'id':
        return r.id
      case 'people':
        return r.people
      case 'members':
        return r.members.map((m) => m.name).join(', ')
      case 'access':
        return accessSummary(r.perms)
      case 'desc':
        return r.desc
      default:
        return ''
    }
  }
  return {
    id: 'settings-team-roles',
    noun: 'role',
    nounPlural: 'roles',
    idOf: (r) => r.id,
    columns: [
      col('id', 'Role', 130, { frozen: 'left', hideable: false }),
      col('people', 'People', 84, { type: 'num', align: 'right' }),
      col('members', 'Members', 220, { min: 120 }),
      col('access', 'Module access', 140),
      ...PEOPLE_MODULES.map((m) => col(`${MODULE_PREFIX}${m.key}`, m.label, 96)),
      col('desc', 'Description', 280, { min: 140 }),
    ],
    raw,
    text: (r, key) => {
      const v = raw(r, key)
      return v === '' ? EM_DASH : String(v)
    },
    searchBlob: (r) => [r.id, r.desc, ...r.members.map((m) => m.name)].join(' \u0001 ').toLowerCase(),
    views: [
      { id: 'all', name: 'All roles', system: true, filters: [] },
      { id: 'inuse', name: 'In use', filters: [{ key: 'people', op: '>', value: '0' }] },
      { id: 'empty', name: 'No people', filters: [{ key: 'people', op: '=', value: '0' }] },
    ],
    filterColumns: [
      { key: 'id', label: 'Role', type: 'text' },
      { key: 'people', label: 'People', type: 'num' },
    ],
    defaultSort: { key: 'id', dir: 'asc' },
  }
}
