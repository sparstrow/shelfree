import { describe, expect, it } from 'vitest'
import type { GstRegistration, Warehouse } from '@/data/schemas'
import {
  type ValidateRegistrationContext,
  applyCancel,
  applyMakePrimary,
  applyReactivate,
  applyRemove,
  applySave,
  blankRegistration,
  cancelBlockReason,
  deleteBlockReason,
  ensurePrimary,
  gapText,
  locationRegistrationError,
  makePrimaryBlockReason,
  normalizeRegistration,
  orderRegistrations,
  reactivateBlockReason,
  registrationForSite,
  registrationGaps,
  registrationSites,
  seedRegistration,
  seriesText,
  suggestSeries,
  validateRegistration,
} from './gst-registrations'

const TN = 'REG-TN'

/** A GSTIN with the correct check character appended to its first 14 characters. */
function withCheck(body: string): string {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let sum = 0
  for (let i = 0; i < 14; i++) {
    const p = alphabet.indexOf(body[i]) * (i % 2 ? 2 : 1)
    sum += Math.floor(p / 36) + (p % 36)
  }
  return body + alphabet[(36 - (sum % 36)) % 36]
}
const reg = (over: Partial<GstRegistration> = {}): GstRegistration => ({
  ...seedRegistration({ gstin: '33ABCDE1234F1Z7', legal: 'Kanalora Crafts Pvt. Ltd.', name: 'Kanalora', addr1: 'Street', city: 'Tiruvannamalai', postal: '606601' }),
  ...over,
})
const KA = reg({ id: 'REG-KA', gstin: '29ABCDE1234F1ZW', series: 'KA/{FY}/', primary: false })
const site = (over: Partial<Warehouse> = {}): Warehouse => ({
  id: 'WH-X',
  name: 'Site X',
  code: 'X',
  type: 'dc',
  addr: '',
  city: '',
  state: '33',
  zip: '',
  country: 'IN',
  area: 0,
  status: 'active',
  pobStatus: 'undeclared',
  managerEmpId: '',
  operatorVendorId: '',
  ...over,
})

const ctx = (over: Partial<ValidateRegistrationContext> = {}): ValidateRegistrationContext => ({
  mode: 'new',
  others: [reg()],
  original: null,
  pan: 'ABCDE1234F',
  today: '2026-11-25',
  fiscalStart: 'April',
  now: new Date(2026, 10, 25),
  ...over,
})
const draft = (over: Partial<GstRegistration> = {}): GstRegistration => ({ ...reg({ id: '', primary: false, series: 'KA/{FY}/', gstin: '29ABCDE1234F1ZW' }), ...over })

describe('seed and series', () => {
  it('seeds REG-TN from the business profile', () => {
    expect(reg()).toMatchObject({ id: TN, series: 'TN/{FY}/', primary: true, scheme: 'Regular' })
  })
  it('suggests a prefix from the state and previews the first number', () => {
    expect(suggestSeries('29ABC')).toBe('KA/{FY}/')
    expect(suggestSeries('96ABC')).toBe('')
    expect(suggestSeries('xx')).toBe('')
    expect(seriesText('tn/{FY}/', '2026-27')).toBe('TN/2026-27/0001')
  })
})

