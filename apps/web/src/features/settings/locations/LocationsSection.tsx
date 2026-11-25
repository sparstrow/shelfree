import { useMemo } from 'react'
import { toast } from 'sonner'
import { type ListDelete, type ListEditor, ListPage } from '@/components/list-page/ListPage'
import { SettingsPage } from '@/components/settings/SettingsPage'
import { useList } from '@/data/queries'
import { useLocationTerm } from '@/data/queries/regional-terminology'
import { useDeleteWarehouse, useLocationUsage, useSaveWarehouse } from '@/data/queries/warehouse-settings'
import type { Warehouse } from '@/data/schemas'
import { GST_STATES } from '@/domain/gst'
import { locationRegistrationError, registrationForSite } from '@/domain/gst-registrations'
import {
  LOCATION_COUNTRIES,
  LOCATION_POB,
  LOCATION_STATUSES,
  LOCATION_TYPES,
  isIndianSite,
  locationAddress,
  locationCountryLabel,
  locationDeleteBlockReason,
  locationPobLabel,
  locationStateLabel,
  locationStatusLabel,
  locationTypeLabel,
  nextLocationId,
  normalizeLocation,
  principalDisplaced,
  validateLocation,
} from '@/domain/locations'
import { EM_DASH, int } from '@/lib/format'
import { type LocationRow, locationsDataset } from './dataset'
import { LOCATIONS_HELP } from './help'

const STATE_OPTIONS = GST_STATES.filter((s) => !s.legacy).map((s) => ({ value: s.code, label: s.name }))
const NONE = ''

const toWarehouse = (r: LocationRow): Warehouse => ({
  id: r.id,
  name: r.name,
  code: r.code,
  type: r.type,
  addr: r.addr,
  city: r.city,
  state: r.state,
  zip: r.zip,
  country: r.country,
  area: r.area,
  status: r.status,
  pobStatus: r.pobStatus,
  managerEmpId: r.managerEmpId,
  operatorVendorId: r.operatorVendorId,
  ...(r.createdAt ? { createdAt: r.createdAt } : {}),
  ...(r.updatedAt ? { updatedAt: r.updatedAt } : {}),
})

/**
 * Warehouse ▸ Settings ▸ Locations & warehouses (`/warehouse/settings/locations`).
 * The prototype also had a Structure Designer (zones, aisles, bins) and a creation
 * wizard on this page — neither is ported yet (see docs/gaps.md).
 */
