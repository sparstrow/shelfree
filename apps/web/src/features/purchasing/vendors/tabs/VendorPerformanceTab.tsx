import { useNavigate } from '@tanstack/react-router'
import { useMemo } from 'react'
import { RecordCard } from '@/components/record-page/RecordPage'
import type { Item, Vendor } from '@/data/schemas'
import type { VendorStats } from '@/domain/vendor'
import { formatDeliveryDelta, vendorPerformance } from '@/domain/vendor-activity'
import { EM_DASH, fmtDate, int } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface VendorPerformanceTabProps {
  vendor: Pick<Vendor, 'no' | 'name' | 'subInfo'>
  stats: VendorStats
  items: readonly Item[]
}

const DELIVERY_COLS = 'grid-cols-[100px_100px_minmax(90px,1fr)_minmax(100px,1fr)]'

export function VendorPerformanceTab({ vendor, stats, items }: VendorPerformanceTabProps) {
  const navigate = useNavigate()
  const perf = useMemo(() => vendorPerformance(vendor, stats, items), [vendor, stats, items])

  const openReceipt = (no: string) => void navigate({ to: '/purchasing/purchase-receipts/$no', params: { no } })

  const scorecard = [
    {
      k: 'On-time deliveries',
      v: perf.onTimePct == null ? EM_DASH : `${int(perf.onTime)} of ${int(perf.timed)} · ${perf.onTimePct}%`,
    },
    { k: 'Average lead time', v: perf.avgLeadDays == null ? EM_DASH : `${int(perf.avgLeadDays)} days` },
    { k: 'Quoted lead time', v: perf.quotedLeadDays ? `${int(perf.quotedLeadDays)} days` : EM_DASH },
    { k: 'Units received', v: int(perf.receivedQty) },
    { k: 'Units rejected', v: int(perf.rejectedQty) },
    {
      k: 'Rejection rate',
      v: perf.rejectionPct == null ? EM_DASH : `${Math.round(perf.rejectionPct * 10) / 10}%`,
    },
    { k: 'Late open orders', v: int(perf.lateOpenOrders) },
  ]

  return (
    <div className="grid animate-sf-fade grid-cols-[repeat(auto-fit,minmax(340px,1fr))] items-start gap-4">
      <RecordCard title="Delivery record" className="overflow-hidden pb-0">
        <div className="-mx-[18px] overflow-x-auto border-t border-border">
          <div
            className={cn(
              'grid h-[38px] items-center gap-2.5 border-b border-border bg-[color-mix(in_oklab,var(--foreground)_3%,transparent)] px-4 text-[11px] font-semibold tracking-[0.04em] text-muted-foreground uppercase',
              DELIVERY_COLS,
            )}
          >
            <span>Receipt</span>
            <span>Expected</span>
            <span>Received</span>
            <span className="text-right">Timing</span>
          </div>

          {perf.deliveries.map((d) => (
            <button
              key={d.no}
              type="button"
              onClick={() => openReceipt(d.no)}
              className={cn(
                'grid min-h-[46px] w-full items-center gap-2.5 border-0 border-b border-border bg-transparent px-4 text-left text-[12.5px] text-foreground transition-colors duration-[140ms] last:border-b-0 hover:bg-tint-7 focus-visible:bg-tint-7 focus-visible:shadow-[inset_0_0_0_1px_var(--ring)] focus-visible:outline-none',
                DELIVERY_COLS,
              )}
            >
              <span className="font-mono text-xs font-semibold">{d.no}</span>
              <span className="tnum whitespace-nowrap text-muted-foreground">{fmtDate(d.expectedDate)}</span>
              <span className="tnum whitespace-nowrap">{fmtDate(d.receiptDate)}</span>
              <span
                className={cn(
                  'tnum text-right font-semibold',
                  d.deltaDays === null ? 'text-muted-foreground' : d.deltaDays > 0 ? 'text-bad-fg' : 'text-ok-fg',
                )}
              >
                {formatDeliveryDelta(d.deltaDays)}
              </span>
            </button>
          ))}

          {perf.deliveries.length === 0 && (
            <div role="status" className="px-5 py-8 text-center text-[12.5px] text-muted-foreground">
              No posted receipts yet — the record starts with the first delivery.
            </div>
          )}
        </div>
      </RecordCard>

      <div className="flex flex-col gap-4">
        <RecordCard title="Scorecard">
          {scorecard.map((row) => (
            <div
              key={row.k}
              className="flex justify-between gap-3 border-b border-dashed border-border py-[9px] text-[13px] last:border-b-0"
            >
              <span className="text-muted-foreground">{row.k}</span>
              <span className="tnum min-w-0 truncate text-right font-semibold">{row.v}</span>
            </div>
          ))}
        </RecordCard>

        <RecordCard title="Quality log">
          {perf.qualityLog.map((q) => (
            <button
              key={q.key}
              type="button"
              onClick={() => openReceipt(q.receiptNo)}
              className="-mx-1.5 flex w-[calc(100%+12px)] gap-[11px] rounded-lg border-0 bg-transparent px-1.5 py-[9px] text-left text-foreground transition-colors duration-[140ms] hover:bg-tint-7 focus-visible:bg-tint-7 focus-visible:shadow-[inset_0_0_0_1px_var(--ring)] focus-visible:outline-none"
            >
              <span className="tnum w-[84px] flex-none text-[11.5px] text-muted-foreground">{fmtDate(q.date)}</span>
              <span className="min-w-0 flex-1 text-[12.5px]">
                <span className="flex flex-wrap items-baseline gap-2">
                  <span className="font-mono text-[11.5px] font-semibold">{q.item}</span>
                  <span className="tnum font-semibold text-bad-fg">
                    {int(q.qty)}
                    {q.uom ? ` ${q.uom}` : ''} rejected
                  </span>
                </span>
                <span className="mt-0.5 block text-[11.5px] text-pretty text-muted-foreground">
                  {q.reason} · {q.receiptNo}
                </span>
              </span>
            </button>
          ))}

          {perf.qualityLog.length === 0 && (
            <div role="status" className="text-[12.5px] text-muted-foreground">
              Nothing rejected on receipt so far.
            </div>
          )}
        </RecordCard>
      </div>
    </div>
  )
}
