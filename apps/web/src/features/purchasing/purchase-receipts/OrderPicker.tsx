import { Search } from 'lucide-react'
import { useState } from 'react'
import { StatusPill } from '@/components/StatusPill'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { PurchaseOrder, PurchaseReceipt, Vendor } from '@/data/schemas'
import { poOutstandingQty, poReceivable } from '@/domain/purchase-order'
import { int } from '@/lib/format'

export interface OrderPickerProps {
  open: boolean
  orders: readonly PurchaseOrder[]
  receipts: readonly PurchaseReceipt[]
  vendors: readonly Vendor[]
  onPick: (po: PurchaseOrder) => void
  onClose: () => void
}

/** "Receive against which order?" — lists orders that can still receive goods. */
export function OrderPicker({ open, orders, receipts, vendors, onPick, onClose }: OrderPickerProps) {
  const [query, setQuery] = useState('')
  const vendorName = (po: PurchaseOrder) => vendors.find((v) => v.no === po.vendor)?.name ?? po.vendor
  const q = query.trim().toLowerCase()
  const list = orders.filter((po) => poReceivable(po)).filter((po) => !q || (po.no + ' ' + vendorName(po)).toLowerCase().includes(q))

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setQuery('')
          onClose()
        }
      }}
    >
      <DialogContent className="flex max-h-[70vh] w-[560px] max-w-[calc(100vw-48px)] flex-col gap-0 overflow-hidden rounded-[14px] p-0 sm:max-w-[560px]">
        <DialogHeader className="gap-0 border-b border-border px-4 py-[14px] text-left">
          <DialogTitle className="text-sm font-semibold">Receive against which order?</DialogTitle>
          <DialogDescription className="mt-0.5 text-xs">
            Only issued orders with something still outstanding can be received.
          </DialogDescription>
        </DialogHeader>
        <div className="border-b border-border px-4 py-3">
          <span className="relative block">
            <Search className="pointer-events-none absolute top-[10px] left-[11px] size-[14px] text-muted-foreground" strokeWidth={2} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && list[0]) onPick(list[0])
              }}
              placeholder="Search by order number or vendor…"
              aria-label="Search orders"
              className="h-[34px] w-full rounded-lg border border-input bg-transparent pr-3 pl-[34px] text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus:border-ring"
            />
          </span>
        </div>
        <div className="flex-1 overflow-auto p-1.5">
          {list.length === 0 && (
            <div className="px-4 py-7 text-center text-[13px] text-muted-foreground">
              Nothing is waiting to be received right now.
            </div>
          )}
          {list.map((po) => (
            <button
              key={po.no}
              type="button"
              onClick={() => onPick(po)}
              className="flex w-full items-center gap-3 rounded-lg border-0 bg-transparent px-[11px] py-[10px] text-left text-foreground transition-colors duration-[140ms] hover:bg-tint-10 focus-visible:bg-tint-10 focus-visible:outline-none"
            >
              <span className="w-24 flex-none font-mono text-xs font-medium">{po.no}</span>
              <span className="min-w-0 flex-1 truncate text-[13px]">{vendorName(po)}</span>
              <StatusPill label={po.status} />
              <span className="tnum w-28 flex-none text-right text-[11.5px] text-muted-foreground">
                {int(poOutstandingQty(po, receipts))} outstanding
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