export function LocationsSection({ readOnly = false }: { readOnly?: boolean } = {}) {
  const warehouses = useList('warehouses')
  const employees = useList('employees')
  const vendors = useList('vendors')
  const registrations = useList('gstRegistrations')
  const term = useLocationTerm()
  const usageQuery = useLocationUsage()
  const save = useSaveWarehouse()
  const remove = useDeleteWarehouse()

  const sites = useMemo(() => warehouses.data ?? [], [warehouses.data])
  const usage = usageQuery.data

  const rows = useMemo<LocationRow[] | undefined>(() => {
    if (warehouses.data === undefined || usage === undefined || registrations.data === undefined) return undefined
    const empName = new Map((employees.data ?? []).map((e) => [e.id, e.name]))
    const vendorName = new Map((vendors.data ?? []).map((v) => [v.no, v.name]))
    return sites.map((w) => ({
      ...w,
      stock: usage.get(w.id)?.stock ?? 0,
      openDocs: usage.get(w.id)?.openDocs ?? 0,
      managerName: empName.get(w.managerEmpId) ?? '',
      operatorName: vendorName.get(w.operatorVendorId) ?? '',
      registration: registrationForSite(registrations.data ?? [], w)?.gstin ?? '',
    }))
  }, [warehouses.data, usage, sites, employees.data, vendors.data, registrations.data])

  const dataset = useMemo(() => locationsDataset(term), [term])

  const managerOptions = useMemo(
    () => [
      { value: NONE, label: 'No manager' },
      ...(employees.data ?? [])
        .filter((e) => e.status !== 'Terminated')
        .map((e) => ({ value: e.id, label: e.title ? `${e.name} · ${e.title}` : e.name })),
    ],
    [employees.data],
  )

  const del: ListDelete<LocationRow> = {
    blockedReason: (w) => locationDeleteBlockReason(w, sites, usage?.get(w.id)),
    describe: (w) => `${w.code} · ${w.name}`,
    note: 'It holds no stock and has no open documents.',
    run: (w) => remove.mutateAsync(w.id),
    undo: (w) => void save.mutateAsync(toWarehouse(w)),
  }

  const editor: ListEditor<LocationRow> = {
    fields: (d, mode) => {
      const indian = isIndianSite(d)
      const docsUsing = usage?.get(d.id)?.docs ?? 0
      const codeFixed = mode === 'edit' && docsUsing > 0
      const operatorOptions = [
        { value: NONE, label: 'Not set' },
        ...(vendors.data ?? [])
          .filter((v) => v.supplies !== 'goods' || v.no === d.operatorVendorId)
          .map((v) => ({ value: v.no, label: `${v.name} · ${v.no}` })),
      ]
      return [
        { key: 'name', label: 'Name', type: 'text', placeholder: 'e.g. Tiruvannamalai — Main', hint: LOCATIONS_HELP.name.body },
        {
          key: 'code',
          label: 'Code',
          type: 'text',
          mono: true,
          maxLength: 9,
          locked: codeFixed,
          placeholder: 'e.g. TVM-MAIN',
          hint: codeFixed
            ? `${docsUsing} ${docsUsing === 1 ? 'document refers' : 'documents refer'} to this code, so it is fixed.`
            : LOCATIONS_HELP.code.body,
        },
        { key: 'type', label: 'Type', type: 'select', options: LOCATION_TYPES, hint: LOCATIONS_HELP.type.body },
        { key: 'status', label: 'Status', type: 'select', options: LOCATION_STATUSES, hint: LOCATIONS_HELP.status.body },
        {
          key: 'country',
          label: 'Country',
          type: 'select',
          options: LOCATION_COUNTRIES,
          display: (w) => locationCountryLabel(w.country || 'IN'),
          hint: LOCATIONS_HELP.country.body,
        },
        indian
          ? {
              key: 'state',
              label: 'State',
              type: 'select',
              options: [{ value: NONE, label: 'Choose a state…' }, ...STATE_OPTIONS],
              display: (w) => locationStateLabel(w),
              hint: LOCATIONS_HELP.state.body,
            }
          : {
              key: 'state',
              label: 'Region',
              type: 'text',
              placeholder: 'State, province or emirate',
              hint: LOCATIONS_HELP.state.body,
            },
        { key: 'addr', label: 'Address', type: 'text', placeholder: 'Street address', hint: LOCATIONS_HELP.addr.body },
        { key: 'city', label: 'City', type: 'text', hint: LOCATIONS_HELP.city.body },
        { key: 'zip', label: 'PIN code', type: 'text', mono: true, maxLength: 10, hint: LOCATIONS_HELP.zip.body },
        { key: 'area', label: 'Area (sq ft)', type: 'number', step: '1', hint: LOCATIONS_HELP.area.body },
        ...(indian
          ? [
              {
                key: 'pobStatus' as const,
                label: 'On the GST certificate as',
                type: 'select' as const,
                options: LOCATION_POB,
                hint: LOCATIONS_HELP.pobStatus.body,
              },
            ]
          : []),
        {
          key: 'managerEmpId',
          label: 'Site manager',
          type: 'select',
          options: managerOptions,
          display: (w) => w.managerName,
          hint: LOCATIONS_HELP.managerEmpId.body,
        },
        ...(d.type === '3pl'
          ? [
              {
                key: 'operatorVendorId' as const,
                label: 'Operated by (3PL vendor)',
                type: 'select' as const,
                options: operatorOptions,
                display: (w: LocationRow) => w.operatorName,
                hint: LOCATIONS_HELP.operatorVendorId.body,
              },
            ]
          : []),
      ]
    },
    view: (w) => {
      const blocked = locationDeleteBlockReason(w, sites, usage?.get(w.id))
      const uncovered = locationRegistrationError(w, registrations.data ?? [])
      return {
        no: w.code || EM_DASH,
        status: locationStatusLabel(w.status),
        tags: [locationTypeLabel(w.type), ...(isIndianSite(w) ? [locationPobLabel(w.pobStatus)] : [])],
        title: w.name || 'Untitled location',
        subtitle: locationAddress(w) || undefined,
        notice: blocked ?? uncovered ?? undefined,
        facts: [
          ...(isIndianSite(w) ? [{ k: 'GST registration', v: w.registration || 'None for this state' }] : []),
          { k: 'Units in stock', v: int(w.stock) },
          { k: 'Open documents', v: int(w.openDocs) },
        ],
      }
    },
    blank: () => ({
      id: '',
      name: '',
      code: '',
      type: 'dc',
      addr: '',
      city: '',
      state: '',
      zip: '',
      country: 'IN',
      area: 0,
      status: 'setup',
      pobStatus: 'undeclared',
      managerEmpId: '',
      operatorVendorId: '',
      stock: 0,
      openDocs: 0,
      managerName: '',
      operatorName: '',
      registration: '',
    }),
    onChange: (draft, key) => {
      if (key === 'code') return { ...draft, code: draft.code.toUpperCase().replace(/[^A-Z0-9-]/g, '') }
      // The state is a GST code for Indian sites and free text elsewhere, so it resets with the country.
      if (key === 'country') return { ...draft, state: '', pobStatus: 'undeclared' }
      return draft
    },
    normalize: (draft) => {
      const n = normalizeLocation(draft)
      return { ...draft, ...n, id: draft.id || nextLocationId(sites, n.code) }
    },
    validate: (draft, others) => {
      const original = sites.find((w) => w.id === draft.id) ?? null
      return validateLocation(
        toWarehouse(draft),
        others.map(toWarehouse),
        original,
        usage?.get(draft.id),
        new Set((vendors.data ?? []).map((v) => v.no)),
        registrations.data ?? [],
      )
    },
    save: async (record) => {
      const result = await save.mutateAsync(toWarehouse(record))
      if (result.moved) {
        toast('Principal place changed', { description: `${result.moved.name} moved to Additional.` })
      }
    },
    label: (w) => `${w.code} · ${w.name}`,
    extraEdit: (draft) => {
      const displaced = principalDisplaced(toWarehouse(draft), sites)
      if (!displaced) return null
      return (
        <p aria-live="polite" className="m-0 mt-3 text-[12px] text-muted-foreground">
          Saving makes this the principal place and moves {displaced.name} to Additional.
        </p>
      )
    },
  }

  return (
    <SettingsPage
      title={`${term.plural} & warehouses`}
      help={LOCATIONS_HELP.page}
      count={rows?.length}
      flush
      readOnly={readOnly}
    >
      <ListPage<LocationRow>
        embedded
        readOnly={readOnly}
        dataset={dataset}
        rows={rows}
        isLoading={warehouses.isLoading || usageQuery.isLoading || registrations.isLoading}
        error={warehouses.error ?? usageQuery.error ?? registrations.error}
        onRefresh={() => Promise.all([warehouses.refetch(), usageQuery.refetch(), registrations.refetch()])}
        remove={del}
        editor={editor}
        emptyText={`No ${term.plural.toLowerCase()} match.`}
      />
    </SettingsPage>
  )
}
