import { describe, expect, it } from 'vitest'
import { PEOPLE_MODULES, ROLE_PRESETS, USER_ROLES, blankUser, roleDefaultPerms, roleDefaultSettings } from './people'
import {
  ADMIN_LOCKED_REASON,
  ROLE_DESC_MAX,
  defaultRoleDefs,
  levelWord,
  normalizeRoleDef,
  peopleLabel,
  roleEditBlock,
  roleHolders,
  validateRoleDef,
} from './roles'

describe('role definitions', () => {
  it('starts with one definition per built-in role, from the presets', () => {
    const defs = defaultRoleDefs()
    expect(defs.map((d) => d.id)).toEqual([...USER_ROLES])
    for (const d of defs) {
      expect(d.desc.length).toBeGreaterThan(0)
      expect(d.perms).toEqual(ROLE_PRESETS[d.id as (typeof USER_ROLES)[number]])
    }
  })

  it('seeds the manage-settings right the way the presets always gave it', () => {
    const defs = defaultRoleDefs()
    const admin = defs.find((d) => d.id === 'Admin')
    const sales = defs.find((d) => d.id === 'Sales')
    expect(admin?.settings.finance).toBe(true)
    expect(sales?.settings.sales).toBe(false)
  })

  it('normalizes: fills every module, drops manage-settings without access or without a settings area', () => {
    const n = normalizeRoleDef({
      id: 'Sales',
      desc: '  Sell.  ',
      perms: { sales: 'write', finance: 'none', home: 'read' },
      settings: { sales: true, finance: true, home: true },
    })
    expect(n.desc).toBe('Sell.')
    expect(Object.keys(n.perms)).toHaveLength(PEOPLE_MODULES.length)
    expect(n.settings.sales).toBe(true)
    expect(n.settings.finance).toBe(false)
    expect(n.settings.home).toBe(false)
  })

  it('refuses a description over the limit', () => {
    const def = defaultRoleDefs().find((d) => d.id === 'Sales')
    if (!def) throw new Error('missing Sales')
    expect(validateRoleDef({ ...def, desc: 'x'.repeat(ROLE_DESC_MAX) })).toEqual({})
    expect(validateRoleDef({ ...def, desc: 'x'.repeat(ROLE_DESC_MAX + 1) }).desc).toBeTruthy()
  })

  it('keeps Admin at full access', () => {
    const admin = defaultRoleDefs().find((d) => d.id === 'Admin')
    if (!admin) throw new Error('missing Admin')
    expect(validateRoleDef(admin)).toEqual({})
    expect(validateRoleDef({ ...admin, perms: { ...admin.perms, finance: 'read' } }).perms).toBe(ADMIN_LOCKED_REASON)
    expect(roleEditBlock({ id: 'Admin' })).toBe(ADMIN_LOCKED_REASON)
    expect(roleEditBlock({ id: 'Sales' })).toBeNull()
  })

  it('counts who holds each role, suspended users included', () => {
    const holders = roleHolders([
      { role: 'Sales', name: 'Meera' },
      { role: 'Sales', name: 'Arun' },
      { role: 'Admin', name: 'Kavitha' },
    ])
    expect(holders.get('Sales')).toEqual({ count: 2, names: ['Meera', 'Arun'] })
    expect(holders.get('Viewer')).toBeUndefined()
    expect(peopleLabel(1)).toBe('1 person')
    expect(peopleLabel(0)).toBe('0 people')
  })

  it('words the access as the prototype matrix does', () => {
    expect(levelWord({ sales: 'write' }, 'sales')).toBe('Full')
    expect(levelWord({ sales: 'read' }, 'sales')).toBe('View')
    expect(levelWord({}, 'sales')).toBe('None')
  })
})

describe('users start from the workspace role definitions', () => {
  const edited = defaultRoleDefs().map((d) =>
    d.id === 'Sales' ? { ...d, perms: { ...d.perms, finance: 'read' }, settings: { ...d.settings, sales: true } } : d,
  )

  it('uses an edited definition for default access and manage-settings', () => {
    expect(roleDefaultPerms('Sales').finance).toBe('none')
    expect(roleDefaultPerms('Sales', edited).finance).toBe('read')
    expect(roleDefaultSettings('Sales', undefined, edited).sales).toBe(true)
    expect(roleDefaultSettings('Sales').sales).toBe(false)
  })

  it('drops manage-settings where the access it needs was taken away', () => {
    const noAccess = defaultRoleDefs().map((d) =>
      d.id === 'Manager' ? { ...d, perms: { ...d.perms, sales: 'none' }, settings: { ...d.settings, sales: true } } : d,
    )
    expect(roleDefaultSettings('Manager', undefined, noAccess).sales).toBe(false)
  })

  it('falls back to the built-in preset when there is no definition', () => {
    expect(roleDefaultPerms('Warehouse', [])).toEqual(ROLE_PRESETS.Warehouse)
    expect(roleDefaultPerms('Unknown')).toEqual(ROLE_PRESETS.Viewer)
  })

  it('creates a new user with the edited access', () => {
    const user = blankUser([], 'Sales', edited)
    expect(user.perms.finance).toBe('read')
    expect(user.settings.sales).toBe(true)
  })
})
