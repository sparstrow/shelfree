import type { Dataset, GridColumn, RawValue } from '@/components/data-grid/model'
import type { User } from '@/data/schemas'
import { USER_ROLES, USER_STATUSES, accessSummary, formatLastActive } from '@/domain/people'
import { maskEmail } from '@/lib/privacy'

const COLS: GridColumn[] = [
  { key: 'id', label: 'User ID', width: 100, min: 90, frozen: 'left', visible: true, align: 'left', type: 'mono', sortable: true },
  { key: 'name', label: 'Name', width: 185, min: 140, visible: true, align: 'left', type: 'text', sortable: true },
  { key: 'email', label: 'Email', width: 190, min: 145, visible: true, align: 'left', type: 'text', sortable: true, muted: true },
  { key: 'role', label: 'Role', width: 118, min: 95, visible: true, align: 'left', type: 'text', sortable: true },
  { key: 'status', label: 'Status', width: 112, min: 92, visible: true, align: 'left', type: 'pill', sortable: true },
  { key: 'twoFA', label: '2FA', width: 88, min: 76, visible: true, align: 'left', type: 'text', sortable: true },
  { key: 'lastActive', label: 'Last active', width: 120, min: 95, visible: true, align: 'left', type: 'text', sortable: true, muted: true },
  { key: 'access', label: 'Module access', width: 145, min: 115, visible: true, align: 'left', type: 'text', sortable: true },
  { key: 'empName', label: 'Employee', width: 165, min: 120, visible: false, align: 'left', type: 'text', sortable: true },
]

export function makeUsersDataset(empNames: Map<string, string>): Dataset<User> {
  const empLabel = (u: User) => (u.empId ? empNames.get(u.empId) ?? u.empId : '')
  const raw = (u: User, key: string): RawValue => {
    switch (key) {
      case 'id':
        return u.id
      case 'name':
        return u.name
      case 'email':
        return maskEmail(u.email)
      case 'role':
        return u.role
      case 'status':
        return u.status
      case 'twoFA':
        return u.twoFA ? 'Enabled' : 'Off'
      case 'lastActive':
        return u.lastActive ?? ''
      case 'access':
        return accessSummary(u.perms)
      case 'empName':
        return empLabel(u)
      default:
        return ''
    }
  }
  const text = (u: User, key: string): string => {
    if (key === 'lastActive') return formatLastActive(u.lastActive)
    if (key === 'empName') return empLabel(u) || '—'
    return String(raw(u, key))
  }
  return {
    id: 'people-users',
    noun: 'user',
    nounPlural: 'users',
    idOf: (u) => u.id,
    columns: COLS,
    raw,
    text,
    searchBlob: (u) => [u.id, u.name, maskEmail(u.email), u.role, u.status, empLabel(u)].join(' ').toLowerCase(),
    defaultSort: { key: 'id', dir: 'asc' },
    views: [
      { id: 'all', name: 'All users', system: true, filters: [] },
      { id: 'active', name: 'Active', system: true, filters: [{ key: 'status', op: 'isAny', value: ['Active'] }] },
      { id: 'pending', name: 'Pending', system: true, filters: [{ key: 'status', op: 'isAny', value: ['Pending'] }] },
      { id: 'suspended', name: 'Suspended', system: true, filters: [{ key: 'status', op: 'isAny', value: ['Suspended'] }] },
      { id: 'admins', name: 'Admins & managers', system: true, filters: [{ key: 'role', op: 'isAny', value: ['Admin', 'Manager'] }] },
    ],
    filterColumns: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'role', label: 'Role', type: 'enum', options: [...USER_ROLES] },
      { key: 'status', label: 'Status', type: 'enum', options: [...USER_STATUSES] },
      { key: 'twoFA', label: '2FA', type: 'enum', options: ['Enabled', 'Off'] },
    ],
    rowFlag: (u) =>
      u.status === 'Suspended'
        ? 'Suspended account'
        : u.role === 'Admin' && !u.twoFA
          ? 'Admin without 2FA'
          : null,
  }
}