describe('validateRegistration — GSTIN', () => {
  it('accepts a valid new GSTIN in a new state with the business PAN', () => {
    expect(validateRegistration(draft(), ctx())).toEqual({})
  })
  it('requires 15 characters, a valid format and a known state', () => {
    expect(validateRegistration(draft({ gstin: '' }), ctx()).gstin).toMatch(/Enter the GSTIN/)
    expect(validateRegistration(draft({ gstin: '29ABC' }), ctx()).gstin).toBe('A GSTIN has 15 characters.')
    expect(validateRegistration(draft({ gstin: '99ABCDE1234F1Z7' }), ctx()).gstin).toMatch(/isn’t a GST state code/)
    expect(validateRegistration(draft({ gstin: '29ABCDE1234F1ZW'.replace('ABCDE', '12345') }), ctx()).gstin).toMatch(/Not a valid GSTIN/)
  })
  it('blocks a wrong check character (unlike vendor GSTINs)', () => {
    expect(validateRegistration(draft({ gstin: '29ABCDE1234F1Z7' }), ctx()).gstin).toMatch(/doesn’t check out/)
  })
  it('blocks a retired state code', () => {
    // 28 = old Andhra Pradesh.
    const gstin = withCheck('28ABCDE1234F1Z')
    expect(validateRegistration(draft({ gstin }), ctx()).gstin).toMatch(/State code 28 is retired/)
  })
  it('refuses a duplicate GSTIN and a different PAN', () => {
    expect(validateRegistration(draft({ gstin: '33ABCDE1234F1Z7' }), ctx({ others: [reg({ status: 'Cancelled', primary: false })] })).gstin).toBe('This GSTIN is already on the list.')
    expect(validateRegistration(draft(), ctx({ pan: 'ZZZZZ9999Z' })).gstin).toMatch(/isn’t your business PAN/)
  })
  it('one active Normal registration per state, but Casual may overlap', () => {
    const second = draft({ gstin: withCheck('33ABCDE1234F2Z') })
    const errors = validateRegistration(second, ctx({ others: [reg()] }))
    expect(errors.gstin).toMatch(/already have an active registration in Tamil Nadu/)
    // A Casual one may overlap the state.
    const overlapping = draft({ gstin: withCheck('33ABCDE1234F2Z'), regType: 'Casual', validFrom: '2026-12-01', validTo: '2027-02-28' })
    expect(validateRegistration(overlapping, ctx({ others: [reg()] })).gstin).toBeUndefined()
  })
  it('does not re-check the GSTIN when editing', () => {
    const saved = reg({ gstin: '33ABCDE1234F1Z7' })
    expect(validateRegistration(saved, ctx({ mode: 'edit', original: saved, others: [] }))).toEqual({})
  })
})

describe('validateRegistration — other fields', () => {
  it('needs a legal name, a past registration date, a valid prefix and amount', () => {
    const e = validateRegistration(draft({ legal: ' ', registeredOn: '2027-01-01', series: '', ewayMin: -1, postal: '12' }), ctx())
    expect(e.legal).toMatch(/legal name/)
    expect(e.registeredOn).toBe('Can’t be in the future.')
    expect(e.series).toMatch(/Enter a prefix/)
    expect(e.ewayMin).toMatch(/whole rupee/)
    expect(e.postal).toBe('A PIN code has 6 digits.')
  })
  it('limits the prefix to its allowed characters, the 16-character invoice number and uniqueness', () => {
    expect(validateRegistration(draft({ series: 'KA*' }), ctx()).series).toMatch(/Use letters/)
    expect(validateRegistration(draft({ series: 'KARNATAKA/{FY}/' }), ctx()).series).toMatch(/at most 16/)
    expect(validateRegistration(draft({ series: 'KA/{FY}/' }), ctx()).series).toBeUndefined()
    expect(validateRegistration(draft({ series: 'TN/{FY}/' }), ctx()).series).toMatch(/Already used by/)
  })
  it('casual registrations need both dates, in order, within 180 days', () => {
    const casual = (over: Partial<GstRegistration>) => draft({ regType: 'Casual', ...over })
    expect(validateRegistration(casual({}), ctx()).validTo).toMatch(/both dates/)
    expect(validateRegistration(casual({ validFrom: '2026-12-10', validTo: '2026-12-01' }), ctx()).validTo).toMatch(/before the start/)
    expect(validateRegistration(casual({ validFrom: '2026-01-01', validTo: '2026-12-31' }), ctx()).validTo).toMatch(/365 days/)
    expect(validateRegistration(casual({ validFrom: '2026-12-01', validTo: '2027-02-28' }), ctx()).validTo).toBeUndefined()
  })
  it('the only primary can’t be unset while editing', () => {
    const saved = reg()
    const e = validateRegistration({ ...saved, primary: false }, ctx({ mode: 'edit', original: saved, others: [KA] }))
    expect(e.primary).toMatch(/Make another registration primary/)
  })
})

