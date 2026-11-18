import type { Carrier, Contact, ContactLink, Customer, Vendor } from '@/data/schemas'
import {
  addContactLink,
  blankContact,
  contactDeleteBlocked,
  contactKinds,
  contactLinkedSummary,
  contactLinks,
  contactNotice,
  contactRolesSummary,
  contactStatus,
  contactSubtitle,
  duplicateContact,
  formatContactPhone,
  mirrorPrimaryContact,
  nextContactNo,
  normalizeContact,
  normalizePhone,
  setPrimaryContactLink,
  unlinkContactLink,
  updateContactLinkRole,
  validateContact,
} from './contacts'

function contact(over: Partial<Contact> = {}): Contact {
  return {
    no: 'CON00001',
    name: 'Murugesan Pillai',
    phone: '+919442110287',
    email: 'orders@kailash.example',
    desc: '',
    active: true,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    ...over,
  }
}

describe('contact numbering & defaults', () => {
  it('computes the next sequential CON number', () => {
    expect(nextContactNo([])).toBe('CON00001')
    expect(nextContactNo([contact({ no: 'CON00006' }), contact({ no: 'CON00034' })])).toBe('CON00035')
  })

  it('creates a blank active contact and clean duplicates', () => {
    const existing = [contact({ no: 'CON00009' })]
    const b = blankContact(existing)
    expect(b).toMatchObject({ no: 'CON00010', name: '', phone: '', email: '', active: true })

    const dup = duplicateContact(contact({ no: 'CON00009', name: 'Selvi', active: false }), existing)
    expect(dup.no).toBe('CON00010')
    expect(dup.name).toBe('Selvi (copy)')
    expect(dup.active).toBe(true)
    expect(dup.phone).toBe('+919442110287')
  })
})

describe('phone normalization & formatting', () => {
  it('strips formatting while preserving digits and +', () => {
    expect(normalizePhone('+91 94421-10287')).toBe('+919442110287')
    expect(normalizePhone('(044) 2625 8810')).toBe('04426258810')
  })

  it('formats 10-digit mobiles 5+5 and landlines cleanly', () => {
    expect(formatContactPhone('+91 94421 10287')).toBe('94421 10287')
    expect(formatContactPhone('+919884012345')).toBe('98840 12345')
    expect(formatContactPhone('04426258810')).toBe('04426 258810')
    expect(formatContactPhone('')).toBe('')
  })

  it('normalizes whitespace, casing and phone before saving', () => {
    const n = normalizeContact(
      contact({
        no: ' con00012 ',
        name: '  Selvi   Murugesan ',
        phone: '+91 94421 10290',
        email: '  Accounts@Kailash.IN ',
        desc: '  Best before noon  ',
      }),
    )
    expect(n).toMatchObject({
      no: 'CON00012',
      name: 'Selvi Murugesan',
      phone: '+919442110290',
      email: 'accounts@kailash.in',
      desc: 'Best before noon',
    })
  })
})

describe('validateContact', () => {
  it('requires name and validates phone and email formats', () => {
    const errEmpty = validateContact(contact({ name: '   ', phone: '1234', email: 'bad' }), [])
    expect(errEmpty.name).toBe('Enter the person’s name.')
    expect(errEmpty.phone).toContain('10-digit mobile')
    expect(errEmpty.email).toBe('Enter a valid email address.')
  })

  it('rejects duplicate number and duplicate person+phone matches', () => {
    const existing = [contact({ no: 'CON00006', name: 'Murugesan Pillai', phone: '+91 94421 10287' })]

    const sameNo = validateContact(contact({ no: 'CON00006', name: 'Other Person' }), existing)
    expect(sameNo.no).toBe('Already used.')

    const dupPerson = validateContact(
      contact({ no: 'CON00035', name: '  murugesan  pillai ', phone: '9442110287' }),
      existing,
    )
    expect(dupPerson.name).toContain('CON00006 · Murugesan Pillai already exists')

    const differentPhone = validateContact(
      contact({ no: 'CON00035', name: 'Murugesan Pillai', phone: '9884012345' }),
      existing,
    )
    expect(differentPhone).toEqual({})
  })
})

