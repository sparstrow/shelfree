import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { FileText } from 'lucide-react'
import { useMemo, useState } from 'react'
import { type ListPreview, ListPage } from '@/components/list-page/ListPage'
import { useCollectionDelete } from '@/components/list-page/use-collection-delete'
import type { PurchaseReceipt } from '@/data/schemas'
import { useList } from '@/data/queries'
import { prQtyReceived, prQtyRejected, prValue } from '@/domain/purchase-receipt'
import { EM_DASH, fmtDate, int, money } from '@/lib/format'
import { OrderPicker } from './OrderPicker'
import { purchaseReceiptDataset } from './dataset'

const route = getRouteApi('/purchasing/purchase-receipts/')

/** Purchasing ▸ Purchase Receipts. New receipts start from an order picker (page-specific). */
export function PurchaseReceiptsPage() {
  const navigate = useNavigate()
  const { sel } = route.useSearch()
  const receipts = useList('purchaseReceipts')
  const orders = useList('purchaseOrders')
  const vendors = useList('vendors')
  const employees = useList('employees')
  const warehouses = useList('warehouses')
  const notes = useList('notes')
  const [picking, setPicking] = useState(false)

  const dataset = useMemo(
    () =>
      purchaseReceiptDataset({
        receipts: receipts.data ?? [],
        vendors: vendors.data ?? [],
        employees: employees.data ?? [],
        warehouses: warehouses.data ?? [],
        notes: notes.data ?? [],
      }),
    [receipts.data, vendors.data, employees.data, warehouses.data, notes.data],
  )
  const vendorName = (r: PurchaseReceipt) => (vendors.data ?? []).find((v) => v.no === r.vendor)?.name ?? r.vendor
  const siteName = (r: PurchaseReceipt) => (warehouses.data ?? []).find((w) => w.code === r.location)?.name ?? r.location
  const receiver = (r: PurchaseReceipt) => (employees.data ?? []).find((e) => e.id === r.receivedBy)?.name ?? ''

  const openOrder = (r: PurchaseReceipt) => void navigate({ to: '/purchasing/purchase-orders/$no', params: { no: r.po } })

  const remove = useCollectionDelete<PurchaseReceipt>('purchaseReceipts', {
    // A posted receipt has moved stock; corrections go through a vendor return.
    blockedReason: (r) => (r.status === 'Posted' ? 'A posted receipt can’t be deleted' : null),
    describe: (r) => `${r.no} · ${vendorName(r)}`,
    note: 'Nothing was taken into stock for it.',
  })

  const preview = (r: PurchaseReceipt): ListPreview => ({
    ariaLabel: `Purchase receipt ${r.no}`,
    no: r.no,
    status: r.status,
    title: vendorName(r),
    subtitle: `${fmtDate(r.receiptDate)} · into ${siteName(r)}`,
    stats: [
      { value: int(prQtyReceived(r)), label: 'Received' },
      { value: int(prQtyRejected(r)), label: 'Rejected' },
      { value: money(prValue(r)), label: 'Value' },
    ],
    linesHeading: 'WHAT ARRIVED',
    lines: r.lines.map((l, i) => ({
      key: l.item + i,
      left: (
        <>
          <span className="font-mono text-[11.5px] text-muted-foreground">{l.item}</span> · {l.desc}{' '}
          <span className="text-muted-foreground">
            {int(l.qtyReceived)} {l.uom}
          </span>
        </>
      ),
      right: money((Number(l.qtyReceived) || 0) * (Number(l.unitCost) || 0)),
    })),
    facts: [
      { k: 'Purchase order', v: r.po || EM_DASH },
      { k: 'Vendor challan', v: r.vendorDocNo || EM_DASH },
      { k: 'Received into', v: siteName(r) },
      { k: 'Received by', v: receiver(r) || 'Unassigned' },
      { k: 'Rejected', v: int(prQtyRejected(r)) },
      { k: 'Value', v: money(prValue(r)) },
    ],
  })

  return (
    <>
      <ListPage
        dataset={dataset}
        rows={receipts.data}
        isLoading={receipts.isPending}
        error={receipts.error}
        onRefresh={() => Promise.all([receipts.refetch(), orders.refetch(), vendors.refetch(), notes.refetch()])}
        recordPath={(r) => `/purchasing/purchase-receipts/${r.no}`}
        openLabel="Open receipt"
        create={{ label: 'New purchase receipt', run: () => setPicking(true) }}
        remove={remove}
        actions={[
          { label: 'Order', icon: FileText, when: (r) => !!r.po, run: openOrder, inDrawer: true, title: 'Open the purchase order' },
        ]}
        preview={preview}
        initialActiveId={sel ?? null}
        emptyText="No purchase receipts yet. Use New purchase receipt when goods arrive."
      />
      <OrderPicker
        open={picking}
        orders={orders.data ?? []}
        receipts={receipts.data ?? []}
        vendors={vendors.data ?? []}
        onClose={() => setPicking(false)}
        onPick={(po) => {
          setPicking(false)
          void navigate({ to: '/purchasing/purchase-receipts/$no', params: { no: 'new' }, search: { po: po.no } })
        }}
      />
    </>
  )
}
