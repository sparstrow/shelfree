import type { Carrier, Contact } from '@/data/schemas'
import {
  CARRIER_TYPE_DEFAULTS,
  type CarrierType,
  blankCarrier,
  carrierBehavior,
  carrierBehaviorLabel,
  carrierDeleteBlocked,
  carrierGstTreatment,
  carrierNotices,
  carrierOnChange,
  carrierRowFlag,
  carrierSampleTrackUrl,
  carrierStatus,
  carrierTrackingLinkStatus,
  carrierTrackingRef,
  carrierTypeCode,
  carrierTypeName,
  carrierTypeOptions,
  duplicateCarrier,
  normalizeCarrier,
  validateCarrier,
} from './carriers'

const carrier = (over: Partial<Carrier> = {}): Carrier => ({
  ...blankCarrier(),
  no: 'STC',
  name: 'ST Courier',
  type: 'COURIER',
  gstin: '33AAECS4721K1Z8',
  trackUrl: 'https://www.stcourier.com/track?awb={tracking}',
  service: 'Standard surface',
  contactId: 'CON00001',
  createdAt: '2026-09-24T09:00:00.000Z',
  updatedAt: '2026-09-24T09:00:00.000Z',
  ...over,
})

const contact = (over: Partial<Contact> = {}): Contact => ({
  no: 'CON00001',
  name: 'Karthik R.',
  phone: '9443152876',
  email: '',
  desc: '',
  active: true,
  createdAt: '2026-09-24T09:00:00.000Z',
  updatedAt: '2026-09-24T09:00:00.000Z',
  ...over,
})

describe('carrier type & display helpers', () => {
  it('resolves codes, names, behaviors and tracking refs', () => {
    expect(carrierBehavior('COURIER')).toBe('courier')
    expect(carrierBehavior('Transporter (GTA)')).toBe('gta')
    expect(carrierBehavior('OWN')).toBe('own')
    expect(carrierBehaviorLabel('gta')).toBe('Goods transport agency (GTA)')
    expect(carrierTypeName('GTA')).toBe('Transporter (GTA)')
    expect(carrierTypeCode('Own vehicle')).toBe('OWN')

    expect(carrierTrackingRef('COURIER')).toBe('AWB')
    expect(carrierTrackingRef('GTA')).toBe('LR no.')
    expect(carrierTrackingRef('OWN')).toBe('—')
    expect(carrierStatus(carrier({ active: false }))).toBe('Inactive')
  })

  it('derives GST treatment, tracking link status, sample URL, row flags and notices', () => {
    expect(carrierGstTreatment({ type: 'COURIER', rcm: false })).toBe('Forward charge')
    expect(carrierGstTreatment({ type: 'GTA', rcm: true })).toBe('Reverse charge')
    expect(carrierGstTreatment({ type: 'GTA', rcm: false })).toBe('Forward charge')
    expect(carrierGstTreatment({ type: 'OWN', rcm: true })).toBe('Not applicable')

    expect(carrierTrackingLinkStatus({ type: 'COURIER', trackUrl: '' })).toBe('Not set')
    expect(carrierTrackingLinkStatus({ type: 'COURIER', trackUrl: 'https://x.in/{tracking}' })).toBe('Set')
    expect(carrierTrackingLinkStatus({ type: 'OWN', trackUrl: '' })).toBe('Not applicable')

    expect(carrierSampleTrackUrl(carrier())).toBe('https://www.stcourier.com/track?awb=1234567890')
    expect(carrierSampleTrackUrl(carrier({ type: 'OWN' }))).toBe('')
    expect(carrierRowFlag(carrier({ trackUrl: '' }))).toBe('No tracking link set')
    expect(carrierRowFlag(carrier({ active: false }))).toBe('Inactive carrier')
    expect(carrierRowFlag(carrier({ type: 'GTA', rcm: true, trackUrl: '' }))).toBeNull()

    expect(carrierNotices(carrier({ type: 'GTA', rcm: true, trackUrl: '' }))[0]).toContain('Reverse charge')
    expect(carrierNotices(carrier({ type: 'COURIER', trackUrl: '' }))[0]).toContain('AWB numbers')
  })
})

