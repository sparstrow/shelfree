import { useRouter } from '@tanstack/react-router'
import { ChevronDown, Pencil, Unlink } from 'lucide-react'
import { type KeyboardEvent, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ContactPicker } from '@/components/lookup/ContactPicker'
import { useList, useUpsert } from '@/data/queries'
import type { Contact, ContactLink, Customer } from '@/data/schemas'
import {
  type ContactLookup,
  addContactLink,
  contactLinks,
  formatContactPhone,
  mirrorPrimaryContact,
  normalizeContact,
  setPrimaryContactLink,
  unlinkContactLink,
  updateContactLinkRole,
  validateContact,
} from '@/domain/contacts'
import { EM_DASH } from '@/lib/format'
import { cn } from '@/lib/utils'

interface ContactEditDraft {
  linkId: string
  contactId: string
  name: string
  role: string
  phone: string
  email: string
}

export interface CustomerContactsTabProps {
  customer: Customer
}

/**
 * Sales ▸ Customers ▸ profile ▸ Contacts tab.
 * Links shared people from People ▸ Contacts to this customer with per-link role
 * and primary status. Unlink removes the link only; edits to name/phone/email
 * are shared across all records linked to that contact.
 */
export function CustomerContactsTab({ customer }: CustomerContactsTabProps) {
  const router = useRouter()
  const contactsQuery = useList('contacts')
  const vendorsQuery = useList('vendors')
  const customersQuery = useList('customers')
  const carriersQuery = useList('carriers')

  const saveCustomer = useUpsert('customers')
  const saveVendor = useUpsert('vendors')
  const saveContact = useUpsert('contacts')

  const contactList = useMemo(() => contactsQuery.data ?? [], [contactsQuery.data])
  const contactById = useMemo(() => new Map(contactList.map((c) => [c.no, c])), [contactList])
  const lookups = useMemo<ContactLookup>(
    () => ({
      vendors: vendorsQuery.data ?? [],
      customers: customersQuery.data ?? [],
      carriers: carriersQuery.data ?? [],
    }),
    [vendorsQuery.data, customersQuery.data, carriersQuery.data],
  )

  const [draft, setDraft] = useState<ContactEditDraft | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const links = useMemo(() => customer.contacts ?? [], [customer.contacts])
  const excludeIds = useMemo(() => links.map((l) => l.contactId), [links])

  // Esc closes the inline contact edit card before RecordPage treats it as "back to list".
  useEffect(() => {
    if (!draft) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        setDraft(null)
        setErrors({})
        setFormError('')
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [draft])

  const persistCustomerLinks = async (nextLinks: ContactLink[], extraContacts: readonly Contact[] = []) => {
    const allContacts = extraContacts.length ? [...contactList, ...extraContacts] : contactList
    const nextCustomer = mirrorPrimaryContact({ ...customer, contacts: nextLinks }, allContacts)
    await saveCustomer.mutateAsync(nextCustomer)
  }

  const handleAddContact = async (contactId: string, picked?: Contact) => {
    if (!contactId) return
    const nextLinks = addContactLink(links, contactId, { idPrefix: customer.no })
    await persistCustomerLinks(nextLinks, picked ? [picked] : [])
    const name = picked?.name ?? contactById.get(contactId)?.name ?? contactId
    toast('Contact linked', { description: name })
  }

  const handleSetPrimary = async (linkId: string) => {
    const nextLinks = setPrimaryContactLink(links, linkId)
    await persistCustomerLinks(nextLinks)
    const link = nextLinks.find((l) => l.id === linkId)
    const name = link ? (contactById.get(link.contactId)?.name ?? link.contactId) : ''
    toast('Primary contact updated', name ? { description: name } : undefined)
  }

  const handleUnlink = async (link: ContactLink) => {
    if (draft?.linkId === link.id) {
      setDraft(null)
      setErrors({})
      setFormError('')
    }
    const person = contactById.get(link.contactId)
    const nextLinks = unlinkContactLink(links, link.id)
    await persistCustomerLinks(nextLinks)
    toast('Contact unlinked', {
      description: `${person?.name ?? link.contactId} stays in People › Contacts.`,
    })
  }

  const startEdit = (link: ContactLink) => {
    const person = contactById.get(link.contactId)
    setDraft({
      linkId: link.id,
      contactId: link.contactId,
      name: person?.name ?? '',
      role: link.role ?? '',
      phone: person ? formatContactPhone(person.phone) || person.phone : '',
      email: person?.email ?? '',
    })
    setErrors({})
    setFormError('')
  }

  const cancelEdit = () => {
    setDraft(null)
    setErrors({})
    setFormError('')
  }

  const saveEdit = async () => {
    if (!draft || saving) return
    const existing = contactById.get(draft.contactId)
    if (!existing) {
      setFormError('This contact no longer exists.')
      return
    }
    const now = new Date().toISOString()
    const normalized = normalizeContact({
      ...existing,
      name: draft.name,
      phone: draft.phone,
      email: draft.email,
      updatedAt: now,
    })
    const others = contactList.filter((c) => c.no !== existing.no)
    const fe = validateContact(normalized, others)
    if (Object.keys(fe).length) {
      setErrors(fe)
      setFormError(Object.values(fe)[0] ?? 'Check the highlighted fields.')
      return
    }

    setSaving(true)
    try {
      await saveContact.mutateAsync(normalized)

      const updatedLinks = updateContactLinkRole(links, draft.linkId, draft.role)
      const nextCustomer = mirrorPrimaryContact({ ...customer, contacts: updatedLinks }, [
        ...others,
        normalized,
      ])
      await saveCustomer.mutateAsync(nextCustomer)

      // Keep primary contact mirrors in sync on any other customers or vendors linked to this contact.
      const formattedPhone = formatContactPhone(normalized.phone) || normalized.phone
      const otherCustomers = lookups.customers.filter(
        (cu) =>
          cu.no !== customer.no &&
          (cu.contacts ?? []).some((l) => l.isPrimary && l.contactId === normalized.no) &&
          (cu.contact !== normalized.name || cu.phone !== formattedPhone || cu.email !== normalized.email),
      )
      const otherVendors = lookups.vendors.filter(
        (v) =>
          (v.contacts ?? []).some((l) => l.isPrimary && l.contactId === normalized.no) &&
          (v.contact !== normalized.name || v.phone !== formattedPhone || v.email !== normalized.email),
      )
      await Promise.all([
        ...otherCustomers.map((cu) =>
          saveCustomer.mutateAsync({ ...cu, contact: normalized.name, phone: formattedPhone, email: normalized.email }),
        ),
        ...otherVendors.map((v) =>
          saveVendor.mutateAsync({ ...v, contact: normalized.name, phone: formattedPhone, email: normalized.email }),
        ),
      ])

      toast('Contact updated', { description: `${normalized.no} · ${normalized.name}` })
      cancelEdit()
    } catch {
      setFormError('Could not save changes. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  const onEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      void saveEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      cancelEdit()
    }
  }

  const draftUsageCount = draft ? contactLinks(draft.contactId, lookups).length : 0
  const shareNote =
    draftUsageCount > 1
      ? `Shared by ${draftUsageCount} records — edits to name, phone and email apply everywhere it is linked. Role applies only to ${customer.name}.`
      : `Edits to name, phone and email update People › Contacts. Role applies only to ${customer.name}.`

  return (
    <div className="max-w-[980px] animate-sf-fade">
      <div className="mb-[11px] flex items-center gap-2.5">
        <h2 className="m-0 text-[13px] font-semibold">People at this account</h2>
        <div className="flex-1" />
        <ContactPicker
          exclude={excludeIds}
          allowNone={false}
          title="Add contact"
          align="end"
          onChange={(id, contact) => void handleAddContact(id, contact)}
        >
          <button
            type="button"
            aria-haspopup="listbox"
            title="Pick someone from People › Contacts, or create a new contact"
            className="hover-lift inline-flex h-[30px] items-center gap-1.5 rounded-lg border-0 bg-primary pr-2.5 pl-[13px] text-[12.5px] font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            Add contact
            <ChevronDown className="size-[13px]" strokeWidth={2.2} />
          </button>
        </ContactPicker>
      </div>

      {draft && (
        <div className="mb-3 animate-sf-fade rounded-xl border border-primary bg-card px-4 py-[15px]">
          <div className="text-[12.5px] font-semibold">Edit contact</div>
          <div className="mt-[3px] mb-3 text-xs leading-[1.45] text-pretty text-muted-foreground">{shareNote}</div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-[5px] block text-xs text-muted-foreground">Name</span>
              <input
                autoFocus
                value={draft.name}
                onChange={(e) => {
                  const v = e.target.value
                  setDraft((d) => (d ? { ...d, name: v } : d))
                  setErrors((prev) => ({ ...prev, name: '' }))
                  setFormError('')
                }}
                onKeyDown={onEditKeyDown}
                aria-invalid={!!errors.name}
                className={cn(
                  'h-8 w-full rounded-[7px] border bg-transparent px-2.5 text-[13px] text-foreground outline-none focus:border-ring',
                  errors.name ? 'border-bad-fg' : 'border-input',
                )}
              />
            </label>

            <label className="block">
              <span className="mb-[5px] block text-xs text-muted-foreground">Role</span>
              <input
                value={draft.role}
                onChange={(e) => {
                  const v = e.target.value
                  setDraft((d) => (d ? { ...d, role: v } : d))
                }}
                onKeyDown={onEditKeyDown}
                placeholder="Owner, Accounts, Receiving"
                className="h-8 w-full rounded-[7px] border border-input bg-transparent px-2.5 text-[13px] text-foreground outline-none focus:border-ring"
              />
            </label>

            <label className="block">
              <span className="mb-[5px] block text-xs text-muted-foreground">Phone</span>
              <input
                value={draft.phone}
                onChange={(e) => {
                  const v = e.target.value
                  setDraft((d) => (d ? { ...d, phone: v } : d))
                  setErrors((prev) => ({ ...prev, phone: '' }))
                  setFormError('')
                }}
                onKeyDown={onEditKeyDown}
                aria-invalid={!!errors.phone}
                className={cn(
                  'h-8 w-full rounded-[7px] border bg-transparent px-2.5 font-mono text-[13px] text-foreground outline-none focus:border-ring',
                  errors.phone ? 'border-bad-fg' : 'border-input',
                )}
              />
            </label>

            <label className="block">
              <span className="mb-[5px] block text-xs text-muted-foreground">Email</span>
              <input
                value={draft.email}
                onChange={(e) => {
                  const v = e.target.value
                  setDraft((d) => (d ? { ...d, email: v } : d))
                  setErrors((prev) => ({ ...prev, email: '' }))
                  setFormError('')
                }}
                onKeyDown={onEditKeyDown}
                aria-invalid={!!errors.email}
                className={cn(
                  'h-8 w-full rounded-[7px] border bg-transparent px-2.5 text-[13px] text-foreground outline-none focus:border-ring',
                  errors.email ? 'border-bad-fg' : 'border-input',
                )}
              />
            </label>
          </div>

          <div className="mt-[13px] flex items-center justify-end gap-2">
            {formError && (
              <div role="alert" className="mr-auto animate-sf-fade text-xs leading-[1.4] text-bad-fg">
                {formError}
              </div>
            )}
            <button
              type="button"
              onClick={cancelEdit}
              className="hover-lift inline-flex h-[30px] items-center rounded-lg border border-input bg-transparent px-3 text-[12.5px] font-medium text-foreground hover:bg-tint-10"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveEdit()}
              className="hover-lift inline-flex h-[30px] items-center gap-1.5 rounded-lg border-0 bg-primary px-[13px] text-[12.5px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
            >
              Save
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="h-[38px] border-b border-border bg-tint-7 text-left text-[11px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
              <th className="px-4 font-semibold">Name</th>
              <th className="w-[120px] px-2.5 font-semibold">Role</th>
              <th className="w-[140px] px-2.5 font-semibold">Phone</th>
              <th className="px-2.5 font-semibold">Email</th>
              <th className="w-[184px] px-4 text-right font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {links.map((link) => {
              const person = contactById.get(link.contactId)
              const allUsage = contactLinks(link.contactId, lookups)
              const otherCount = Math.max(0, allUsage.length - 1)
              const displayName = person
                ? `${person.name}${person.active === false ? ' (inactive)' : ''}`
                : link.contactId
              const formattedPhone = person ? formatContactPhone(person.phone) || person.phone : ''
              return (
                <tr
                  key={link.id}
                  className="h-12 border-b border-border text-[12.5px] transition-colors duration-[140ms] last:border-b-0 hover:bg-tint-7"
                >
                  <td className="px-4">
                    <div className="flex min-w-0 items-center gap-2 font-semibold">
                      <button
                        type="button"
                        onClick={() =>
                          router.history.push(`/people/contacts?sel=${encodeURIComponent(link.contactId)}`)
                        }
                        title="Open in People › Contacts"
                        className="min-w-0 truncate border-0 bg-transparent p-0 text-left font-semibold text-foreground underline decoration-transparent underline-offset-[3px] transition-colors duration-[140ms] hover:text-primary hover:decoration-current"
                      >
                        {displayName}
                      </button>
                      {otherCount > 0 && (
                        <span
                          title="Linked to other records too — edits to name, phone or email show everywhere"
                          className="flex-none rounded-full bg-neutral-bg px-1.5 py-px text-[10px] font-semibold text-neutral-fg"
                        >
                          Also on {otherCount}
                        </span>
                      )}
                      {link.isPrimary && (
                        <span className="flex-none rounded-full bg-primary-tint px-[7px] py-px text-[10px] font-bold tracking-[0.03em] text-primary uppercase">
                          Primary
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2.5 text-muted-foreground">{link.role || EM_DASH}</td>
                  <td className="tnum px-2.5">{formattedPhone || EM_DASH}</td>
                  <td className="px-2.5 text-muted-foreground">{person?.email || EM_DASH}</td>
                  <td className="px-4">
                    <div className="flex items-center justify-end gap-1.5">
                      {!link.isPrimary && (
                        <button
                          type="button"
                          onClick={() => void handleSetPrimary(link.id)}
                          className="h-[26px] rounded-[7px] border border-input bg-transparent px-2.5 text-[11.5px] font-semibold text-muted-foreground transition-colors duration-[140ms] hover:bg-tint-10 hover:text-foreground"
                        >
                          Make primary
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label="Edit"
                        title="Edit"
                        onClick={() => startEdit(link)}
                        className="hover-lift flex size-[26px] items-center justify-center rounded-[7px] border border-input bg-transparent text-muted-foreground hover:bg-tint-10 hover:text-foreground"
                      >
                        <Pencil className="size-3" strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        aria-label="Unlink"
                        title="Unlink — the contact stays in People › Contacts"
                        onClick={() => void handleUnlink(link)}
                        className="hover-lift flex size-[26px] items-center justify-center rounded-[7px] border border-input bg-transparent text-muted-foreground hover:border-bad-fg hover:bg-bad-bg hover:text-bad-fg"
                      >
                        <Unlink className="size-3" strokeWidth={2} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {links.length === 0 && (
          <div className="px-6 py-9 text-center text-[13px] text-muted-foreground">No contacts recorded.</div>
        )}
      </div>
    </div>
  )
}
