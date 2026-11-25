import { getRouteApi, useRouter } from '@tanstack/react-router'
import { ChevronRight, ExternalLink } from 'lucide-react'
import { useMemo } from 'react'
import type { Dataset, RawValue } from '@/components/data-grid/model'
import { type ListEditor, ListPage } from '@/components/list-page/ListPage'
import { useCollectionDelete } from '@/components/list-page/use-collection-delete'
import { useList, useUpsert } from '@/data/queries'
import type { Carrier, CarrierTypeRecord, Contact } from '@/data/schemas'
import {
  CARRIER_BEHAVIORS,
  CARRIER_TYPE_DEFAULTS,
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
  carrierTypeName,
  carrierTypeOptions,
  duplicateCarrier,
  normalizeCarrier,
  validateCarrier,
} from '@/domain/carriers'
import { formatContactPhone } from '@/domain/contacts'
import { EM_DASH, fmtDate } from '@/lib/format'
import { maskPhone } from '@/lib/privacy'

const route = getRouteApi('/purchasing/carriers/')

function carrierDataset(contacts: readonly Contact[], types: readonly CarrierTypeRecord[]): Dataset<Carrier> {
  const contactById = new Map(contacts.map((c) => [c.no, c]))
  const contactName = (c: Carrier) => (c.contactId ? (contactById.get(c.contactId)?.name ?? '') : '')
  const contactPhone = (c: Carrier) => (c.contactId ? (contactById.get(c.contactId)?.phone ?? '') : '')

  const raw = (c: Carrier, key: string): RawValue => {
    switch (key) {
      case 'type':
        return carrierTypeName(c.type, types)
      case 'kind':
        return carrierBehaviorLabel(carrierBehavior(c.type, types))
      case 'gstin':
        return carrierBehavior(c.type, types) === 'own' ? '' : c.gstin || ''
      case 'tax':
        return carrierGstTreatment(c, types)
      case 'ref':
        return carrierTrackingRef(c.type, types)
      case 'link':
        return carrierTrackingLinkStatus(c, types)
      case 'contact':
        return contactName(c)
      case 'phone':
        return maskPhone(contactPhone(c))
      case 'status':
        return carrierStatus(c)
      default: {
        const v = c[key as keyof Carrier]
        return v == null ? '' : String(v)
      }
    }
  }

  const col = (key: string, label: string, width: number, extra: Partial<Dataset<Carrier>['columns'][number]> = {}) => ({
    key,
    label,
    width,
    min: Math.min(width, 80),
    visible: true,
    align: 'left' as const,
    type: 'text' as const,
    sortable: true,
    ...extra,
  })

  return {
    id: 'carriers',
    noun: 'carrier',
    nounPlural: 'carriers',
    idOf: (c) => c.no,
    columns: [
      col('no', 'Code', 92, { frozen: 'left', type: 'mono', min: 64 }),
      col('name', 'Name', 220, { min: 140 }),
      col('type', 'Type', 150),
      col('kind', 'Behaves as', 180, { visible: false }),
      col('gstin', 'GSTIN', 160, { type: 'mono' }),
      col('tax', 'GST on freight', 140),
      col('ref', 'Tracking ref.', 110),
      col('link', 'Tracking link', 116),
      col('service', 'Default service', 150),
      col('contact', 'Contact', 140, { visible: false }),
      col('phone', 'Phone', 110, { visible: false, type: 'mono' }),
      col('status', 'Status', 100, { type: 'pill' }),
      col('desc', 'Notes', 320, { visible: false }),
    ],
    raw,
    text: (c, key) => {
      const v = raw(c, key)
      return v === '' ? EM_DASH : String(v)
    },
    searchBlob: (c) =>
      [
        c.no,
        c.name,
        carrierTypeName(c.type, types),
        raw(c, 'gstin'),
        carrierGstTreatment(c, types),
        carrierTrackingRef(c.type, types),
        carrierTrackingLinkStatus(c, types),
        c.service,
        contactName(c),
        maskPhone(contactPhone(c)),
        carrierStatus(c),
        c.desc,
      ]
        .join(' \u0001 ')
        .toLowerCase(),
    views: [
      { id: 'all', name: 'All carriers', system: true, filters: [] },
      { id: 'courier', name: 'Couriers', filters: [{ key: 'type', op: 'isAny', value: ['Courier'] }] },
      {
        id: 'gta',
        name: 'Transporters (GTA)',
        filters: [{ key: 'kind', op: 'isAny', value: [carrierBehaviorLabel('gta')] }],
      },
      { id: 'rcm', name: 'Reverse charge', filters: [{ key: 'tax', op: 'isAny', value: ['Reverse charge'] }] },
      { id: 'nolink', name: 'No tracking link', filters: [{ key: 'link', op: 'isAny', value: ['Not set'] }] },
      { id: 'inactive', name: 'Inactive', filters: [{ key: 'status', op: 'isAny', value: ['Inactive'] }] },
    ],
    filterColumns: [
      { key: 'no', label: 'Code', type: 'text' },
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'type', label: 'Type', type: 'enum', options: types.map((t) => t.name) },
      { key: 'kind', label: 'Behaves as', type: 'enum', options: CARRIER_BEHAVIORS.map((b) => b.label) },
      { key: 'gstin', label: 'GSTIN', type: 'text' },
      {
        key: 'tax',
        label: 'GST on freight',
        type: 'enum',
        options: ['Reverse charge', 'Forward charge', 'Not applicable'],
      },
      {
        key: 'ref',
        label: 'Tracking ref.',
        type: 'enum',
        options: [
          ...new Set(types.filter((t) => t.behavior !== 'own').map((t) => t.refLabel || 'Tracking no.')),
          EM_DASH,
        ],
      },
      { key: 'link', label: 'Tracking link', type: 'enum', options: ['Set', 'Not set', 'Not applicable'] },
      { key: 'service', label: 'Default service', type: 'text' },
      { key: 'contact', label: 'Contact', type: 'text' },
      { key: 'status', label: 'Status', type: 'enum', options: ['Active', 'Inactive'] },
      { key: 'desc', label: 'Notes', type: 'text' },
    ],
    defaultSort: { key: 'no', dir: 'asc' },
    rowFlag: (c) => carrierRowFlag(c, types),
  }
}

