import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { Copy, ExternalLink, Eye, FileText, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { TopBar } from '@/app/shell/TopBar'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataGrid, type GridAction } from '@/components/data-grid/DataGrid'
import {
  RecordDrawer,
  drawerDangerIconButton,
  drawerPrimaryButton,
  drawerSecondaryButton,
} from '@/components/record-drawer/RecordDrawer'
import type { PurchaseReceipt } from '@/data/schemas'
import { useList, useRemove, useUpsert } from '@/data/queries'
import { prQtyReceived, prQtyRejected, prValue } from '@/domain/purchase-receipt'
import { EM_DASH, fmtDate, int, money } from '@/lib/format'
import { OrderPicker } from './OrderPicker'
import { purchaseReceiptDataset } from './dataset'

const route = getRouteApi('/purchasing/purchase-receipts/')

/** Purchasing ▸ Purchase Receipts — list, preview drawer, start a receipt. */
export function PurchaseReceiptsPage() {
  const navigate = useNavigate()
  const { sel } = route.useSearch()
  const receipts = useList('purchaseReceipts')
  const orders = useList('purchaseOrders')
  const vendors = useList('vendors')
  const employees = useList('employees')
  const warehouses = useList('warehouses')
  const notes = useList('notes')
  const remove = useRemove('purchaseReceipts')
  const restore = useUpsert('purchaseReceipts')

  const [activeId, setActiveId] = useState<string | null>(sel ?? null)
  const [deleting, setDeleting] = useState<PurchaseReceipt | null>(null)
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

  const active = activeId ? (receipts.data ?? []).find((r) => r.no === activeId) : undefined
  const vendorName = (r: PurchaseReceipt) => (vendors.data ?? []).find((v) => v.no === r.vendor)?.name ?? r.vendor
  const siteName = (r: PurchaseReceipt) => (warehouses.data ?? []).find((w) => w.code === r.location)?.name ?? r.location
  const receiver = (r: PurchaseReceipt) => (employees.data ?? []).find((e) => e.id === r.receivedBy)?.name ?? ''

  const openReceipt = (r: PurchaseReceipt) => navigate({ to: '/purchasing/purchase-receipts/$no', params: { no: r.no } })
  const openOrder = (r: PurchaseReceipt) => {
    if (r.po) void navigate({ to: '/purchasing/purchase-orders/$no', params: { no: r.po } })
  }
  const copyNo = async (r: PurchaseReceipt) => {
    try {
      await navigator.clipboard.writeText(r.no)
      toast('Copied', { description: r.no })
    } catch {
      toast('Could not copy', { description: 'The browser blocked clipboard access.' })
    }
  }

  const confirmDelete = async () => {
    const r = deleting
    if (!r) return
    setDeleting(null)
    if (activeId === r.no) setActiveId(null)
    await remove.mutateAsync(r.no)
    toast('Purchase receipt deleted', {
      description: `${r.no} · ${vendorName(r)}`,
      action: { label: 'Undo', onClick: () => restore.mutate(r) },
    })
  }

  // A posted receipt has moved stock, so it can't simply be deleted; corrections go through a vendor return.
  const deletable = (r: PurchaseReceipt) => r.status !== 'Posted'

  const actions: GridAction<PurchaseReceipt>[] = [
    { label: 'View', icon: Eye, onSelect: (r) => setActiveId(r.no) },
    { label: 'Open receipt', icon: ExternalLink, onSelect: openReceipt },
    { label: 'Open purchase order', icon: FileText, disabled: (r) => !r.po, onSelect: openOrder },
    { label: 'Copy number', icon: Copy, onSelect: copyNo },
    { label: 'Delete', icon: Trash2, danger: true, disabled: (r) => !deletable(r), onSelect: setDeleting },
  ]

  return (
    <>
      <TopBar
        count={receipts.data?.length}
        countTitle={receipts.data ? `${receipts.data.length} purchase receipts` : undefined}
        newLabel="New purchase receipt"
        onNew={() => setPicking(true)}
      />
      <DataGrid
        dataset={dataset}
        rows={receipts.data}
        isLoading={receipts.isPending}
        error={receipts.error}
        onRefresh={() => Promise.all([receipts.refetch(), orders.refetch(), vendors.refetch(), notes.refetch()])}
        activeId={activeId}
        onActiveChange={setActiveId}
        onOpen={openReceipt}
        actions={actions}
        emptyText="No purchase receipts yet. Use New purchase receipt when goods arrive."
        drawer={
          active && (
            <RecordDrawer
              ariaLabel={`Purchase receipt ${active.no}`}
              no={active.no}
              status={active.status}
              title={vendorName(active)}
              subtitle={`${fmtDate(active.receiptDate)} · into ${siteName(active)}`}
              stats={[
                { value: int(prQtyReceived(active)), label: 'Received' },
                { value: int(prQtyRejected(active)), label: 'Rejected' },
                { value: money(prValue(active)), label: 'Value' },
              ]}
              linesHeading="WHAT ARRIVED"
              lines={active.lines.map((l, i) => ({
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
              }))}
              facts={[
                { k: 'Purchase order', v: active.po || EM_DASH },
                { k: 'Vendor challan', v: active.vendorDocNo || EM_DASH },
                { k: 'Received into', v: siteName(active) },
                { k: 'Received by', v: receiver(active) || 'Unassigned' },
                { k: 'Rejected', v: int(prQtyRejected(active)) },
                { k: 'Value', v: money(prValue(active)) },
              ]}
              onClose={() => setActiveId(null)}
              footer={
                <>
                  <button type="button" onClick={() => openReceipt(active)} className={drawerPrimaryButton}>
                    <ExternalLink className="size-[13px]" strokeWidth={2} />
                    Open receipt
                  </button>
                  <button
                    type="button"
                    onClick={() => openOrder(active)}
                    title="Open the purchase order"
                    className={drawerSecondaryButton}
                  >
                    Order
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(active)}
                    disabled={!deletable(active)}
                    title={deletable(active) ? 'Delete receipt' : 'A posted receipt can’t be deleted'}
                    aria-label="Delete receipt"
                    className={drawerDangerIconButton}
                  >
                    <Trash2 className="size-[14px]" strokeWidth={2} />
                  </button>
                </>
              }
            />
          )
        }
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

      <ConfirmDialog
        open={!!deleting}
        danger
        title="Delete this purchase receipt?"
        description={
          <>
            {deleting ? `${deleting.no} · ${vendorName(deleting)}` : ''} will be removed. Nothing was taken into stock
            for it. You can undo this right after deleting.
          </>
        }
        confirmLabel="Delete purchase receipt"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  )
}
