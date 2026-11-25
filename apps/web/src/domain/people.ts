/**
 * Pure business rules for People (Users and Employees): role presets, module
 * access summaries, ID numbering, formatting, validation, status-change guards,
 * and delete protections. No React, DOM, or persistence here.
 */
import type { Employee, User } from '@/data/schemas'
import { EM_DASH, todayLocal } from '@/lib/format'

export const PEOPLE_MODULES = [
  { key: 'home', label: 'Home' },
  { key: 'finance', label: 'Finance' },
  { key: 'notes', label: 'Notes' },
  { key: 'sales', label: 'Sales' },
  { key: 'purchasing', label: 'Purchasing' },
  { key: 'warehouse', label: 'Warehouse' },
  { key: 'production', label: 'Production' },
  { key: 'people', label: 'People' },
] as const

export type PeopleModuleKey = (typeof PEOPLE_MODULES)[number]['key']

export const PERM_LEVELS = ['none', 'read', 'write'] as const
export type PermLevel = (typeof PERM_LEVELS)[number]

export const USER_ROLES = ['Admin', 'Manager', 'Warehouse', 'Sales', 'Purchasing', 'Finance', 'Viewer'] as const
export type UserRole = (typeof USER_ROLES)[number]

export const USER_STATUSES = ['Active', 'Pending', 'Suspended'] as const
export type UserStatus = (typeof USER_STATUSES)[number]

export const EMPLOYEE_DEPTS = ['Operations', 'Manufacturing', 'Warehouse', 'Sales', 'Purchasing', 'Finance'] as const
export type EmployeeDept = (typeof EMPLOYEE_DEPTS)[number]

export const EMPLOYEE_TYPES = ['Full-time', 'Part-time', 'Contractor'] as const
export type EmployeeType = (typeof EMPLOYEE_TYPES)[number]

export const EMPLOYEE_STATUSES = ['Active', 'On leave', 'Terminated'] as const
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number]

export const ROLE_HUE: Record<string, number | null> = {
  Admin: 58,
  Manager: 245,
  Sales: 155,
  Purchasing: 300,
  Warehouse: 70,
  Finance: 210,
  Viewer: null,
}

const ROLE_PRESETS: Record<UserRole, Record<PeopleModuleKey, PermLevel>> = {
  Admin: {
    home: 'write',
    finance: 'write',
    notes: 'write',
    sales: 'write',
    purchasing: 'write',
    warehouse: 'write',
    production: 'write',
    people: 'write',
  },
  Manager: {
    home: 'read',
    finance: 'read',
    notes: 'read',
    sales: 'read',
    purchasing: 'read',
    warehouse: 'write',
    production: 'write',
    people: 'read',
  },
  Warehouse: {
    home: 'read',
    finance: 'none',
    notes: 'none',
    sales: 'none',
    purchasing: 'read',
    warehouse: 'write',
    production: 'write',
    people: 'none',
  },
  Sales: {
    home: 'read',
    finance: 'none',
    notes: 'none',
    sales: 'write',
    purchasing: 'none',
    warehouse: 'read',
    production: 'read',
    people: 'none',
  },
  Purchasing: {
    home: 'read',
    finance: 'read',
    notes: 'none',
    sales: 'none',
    purchasing: 'write',
    warehouse: 'read',
    production: 'read',
    people: 'none',
  },
  Finance: {
    home: 'read',
    finance: 'write',
    notes: 'none',
    sales: 'read',
    purchasing: 'read',
    warehouse: 'read',
    production: 'read',
    people: 'none',
  },
  Viewer: {
    home: 'read',
    finance: 'read',
    notes: 'none',
    sales: 'read',
    purchasing: 'read',
    warehouse: 'read',
    production: 'read',
    people: 'none',
  },
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function permLevel(perms: Record<string, string> | undefined, key: PeopleModuleKey): PermLevel {
  const v = perms?.[key]
  return v === 'write' || v === 'read' ? v : 'none'
}

export function normalizePerms(perms: Record<string, string> | undefined): Record<PeopleModuleKey, PermLevel> {
  const out = {} as Record<PeopleModuleKey, PermLevel>
  for (const mod of PEOPLE_MODULES) out[mod.key] = permLevel(perms, mod.key)
  return out
}

export function roleDefaultPerms(role: string): Record<PeopleModuleKey, PermLevel> {
  const preset = ROLE_PRESETS[role as UserRole] ?? ROLE_PRESETS.Viewer
  return { ...preset }
}

export function normalizeSettings(settings: Record<string, boolean> | undefined): Record<PeopleModuleKey, boolean> {
  const out = {} as Record<PeopleModuleKey, boolean>
  for (const mod of PEOPLE_MODULES) out[mod.key] = settings?.[mod.key] === true
  return out
}

export function roleDefaultSettings(
  role: string,
  perms?: Record<string, string>,
): Record<PeopleModuleKey, boolean> {
  const out = {} as Record<PeopleModuleKey, boolean>
  const resolvedPerms = perms ?? roleDefaultPerms(role)
  for (const mod of PEOPLE_MODULES) {
    if (role === 'Owner' || role === 'Admin') {
      out[mod.key] = true
    } else if (role === 'Manager') {
      out[mod.key] = permLevel(resolvedPerms, mod.key) === 'write'
    } else {
      out[mod.key] = false
    }
  }
  return out
}

/** Human summary matching the prototype (`Full access`, `No access`, `5 read-only`, `2 write · 3 read`). */
export function accessSummary(perms: Record<string, string> | undefined): string {
  let write = 0
  let read = 0
  for (const mod of PEOPLE_MODULES) {
    const level = permLevel(perms, mod.key)
    if (level === 'write') write += 1
    else if (level === 'read') read += 1
  }
  if (write === PEOPLE_MODULES.length) return 'Full access'
  if (write === 0 && read === 0) return 'No access'
  if (write === 0) return `${read} read-only`
  return `${write} write · ${read} read`
}

export function personInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function personAvatarStyle(seed: string): { bg: string; fg: string } {
  let h = 0
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) | 0
  }
  const hue = Math.abs(h) % 360
  return {
    bg: `oklch(0.92 0.045 ${hue})`,
    fg: `oklch(0.36 0.08 ${hue})`,
  }
}