/** Purchasing ▸ Carriers — couriers, transporters (GTA) and our own vehicle, edited in the drawer. */
export function CarriersPage() {
  const router = useRouter()
  const { sel } = route.useSearch()
  const carriers = useList('carriers')
  const contacts = useList('contacts')
  const save = useUpsert('carriers')

  const carrierTypes = useList('carrierTypes')
  // Types come from Settings ▸ Carrier types; the built-in defaults cover the moment before they load.
  const typeList = useMemo<readonly CarrierTypeRecord[]>(
    () => carrierTypes.data ?? CARRIER_TYPE_DEFAULTS,
    [carrierTypes.data],
  )
  const contactList = useMemo(() => contacts.data ?? [], [contacts.data])
  const contactById = useMemo(() => new Map(contactList.map((c) => [c.no, c])), [contactList])
  const dataset = useMemo(() => carrierDataset(contactList, typeList), [contactList, typeList])
  const label = (c: Carrier) => `${c.no || EM_DASH} · ${c.name || 'Untitled carrier'}`

  const remove = useCollectionDelete<Carrier>('carriers', {
    blockedReason: carrierDeleteBlocked,
    describe: label,
  })

  const editor: ListEditor<Carrier> = {
    fields: (d) => {
      const beh = carrierBehavior(d.type, typeList)
      const own = beh === 'own'
      const gta = beh === 'gta'
      return [
        {
          key: 'no',
          label: 'Code',
          type: 'text',
          mono: true,
          maxLength: 12,
          placeholder: 'e.g. STC',
          hint: 'Short code shown on orders and shipments.',
        },
        {
          key: 'type',
          label: 'Type',
          type: 'select',
          options: carrierTypeOptions(d.type, typeList),
          hint: 'Add or rename types in Settings › Carrier types.',
        },
        {
          key: 'name',
          label: 'Name',
          type: 'text',
          placeholder: own ? 'e.g. Kanalora van' : 'e.g. ST Courier',
        },
        ...(!own
          ? [
              {
                key: 'gstin' as const,
                label: 'GSTIN',
                type: 'text' as const,
                mono: true,
                maxLength: 15,
                placeholder: '33AAECS4721K1Z8',
                hint: gta
                  ? d.rcm
                    ? 'Optional for a reverse-charge GTA — needed on the RCM self-invoice when registered.'
                    : 'Required — a forward-charge GTA bills GST.'
                  : 'Optional — needed to claim input tax credit on its bills.',
              },
            ]
          : []),
        ...(gta
          ? [
              {
                key: 'rcm' as const,
                label: 'GST on freight',
                type: 'toggle' as const,
                onText: 'Reverse charge — we pay the GST',
                offText: 'Forward charge — GTA bills GST',
                hint: 'Default for a GTA is reverse charge. Turn off only if the transporter has opted to charge GST on its own invoices.',
              },
            ]
          : []),
        ...(!own
          ? [
              {
                key: 'trackUrl' as const,
                label: 'Tracking link',
                type: 'text' as const,
                mono: true,
                placeholder: 'https://…/track?no={tracking}',
                hint: `Paste the carrier’s tracking page and put {tracking} where the ${carrierTrackingRef(d.type, typeList)} goes. Shipments turn it into a clickable link.`,
              },
            ]
          : []),
        {
          key: 'service',
          label: 'Default service',
          type: 'text',
          placeholder: own ? 'Local pickup' : gta ? 'Part load' : 'Standard surface',
        },
        {
          key: 'contactId',
          label: own ? 'Driver' : 'Contact',
          type: 'lookup',
          source: 'contacts',
          placeholder: own ? 'Pick the driver…' : 'Pick a contact…',
          hint: 'From People › Contacts — search by name, phone or email, or create one from the list. Phone shows masked in the grid.',
        },
        {
          key: 'desc',
          label: 'Notes',
          type: 'area',
          placeholder: 'Lanes, cut-off times, what it’s good for.',
        },
        {
          key: 'active',
          label: 'Status',
          type: 'toggle',
          onText: 'Active',
          offText: 'Inactive',
          hint: 'Inactive carriers keep their history but can’t be picked on new orders or shipments.',
        },
      ]
    },
    view: (c) => {
      const own = carrierBehavior(c.type, typeList) === 'own'
      const typeLabel = carrierTypeName(c.type, typeList)
      return {
        no: c.no || EM_DASH,
        status: carrierStatus(c),
        title: c.name || 'Untitled carrier',
        subtitle: typeLabel + (own ? '' : ` · ${carrierGstTreatment(c, typeList)}`),
        notice: carrierNotices(c, typeList).join(' ') || undefined,
        facts: [
          { k: 'Behaves as', v: carrierBehaviorLabel(carrierBehavior(c.type, typeList)) },
          ...(!own ? [{ k: 'Tracking ref.', v: carrierTrackingRef(c.type, typeList) }] : []),
          { k: 'Last changed', v: c.updatedAt ? fmtDate(c.updatedAt.slice(0, 10)) : EM_DASH },
        ],
      }
    },
    extra: (c) => {
      const own = carrierBehavior(c.type, typeList) === 'own'
      const sampleUrl = carrierSampleTrackUrl(c, typeList)
      const linkedContact = c.contactId ? contactById.get(c.contactId) : undefined
      return (
        <div className="flex flex-col gap-3.5 pt-3.5">
          {sampleUrl && (
            <div>
              <a
                href={sampleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover-lift inline-flex h-[30px] items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground no-underline hover:bg-tint-12"
              >
                <ExternalLink className="size-[13px]" strokeWidth={2} />
                Test tracking link
              </a>
            </div>
          )}

          {linkedContact && (
            <div>
              <div className="mb-1.5 text-[11px] font-semibold tracking-[0.05em] text-muted-foreground">
                {own ? 'DRIVER' : 'CONTACT'}
              </div>
              <button
                type="button"
                onClick={() => router.history.push(`/people/contacts?sel=${encodeURIComponent(linkedContact.no)}`)}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-transparent px-2.5 py-2 text-left transition-colors hover:bg-tint-16"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
                    <span className="rounded bg-tint-16 px-1.5 py-0.5 text-[10.5px] font-semibold text-muted-foreground">
                      Contact
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{linkedContact.no}</span>
                    <span className="truncate font-medium text-foreground">{linkedContact.name}</span>
                  </div>
                  <div className="tnum mt-0.5 truncate text-[11.5px] text-muted-foreground">
                    {[formatContactPhone(linkedContact.phone), linkedContact.email].filter(Boolean).join(' · ') ||
                      'No phone or email'}
                  </div>
                </div>
                <ChevronRight className="size-[14px] flex-none text-muted-foreground" strokeWidth={2} />
              </button>
            </div>
          )}

          <div className="text-xs leading-[1.45] text-muted-foreground">
            Not on any shipment yet — carriers are picked on vendor cards and purchase orders next, and on receipts with
            the shipment block.
          </div>
        </div>
      )
    },
    blank: () => blankCarrier(typeList),
    duplicate: duplicateCarrier,
    onChange: (d, key) => carrierOnChange(d, key, typeList),
    normalize: (d) => normalizeCarrier(d, typeList),
    validate: (d, others) => validateCarrier(d, others, contactList, d.createdAt ? 'edit' : 'new', typeList),
    save: (c, mode) => {
      const now = new Date().toISOString()
      return save.mutateAsync({ ...c, createdAt: mode === 'new' || !c.createdAt ? now : c.createdAt, updatedAt: now })
    },
    label,
  }

  return (
    <ListPage
      dataset={dataset}
      rows={carriers.data}
      isLoading={carriers.isPending}
      error={carriers.error}
      onRefresh={() => Promise.all([carriers.refetch(), contacts.refetch(), carrierTypes.refetch()])}
      remove={remove}
      editor={editor}
      initialActiveId={sel ?? null}
      emptyText="No carriers match your filters."
    />
  )
}
