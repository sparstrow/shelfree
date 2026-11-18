import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { Download } from 'lucide-react'
import { useMemo } from 'react'
import { type ListPreview, ListPage } from '@/components/list-page/ListPage'
import { useCollectionDelete } from '@/components/list-page/use-collection-delete'
import type { PurchaseOrder } from '@/data/schemas'
import { useList } from '@/data/queries'
import { poLineCount, poLineTotal, poReceivable, poSubtotal } from '@/domain/purchase-order'
import { EM_DASH, fmtDate, int, money } from '@/lib/format'
import { purchaseOrderDataset } from './dataset'
import { PO_RECEIVE_SHORTCUT } from './shortcuts'

const route = getRouteApi('/purchasing/purchase-orders/')

/** Purchasing ▸ Purchase Orders. */
export function PurchaseOrdersPage() {
  const navigate = useNavigate()
  const { sel } = route.useSearch()
  const orders = useList('purchaseOrders')
  const vendors = useList('vendors')
  const employees = useList('employees')
  const notes = useList('notes')

  const dataset = useMemo(
    () =>
      purchaseOrderDataset({
        orders: orders.data ?? [],
        vendors: vendors.data ?? [],
        employees: employees.data ?? [],
        notes: notes.data ?? [],
      }),
    [orders.data, vendors.data, employees.data, notes.data],
  )
  const vendorName = (po: PurchaseOrder) => (vendors.data ?? []).find((v) => v.no === po.vendor)?.name ?? po.vendor
  const buyerName = (po: PurchaseOrder) => (employees.data ?? []).find((e) => e.id === po.buyer)?.name ?? ''

  const receive = (po: PurchaseOrder) =>
    void navigate({ to: '/purchasing/purchase-receipts/$no', params: { no: 'new' }, search: { po: po.no } })

  const remove = useCollectionDelete<PurchaseOrder>('purchaseOrders', {
    // Issued orders are cancelled, never deleted.
    blockedReason: (po) => (po.status === 'Draft' ? null : 'Only draft orders can be deleted'),
    describe: (po) => `${po.no} · ${vendorName(po)}`,
  })

  const preview = (po: PurchaseOrder): ListPreview => {
    const expected = po.expectedDate ? fmtDate(po.expectedDate) : EM_DASH
    return {
      ariaLabel: `Purchase order ${po.no}`,
      no: po.no,
      status: po.status,
      title: vendorName(po),
      subtitle: `Ordered ${fmtDate(po.orderDate)} · ${po.location || EM_DASH}`,
      stats: [
        { value: money(poSubtotal(po)), label: 'Total' },
        { value: int(poLineCount(po)), label: 'Lines' },
        { value: expected, label: 'Expected' },
      ],
      linesHeading: 'LINES',
      linesEmptyText: 'No lines yet.',
      lines: po.lines.map((line, i) => ({
        key: line.item + i,
        left: (
          <>
            <span className="font-mono text-[11.5px] text-muted-foreground">{line.item}</span> · {line.desc}{' '}
            <span className="text-muted-foreground">×{int(line.qty)}</span>
          </>
        ),
        right: money(poLineTotal(line)),
      })),
      facts: [
        { k: 'Order date', v: fmtDate(po.orderDate) },
        { k: 'Expected date', v: expected },
        { k: 'Receiving location', v: po.location || EM_DASH },
        { k: 'Buyer', v: buyerName(po) || 'Unassigned' },
        { k: 'Lines', v: int(poLineCount(po)) },
        { k: 'Total', v: money(poSubtotal(po)) },
      ],
    }
  }

  return (
    <ListPage
      dataset={dataset}
      rows={orders.data}
      isLoading={orders.isPending}
      error={orders.error}
      onRefresh={() => Promise.all([orders.refetch(), vendors.refetch(), employees.refetch(), notes.refetch()])}
      recordPath={(po) => `/purchasing/purchase-orders/${po.no}`}
      create={{
        label: 'New purchase order',
        run: () => void navigate({ to: '/purchasing/purchase-orders/$no', params: { no: 'new' } }),
      }}
      remove={remove}
      actions={[
        {
          label: 'Receive',
          icon: Download,
          when: poReceivable,
          run: receive,
          inDrawer: true,
          title: 'Record a goods-in receipt against this order (R)',
        },
      ]}
      shortcuts={[
        { ...PO_RECEIVE_SHORTCUT, when: poReceivable, run: receive },
      ]}
      preview={preview}
      initialActiveId={sel ?? null}
      emptyText="No purchase orders yet. Use New purchase order to raise the first one."
    />
  )
}
