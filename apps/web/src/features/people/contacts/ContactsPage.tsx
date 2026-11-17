import { getRouteApi, useRouter } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { useMemo } from 'react'
import type { Dataset, RawValue } from '@/components/data-grid/model'
import { type ListEditor, ListPage } from '@/components/list-page/ListPage'
import { useCollectionDelete } from '@/components/list-page/use-collection-delete'
import { useList, useUpsert } from '@/data/queries'
import type { Contact } from '@/data/schemas'
import {
  type ContactLinkKind,
  type ContactLookup,
  type ContactUsage,
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
  normalizeContact,
  validateContact,
} from '@/domain/contacts'
import { EM_DASH, fmtDate } from '@/lib/format'
import { maskEmail, maskPhone } from '@/lib/privacy'

const route = getRouteApi('/people/contacts/')

const LINK_LIST_PATH: Record<ContactLinkKind, string> = {
  Vendor: '/purchasing/vendors',
  Customer: '/sales/customers',
  Carrier: '/purchasing/carriers',
}

function contactDataset(lookups: ContactLookup): Dataset<Contact> {
  const linksFor = (c: Contact) => contactLinks(c.no, lookups)

  const raw = (c: Contact, key: string): RawValue => {
    switch (key) {
      case 'phone':
        return maskPhone(c.phone)
      case 'email':
        return maskEmail(c.email)
      case 'linkedTo':
        return contactLinkedSummary(linksFor(c))
      case 'kinds': {
        const k = contactKinds(linksFor(c))
        return k.length ? k.join(', ') : 'Unlinked'
      }
      case 'links':
        return linksFor(c).length
      case 'roles':
        return contactRolesSummary(linksFor(c))
      case 'status':
        return contactStatus(c)
      default: {
        const v = c[key as keyof Contact]
        return v == null ? '' : String(v)
      }
    }
  }

  const col = (key: string, label: string, width: number, extra: Partial<Dataset<Contact>['columns'][number]> = {}) => ({
    key,
    label,
    width,
    min: Math.min(width, 72),
    visible: true,
    align: 'left' as const,
    type: 'text' as const,
    sortable: true,
    ...extra,
  })

  return {
    id: 'contacts',
    noun: 'contact',
    nounPlural: 'contacts',
    idOf: (c) => c.no,
    columns: [
      col('no', 'Contact no.', 104, { frozen: 'left', type: 'mono', min: 80 }),
      col('name', 'Name', 200, { min: 130 }),
      col('phone', 'Phone', 112, { type: 'mono' }),
      col('email', 'Email', 240),
      col('linkedTo', 'Linked to', 220),
      col('kinds', 'Linked as', 150),
      col('links', 'Links', 72, { align: 'right', type: 'num' }),
      col('roles', 'Roles', 170, { visible: false }),
      col('status', 'Status', 100, { type: 'pill' }),
      col('desc', 'Notes', 300, { visible: false }),
    ],
    raw,
    text: (c, key) => {
      const v = raw(c, key)
      return v === '' ? EM_DASH : String(v)
    },
    searchBlob: (c) => {
      const links = linksFor(c)
      const kinds = contactKinds(links)
      return [
        c.no,
        c.name,
        maskPhone(c.phone),
        maskEmail(c.email),
        contactLinkedSummary(links),
        kinds.length ? kinds.join(', ') : 'Unlinked',
        contactRolesSummary(links),
        contactStatus(c),
        c.desc,
      ]
        .join(' \u0001 ')
        .toLowerCase()
    },
    views: [
      { id: 'all', name: 'All contacts', system: true, filters: [] },
      { id: 'vendors', name: 'Vendor contacts', filters: [{ key: 'kinds', op: 'contains', value: 'Vendor' }] },
      { id: 'customers', name: 'Customer contacts', filters: [{ key: 'kinds', op: 'contains', value: 'Customer' }] },
      { id: 'carriers', name: 'Carrier contacts', filters: [{ key: 'kinds', op: 'contains', value: 'Carrier' }] },
      { id: 'unlinked', name: 'Unlinked', filters: [{ key: 'kinds', op: 'contains', value: 'Unlinked' }] },
      { id: 'inactive', name: 'Inactive', filters: [{ key: 'status', op: 'isAny', value: ['Inactive'] }] },
    ],
    filterColumns: [
      { key: 'no', label: 'Contact no.', type: 'text' },
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'linkedTo', label: 'Linked to', type: 'text' },
      { key: 'kinds', label: 'Linked as', type: 'text' },
      { key: 'links', label: 'Links', type: 'num' },
      { key: 'roles', label: 'Roles', type: 'text' },
      { key: 'status', label: 'Status', type: 'enum', options: ['Active', 'Inactive'] },
      { key: 'desc', label: 'Notes', type: 'text' },
    ],
    defaultSort: { key: 'no', dir: 'asc' },
  }
}

