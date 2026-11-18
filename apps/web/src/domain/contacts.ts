import type { Carrier, Contact, ContactLink, Customer, Vendor } from '@/data/schemas'

export type ContactLinkKind = 'Carrier' | 'Vendor' | 'Customer'

/** One record (carrier, vendor or customer) that points at a contact. */
export interface ContactUsage {
  kind: ContactLinkKind
  no: string
  name: string
  role: string
  isPrimary: boolean
}

export interface ContactLookup {
  vendors: readonly Vendor[]
  customers: readonly Customer[]
  carriers: readonly Carrier[]
}

/** Next sequential `CON00001`-style number above existing contacts. */
export function nextContactNo(contacts: readonly Contact[]): string {
  let max = 0
  for (const c of contacts) {
    const m = /^CON(\d+)$/.exec(c.no ?? '')
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `CON${String(max + 1).padStart(5, '0')}`
}

/** A blank, active contact numbered one above `contacts`. */
export function blankContact(contacts: readonly Contact[]): Contact {
  return {
    no: nextContactNo(contacts),
    name: '',
    phone: '',
    email: '',
    desc: '',
    active: true,
    createdAt: '',
    updatedAt: '',
  }
}

/** Copy a contact as a new active record with a fresh number. */
export function duplicateContact(c: Contact, contacts: readonly Contact[]): Contact {
  return {
    ...c,
    no: nextContactNo(contacts),
    name: c.name ? `${c.name} (copy)` : '',
    active: true,
    createdAt: '',
    updatedAt: '',
  }
}

/** Strip formatting characters from a phone number while keeping digits and `+`. */
export function normalizePhone(phone: string | null | undefined): string {
  return String(phone ?? '').replace(/[^\d+]/g, '')
}

/** Format an Indian mobile or landline number for display in detail views. */
export function formatContactPhone(phone: string | null | undefined): string {
  const d = String(phone ?? '')
    .replace(/\D/g, '')
    .replace(/^91(?=\d{10}$)/, '')
  if (!d) return ''
  if (d.length === 10 && /^[6-9]/.test(d)) return `${d.slice(0, 5)} ${d.slice(5)}`
  if (d.length >= 10) return `${d.slice(0, d.length - 6)} ${d.slice(-6)}`
  return d
}

/** Trim and canonicalise contact fields before validation and persistence. */
export function normalizeContact(d: Contact): Contact {
  return {
    ...d,
    no: String(d.no ?? '').trim().toUpperCase(),
    name: String(d.name ?? '').trim().replace(/\s+/g, ' '),
    phone: normalizePhone(d.phone),
    email: String(d.email ?? '').trim().toLowerCase(),
    desc: String(d.desc ?? '').trim(),
  }
}

/** Display status label for a contact. */
export function contactStatus(c: Pick<Contact, 'active'>): 'Active' | 'Inactive' {
  return c.active === false ? 'Inactive' : 'Active'
}

/** Validate a normalised contact against all other contacts. */
export function validateContact(d: Contact, others: readonly Contact[]): Record<string, string> {
  const fe: Record<string, string> = {}
  const no = String(d.no ?? '').trim().toUpperCase()
  if (!/^CON\d{5,}$/.test(no)) fe.no = 'Contact numbers look like CON00001.'
  else if (others.some((r) => r.no === no)) fe.no = 'Already used.'

  const name = String(d.name ?? '').trim().replace(/\s+/g, ' ')
  if (!name) fe.name = 'Enter the person’s name.'

  if (d.phone) {
    const dg = String(d.phone)
      .replace(/^\+?91(?=\d{10}$)/, '')
      .replace(/\D/g, '')
    if (!/^\d{10,11}$/.test(dg)) fe.phone = 'Use a 10-digit mobile or a landline with its STD code.'
  }

  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(d.email).trim())) {
    fe.email = 'Enter a valid email address.'
  }

  if (!fe.name && !fe.phone) {
    const ten = (p: string) => String(p ?? '').replace(/\D/g, '').slice(-10)
    const hit = others.find(
      (c) =>
        String(c.name ?? '')
          .trim()
          .replace(/\s+/g, ' ')
          .toLowerCase() === name.toLowerCase() &&
        (!d.phone || !c.phone || ten(c.phone) === ten(d.phone)),
    )
    if (hit) fe.name = `Looks like ${hit.no} · ${hit.name} already exists — link that contact instead.`
  }

  return fe
}

/** Find every carrier, vendor and customer record pointing at `contactNo`. */
export function contactLinks(contactNo: string, lookups: ContactLookup): ContactUsage[] {
  if (!contactNo) return []
  const out: ContactUsage[] = []
  for (const c of lookups.carriers) {
    if (c.contactId === contactNo) {
      out.push({ kind: 'Carrier', no: c.no, name: c.name, role: '', isPrimary: true })
    }
  }
  for (const v of lookups.vendors) {
    for (const p of v.contacts ?? []) {
      if (p.contactId === contactNo) {
        out.push({ kind: 'Vendor', no: v.no, name: v.name, role: p.role || '', isPrimary: !!p.isPrimary })
      }
    }
  }
  for (const cu of lookups.customers) {
    for (const p of cu.contacts ?? []) {
      if (p.contactId === contactNo) {
        out.push({ kind: 'Customer', no: cu.no, name: cu.name, role: p.role || '', isPrimary: !!p.isPrimary })
      }
    }
  }
  return out
}

