import { describe, expect, it } from 'vitest'
import { type Employee, type User, userSchema } from '@/data/schemas'
import {
  type EmployeeDeleteRefs,
  accessSummary,
  blankEmployee,
  blankUser,
  employeeDeleteBlocked,
  formatLastActive,
  formatTenure,
  nextEmployeeId,
  nextUserId,
  normalizeEmployee,
  normalizePerms,
  normalizeSettings,
  normalizeUser,
  personAvatarStyle,
  personInitials,
  roleDefaultPerms,
  roleDefaultSettings,
  userDeleteBlocked,
  userStatusTransitionError,
  validateEmployee,
  validateUser,
} from './people'

const makeUser = (over: Partial<User> = {}): User => ({
  id: 'USR00001',
  empId: null,
  name: 'Karthik Subramaniam',
  email: 'karthik@kanalora.example',
  role: 'Admin',
  status: 'Active',
  twoFA: true,
  lastActive: '2026-10-16T08:00:00Z',
  perms: roleDefaultPerms('Admin'),
  settings: roleDefaultSettings('Admin'),
  ...over,
})

const makeEmployee = (over: Partial<Employee> = {}): Employee => ({
  id: 'EMP00001',
  name: 'Karthik Subramaniam',
  title: 'Founder & CEO',
  dept: 'Operations',
  managerId: null,
  status: 'Active',
  type: 'Full-time',
  email: 'karthik@kanalora.example',
  phone: '+91 90031 00001',
  location: 'TVM-Main',
  joinDate: '2019-06-10',
  ...over,
})

const emptyRefs = (over: Partial<EmployeeDeleteRefs> = {}): EmployeeDeleteRefs => ({
  employees: [],
  users: [],
  vendors: [],
  customers: [],
  purchaseOrders: [],
  purchaseReceipts: [],
  assemblyOrders: [],
  warehouses: [],
  ...over,
})

