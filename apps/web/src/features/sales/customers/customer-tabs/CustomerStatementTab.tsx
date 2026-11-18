import { RecordCard } from '@/components/record-page/RecordPage'
import type { CustomerAgingSummary } from '@/domain/customer'
import { int, money } from '@/lib/format'
import { cn } from '@/lib/utils'

export function CustomerStatementTab({ aging }: { aging: CustomerAgingSummary }) {
  return (
    <div className="grid animate-sf-fade grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-start gap-4">
      <RecordCard
        title="Aging"
        hint="Unpaid invoices grouped by how many days past their due date they are today."
      >
        <div className="pt-1">
          {aging.buckets.map((b) => (
            <div key={b.label} className="mb-3 flex items-center gap-3 last:mb-0">
              <span className="w-24 flex-none text-[12.5px] text-muted-foreground">{b.label}</span>
              <span className="h-2 flex-1 overflow-hidden rounded bg-muted">
                <span
                  className={cn(
                    'block h-full rounded transition-[width] duration-200',
                    b.isOverdue ? 'bg-bad-fg' : 'bg-primary',
                  )}
                  style={{ width: `${b.pct}%` }}
                />
              </span>
              <span className="tnum w-24 flex-none text-right text-[12.5px] font-semibold">{money(b.amount)}</span>
            </div>
          ))}
        </div>
      </RecordCard>

      <RecordCard title="Open items">
        <div className="flex justify-between gap-3 border-b border-dashed border-border py-[9px] text-[13px]">
          <span className="text-muted-foreground">Unpaid invoices</span>
          <span className="tnum font-semibold">{money(aging.openTotal)}</span>
        </div>
        <div className="flex justify-between gap-3 border-b border-dashed border-border py-[9px] text-[13px]">
          <span className="text-muted-foreground">On file</span>
          <span className="tnum font-semibold">
            {int(aging.invoiceCount)} {aging.invoiceCount === 1 ? 'invoice' : 'invoices'}
          </span>
        </div>
        <div className="mt-3 text-[11.5px] leading-normal text-pretty text-muted-foreground">
          Balances come from the invoices on file. A real ledger (payments, credit notes, part-payments) arrives with the backend.
        </div>
      </RecordCard>
    </div>
  )
}
