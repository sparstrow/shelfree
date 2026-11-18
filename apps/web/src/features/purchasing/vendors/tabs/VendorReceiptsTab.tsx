import { useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { StatusPill } from '@/components/StatusPill'
import type { PurchaseReceipt } from '@/data/schemas'
import { type VendorReceiptFilter, vendorReceiptRows } from '@/domain/vendor-activity'
import { EM_DASH, fmtDate, int, money } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface VendorReceiptsTabProps {
  vendorNo: string
  receipts: readonly PurchaseReceipt[]
}

const RECEIPT_FILTERS: readonly { id: VendorReceiptFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'Draft', label: 'Draft' },
  { id: 'Posted', label: 'Posted' },
  { id: 'Cancelled', label: 'Cancelled' },
]

const GRID_COLS = 'grid-cols-[110px_100px_110px_minmax(100px,1fr)_90px_90px_120px_100px]'

export function VendorReceiptsTab({ vendorNo, receipts }: VendorReceiptsTabProps) {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<VendorReceiptFilter>('all')

  const { rows, counts } = useMemo(
    () => vendorReceiptRows(vendorNo, receipts, filter),
    [vendorNo, receipts, filter],
  )

  const openReceipt = (no: string) => void navigate({ to: '/purchasing/purchase-receipts/$no', params: { no } })
  const openOrder = (no: string) => void navigate({ to: '/purchasing/purchase-orders/$no', params: { no } })

  return (
    <div className="animate-sf-fade">
      <div role="group" aria-label="Filter purchase receipts" className="mb-[11px] flex flex-wrap gap-1.5">
        {RECEIPT_FILTERS.map((f) => {
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

      <section aria-label="Purchase receipts" className="overflow-x-auto rounded-xl border border-border bg-card">
        <div className="min-w-[860px]">
          <div
            className={cn(
              'grid h-[38px] items-center gap-2.5 border-b border-border bg-[color-mix(in_oklab,var(--foreground)_3%,transparent)] px-4 text-[11px] font-semibold tracking-[0.04em] text-muted-foreground uppercase',
              GRID_COLS,
            )}
          >
            <span>Receipt</span>
            <span>Date</span>
            <span>Order</span>
            <span>Vendor challan</span>
            <span className="text-right">Received</span>
            <span className="text-right">Rejected</span>
            <span className="text-right">Value</span>
            <span>Status</span>
          </div>

          {rows.map((row) => (
            <div
              key={row.no}
              className={cn(
                'relative grid min-h-[46px] items-center gap-2.5 border-b border-border px-4 text-[12.5px] transition-colors duration-[140ms] last:border-b-0 hover:bg-tint-7 has-[>[data-row-open]:focus-visible]:bg-tint-7 has-[>[data-row-open]:focus-visible]:shadow-[inset_0_0_0_1px_var(--ring)]',
                GRID_COLS,
              )}
            >
              <button
                type="button"
                data-row-open=""
                onClick={() => openReceipt(row.no)}
                className="border-0 bg-transparent p-0 text-left font-mono text-xs font-semibold text-foreground outline-none after:absolute after:inset-0 focus-visible:underline"
              >
                {row.no}
              </button>
              <span className="tnum whitespace-nowrap text-muted-foreground">{fmtDate(row.receiptDate)}</span>
              <span>
                {row.po ? (
                  <button
                    type="button"
                    onClick={() => openOrder(row.po)}
                    title="Open the purchase order"
                    className="relative z-10 -ml-[7px] rounded-md border-0 bg-transparent px-[7px] py-0.5 font-mono text-xs font-semibold text-primary transition-colors duration-[140ms] hover:bg-primary-tint"
                  >
                    {row.po}
                  </button>
                ) : (
                  <span className="text-muted-foreground">{EM_DASH}</span>
                )}
              </span>
              <span className="truncate font-mono text-[11.5px] text-muted-foreground">{row.vendorDocNo || EM_DASH}</span>
              <span className="tnum text-right">{int(row.received)}</span>
              <span className={cn('tnum text-right font-semibold', row.rejected > 0 ? 'text-bad-fg' : 'text-muted-foreground')}>
                {int(row.rejected)}
              </span>
              <span className="tnum text-right font-semibold">{money(row.value)}</span>
              <span>
                <StatusPill label={row.status} />
              </span>
            </div>
          ))}

          {rows.length === 0 && (
            <div role="status" className="px-6 py-10 text-center text-[13px] text-muted-foreground">
              {counts.all > 0 ? 'No receipts in this filter.' : 'Nothing received from this vendor yet.'}
            </div>
          )}
        </div>
      </section>

      <div className="mt-2.5 text-xs text-pretty text-muted-foreground">
        Rejected quantities never enter stock — they go back to the vendor and become debit notes once vendor bills are built.
      </div>
    </div>
  )
}