describe('contactLinks & summaries', () => {
  const lookups = {
    carriers: [{ no: 'CAR001', name: 'Southern Transport', contactId: 'CON00001' } as Carrier],
    vendors: [
      {
        no: 'V00001',
        name: 'Kailash Ceramics',
        contacts: [
          { id: 'L1', contactId: 'CON00001', role: 'Dispatch', isPrimary: true },
          { id: 'L2', contactId: 'CON00007', role: 'Accounts', isPrimary: false },
        ],
      } as Vendor,
    ],
    customers: [
      {
        no: 'CUS00001',
        name: 'Annamalaiyar Pooja',
        contacts: [{ id: 'L3', contactId: 'CON00001', role: 'Accounts', isPrimary: false }],
      } as Customer,
    ],
  }

  it('collects carrier, vendor and customer references for a contact', () => {
    const links = contactLinks('CON00001', lookups)
    expect(links).toEqual([
      { kind: 'Carrier', no: 'CAR001', name: 'Southern Transport', role: '', isPrimary: true },
      { kind: 'Vendor', no: 'V00001', name: 'Kailash Ceramics', role: 'Dispatch', isPrimary: true },
      { kind: 'Customer', no: 'CUS00001', name: 'Annamalaiyar Pooja', role: 'Accounts', isPrimary: false },
    ])
    expect(contactKinds(links)).toEqual(['Carrier', 'Vendor', 'Customer'])
    expect(contactLinkedSummary(links)).toBe('Southern Transport +2')
    expect(contactRolesSummary(links)).toBe('Dispatch, Accounts')
    expect(contactSubtitle(links)).toBe('Carrier, Vendor, Customer · Dispatch, Accounts')
    expect(contactDeleteBlocked(links)).toContain('Linked to 3 records')
    expect(contactNotice(contact(), links)).toContain('Shared by 3 records')
  })

  it('allows deletion and shows unlinked notice when nothing points to the contact', () => {
    const links = contactLinks('CON99999', lookups)
    expect(links).toEqual([])
    expect(contactLinkedSummary(links)).toBe('')
    expect(contactSubtitle(links)).toBe('Unlinked')
    expect(contactDeleteBlocked(links)).toBeNull()
    expect(contactNotice(contact({ active: true }), links)).toContain('Not linked to anything yet')
    expect(contactStatus(contact({ active: false }))).toBe('Inactive')
  })
})

describe('contact link helpers (add, unlink, setPrimary, role, mirror)', () => {
  const link = (over: Partial<ContactLink> = {}): ContactLink => ({
    id: 'V00001-C1',
    contactId: 'CON00006',
    role: 'Owner',
    isPrimary: true,
    ...over,
  })

  it('adds links without duplicating, making only the first link primary', () => {
    const first = addContactLink([], 'CON00006', { role: 'Owner', idPrefix: 'V00001' })
    expect(first).toEqual([{ id: 'V00001-C1', contactId: 'CON00006', role: 'Owner', isPrimary: true }])

    const second = addContactLink(first, 'CON00007', { role: 'Accounts', idPrefix: 'V00001' })
    expect(second).toEqual([
      { id: 'V00001-C1', contactId: 'CON00006', role: 'Owner', isPrimary: true },
      { id: 'V00001-C2', contactId: 'CON00007', role: 'Accounts', isPrimary: false },
    ])

    // Already linked -> unchanged.
    expect(addContactLink(second, 'CON00007', { idPrefix: 'V00001' })).toEqual(second)
  })

  it('switches primary and promotes next link when primary is unlinked', () => {
    const links = [link(), link({ id: 'V00001-C2', contactId: 'CON00007', role: 'Accounts', isPrimary: false })]

    const promoted = setPrimaryContactLink(links, 'V00001-C2')
    expect(promoted.map((l) => [l.id, l.isPrimary])).toEqual([
      ['V00001-C1', false],
      ['V00001-C2', true],
    ])

    const afterUnlink = unlinkContactLink(promoted, 'V00001-C2')
    expect(afterUnlink).toEqual([{ id: 'V00001-C1', contactId: 'CON00006', role: 'Owner', isPrimary: true }])
    expect(unlinkContactLink(afterUnlink, 'V00001-C1')).toEqual([])
  })

  it('updates link role and mirrors primary contact fields', () => {
    const links = [link(), link({ id: 'V00001-C2', contactId: 'CON00007', role: 'Accounts', isPrimary: false })]
    expect(updateContactLinkRole(links, 'V00001-C2', '  Dispatch  ')[1].role).toBe('Dispatch')

    const c6 = contact({ no: 'CON00006', name: 'Murugesan Pillai', phone: '+919442110287', email: 'orders@k.in' })
    const c7 = contact({ no: 'CON00007', name: 'Selvi Murugesan', phone: '+919442110290', email: 'accounts@k.in' })
    const baseVendor = { contacts: setPrimaryContactLink(links, 'V00001-C2'), contact: '', phone: '', email: '' }
    expect(mirrorPrimaryContact(baseVendor, [c6, c7])).toMatchObject({
      contact: 'Selvi Murugesan',
      phone: '94421 10290',
      email: 'accounts@k.in',
    })
    expect(mirrorPrimaryContact({ contacts: [], contact: 'Old', phone: '1', email: 'a@b.c' }, [c6])).toMatchObject({
      contact: '',
      phone: '',
      email: '',
    })
  })
})