describe('normalizeRegistration', () => {
  it('forces Quarterly and no e-invoice for Composition, clears dates for Normal, and never lets Casual be primary', () => {
    const n = normalizeRegistration({ ...reg(), scheme: 'Composition', filing: 'Monthly', eInvoice: true, validFrom: '2026-01-01', validTo: '2026-02-01', series: ' tn/{fy}/ '.toUpperCase() })
    expect(n).toMatchObject({ filing: 'Quarterly', eInvoice: false, validFrom: '', validTo: '', series: 'TN/{FY}/' })
    expect(normalizeRegistration({ ...reg(), regType: 'Casual', primary: true }).primary).toBe(false)
  })
})

describe('sites, gaps and the location rule', () => {
  const sites = [site({ id: 'A', name: 'Main' }), site({ id: 'B', name: 'Chennai DC', state: '33' }), site({ id: 'C', name: 'Blr', state: '29' }), site({ id: 'D', name: 'Old', state: '27', status: 'inactive' })]
  it('a site files under the active Normal registration of its state', () => {
    expect(registrationForSite([reg(), KA], sites[0])?.id).toBe(TN)
    expect(registrationForSite([reg(), KA], sites[2])?.id).toBe('REG-KA')
    expect(registrationForSite([reg({ status: 'Cancelled', primary: false })], sites[0])).toBeNull()
    expect(registrationForSite([reg()], site({ country: 'AE', state: 'Dubai' }))).toBeNull()
  })
  it('lists the non-inactive sites of a registration; Casual and Cancelled own none', () => {
    expect(registrationSites(reg(), sites).map((w) => w.id)).toEqual(['A', 'B'])
    expect(registrationSites(reg({ regType: 'Casual' }), sites)).toEqual([])
    expect(registrationSites(reg({ status: 'Cancelled' }), sites)).toEqual([])
  })
  it('reports one gap per state without a registration, ignoring inactive sites', () => {
    const gaps = registrationGaps([reg()], sites)
    expect(gaps).toHaveLength(1)
    expect(gaps[0].state.name).toBe('Karnataka')
    expect(gapText(gaps[0])).toBe('Blr is in Karnataka, which has no active GST registration.')
    expect(registrationGaps([reg(), KA], sites)).toEqual([])
  })
  it('G-017: a location can’t be Active in a state without an active registration', () => {
    expect(locationRegistrationError(site({ state: '29' }), [reg()])).toMatch(/Karnataka has no active GST registration/)
    expect(locationRegistrationError(site({ state: '29' }), [reg(), KA])).toBeNull()
    expect(locationRegistrationError(site({ state: '29', status: 'setup' }), [reg()])).toBeNull()
    expect(locationRegistrationError(site({ country: 'AE', state: 'Dubai' }), [reg()])).toBeNull()
  })
})

describe('cancel, reactivate, delete and primary', () => {
  const sites = [site({ id: 'C', name: 'Blr', state: '29' })]
  it('blocks cancelling the primary and a registration whose sites would be uncovered', () => {
    expect(cancelBlockReason(reg(), [reg(), KA], sites)).toMatch(/primary registration/)
    expect(cancelBlockReason(KA, [reg(), KA], sites)).toBe('Blr is in Karnataka and would be left without a registration.')
    expect(cancelBlockReason(KA, [reg(), KA], [])).toBeNull()
  })
  it('a cancelled registration can always be deleted; an active one follows the cancel rule', () => {
    expect(deleteBlockReason({ ...KA, status: 'Cancelled' }, [reg(), { ...KA, status: 'Cancelled' }], sites)).toBeNull()
    expect(deleteBlockReason(KA, [reg(), KA], sites)).toMatch(/left without a registration/)
  })
  it('reactivating is blocked while another registration covers the state', () => {
    const cancelled = { ...reg({ id: 'OLD', gstin: withCheck('33ABCDE1234F2Z') }), status: 'Cancelled' as const, primary: false }
    expect(reactivateBlockReason(cancelled, [reg(), cancelled])).toMatch(/already covers Tamil Nadu/)
    expect(reactivateBlockReason({ ...KA, status: 'Cancelled' }, [reg(), { ...KA, status: 'Cancelled' }])).toBeNull()
  })
  it('make-primary reasons', () => {
    expect(makePrimaryBlockReason(reg())).toBe('Already primary.')
    expect(makePrimaryBlockReason({ ...KA, status: 'Cancelled' })).toBe('It’s cancelled.')
    expect(makePrimaryBlockReason({ ...KA, regType: 'Casual' })).toMatch(/Casual/)
    expect(makePrimaryBlockReason(KA)).toBeNull()
  })
})

