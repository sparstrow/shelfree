import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { useMemo } from 'react'
import { type ListPreview, ListPage } from '@/components/list-page/ListPage'
import { NotesBlock } from '@/components/notes/NotesBlock'
import { useCollectionDelete } from '@/components/list-page/use-collection-delete'
import type { Vendor } from '@/data/schemas'
import { useList } from '@/data/queries'
import { vendorGstType, vendorGstTypeInfo } from '@/domain/gst'
import { vendorLocation, vendorStatus, vendorSuppliesLabel } from '@/domain/vendor'
import { EM_DASH, money } from '@/lib/format'
import { vendorDataset } from './dataset'

const route = getRouteApi('/purchasing/vendors/')

/** Purchasing ▸ Vendors. */
export function VendorsPage() {
  const navigate = useNavigate()
  const { sel } = route.useSearch()
  const vendors = useList('vendors')
  const employees = useList('employees')
  const orders = useList('purchaseOrders')
  const receipts = useList('purchaseReceipts')

  const dataset = useMemo(
    () =>
      vendorDataset({
        vendors: vendors.data ?? [],
        employees: employees.data ?? [],
      }),
    [vendors.data, employees.data],
  )

  const referencedVendors = useMemo(() => {
    const set = new Set<string>()
    for (const po of orders.data ?? []) if (po.vendor) set.add(po.vendor)
    for (const r of receipts.data ?? []) if (r.vendor) set.add(r.vendor)
    return set
  }, [orders.data, receipts.data])

  const empName = (id: string) => (employees.data ?? []).find((e) => e.id === id)?.name ?? ''

  const remove = useCollectionDelete<Vendor>('vendors', {
    // Referential integrity: vendors with purchase orders or receipts must be blocked instead of deleted.
    blockedReason: (v) =>
      referencedVendors.has(v.no) ? 'This vendor has purchase orders or receipts — block it instead' : null,
    describe: (v) => `${v.no} · ${v.name}`,
  })

  const preview = (v: Vendor): ListPreview => {
    const overdue = v.overdue || 0
    const gstShort = vendorGstTypeInfo(vendorGstType(v)).short
    const suppliesText =
      vendorSuppliesLabel(v) + ((v.supplies || 'goods') === 'services' ? ' · billed without a PO' : '')
    const gstText = gstShort + (v.gstin ? ` · ${v.gstin}` : '')

    return {
      ariaLabel: `Vendor ${v.no}`,
      no: v.no,
      status: vendorStatus(v),
      title: v.name,
      subtitle: `${v.category || EM_DASH} · ${vendorLocation(v) || EM_DASH}`,
      stats: [
        { value: money(v.balance || 0), label: 'Balance' },
        { value: money(v.balanceDue || 0), label: 'Balance due' },
        { value: money(overdue), label: 'Overdue', tone: overdue > 0 ? 'bad' : undefined },
      ],
      sections: [
        {
          heading: 'CONTACT',
          rows: [
            { k: 'Contact', v: v.contact || EM_DASH },
            { k: 'Phone', v: v.phone || EM_DASH },
            { k: 'Email', v: v.email || EM_DASH },
          ],
        },
      ],
      facts: [
        { k: 'Category', v: v.category || EM_DASH },
        { k: 'Supplies', v: suppliesText },
        { k: 'GST registration', v: gstText },
        { k: 'Payment terms', v: v.paymentTerms || EM_DASH },
        { k: 'Payment method', v: v.paymentMethod || EM_DASH },
        { k: 'Purchase person', v: empName(v.purchasePerson) || EM_DASH },
        { k: 'Balance due', v: money(v.balanceDue || 0) },
        { k: 'Outstanding orders', v: money(v.outstandingOrders || 0) },
        { k: 'Vendor since', v: v.vendorSince || EM_DASH },
      ],
      // The vendor's notes thread, as in the prototype's preview.
      children: (
        <div className="border-t border-border px-[14px] pt-3 pb-[14px]">
          <NotesBlock
            entityType="vendor"
            entityNo={v.no}
            listMaxHeight={220}
            placeholder="Add a note about this vendor… quality, lead times, what was agreed."
          />
        </div>
      ),
    }
  }

  return (
    <ListPage
      dataset={dataset}
      rows={vendors.data}
      isLoading={vendors.isPending}
      error={vendors.error}
      onRefresh={() => Promise.all([vendors.refetch(), employees.refetch(), orders.refetch(), receipts.refetch()])}
      recordPath={(v) => `/purchasing/vendors/${v.no}`}
      openLabel="Open full profile"
      create={{
        label: 'New vendor',
        run: () => void navigate({ to: '/purchasing/vendors/$no', params: { no: 'new' } }),
      }}
      remove={remove}
      preview={preview}
      initialActiveId={sel ?? null}
      emptyText="No vendors yet. Use New vendor to add the first one."
    />
  )
}
