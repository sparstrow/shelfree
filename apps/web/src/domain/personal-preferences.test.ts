import { describe, expect, it } from 'vitest'
import {
  clampAssemblyQty,
  initials,
  landingTarget,
  normalizeProfile,
  oppositeTheme,
  resolveAssemblyDefaults,
  resolveRegional,
  resolveTheme,
  validatePasswordChange,
  validateProfile,
} from './personal-preferences'
import { REGIONAL_DEFAULTS } from './regional'

describe('resolveTheme', () => {
  it('draws dark by default and for unknown values', () => {
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme('nonsense', false)).toBe('dark')
  })
  it('follows the device only for system', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
  })
  it('flips what is on screen', () => {
    expect(oppositeTheme('dark')).toBe('light')
    expect(oppositeTheme('light')).toBe('dark')
  })
})

describe('resolveRegional', () => {
  it('uses the workspace values when nothing personal is set', () => {
    expect(resolveRegional(REGIONAL_DEFAULTS, { dateFmt: '', numFmt: '' })).toEqual(REGIONAL_DEFAULTS)
    expect(resolveRegional(REGIONAL_DEFAULTS, undefined)).toEqual(REGIONAL_DEFAULTS)
  })
  it('lets a personal date or number format win, and nothing else', () => {
    const out = resolveRegional(REGIONAL_DEFAULTS, { dateFmt: 'YYYY-MM-DD', numFmt: '1,234,567.89' })
    expect(out.dateFmt).toBe('YYYY-MM-DD')
    expect(out.numFmt).toBe('1,234,567.89')
    expect(out.currency).toBe(REGIONAL_DEFAULTS.currency)
    expect(out.fiscalStart).toBe(REGIONAL_DEFAULTS.fiscalStart)
  })
})

describe('assembly defaults', () => {
  it('falls back to the workspace output location', () => {
    expect(resolveAssemblyDefaults({ defAssemblyLoc: '', defAssemblyQty: 0 }, 'TVM-Main')).toEqual({ location: 'TVM-Main', qty: 1 })
    expect(resolveAssemblyDefaults(undefined, 'TVM-Main')).toEqual({ location: 'TVM-Main', qty: 1 })
  })
  it('uses the personal location and quantity', () => {
    expect(resolveAssemblyDefaults({ defAssemblyLoc: 'TVM-Shop', defAssemblyQty: 25 }, 'TVM-Main')).toEqual({ location: 'TVM-Shop', qty: 25 })
  })
  it('clamps the quantity to a whole number of at least 1', () => {
    expect(clampAssemblyQty('abc')).toBe(1)
    expect(clampAssemblyQty(-4)).toBe(1)
    expect(clampAssemblyQty(7.9)).toBe(7)
  })
})

describe('landingTarget', () => {
  it('maps the prototype options to routes', () => {
    expect(landingTarget('Departments')).toEqual({ kind: 'departments' })
    expect(landingTarget('Warehouse · Items')).toEqual({ kind: 'page', module: 'warehouse', slug: 'items' })
    expect(landingTarget('Purchasing · Purchase Orders')).toEqual({ kind: 'page', module: 'purchasing', slug: 'purchase-orders' })
    expect(landingTarget('Home · Dashboard')).toEqual({ kind: 'page', module: 'home', slug: 'dashboard' })
  })
  it('ignores anything unknown', () => {
    expect(landingTarget('')).toBeNull()
    expect(landingTarget('Finance · Tax')).toBeNull()
  })
})

describe('profile', () => {
  const ok = { name: 'Kavitha Elumalai', title: 'Finance Manager', email: 'kavitha.elumalai@kanalora.example', phone: '+91 90031 44378' }
  it('accepts the seeded profile', () => expect(validateProfile(ok)).toEqual({}))
  it('requires a name and a valid email', () => {
    expect(validateProfile({ ...ok, name: '  ' }).name).toBeTruthy()
    expect(validateProfile({ ...ok, email: '' }).email).toBeTruthy()
    expect(validateProfile({ ...ok, email: 'nope' }).email).toBeTruthy()
  })
  it('allows a blank phone but not a bad one', () => {
    expect(validateProfile({ ...ok, phone: '' })).toEqual({})
    expect(validateProfile({ ...ok, phone: 'abc' }).phone).toBeTruthy()
  })
  it('tidies spacing and email case', () => {
    expect(normalizeProfile({ ...ok, name: '  Kavitha   E ', email: ' K@X.IN ' })).toMatchObject({ name: 'Kavitha E', email: 'k@x.in' })
  })
  it('makes initials', () => {
    expect(initials('Kavitha Elumalai')).toBe('KE')
    expect(initials('Madonna')).toBe('MA')
    expect(initials('  ')).toBe('?')
  })
})

describe('validatePasswordChange', () => {
  it('passes a strong, matching change', () => {
    expect(validatePasswordChange({ current: 'old-pass', next: 'Tiruvanna1malai', confirm: 'Tiruvanna1malai' })).toEqual({})
  })
  it('reports each problem on its own field', () => {
    const e = validatePasswordChange({ current: '', next: 'short', confirm: '' })
    expect(e.current).toBeTruthy()
    expect(e.next).toBeTruthy()
  })
  it('needs mixed characters, a new password and a match', () => {
    expect(validatePasswordChange({ current: 'x', next: 'alllowercase1', confirm: 'alllowercase1' }).next).toBeTruthy()
    expect(validatePasswordChange({ current: 'Tiruvanna1malai', next: 'Tiruvanna1malai', confirm: 'Tiruvanna1malai' }).next).toBeTruthy()
    expect(validatePasswordChange({ current: 'x', next: 'Tiruvanna1malai', confirm: 'Tiruvanna1malaj' }).confirm).toBeTruthy()
  })
})
