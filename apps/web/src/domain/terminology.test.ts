import { describe, expect, it } from 'vitest'
import {
  applyTermPatch,
  knownTermKeys,
  locationTerm,
  renamedCount,
  termGet,
  termPatch,
  termResetPatch,
  termRows,
  validateTermRow,
} from './terminology'

describe('termGet / locationTerm', () => {
  it('falls back when nothing is renamed or the override is blank', () => {
    expect(termGet({}, 'object.vendor.singular', 'Vendor')).toBe('Vendor')
    expect(termGet({ 'object.vendor.singular': '   ' }, 'object.vendor.singular', 'Vendor')).toBe('Vendor')
    expect(termGet(undefined, 'x', 'Fallback')).toBe('Fallback')
  })
  it('uses the override', () => {
    expect(termGet({ 'module.sales': 'Selling' }, 'module.sales', 'Sales')).toBe('Selling')
    expect(locationTerm({ 'object.location.singular': 'Store', 'object.location.plural': 'Stores' })).toEqual({
      singular: 'Store',
      plural: 'Stores',
    })
    expect(locationTerm({})).toEqual({ singular: 'Location', plural: 'Locations' })
  })
})

describe('termRows', () => {
  it('lists every group, hides field renames until their capability is on', () => {
    const rows = termRows({})
    expect(rows.find((r) => r.id === 'object.location')).toMatchObject({ pair: true, singular: 'Location', plural: 'Locations', renamed: false })
    expect(rows.find((r) => r.id === 'module.finance')).toMatchObject({ pair: false, singular: 'Finance' })
    expect(rows.some((r) => r.id === 'field.customerPrice.label')).toBe(false)
    expect(termRows({}, ['customerPricing']).some((r) => r.id === 'field.customerPrice.label')).toBe(true)
  })
  it('marks renamed rows and counts overrides', () => {
    const terms = { 'object.location.singular': 'Store', 'module.sales': 'Selling' }
    const rows = termRows(terms)
    expect(rows.find((r) => r.id === 'object.location')).toMatchObject({ singular: 'Store', plural: 'Locations', renamed: true })
    expect(rows.find((r) => r.id === 'module.sales')?.renamed).toBe(true)
    expect(renamedCount(terms)).toBe(2)
    expect(renamedCount({ 'object.location.singular': 'Store', 'object.location.plural': 'Stores' })).toBe(1)
  })
})

describe('termPatch / applyTermPatch', () => {
  const row = termRows({}).find((r) => r.id === 'object.location')!
  it('stores only what differs from the original, tidied', () => {
    expect(termPatch({ ...row, singular: '  Store ', plural: 'Locations' })).toEqual({
      'object.location.singular': 'Store',
      'object.location.plural': null,
    })
  })
  it('a blank value removes the override', () => {
    const merged = applyTermPatch({ 'object.location.singular': 'Store' }, termPatch({ ...row, singular: '', plural: 'Locations' }))
    expect(merged).toEqual({})
  })
  it('reset clears both names of a pair, and one key of a single label', () => {
    expect(termResetPatch(row)).toEqual({ 'object.location.singular': null, 'object.location.plural': null })
    expect(termResetPatch({ id: 'module.sales', pair: false })).toEqual({ 'module.sales': null })
  })
  it('keeps other keys when merging', () => {
    expect(applyTermPatch({ 'module.sales': 'Selling' }, { 'module.finance': 'Accounts' })).toEqual({
      'module.sales': 'Selling',
      'module.finance': 'Accounts',
    })
  })
})

describe('validateTermRow', () => {
  it('accepts blank and normal text, rejects long text and angle brackets', () => {
    expect(validateTermRow({ pair: true, singular: '', plural: 'Stores' })).toEqual({})
    expect(validateTermRow({ pair: false, singular: 'x'.repeat(41), plural: '' }).singular).toMatch(/40 characters/)
    expect(validateTermRow({ pair: true, singular: 'Store', plural: '<b>' }).plural).toMatch(/no < or >/)
  })
})

describe('knownTermKeys', () => {
  it('contains the location pair', () => {
    const keys = knownTermKeys()
    expect(keys.has('object.location.singular')).toBe(true)
    expect(keys.has('object.location.plural')).toBe(true)
  })
})
