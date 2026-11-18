import { StatusPill } from '@/components/StatusPill'
import { type CustomerDocumentRow, customerDocStatusTone } from '@/domain/customer'
import { fmtDate, int, money } from '@/lib/format'

export function CustomerOrdersTab({ documents }: { documents: readonly CustomerDocumentRow[] }) {
  return (
    <div className="animate-sf-fade">
      <div className="mb-[11px] flex items-center gap-2.5">
        <span className="text-[13px] font-semibold">Orders &amp; invoices</span>
        <span className="text-xs text-muted-foreground">
          {int(documents.length)} {documents.length === 1 ? 'document' : 'documents'}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid h-[38px] grid-cols-[80px_120px_100px_minmax(110px,1fr)_104px_120px] items-center gap-2.5 border-b border-border bg-tint-7/40 px-4 text-[11px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
          <span>Type</span>
          <span>Document</span>
          <span>Date</span>
          <span>Detail</span>
          <span>Status</span>
          <span className="text-right">Amount</span>
        </div>

        {documents.map((d) => (
          <div
            key={`${d.kind}-${d.no}`}
            className="grid h-[46px] grid-cols-[80px_120px_100px_minmax(110px,1fr)_104px_120px] items-center gap-2.5 border-b border-border px-4 text-[12.5px] last:border-b-0"
          >
            <span className="text-[11.5px] text-muted-foreground">{d.kind}</span>
            <span className="font-mono text-xs font-semibold">{d.no}</span>
            <span className="tnum whitespace-nowrap text-muted-foreground">{fmtDate(d.date)}</span>
            <span className="truncate text-[11.5px] text-muted-foreground">
              {d.kind === 'Order'
                ? `${int(d.lineCount ?? 0)} ${d.lineCount === 1 ? 'line' : 'lines'}`
                : `Due ${fmtDate(d.dueDate)}`}
            </span>
            <span>
              <StatusPill label={d.status} tone={customerDocStatusTone(d.status)} />
            </span>
            <span className="tnum text-right font-semibold">{money(d.amount)}</span>
          </div>
        ))}

        {documents.length === 0 && (
          <div className="px-6 py-10 text-center text-[13px] text-muted-foreground">
            No orders or invoices for this customer yet.
          </div>
        )}
      </div>

      <div className="mt-2.5 text-xs text-pretty text-muted-foreground">
        Sales order and invoice documents aren’t built yet — rows are read-only for now.
      </div>
    </div>
  )
}