describe('people domain rules', () => {
  it('computes access summary across all modules', () => {
    expect(accessSummary(roleDefaultPerms('Admin'))).toBe('Full access')
    expect(
      accessSummary({
        home: 'none',
        finance: 'none',
        notes: 'none',
        sales: 'none',
        purchasing: 'none',
        warehouse: 'none',
        production: 'none',
        people: 'none',
      }),
    ).toBe('No access')
    expect(accessSummary({ home: 'read', finance: 'read' })).toBe('2 read-only')
    expect(accessSummary(roleDefaultPerms('Sales'))).toBe('1 write · 3 read')
  })

  it('normalizes missing module permission and settings keys safely', () => {
    expect(normalizePerms({ home: 'write', finance: 'read' })).toEqual({
      home: 'write',
      finance: 'read',
      notes: 'none',
      sales: 'none',
      purchasing: 'none',
      warehouse: 'none',
      production: 'none',
      people: 'none',
    })
    expect(normalizeSettings({ purchasing: true })).toEqual({
      home: false,
      finance: false,
      notes: false,
      sales: false,
      purchasing: true,
      warehouse: false,
      production: false,
      people: false,
    })
    expect(roleDefaultSettings('Admin')).toEqual({
      home: true,
      finance: true,
      notes: true,
      sales: true,
      purchasing: true,
      warehouse: true,
      production: true,
      people: true,
    })
    expect(roleDefaultSettings('Manager')).toEqual({
      home: false,
      finance: false,
      notes: false,
      sales: false,
      purchasing: false,
      warehouse: true,
      production: true,
      people: false,
    })
    expect(roleDefaultSettings('Sales')).toEqual({
      home: false,
      finance: false,
      notes: false,
      sales: false,
      purchasing: false,
      warehouse: false,
      production: false,
      people: false,
    })

    // Existing stored user rows without `settings` still parse via userSchema default.
    const legacyParsed = userSchema.parse({
      id: 'USR00099',
      empId: null,
      name: 'Legacy User',
      email: 'legacy@kanalora.example',
      role: 'Viewer',
      status: 'Active',
      twoFA: false,
      lastActive: null,
      perms: { home: 'read' },
    })
    expect(legacyParsed.settings).toEqual({})
  })

  it('formats relative last-active timestamps and tenure deterministically', () => {
    const now = Date.UTC(2026, 9, 17, 12, 0, 0)
    expect(formatLastActive(null, now)).toBe('Never')
    expect(formatLastActive('2026-10-17T11:45:00Z', now)).toBe('15m ago')
    expect(formatLastActive('2026-10-17T08:00:00Z', now)).toBe('4h ago')
    expect(formatLastActive('2026-10-14T12:00:00Z', now)).toBe('3d ago')
    expect(formatLastActive('2026-09-01T12:00:00Z', now)).toMatch(/Sep/)

    expect(formatTenure('', now)).toBe('—')
    expect(formatTenure('2026-08-17', now)).toBe('2 months')
    expect(formatTenure('2025-10-17', now)).toBe('1 yr')
    expect(formatTenure('2024-07-17', now)).toBe('2 yrs 3 mo')
  })

  it('computes deterministic initials and avatar colors', () => {
    expect(personInitials('Karthik Subramaniam')).toBe('KS')
    expect(personInitials('Ramesh')).toBe('RA')
    expect(personInitials('  ')).toBe('?')
    const a = personAvatarStyle('Karthik Subramaniam')
    const b = personAvatarStyle('Karthik Subramaniam')
    expect(a).toEqual(b)
    expect(a.bg).toContain('oklch(')
  })

  it('generates next sequential IDs and blanks', () => {
    const users = [makeUser({ id: 'USR00001' }), makeUser({ id: 'USR00011' })]
    const emps = [makeEmployee({ id: 'EMP00001' }), makeEmployee({ id: 'EMP00021' })]
    expect(nextUserId(users)).toBe('USR00012')
    expect(nextEmployeeId(emps)).toBe('EMP00022')
    expect(blankUser(users).status).toBe('Pending')
    expect(blankUser(users).role).toBe('Sales')
    expect(blankEmployee(emps, 'TVM-Main').id).toBe('EMP00022')
  })

  it('normalizes user email lowercase and blank nullable links to null', () => {
    const u = normalizeUser(makeUser({ id: ' usr00012 ', name: '  Meera Devi  ', email: '  MEERA@KANALORA.EXAMPLE ', empId: '' }))
    expect(u.id).toBe('USR00012')
    expect(u.name).toBe('Meera Devi')
    expect(u.email).toBe('meera@kanalora.example')
    expect(u.empId).toBeNull()

    const e = normalizeEmployee(makeEmployee({ id: ' emp00022 ', managerId: '   ', email: ' Meera@Kanalora.Example ' }))
    expect(e.id).toBe('EMP00022')
    expect(e.managerId).toBeNull()
    expect(e.email).toBe('meera@kanalora.example')
  })

  it('validates user required fields, unique email, and last active Admin guard', () => {
    const admin = makeUser({ id: 'USR00001', role: 'Admin', status: 'Active' })
    const finance = makeUser({ id: 'USR00007', email: 'kavitha@kanalora.example', role: 'Finance', status: 'Active' })

    const invalid = validateUser(
      makeUser({ id: 'USR00012', name: '', email: 'kavitha@kanalora.example', role: 'Sales' }),
      [admin, finance],
    )
    expect(invalid.name).toBeDefined()
    expect(invalid.email).toMatch(/already exists/i)

    // Cannot demote or suspend the last active Admin
    const demoteAdmin = validateUser({ ...admin, role: 'Viewer' }, [finance], {
      existing: admin,
      currentUserEmail: finance.email,
    })
    expect(demoteAdmin.role).toMatch(/last active admin/i)

    const suspendAdmin = validateUser({ ...admin, status: 'Suspended' }, [finance], {
      existing: admin,
      currentUserEmail: finance.email,
    })
    expect(suspendAdmin.status).toMatch(/last active admin/i)

    // Cannot suspend your own signed-in user
    const suspendSelf = validateUser({ ...finance, status: 'Suspended' }, [admin], {
      existing: finance,
      currentUserEmail: finance.email,
    })
    expect(suspendSelf.status).toMatch(/own signed-in/i)
  })

  it('enforces user delete and status-transition protections', () => {
    const admin = makeUser({ id: 'USR00001', email: 'karthik@kanalora.example', role: 'Admin', status: 'Active' })
    const secondAdmin = makeUser({ id: 'USR00002', email: 'balaji@kanalora.example', role: 'Admin', status: 'Active' })
    const self = makeUser({ id: 'USR00007', email: 'kavitha@kanalora.example', role: 'Finance', status: 'Active' })
    const viewer = makeUser({ id: 'USR00011', email: 'audit@kanalora.example', role: 'Viewer', status: 'Pending' })

    expect(userDeleteBlocked(self, [admin, self, viewer], self.email)).toMatch(/own signed-in/i)
    expect(userDeleteBlocked(admin, [admin, self, viewer], self.email)).toMatch(/last admin/i)
    expect(userDeleteBlocked(viewer, [admin, self, viewer], self.email)).toBeNull()

    // With two active Admins, suspending/deleting one is permitted
    expect(userDeleteBlocked(admin, [admin, secondAdmin, self], self.email)).toBeNull()
    expect(userStatusTransitionError(admin, 'Suspended', [admin, self], self.email)).toMatch(/last active admin/i)
    expect(userStatusTransitionError(self, 'Suspended', [admin, self], self.email)).toMatch(/own signed-in/i)
    expect(userStatusTransitionError(viewer, 'Suspended', [admin, self, viewer], self.email)).toBeNull()
  })

  it('validates employee fields, email uniqueness, phone, and reporting cycles', () => {
    const mgr = makeEmployee({ id: 'EMP00001', email: 'karthik@kanalora.example', managerId: null })
    const report = makeEmployee({ id: 'EMP00002', email: 'balaji@kanalora.example', managerId: 'EMP00001' })

    const err = validateEmployee(
      makeEmployee({ id: 'EMP00022', name: '', title: '', email: 'KARTHIK@kanalora.example', phone: '123', managerId: 'EMP00022' }),
      [mgr, report],
    )
    expect(err.name).toBeDefined()
    expect(err.title).toBeDefined()
    expect(err.email).toMatch(/already exists/i)
    expect(err.phone).toBeDefined()
    expect(err.managerId).toMatch(/themselves/i)

    // Cycle check: setting EMP00001's manager to EMP00002 when EMP00002 reports to EMP00001
    const cycleErr = validateEmployee({ ...mgr, managerId: 'EMP00002' }, [report], { existing: mgr })
    expect(cycleErr.managerId).toMatch(/cycle/i)

    // Existing 'Contractor' seed status remains valid during edit
    const contractor = makeEmployee({ id: 'EMP00014', email: 'divya@kanalora.example', status: 'Contractor', type: 'Contractor' })
    expect(validateEmployee(contractor, [mgr], { existing: contractor })).toEqual({})
  })

  it('blocks deleting employees with active references', () => {
    const emp = makeEmployee({ id: 'EMP00004', name: 'Meera Devi' })
    expect(employeeDeleteBlocked(emp, emptyRefs())).toBeNull()

    const blocked = employeeDeleteBlocked(
      emp,
      emptyRefs({
        users: [makeUser({ empId: 'EMP00004' })],
        purchaseOrders: [{ buyer: 'EMP00004' }],
        warehouses: [{ managerEmpId: 'EMP00004' }],
      }),
    )
    expect(blocked).toContain('1 user account')
    expect(blocked).toContain('1 warehouse')
    expect(blocked).toContain('1 purchase order')
  })
})