/** Distinct link kinds in display order (e.g. `['Carrier', 'Vendor']`). */
export function contactKinds(links: readonly ContactUsage[]): ContactLinkKind[] {
  return [...new Set(links.map((l) => l.kind))]
}

/** Compact grid label for the Linked to column (e.g. `'Kailash Ceramics +1'`). */
export function contactLinkedSummary(links: readonly ContactUsage[]): string {
  if (!links.length) return ''
  return links[0].name + (links.length > 1 ? ` +${links.length - 1}` : '')
}

/** Comma-separated unique roles across a contact's links. */
export function contactRolesSummary(links: readonly ContactUsage[]): string {
  return [...new Set(links.map((l) => l.role).filter(Boolean))].join(', ')
}

/** Drawer subtitle showing linked kinds + roles, or `'Unlinked'`. */
export function contactSubtitle(links: readonly ContactUsage[]): string {
  if (!links.length) return 'Unlinked'
  const kinds = contactKinds(links).join(', ')
  const roles = contactRolesSummary(links)
  return roles ? `${kinds} · ${roles}` : kinds
}

/** View-mode notice warning about shared edits or explaining unlinked/inactive status. */
export function contactNotice(c: Pick<Contact, 'active'>, links: readonly ContactUsage[]): string {
  if (!links.length) {
    return c.active === false
      ? 'Inactive and not linked to any record.'
      : 'Not linked to anything yet — pick this contact on a vendor’s or customer’s Contacts tab, or a carrier’s Contact field.'
  }
  const shared =
    links.length === 1
      ? 'Linked to 1 record — edits to name, phone and email apply everywhere it is linked.'
      : `Shared by ${links.length} records — edits to name, phone and email apply everywhere it is linked.`
  return c.active === false
    ? `Inactive — still shows on the records it’s linked to, but can’t be picked for new links. ${shared}`
    : shared
}

/** Delete block reason when a contact is still referenced by carriers, vendors or customers. */
export function contactDeleteBlocked(links: readonly ContactUsage[]): string | null {
  if (!links.length) return null
  return `Linked to ${links.length} ${links.length === 1 ? 'record' : 'records'} — unlink it there first, or mark it inactive.`
}

/** Add a contact link to an owning record's link list. First link automatically becomes primary. */
export function addContactLink(
  links: readonly ContactLink[],
  contactId: string,
  opts?: { role?: string; idPrefix?: string },
): ContactLink[] {
  if (!contactId || links.some((l) => l.contactId === contactId)) return [...links]
  const used = new Set(links.map((l) => l.id))
  const prefix = opts?.idPrefix ? `${opts.idPrefix}-C` : 'L'
  let n = links.length + 1
  while (used.has(`${prefix}${n}`)) n++
  return [
    ...links,
    {
      id: `${prefix}${n}`,
      contactId,
      role: String(opts?.role ?? '').trim(),
      isPrimary: links.length === 0,
    },
  ]
}

/** Remove a contact link by link id; if the primary was unlinked, promotes the next link. */
export function unlinkContactLink(links: readonly ContactLink[], linkId: string): ContactLink[] {
  const remaining = links.filter((l) => l.id !== linkId)
  if (remaining.length > 0 && !remaining.some((l) => l.isPrimary)) {
    return remaining.map((l, i) => (i === 0 ? { ...l, isPrimary: true } : l))
  }
  return remaining
}

/** Mark one contact link as primary and clear `isPrimary` on all others. */
export function setPrimaryContactLink(links: readonly ContactLink[], linkId: string): ContactLink[] {
  if (!links.some((l) => l.id === linkId)) return [...links]
  return links.map((l) => ({ ...l, isPrimary: l.id === linkId }))
}

/** Update the role on one contact link. */
export function updateContactLinkRole(links: readonly ContactLink[], linkId: string, role: string): ContactLink[] {
  return links.map((l) => (l.id === linkId ? { ...l, role: role.trim() } : l))
}

/** Recompute the flat `contact`/`phone`/`email` read mirror from the primary linked contact. */
export function mirrorPrimaryContact<
  T extends { contacts: ContactLink[]; contact: string; phone: string; email: string },
>(record: T, contacts: readonly Contact[]): T {
  const links = record.contacts ?? []
  const primary = links.find((l) => l.isPrimary) ?? links[0]
  const c = primary ? contacts.find((x) => x.no === primary.contactId) : undefined
  if (c) {
    return {
      ...record,
      contact: c.name,
      phone: formatContactPhone(c.phone) || c.phone || '',
      email: c.email || '',
    }
  }
  return links.length ? { ...record } : { ...record, contact: '', phone: '', email: '' }
}
