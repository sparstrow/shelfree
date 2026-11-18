import { useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { StatusPill } from '@/components/StatusPill'
import { primaryButton } from '@/components/document/parts'
import type { Employee, PurchaseOrder, PurchaseReceipt, Vendor } from '@/data/schemas'
import { type VendorOrderFilter, vendorOrderRows } from '@/domain/vendor-activity'
import { fmtDate, int, money } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface VendorOrdersTabProps {
  vendor: Pick<Vendor, 'no' | 'blocked'>
  orders: readonly PurchaseOrder[]
  receipts: readonly PurchaseReceipt[]
  employees: readonly Employee[]
  today: string
}

const ORDER_FILTERS: readonly { id: VendorOrderFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'done', label: 'Received & closed' },
  { id: 'cancelled', label: 'Cancelled' },
]

const GRID_COLS = 'grid-cols-[104px_96px_110px_minmax(120px,1fr)_140px_138px_118px_86px]'

export function VendorOrdersTab({ vendor, orders, receipts, employees, today }: VendorOrdersTabProps) {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<VendorOrderFilter>('all')

  const { rows, counts } = useMemo(
    () => vendorOrderRows(vendor, orders, receipts, employees, today, filter),
    [vendor, orders, receipts, employees, today, filter],
  )

  const openOrder = (no: string) => void navigate({ to: '/purchasing/purchase-orders/$no', params: { no } })
  const receiveOrder = (poNo: string) => {
    if (vendor.blocked === 'All') {
      toast('Vendor is blocked', { description: 'Unblock it to receive goods against its orders.' })
      return
    }
    void navigate({ to: '/purchasing/purchase-receipts/$no', params: { no: 'new' }, search: { po: poNo } })
  }
  const newOrder = () => {
    if (vendor.blocked === 'All') {
      toast('Vendor is blocked', { description: 'Unblock it on the Payables & blocking tab to raise a purchase order.' })
      return
    }
    void navigate({ to: '/purchasing/purchase-orders/$no', params: { no: 'new' } })
  }

  return (
    <div className="animate-sf-fade">
      <div className="mb-[11px] flex flex-wrap items-center gap-2.5">
        <div role="group" aria-label="Filter purchase orders" className="flex flex-wrap gap-1.5">
          {ORDER_FILTERS.map((f) => {
            const selected = filter === f.id
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setFilter(f.id)}
                className={cn(
                  'hover-lift inline-flex h-7 items-center gap-1.5 rounded-full border px-[11px] text-xs font-semibold transition-[background-color,color,border-color,transform,box-shadow] duration-[140ms]',
                  selected
                    ? 'border-primary bg-primary-tint text-primary'
                    : 'border-input bg-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label}
                <span className="tnum opacity-75">{int(counts[f.id])}</span>
              </button>
            )
          })}
        </div>
        <div className="min-w-3 flex-1" />
        <button
          type="button"
          onClick={newOrder}
          title={
            vendor.blocked === 'All'
              ? 'Blocked for all transactions — unblock on Payables & blocking'
              : 'New purchase order for this vendor'
          }
          className={cn(primaryButton, 'h-[30px] gap-1.5 px-[13px]')}
        >
          <Plus className="size-[13px]" strokeWidth={2.2} />
          New purchase order
        </button>
      </div>

      <section aria-label="Purchase orders" className="overflow-x-auto rounded-xl border border-border bg-card">
        <div className="min-w-[900px]">
          <div
            className={cn(
              'grid h-[38px] items-center gap-2.5 border-b border-border bg-[color-mix(in_oklab,var(--foreground)_3%,transparent)] px-4 text-[11px] font-semibold tracking-[0.04em] text-muted-foreground uppercase',
              GRID_COLS,
            )}
          >
            <span>Order</span>
            <span>Ordered</span>
            <span>Expected</span>
            <span>Lines</span>
            <span>Received</span>
            <span>Status</span>
            <span className="text-right">Total</span>
            <span />
          </div>

          {rows.map((row) => (
            <div
              key={row.no}
              className={cn(
                'relative grid min-h-[50px] items-center gap-2.5 border-b border-border px-4 text-[12.5px] transition-colors duration-[140ms] last:border-b-0 hover:bg-tint-7 has-[>[data-row-open]:focus-visible]:bg-tint-7 has-[>[data-row-open]:focus-visible]:shadow-[inset_0_0_0_1px_var(--ring)]',
                GRID_COLS,
              )}
            >
              <button
                type="button"
                data-row-open=""
                onClick={() => openOrder(row.no)}
                className="border-0 bg-transparent p-0 text-left font-mono text-xs font-semibold text-foreground outline-none after:absolute after:inset-0 focus-visible:underline"
              >
                {row.no}
              </button>
              <span className="tnum whitespace-nowrap text-muted-foreground">{fmtDate(row.orderDate)}</span>
              <span className={cn('tnum whitespace-nowrap', row.late ? 'text-bad-fg' : 'text-muted-foreground')}>
                {fmtDate(row.expectedDate)}
                {row.late && <span className="block text-[10.5px] font-bold tracking-[0.03em] uppercase">Late</span>}
              </span>
              <span className="truncate text-[11.5px] text-muted-foreground">
                {int(row.lineCount)} {row.lineCount === 1 ? 'line' : 'lines'}
                {row.buyerName ? ` · ${row.buyerName}` : ''}
              </span>
              <span className="min-w-0">
                <span className="tnum mb-1 block text-[11.5px]">
                  {int(row.receivedQty)} / {int(row.orderedQty)} received
                </span>
                <span className="block h-[5px] overflow-hidden rounded-[3px] bg-muted">
                  <span
                    className={cn(
                      'block h-full rounded-[3px] transition-[width] duration-300',
                      row.receivedPct >= 100 ? 'bg-ok-fg' : 'bg-primary',
                    )}
                    style={{ width: `${row.receivedPct}%` }}
                  />
                </span>
              </span>
              <span>
                <StatusPill label={row.status} />
              </span>
              <span className="tnum text-right font-semibold">{money(row.total)}</span>
              <span className="relative z-10 justify-self-end">
                {row.canReceive && (
                  <button
                    type="button"
                    onClick={() => receiveOrder(row.no)}
                    title="Create a goods receipt for the outstanding quantities"
                    className="hover-lift inline-flex h-[26px] items-center rounded-[7px] border border-input bg-transparent px-2.5 text-[11.5px] font-semibold text-foreground hover:border-primary hover:bg-primary-tint"
                  >
                    Receive
                  </button>
                )}
              </span>
            </div>
          ))}

          {rows.length === 0 && (
            <div role="status" className="px-6 py-10 text-center text-[13px] text-muted-foreground">
              {counts.all > 0 ? 'No purchase orders in this filter.' : 'No purchase orders with this vendor yet.'}
            </div>
          )}
        </div>
      </section>

      <div className="mt-2.5 text-xs text-pretty text-muted-foreground">
        Receive starts a draft goods receipt pre-filled with what&apos;s still outstanding. Click a row to open the order.
      </div>
    </div>
  )
}
