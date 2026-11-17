import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { Copy, Download, ExternalLink, Eye, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { TopBar } from '@/app/shell/TopBar'
import { useUi } from '@/app/stores/ui'
import { DataGrid, type GridAction } from '@/components/data-grid/DataGrid'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { PurchaseOrder } from '@/data/schemas'
import { poReceivable } from '@/domain/purchase-order'
import { useList, useRemove, useUpsert } from '@/data/queries'
import { PurchaseOrderDrawer } from './PurchaseOrderDrawer'
import { purchaseOrderDataset } from './dataset'

const route = getRouteApi('/purchasing/purchase-orders/')

/** Purchasing ▸ Purchase Orders — list, preview drawer, delete. */
export function PurchaseOrdersPage() {
  const navigate = useNavigate()
  // `?sel=PO00011` opens that order's preview (used when returning from the document).
  const { sel } = route.useSearch()
  const openTab = useUi((s) => s.openTab)
  const orders = useList('purchaseOrders')
  const vendors = useList('vendors')
  const employees = useList('employees')
  const notes = useList('notes')
  const remove = useRemove('purchaseOrders')
  const restore = useUpsert('purchaseOrders')

  const [activeId, setActiveId] = useState<string | null>(sel ?? null)
  const [deleting, setDeleting] = useState<PurchaseOrder | null>(null)

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

  const active = activeId ? (orders.data ?? []).find((po) => po.no === activeId) : undefined
  const vendorName = (po: PurchaseOrder) => (vendors.data ?? []).find((v) => v.no === po.vendor)?.name ?? po.vendor
  const buyerName = (po: PurchaseOrder) => (employees.data ?? []).find((e) => e.id === po.buyer)?.name ?? ''

  const openOrder = (po: PurchaseOrder) =>
    navigate({ to: '/purchasing/purchase-orders/$no', params: { no: po.no } })

  const openInNewTab = (po: PurchaseOrder) => {
    const path = `/purchasing/purchase-orders/${po.no}`
    openTab(path)
    void navigate({ to: '/purchasing/purchase-orders/$no', params: { no: po.no } })
  }

  const copyNo = async (po: PurchaseOrder) => {
    try {
      await navigator.clipboard.writeText(po.no)
      toast('Copied', { description: po.no })
    } catch {
      toast('Could not copy', { description: 'The browser blocked clipboard access.' })
    }
  }

  const confirmDelete = async () => {
    const po = deleting
    if (!po) return
    setDeleting(null)
    if (activeId === po.no) setActiveId(null)
    await remove.mutateAsync(po.no)
    toast('Purchase order deleted', {
      description: `${po.no} · ${vendorName(po)}`,
      action: { label: 'Undo', onClick: () => restore.mutate(po) },
    })
  }

  const receive = (po: PurchaseOrder) =>
    navigate({ to: '/purchasing/purchase-receipts/$no', params: { no: 'new' }, search: { po: po.no } })

  // R: start a goods-in receipt against the active order.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (/^(input|textarea|select)$/i.test(el.tagName) || el.isContentEditable)) return
      if (e.metaKey || e.ctrlKey || e.altKey || e.key.toLowerCase() !== 'r') return
      if (active && poReceivable(active)) {
        e.preventDefault()
        void receive(active)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const actions: GridAction<PurchaseOrder>[] = [
    { label: 'View', icon: Eye, onSelect: (po) => setActiveId(po.no) },
    { label: 'Open purchase order', icon: ExternalLink, onSelect: openOrder },
    { label: 'Open in new tab', icon: ExternalLink, onSelect: openInNewTab },
    { label: 'Receive goods', icon: Download, disabled: (po) => !poReceivable(po), onSelect: receive },
    { label: 'Copy number', icon: Copy, onSelect: copyNo },
    {
      label: 'Delete',
      icon: Trash2,
      danger: true,
      // Only drafts can be deleted; anything issued is cancelled instead.
      disabled: (po) => po.status !== 'Draft',
      onSelect: setDeleting,
    },
  ]

  return (
    <>
      <TopBar
        count={orders.data?.length}
        countTitle={orders.data ? `${orders.data.length} purchase orders` : undefined}
        newLabel="New purchase order"
        onNew={() => navigate({ to: '/purchasing/purchase-orders/$no', params: { no: 'new' } })}
      />
      <DataGrid
        dataset={dataset}
        rows={orders.data}
        isLoading={orders.isPending}
        error={orders.error}
        onRefresh={() => Promise.all([orders.refetch(), vendors.refetch(), employees.refetch(), notes.refetch()])}
        activeId={activeId}
        onActiveChange={setActiveId}
        onOpen={openOrder}
        actions={actions}
        emptyText="No purchase orders yet. Use New purchase order to raise the first one."
        drawer={
          active && (
            <PurchaseOrderDrawer
              po={active}
              vendorName={vendorName(active)}
              buyerName={buyerName(active)}
              canDelete={active.status === 'Draft'}
              onClose={() => setActiveId(null)}
              onOpen={() => openOrder(active)}
              onReceive={() => receive(active)}
              onDelete={() => setDeleting(active)}
            />
          )
        }
      />

      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete this purchase order?</DialogTitle>
            <DialogDescription>
              {deleting ? `${deleting.no} · ${vendorName(deleting)}` : ''} will be removed. You can undo this right
              after deleting.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setDeleting(null)}
              className="hover-lift inline-flex h-[34px] items-center rounded-lg border border-border bg-card px-[14px] text-[13px] font-medium text-foreground hover:bg-tint-12"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              autoFocus
              className="hover-lift inline-flex h-[34px] items-center rounded-lg border-0 bg-danger px-[14px] text-[13px] font-semibold text-danger-fg hover:bg-danger-hover"
            >
              Delete purchase order
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