describe('carrier editing, normalization and duplication', () => {
  it('toggles reverse charge when switching to/from GTA and normalizes fields', () => {
    expect(carrierOnChange(carrier({ no: 'art' }), 'no').no).toBe('ART')
    expect(carrierOnChange(carrier({ gstin: '33aaecs' }), 'gstin').gstin).toBe('33AAECS')
    expect(carrierOnChange(carrier({ type: 'GTA', rcm: false }), 'type').rcm).toBe(true)
    expect(carrierOnChange(carrier({ type: 'COURIER', rcm: true }), 'type').rcm).toBe(false)

    expect(
      normalizeCarrier(
        carrier({
          no: ' own ',
          name: '  Kanalora van ',
          type: 'Own vehicle',
          gstin: '33aaecs 4721k1z8',
          rcm: true,
          trackUrl: 'https://example.com/{tracking}',
        }),
      ),
    ).toMatchObject({
      no: 'OWN',
      name: 'Kanalora van',
      type: 'OWN',
      gstin: '',
      rcm: false,
      trackUrl: '',
    })
  })

  it('duplicates with next free CODE-n and allows deletion', () => {
    const dup = duplicateCarrier(carrier({ active: false }), [carrier(), carrier({ no: 'STC-2' })])
    expect(dup).toMatchObject({ no: 'STC-3', name: 'ST Courier (copy)', active: true, createdAt: '' })
    expect(carrierDeleteBlocked()).toBeNull()
  })
})

describe('validateCarrier', () => {
  const contacts = [contact(), contact({ no: 'CON00002', name: 'Inactive Person', active: false })]

  it('accepts valid courier, reverse-charge GTA and own vehicle carriers', () => {
    expect(validateCarrier(carrier(), [], contacts)).toEqual({})
    expect(validateCarrier(carrier({ no: 'ART', name: 'Arunachala', type: 'GTA', rcm: true, gstin: '', trackUrl: '' }), [], contacts)).toEqual({})
    expect(validateCarrier(carrier({ no: 'OWN', name: 'Van', type: 'OWN', gstin: '', trackUrl: '', contactId: '' }), [], contacts)).toEqual({})
  })

  it('enforces code, unique name, GSTIN, forward-charge GTA GSTIN, tracking URL and contact rules', () => {
    const bad = validateCarrier(
      carrier({
        no: 'x',
        name: '',
        type: 'GTA',
        rcm: false,
        gstin: '',
        trackUrl: 'http://bad url',
        contactId: 'CON00002',
        createdAt: '',
      }),
      [],
      contacts,
      'new',
    )
    expect(Object.keys(bad).sort()).toEqual(['contactId', 'gstin', 'name', 'no', 'trackUrl'])
    expect(bad.gstin).toContain('forward-charge GTA')
    expect(bad.trackUrl).toContain('https://')
    expect(bad.contactId).toContain('is inactive')

    expect(
      validateCarrier(carrier({ trackUrl: 'https://example.com/track', createdAt: '' }), [], contacts, 'new').trackUrl,
    ).toContain('{tracking}')
    expect(
      validateCarrier(carrier({ gstin: 'BAD' }), [], contacts, 'edit').gstin,
    ).toContain('15 characters')
    expect(
      validateCarrier(carrier({ contactId: 'CON99999' }), [], contacts, 'edit').contactId,
    ).toContain('no longer exists')
  })

  it('handles inactive types on create while allowing existing carriers to keep theirs', () => {
    const customTypes: CarrierType[] = [
      ...CARRIER_TYPE_DEFAULTS,
      { code: 'RAIL', name: 'Rail parcel', behavior: 'courier', refLabel: 'PWB', desc: '', active: false, system: false },
    ]
    expect(carrierTypeOptions('COURIER', customTypes).map((o) => o.value)).toEqual(['COURIER', 'GTA', 'OWN'])
    expect(carrierTypeOptions('RAIL', customTypes).map((o) => o.value)).toEqual(['COURIER', 'GTA', 'OWN', 'RAIL'])
    expect(validateCarrier(carrier({ no: 'RL', name: 'Southern Rail', type: 'RAIL', createdAt: '' }), [], contacts, 'new', customTypes).type).toContain(
      'inactive',
    )
    expect(validateCarrier(carrier({ no: 'RL', name: 'Southern Rail', type: 'RAIL' }), [], contacts, 'edit', customTypes)).toEqual({})
  })
})