/** People ▸ Contacts — shared contact directory edited in the drawer. */
export function ContactsPage() {
  const router = useRouter()
  const { sel } = route.useSearch()
  const contacts = useList('contacts')
  const vendors = useList('vendors')
  const customers = useList('customers')
  const carriers = useList('carriers')
  const save = useUpsert('contacts')
  const saveVendor = useUpsert('vendors')
  const saveCustomer = useUpsert('customers')

  const lookups = useMemo<ContactLookup>(
    () => ({
      vendors: vendors.data ?? [],
      customers: customers.data ?? [],
      carriers: carriers.data ?? [],
    }),
    [vendors.data, customers.data, carriers.data],
  )

  const dataset = useMemo(() => contactDataset(lookups), [lookups])
  const label = (c: Contact) => `${c.no || EM_DASH} · ${c.name || 'Unnamed contact'}`

  const remove = useCollectionDelete<Contact>('contacts', {
    blockedReason: (c) => contactDeleteBlocked(contactLinks(c.no, lookups)),
    describe: label,
  })

  const openLinkedRecord = (link: ContactUsage) => {
    router.history.push(`${LINK_LIST_PATH[link.kind]}?sel=${encodeURIComponent(link.no)}`)
  }

  const editor: ListEditor<Contact> = {
    fields: () => [
      { key: 'no', label: 'Contact no.', type: 'text', mono: true, locked: true, hint: 'Assigned automatically.' },
      { key: 'name', label: 'Name', type: 'text', placeholder: 'e.g. Selvi Murugesan, or a desk like “Accounts desk”' },
      {
        key: 'phone',
        label: 'Phone',
        type: 'text',
        mono: true,
        placeholder: '94421 10290',
        display: (c) => formatContactPhone(c.phone) || EM_DASH,
      },
      { key: 'email', label: 'Email', type: 'text', placeholder: 'name@company.in' },
      { key: 'desc', label: 'Notes', type: 'area', placeholder: 'Best time to call, language, who they cover for.' },
      { key: 'active', label: 'Status', type: 'toggle', onText: 'Active', offText: 'Inactive' },
    ],
    view: (c) => {
      const links = contactLinks(c.no, lookups)
      return {
        no: c.no || EM_DASH,
        status: contactStatus(c),
        title: c.name || 'Unnamed contact',
        subtitle: contactSubtitle(links),
        notice: contactNotice(c, links),
        facts: [
          { k: 'Linked records', v: String(links.length) },
          { k: 'Last changed', v: c.updatedAt ? fmtDate(c.updatedAt.slice(0, 10)) : EM_DASH },
        ],
      }
    },
    extra: (c) => {
      const links = contactLinks(c.no, lookups)
      if (!links.length) return null
      return (
        <div className="pt-4">
          <div className="mb-1.5 text-[11px] font-semibold tracking-[0.05em] text-muted-foreground">LINKED TO</div>
          <div className="flex flex-col gap-1.5">
            {links.map((link) => (
              <button
                key={`${link.kind}:${link.no}:${link.role}:${link.isPrimary}`}
                type="button"
                onClick={() => openLinkedRecord(link)}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-transparent px-2.5 py-2 text-left transition-colors hover:bg-tint-16"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
                    <span className="rounded bg-tint-16 px-1.5 py-0.5 text-[10.5px] font-semibold text-muted-foreground">
                      {link.kind}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{link.no}</span>
                    <span className="truncate font-medium text-foreground">{link.name}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                    <span>{link.role || (link.kind === 'Carrier' ? 'Carrier contact' : 'No role set')}</span>
                    {link.isPrimary && link.kind !== 'Carrier' && (
                      <span className="rounded-full bg-tint-16 px-1.5 py-[1px] text-[10.5px] font-semibold text-foreground">
                        Primary
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="size-[14px] flex-none text-muted-foreground" strokeWidth={2} />
              </button>
            ))}
          </div>
        </div>
      )
    },
    blank: blankContact,
    duplicate: duplicateContact,
    normalize: normalizeContact,
    validate: validateContact,
    save: async (c, mode) => {
      const now = new Date().toISOString()
      const record: Contact = {
        ...c,
        createdAt: mode === 'new' || !c.createdAt ? now : c.createdAt,
        updatedAt: now,
      }
      await save.mutateAsync(record)
      if (mode === 'edit') {
        const formattedPhone = formatContactPhone(record.phone) || record.phone
        const mirrorVendors = lookups.vendors.filter(
          (v) =>
            (v.contacts ?? []).some((link) => link.isPrimary && link.contactId === record.no) &&
            (v.contact !== record.name || v.phone !== formattedPhone || v.email !== record.email),
        )
        const mirrorCustomers = lookups.customers.filter(
          (cu) =>
            (cu.contacts ?? []).some((link) => link.isPrimary && link.contactId === record.no) &&
            (cu.contact !== record.name || cu.phone !== formattedPhone || cu.email !== record.email),
        )
        await Promise.all([
          ...mirrorVendors.map((v) =>
            saveVendor.mutateAsync({ ...v, contact: record.name, phone: formattedPhone, email: record.email }),
          ),
          ...mirrorCustomers.map((cu) =>
            saveCustomer.mutateAsync({ ...cu, contact: record.name, phone: formattedPhone, email: record.email }),
          ),
        ])
      }
    },
    label,
  }

  return (
    <ListPage
      dataset={dataset}
      rows={contacts.data}
      isLoading={contacts.isPending}
      error={contacts.error}
      onRefresh={() => Promise.all([contacts.refetch(), vendors.refetch(), customers.refetch(), carriers.refetch()])}
      remove={remove}
      editor={editor}
      initialActiveId={sel ?? null}
      emptyText="No contacts yet. Use New contact to add a person or desk."
    />
  )
}
