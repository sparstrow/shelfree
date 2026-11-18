import { useMemo } from 'react'
import { RecordPage, type RecordPageState, type RecordTab, RecordTabPending } from '@/components/record-page/RecordPage'
import { useList, useUpsert } from '@/data/queries'
import { useMe } from '@/data/queries/session'
import { useSettings } from '@/data/queries/settings'
import type { Vendor } from '@/data/schemas'
import {
  applyVendorForm,
  normalizeVendorForm,
  validateVendorForm,
  vendorActivity,
  vendorGstReview,
  vendorLastOrderDate,
  vendorLocation,
  vendorSavedNote,
  vendorStats,
  vendorStatus,
  vendorSuppliesLabel,
  vendorSupply,
  vendorToForm,
} from '@/domain/vendor'
import { fmtDate, int, todayLocal } from '@/lib/format'
import { VendorOverview, type VendorDraft } from './VendorOverview'
import { VendorContactsTab } from './tabs/VendorContactsTab'

const BACK_TO = '/purchasing/vendors'

/** The ten tabs of the vendor profile. Only Overview is built so far. */
const TABS: readonly RecordTab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'details', label: 'Address & payment' },
  { id: 'items', label: 'Items supplied' },
  { id: 'orders', label: 'Purchase orders' },
  { id: 'receipts', label: 'Purchase receipts' },
  { id: 'payables', label: 'Payables & blocking' },
  { id: 'performance', label: 'Performance' },
  { id: 'notes', label: 'Notes & activity' },
  { id: 'docs', label: 'Documents' },
  { id: 'contacts', label: 'Contacts' },
]

/** Fields that live on the Overview tab (the only tab built so far). */
const tabOfField = () => 'overview'

/** Purchasing ▸ Vendors ▸ profile page. */
export function VendorProfilePage({ no }: { no: string }) {
  const vendors = useList('vendors')
  const employees = useList('employees')
  const orders = useList('purchaseOrders')
  const receipts = useList('purchaseReceipts')
  const items = useList('items')
  const prices = useList('purchasePrices')
  const settings = useSettings()
  const me = useMe()
  const upsert = useUpsert('vendors')
  const queries = [vendors, employees, orders, receipts, items, prices, settings]

  const today = todayLocal()
  const record = vendors.data?.find((v) => v.no === no) ?? null
  const ws = settings.data?.tax ?? { taxCalc: 'line' as const, roundTotal: true }

  const stats = useMemo(
    () => vendorStats(no, orders.data ?? [], receipts.data ?? [], today),
    [no, orders.data, receipts.data, today],
  )

  let state: RecordPageState = { kind: 'ready' }
  if (queries.some((q) => q.isError)) {
    state = { kind: 'error', message: 'Could not load this vendor.', retry: () => queries.forEach((q) => void q.refetch()) }
  } else if (!queries.every((q) => q.data !== undefined)) {
    state = { kind: 'loading' }
  }

  const toDraft = (v: Vendor): VendorDraft => ({
    ...vendorToForm(v, ws),
    supplies: vendorSuppliesLabel(v) + (v.supplies === 'services' ? ' · billed without a PO' : ''),
    vendorSince: fmtDate(v.vendorSince),
    lastOrder: fmtDate(vendorLastOrderDate(stats.orders)),
    openOrders: int(stats.open.length),
  })

  const purchasePersonOptions = [
    { value: '', label: 'Unassigned' },
    ...(employees.data ?? [])
      .filter((e) => (e.dept === 'Purchasing' && e.status !== 'Terminated') || e.id === record?.purchasePerson)
      .map((e) => ({ value: e.id, label: e.name }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  ]

  return (
    <RecordPage<Vendor, VendorDraft>
      key={no}
      pageLabel="Vendor"
      backTo={BACK_TO}
      backLabel="Back to vendors"
      recordNo={no}
      state={state}
      record={record}
      notFoundText={`Vendor ${no} was not found. It may have been deleted.`}
      header={(v, d) => ({
        title: d.name,
        no: v.no,
        status: vendorStatus(v),
        tags: [
          ...(v.blocked ? [{ label: v.blocked === 'All' ? 'Blocked · all' : 'Payments blocked', tone: 'bad' as const }] : []),
          ...(v.subInfo.sub ? [{ label: 'Subcontractor', tone: 'info' as const }] : []),
        ],
        subtitle: [v.category, vendorLocation(v), v.paymentTerms].filter(Boolean).join('  ·  '),
      })}
      titleField="name"
      titleLabel="Vendor name"
      tabs={TABS}
      toDraft={toDraft}
      normalize={normalizeVendorForm}
      validate={(d, v) => validateVendorForm(d, v)}
      tabOfField={tabOfField}
      onChange={(d, key) =>
        // Back to workspace rules: the dependent rows return to the workspace values.
        key === 'taxRules' && d.taxRules === 'workspace'
          ? { ...d, taxCalc: ws.taxCalc, roundTotal: ws.roundTotal ? 'yes' : 'no' }
          : d
      }
      review={(d, v) => vendorGstReview(v, d, stats.taxPending)}
      save={async (d, v) => {
        const next = applyVendorForm(v, d, {
          openOrders: stats.taxPending,
          by: me.data?.name ?? '',
          now: new Date().toISOString().slice(0, 19),
        })
        await upsert.mutateAsync(next)
        return { title: 'Vendor updated', description: `${next.no} · ${next.name}${vendorSavedNote(v, next, ws)}` }
      }}
    >
      {(ctx, tab) => {
        switch (tab.id) {
          case 'overview':
            return (
              <VendorOverview
                ctx={ctx}
                stats={stats}
                supply={vendorSupply(ctx.record, items.data ?? [], prices.data ?? [], stats.orders, today)}
                activity={vendorActivity(ctx.record, stats, today)}
                purchasePersonOptions={purchasePersonOptions}
                workspaceTax={ws}
              />
            )
          case 'contacts':
            return <VendorContactsTab vendor={ctx.record} />
          default:
            return <RecordTabPending label={tab.label} />
        }
      }}
    </RecordPage>
  )
}