export function formatLastActive(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return 'Never'
  const ts = new Date(iso).getTime()
  if (Number.isNaN(ts)) return 'Never'
  const diff = Math.max(0, now - ts)
  const min = 60_000
  const hr = 3_600_000
  const day = 86_400_000
  if (diff < hr) return `${Math.max(1, Math.round(diff / min))}m ago`
  if (diff < day) return `${Math.round(diff / hr)}h ago`
  if (diff < 7 * day) return `${Math.round(diff / day)}d ago`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatTenure(joinDate: string | null | undefined, now = Date.now()): string {
  if (!joinDate) return EM_DASH
  const ts = new Date(joinDate).getTime()
  if (Number.isNaN(ts)) return EM_DASH
  const months = Math.max(0, (now - ts) / (30.44 * 86_400_000))
  let yrs = Math.floor(months / 12)
  let mo = Math.round(months % 12)
  if (mo === 12) {
    yrs += 1
    mo = 0
  }
  if (yrs <= 0) return `${mo} ${mo === 1 ? 'month' : 'months'}`
  return `${yrs} ${yrs === 1 ? 'yr' : 'yrs'}${mo ? ` ${mo} mo` : ''}`
}

function nextSequentialId(prefix: string, ids: readonly string[], width = 5): string {
  const re = new RegExp(`^${prefix}(\\d+)$`)
  let max = 0
  for (const id of ids) {
    const m = re.exec(id)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `${prefix}${String(max + 1).padStart(width, '0')}`
}

export const nextUserId = (users: readonly User[]): string => nextSequentialId('USR', users.map((u) => u.id))

export const nextEmployeeId = (employees: readonly Employee[]): string =>
  nextSequentialId('EMP', employees.map((e) => e.id))

export function blankUser(users: readonly User[], role: UserRole = 'Sales'): User {
  const perms = roleDefaultPerms(role)
  return {
    id: nextUserId(users),
    empId: null,
    name: '',
    email: '',
    role,
    status: 'Pending',
    twoFA: false,
    lastActive: null,
    perms,
    settings: roleDefaultSettings(role, perms),
  }
}

export function blankEmployee(employees: readonly Employee[], defaultLocation = 'TVM-Main'): Employee {
  return {
    id: nextEmployeeId(employees),
    name: '',
    title: '',
    dept: 'Operations',
    managerId: null,
    status: 'Active',
    type: 'Full-time',
    email: '',
    phone: '',
    location: defaultLocation || 'TVM-Main',
    joinDate: todayLocal(),
  }
}

export function normalizeUser(u: User): User {
  return {
    ...u,
    id: u.id.trim().toUpperCase(),
    name: u.name.trim(),
    email: u.email.trim().toLowerCase(),
    role: u.role.trim(),
    status: u.status.trim(),
    empId: u.empId?.trim() ? u.empId.trim() : null,
    perms: normalizePerms(u.perms),
    settings: normalizeSettings(u.settings),
  }
}

export function normalizeEmployee(e: Employee): Employee {
  return {
    ...e,
    id: e.id.trim().toUpperCase(),
    name: e.name.trim(),
    title: e.title.trim(),
    dept: e.dept.trim(),
    managerId: e.managerId?.trim() ? e.managerId.trim() : null,
    status: e.status.trim(),
    type: e.type.trim(),
    email: e.email.trim().toLowerCase(),
    phone: e.phone.trim(),
    location: e.location.trim(),
    joinDate: e.joinDate.trim(),
  }
}

export interface ValidateUserContext {
  currentUserEmail?: string
  existing?: User | null
}

function isSelfUser(user: Pick<User, 'email'>, currentUserEmail?: string): boolean {
  if (!currentUserEmail) return false
  return user.email.trim().toLowerCase() === currentUserEmail.trim().toLowerCase()
}

export function validateUser(draft: User, others: readonly User[], ctx: ValidateUserContext = {}): Record<string, string> {
  const err: Record<string, string> = {}
  const email = draft.email.trim().toLowerCase()

  if (!draft.name.trim()) err.name = 'Full name is required.'
  if (!email || !EMAIL_RE.test(email)) {
    err.email = 'Enter a valid email address.'
  } else if (others.some((o) => o.email.trim().toLowerCase() === email)) {
    err.email = 'A user with this email already exists.'
  }

  if (!USER_ROLES.includes(draft.role as UserRole)) err.role = 'Pick a role.'
  if (!USER_STATUSES.includes(draft.status as UserStatus)) err.status = 'Pick a status.'

  // Protect the signed-in user from self-suspension and preserve at least one active Admin.
  const existing = ctx.existing
  if (existing && isSelfUser(existing, ctx.currentUserEmail) && draft.status === 'Suspended') {
    err.status = "You can't suspend your own signed-in account."
  }

  const hasOtherActiveAdmin = others.some((o) => o.role === 'Admin' && o.status === 'Active')
  if (existing && existing.role === 'Admin' && existing.status === 'Active' && !hasOtherActiveAdmin) {
    if (draft.role !== 'Admin') {
      err.role = "You can't demote the last active Admin — promote another user first."
    }
    if (draft.status !== 'Active') {
      err.status = "You can't suspend the last active Admin — promote another Admin first."
    }
  }

  return err
}

function wouldCreateManagerCycle(
  empId: string,
  managerId: string | null,
  others: readonly Employee[],
): boolean {
  if (!managerId) return false
  if (managerId === empId) return true
  const byId = new Map(others.map((e) => [e.id, e]))
  const seen = new Set<string>([empId])
  let cur: string | null = managerId
  while (cur) {
    if (seen.has(cur)) return true
    seen.add(cur)
    cur = byId.get(cur)?.managerId ?? null
  }
  return false
}

export interface ValidateEmployeeContext {
  existing?: Employee | null
}

export function validateEmployee(
  draft: Employee,
  others: readonly Employee[],
  ctx: ValidateEmployeeContext = {},
): Record<string, string> {
  const err: Record<string, string> = {}
  const email = draft.email.trim().toLowerCase()

  if (!draft.name.trim()) err.name = 'Full name is required.'
  if (!draft.title.trim()) err.title = 'Job title is required.'
  if (!draft.dept.trim()) err.dept = 'Department is required.'

  const validStatuses = new Set<string>(EMPLOYEE_STATUSES)
  if (ctx.existing?.status) validStatuses.add(ctx.existing.status)
  if (!validStatuses.has(draft.status)) err.status = 'Pick a status.'

  if (!EMPLOYEE_TYPES.includes(draft.type as EmployeeType)) err.type = 'Pick an employment type.'

  if (!email || !EMAIL_RE.test(email)) {
    err.email = 'Enter a valid work email.'
  } else if (others.some((o) => o.email.trim().toLowerCase() === email)) {
    err.email = 'An employee with this email already exists.'
  }

  if (draft.phone.trim()) {
    const digits = draft.phone.replace(/\D/g, '')
    if (digits.length < 7 || digits.length > 15) {
      err.phone = 'Enter a valid phone number.'
    }
  }

  if (draft.joinDate && !ISO_DATE_RE.test(draft.joinDate)) {
    err.joinDate = 'Use YYYY-MM-DD.'
  }

  if (draft.managerId === draft.id) {
    err.managerId = "An employee can't report to themselves."
  } else if (wouldCreateManagerCycle(draft.id, draft.managerId, others)) {
    err.managerId = 'Reporting chain would create a cycle.'
  }

  return err
}

export function userStatusTransitionError(
  user: User,
  nextStatus: UserStatus,
  allUsers: readonly User[],
  currentUserEmail?: string,
): string | null {
  if (nextStatus !== 'Suspended') return null
  if (isSelfUser(user, currentUserEmail)) {
    return "You can't suspend your own signed-in account."
  }
  if (user.role === 'Admin' && user.status === 'Active') {
    const otherActiveAdmin = allUsers.some((u) => u.id !== user.id && u.role === 'Admin' && u.status === 'Active')
    if (!otherActiveAdmin) {
      return "You can't suspend the last active Admin — promote another Admin first."
    }
  }
  return null
}

export function userDeleteBlocked(
  user: User,
  allUsers: readonly User[],
  currentUserEmail?: string,
): string | null {
  if (isSelfUser(user, currentUserEmail)) {
    return "You can't delete your own signed-in user account."
  }
  if (user.role === 'Admin') {
    const otherAdmins = allUsers.filter((u) => u.id !== user.id && u.role === 'Admin')
    if (otherAdmins.length === 0) {
      return "You can't delete the last Admin — promote another user to Admin first."
    }
    if (user.status === 'Active' && !otherAdmins.some((u) => u.status === 'Active')) {
      return "You can't delete the last active Admin — activate or promote another Admin first."
    }
  }
  return null
}

export interface EmployeeDeleteRefs {
  employees: readonly Employee[]
  users: readonly User[]
  vendors: readonly { purchasePerson: string }[]
  customers: readonly { salesRep: string }[]
  purchaseOrders: readonly { buyer: string | null }[]
  purchaseReceipts: readonly { receivedBy: string | null }[]
  assemblyOrders: readonly { assignee: string | null }[]
  warehouses: readonly { managerEmpId: string }[]
}

export function employeeDeleteBlocked(emp: Employee, refs: EmployeeDeleteRefs): string | null {
  const reasons: string[] = []
  const linkedUsers = refs.users.filter((u) => u.empId === emp.id).length
  if (linkedUsers) reasons.push(`${linkedUsers} user account${linkedUsers === 1 ? '' : 's'}`)

  const reports = refs.employees.filter((e) => e.id !== emp.id && e.managerId === emp.id).length
  if (reports) reasons.push(`${reports} direct report${reports === 1 ? '' : 's'}`)

  const wh = refs.warehouses.filter((w) => w.managerEmpId === emp.id).length
  if (wh) reasons.push(`${wh} warehouse${wh === 1 ? '' : 's'}`)

  const vendors = refs.vendors.filter((v) => v.purchasePerson === emp.id).length
  if (vendors) reasons.push(`${vendors} vendor${vendors === 1 ? '' : 's'}`)

  const customers = refs.customers.filter((c) => c.salesRep === emp.id).length
  if (customers) reasons.push(`${customers} customer${customers === 1 ? '' : 's'}`)

  const pos = refs.purchaseOrders.filter((p) => p.buyer === emp.id).length
  if (pos) reasons.push(`${pos} purchase order${pos === 1 ? '' : 's'}`)

  const receipts = refs.purchaseReceipts.filter((r) => r.receivedBy === emp.id).length
  if (receipts) reasons.push(`${receipts} receipt${receipts === 1 ? '' : 's'}`)

  const aos = refs.assemblyOrders.filter((a) => a.assignee === emp.id).length
  if (aos) reasons.push(`${aos} assembly order${aos === 1 ? '' : 's'}`)

  if (reasons.length === 0) return null
  return `${emp.name} is still assigned to ${reasons.join(', ')}. Reassign them before deleting.`
}
