import { describe, expect, it } from 'vitest'
import type { GstRegistration, Warehouse } from '@/data/schemas'
import { seedRegistration } from './gst-registrations'
import {
  blankLocationDraft,
  draftToWarehouse,
  effectiveCode,
  locationDraftErrors,
  stepErrors,
  stepOfError,
} from './location-wizard'

const site = (over: Partial<Warehouse>): Warehouse => ({
  id: 'WH-TVM',
  name: 'Main',
  code: 'TVM-MAIN',
  type: 'mixed',
  addr: '',
  city: '',
  state: '33',
  zip: '',
  country: 'IN',
  area: 0,
  status: 'active',
  pobStatus: 'principal',
  managerEmpId: '',
  operatorVendorId: '',
  ...over,
})

const existing = [site({}), site({ id: 'WH-ASSY', code: 'TVM-ASSY', pobStatus: 'additional' })]
const tn: GstRegistration = seedRegistration({ gstin: '33ABCDE1234F1Z7', legal: 'Kanalora', name: 'Kanalora', addr1: 'x', city: 'Tiruvannamalai', postal: '606601' })
const vendors = new Set(['V00006'])

describe('blank draft', () => {
  it('starts as a Distribution site in India, Setting up, with one ground floor', () => {
    const d = blankLocationDraft()
    expect(d).toMatchObject({ type: 'dc', country: 'IN', status: 'setup', pobStatus: 'undeclared', areas: [] })
    expect(d.floors).toEqual([{ id: 'l1', name: 'Ground floor', code: 'L1', level: 1 }])
  })
  it('gives a fresh floors array each time', () => {
    expect(blankLocationDraft().floors).not.toBe(blankLocationDraft().floors)
  })
})

describe('code', () => {
  it('uses the typed code (cleaned) or one suggested from the name', () => {
    expect(effectiveCode({ name: 'Salem retail outlet', code: ' slm-out ' })).toBe('SLM-OUT')
    expect(effectiveCode({ name: 'Salem retail outlet', code: '' })).toBe('SRO')
    expect(effectiveCode({ name: '', code: '' })).toBe('WH')
  })
})

describe('draftToWarehouse', () => {
  it('builds the site with a numbered id when the id is taken', () => {
    const d = { ...blankLocationDraft(), name: ' Salem ', code: 'tvm-main', area: '1,200', state: '33' }
    const w = draftToWarehouse(d, existing)
    expect(w.id).toBe('WH-TVM-MAIN')
    expect(w.name).toBe('Salem')
    expect(w.code).toBe('TVM-MAIN')
    expect(w.area).toBe(0)
    expect(draftToWarehouse({ ...d, area: '1200' }, existing).area).toBe(1200)
    expect(draftToWarehouse(d, [...existing, site({ id: 'WH-TVM-MAIN', code: 'X' })]).id).toBe('WH-TVM-MAIN-2')
  })
  it('clears what does not apply: the operator unless 3PL, the certificate status outside India', () => {
    const d = { ...blankLocationDraft(), name: 'Dubai', code: 'DXB', operatorVendorId: 'V00006', country: 'AE', state: 'Dubai', pobStatus: 'principal' }
    const w = draftToWarehouse(d, existing)
    expect(w.operatorVendorId).toBe('')
    expect(w.pobStatus).toBe('undeclared')
    expect(draftToWarehouse({ ...d, type: '3pl' }, existing).operatorVendorId).toBe('V00006')
  })
  it('carries the floors, cleaned', () => {
    const d = { ...blankLocationDraft(), name: 'Salem', floors: [{ id: 'l1', name: ' ', code: 'g', level: 1 }, { id: 'f2', name: 'Loft', code: 'mz', level: 5 }] }
    expect(draftToWarehouse(d, existing).floors).toEqual([
      { id: 'l1', name: 'Level 1', code: 'G', level: 1 },
      { id: 'f2', name: 'Loft', code: 'MZ', level: 2 },
    ])
  })
})

describe('step errors', () => {
  const draft = { ...blankLocationDraft(), name: 'Salem', code: 'SLM', state: '33' }

  it('Basics needs a name, in the wizard’s wording', () => {
    expect(stepErrors('basics', { ...draft, name: ' ' }, existing, vendors, [tn])).toEqual({ name: 'Give your warehouse a name to continue.' })
    expect(stepErrors('basics', draft, existing, vendors, [tn])).toEqual({})
  })

  it('Basics refuses a code another site uses, including the one suggested from the name', () => {
    expect(stepErrors('basics', { ...draft, code: 'tvm-assy' }, existing, vendors, [tn]).code).toBe('Code “TVM-ASSY” is already used by another warehouse.')
    const clash = [...existing, site({ id: 'WH-S', code: 'SRO' })]
    expect(stepErrors('basics', { ...draft, name: 'Salem retail outlet', code: '' }, clash, vendors, [tn]).code).toMatch(/“SRO”/)
  })

  it('Building refuses floors that share a code', () => {
    const floors = [
      { id: 'l1', name: 'Ground floor', code: 'L1', level: 1 },
      { id: 'f2', name: 'Level 2', code: 'l1', level: 2 },
    ]
    expect(stepErrors('building', { ...draft, floors }, existing, vendors, [tn]).floors).toBe('Each floor needs a unique code (e.g. L1, L2, MZ).')
    expect(stepErrors('building', draft, existing, vendors, [tn])).toEqual({})
  })

  it('Areas never blocks', () => {
    expect(stepErrors('areas', { ...draft, name: '' }, existing, vendors, [tn])).toEqual({})
  })

  it('Finish keeps the saving rules: state, an active site needs a registration, a 3PL operator must exist', () => {
    expect(stepErrors('finish', { ...draft, state: '' }, existing, vendors, [tn]).state).toMatch(/Choose the state/)
    const active = { ...draft, state: '29', status: 'active' }
    expect(stepErrors('finish', active, existing, vendors, [tn]).status).toMatch(/Karnataka has no active GST registration/)
    expect(stepErrors('finish', { ...active, status: 'setup' }, existing, vendors, [tn])).toEqual({})
    expect(stepErrors('finish', { ...draft, type: '3pl', operatorVendorId: 'V99' }, existing, vendors, [tn]).operatorVendorId).toMatch(/no longer exists/)
    expect(stepErrors('finish', { ...draft, country: 'AE', state: 'Dubai', status: 'active' }, existing, vendors, [tn])).toEqual({})
  })

  it('maps every error to the step that owns it', () => {
    expect(stepOfError('name')).toBe('basics')
    expect(stepOfError('code')).toBe('basics')
    expect(stepOfError('floors')).toBe('building')
    expect(stepOfError('state')).toBe('finish')
    expect(stepOfError('status')).toBe('finish')
    const all = locationDraftErrors({ ...draft, name: '', state: '' }, existing, vendors, [tn])
    expect(Object.keys(all).map(stepOfError).sort()).toEqual(['basics', 'finish'])
  })
})
