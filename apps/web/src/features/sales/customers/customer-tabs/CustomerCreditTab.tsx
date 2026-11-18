import { RecordCard } from '@/components/record-page/RecordPage'
import type { Customer } from '@/data/schemas'
import { customerKpis } from '@/domain/customer'
import { EM_DASH, money } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface CustomerCreditTabProps {
  customer: Customer
  onToggleHold: () => Promise<void>
  toggling?: boolean
}

export function CustomerCreditTab({ customer, onToggleHold, toggling = false }: CustomerCreditTabProps) {
  const stats = customerKpis(customer)
  const facts = [
    { k: 'Credit limit', v: money(stats.creditLimit) },
    { k: 'Balance', v: money(stats.balance) },
    { k: 'Headroom', v: money(stats.headroom) },
    { k: 'Overdue', v: money(stats.overdue) },
    { k: 'Payment terms', v: customer.terms || EM_DASH },
  ]

  return (
    <div className="grid max-w-[900px] animate-sf-fade grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-4">
      <RecordCard title="Credit">
        {facts.map((f) => (
          <div
            key={f.k}
            className="flex justify-between gap-3 border-b border-dashed border-border py-[9px] text-[13px] last:border-b-0"
          >
            <span className="text-muted-foreground">{f.k}</span>
            <span className="tnum font-semibold">{f.v}</span>
          </div>
        ))}
      </RecordCard>

      <RecordCard title="Risk">
        <div className="flex items-center gap-3 rounded-[9px] border border-border px-3 py-[11px]">
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold">Credit hold</div>
            <div className="mt-0.5 text-[11.5px] text-pretty text-muted-foreground">
              Stops new orders being confirmed for this account.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={stats.creditHold}
            aria-label="Credit hold"
            disabled={toggling}
            onClick={() => void onToggleHold()}
            className={cn(
              'relative inline-flex h-[18px] w-8 flex-none items-center rounded-full border-0 p-0 transition-colors duration-[160ms] disabled:opacity-50',
              stats.creditHold ? 'bg-primary' : 'bg-input',
            )}
          >
            <span
              className={cn(
                'absolute size-[14px] rounded-full bg-background shadow-base transition-transform duration-[160ms]',
                stats.creditHold ? 'translate-x-[16px]' : 'translate-x-[2px]',
              )}
            />
          </button>
        </div>
        <div className="mt-[13px] text-[12.5px] leading-[1.55] text-pretty text-muted-foreground">
          {customer.riskNote || 'Nothing flagged. Overdue invoices and credit-limit breaches will show up here.'}
        </div>
      </RecordCard>
    </div>
  )
}