describe('list transitions', () => {
  it('saving a primary clears the others; making primary moves the flag', () => {
    const list = applySave([reg()], { ...KA, primary: true })
    expect(list.filter((r) => r.primary).map((r) => r.id)).toEqual(['REG-KA'])
    expect(applyMakePrimary([reg(), KA], 'REG-KA').filter((r) => r.primary).map((r) => r.id)).toEqual(['REG-KA'])
  })
  it('keeps exactly one primary when the primary is cancelled or removed', () => {
    const cancelled = applyCancel([reg(), KA], TN, '2026-11-25')
    expect(cancelled.find((r) => r.id === TN)).toMatchObject({ status: 'Cancelled', cancelledOn: '2026-11-25', primary: false })
    expect(cancelled.find((r) => r.id === 'REG-KA')?.primary).toBe(true)
    expect(applyRemove([reg(), KA], TN).find((r) => r.id === 'REG-KA')?.primary).toBe(true)
    expect(applyReactivate(cancelled, TN).find((r) => r.id === TN)).toMatchObject({ status: 'Active', cancelledOn: '' })
  })
  it('ensurePrimary skips Casual registrations', () => {
    expect(ensurePrimary([{ ...KA, regType: 'Casual' }]).some((r) => r.primary)).toBe(false)
  })
  it('orders primary, active by GSTIN, then cancelled', () => {
    const cancelled = { ...reg({ id: 'OLD', gstin: '27ABCDE1234F1ZX' }), status: 'Cancelled' as const, primary: false }
    expect(orderRegistrations([cancelled, KA, reg()]).map((r) => r.id)).toEqual([TN, 'REG-KA', 'OLD'])
  })
})

describe('blankRegistration', () => {
  it('starts primary only when there is none, with the prefix suggested from the state code', () => {
    expect(blankRegistration({ legal: 'L', trade: 'T', hasPrimary: false })).toMatchObject({ primary: true, series: '' })
    expect(blankRegistration({ legal: 'L', trade: 'T', hasPrimary: true, gstinPrefix: '29' })).toMatchObject({ primary: false, series: 'KA/{FY}/', gstin: '29' })
  })
})

describe('States & territories: registrations (G-025)', () => {
  const KAstate = { code: '29', name: 'Karnataka', abbr: 'KA', type: 'state', ut: false, legacy: false, note: '' } as const
  const TNstate = { code: '33', name: 'Tamil Nadu', abbr: 'TN', type: 'state', ut: false, legacy: false, note: '' } as const
  const split = (s: { ut: boolean }) => (s.ut ? 'CGST + UTGST' : 'CGST + SGST')
  it('badges the primary and other registered states', async () => {
    const { stateRegistrationBadge } = await import('./gst-registrations')
    expect(stateRegistrationBadge([reg(), KA], '33')).toBe('Primary')
    expect(stateRegistrationBadge([reg(), KA], '29')).toBe('Registered')
    expect(stateRegistrationBadge([reg(), KA], '27')).toBe('')
    expect(stateRegistrationBadge([reg({ status: 'Cancelled', primary: false })], '33')).toBe('')
  })
  it('splits CGST + SGST in a registered state and IGST elsewhere, against the primary', async () => {
    const { registrationSplit } = await import('./gst-registrations')
    expect(registrationSplit([reg(), KA], KAstate, null, split)).toEqual({ same: true, text: 'Same state as your registration → CGST + SGST' })
    expect(registrationSplit([reg()], KAstate, null, split)).toEqual({ same: false, text: 'TN → KA · IGST' })
    expect(registrationSplit([], TNstate, TNstate, split).same).toBe(true)
    expect(registrationSplit([], KAstate, null, split).text).toMatch(/Set your business state/)
  })
  it('counts trading sites per state', async () => {
    const { siteCountsByState } = await import('./gst-registrations')
    const counts = siteCountsByState([site(), site({ id: 'B' }), site({ state: '29' }), site({ state: '27', status: 'inactive' }), site({ country: 'AE', state: 'Dubai' })])
    expect(counts.get('33')).toBe(2)
    expect(counts.get('29')).toBe(1)
    expect(counts.has('27')).toBe(false)
  })
})
