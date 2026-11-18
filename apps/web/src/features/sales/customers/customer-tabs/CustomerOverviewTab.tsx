import { secondaryButton } from '@/components/document/parts'
import { FieldRows } from '@/components/record-fields/FieldRows'
import type { EditorField } from '@/components/record-fields/model'
import { RecordCard, type RecordTabContext } from '@/components/record-page/RecordPage'
import type { Customer } from '@/data/schemas'
import { type CustomerActivityEntry, customerKpis } from '@/domain/customer'
import { int, money } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CustomerDraft } from '../CustomerProfilePage'
import { CustomerActivityRows } from './CustomerNotesTab'

export interface CustomerOverviewTabProps {
  ctx: RecordTabContext<Customer, CustomerDraft>
  activity: CustomerActivityEntry[]
  salesRepOptions: { value: string; label: string }[]
}

export function CustomerOverviewTab({ ctx, activity, salesRepOptions }: CustomerOverviewTabProps) {
  const { record, draft, editing, errors, onChange, goToTab } = ctx
  const stats = customerKpis(record)

  const kpis = [
    { label: 'Balance', value: money(stats.balance), sub: 'On the books' },
    {
      label: 'Credit limit',
      value: money(stats.creditLimit),
      sub: stats.creditHold ? 'On hold' : 'Available',
    },
    {
      label: 'Overdue',
      value: money(stats.overdue),
      sub: stats.overdue > 0 ? 'Past due date' : 'Nothing past due',
      tone: stats.overdue > 0 ? ('bad' as const) : undefined,
    },
    { label: 'Open orders', value: int(stats.openOrders), sub: 'Not yet invoiced' },
  ]

  const detailFields: EditorField<CustomerDraft>[] = [
    { key: 'terms', label: 'Payment terms', type: 'text' },
    {
      key: 'creditLimit',
      label: 'Credit limit',
      type: 'number',
      display: (d) => money(Number(d.creditLimit) || 0),
    },
    {
      key: 'salesRep',
      label: 'Sales rep',
      type: 'select',
      options: salesRepOptions,
      hint: 'The salesperson responsible for this customer.',
    },
    { key: 'lastOrder', label: 'Last order', type: 'text', locked: true },
    { key: 'openOrders', label: 'Open orders', type: 'text', locked: true },
    { key: 'customerSince', label: 'Customer since', type: 'text', locked: true },
  ]

  return (
    <div className="animate-sf-fade">
      <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3.5">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card px-4 py-[15px]">
            <div className="text-[11px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">{k.label}</div>
            <div className={cn('tnum mt-1.5 text-[22px] font-bold', k.tone === 'bad' && 'text-bad-fg')}>{k.value}</div>
            <div className="mt-[3px] text-[11.5px] text-muted-foreground">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-start gap-4">
        <RecordCard
          title="Details"
          hint="Commercial terms and account summary. Last order, Open orders and Customer since are worked out from the customer’s records and can’t be edited here."
        >
          <FieldRows
            fields={detailFields}
            values={draft}
            editing={editing}
            errors={errors}
            onChange={onChange}
            idPrefix="cp-details"
            layout="wide"
          />
        </RecordCard>

        <div className="flex flex-col gap-4">
          <RecordCard
            title="Pricing"
            hint="Customer-specific agreed prices override the item list price when sales pricing is configured."
          >
            <div className="text-[12.5px] text-pretty text-muted-foreground">
              Customer-specific agreed prices are not moved yet — orders use each item’s list price for now.
            </div>
            <div className="mt-[13px] flex flex-wrap gap-2">
              <button type="button" className={secondaryButton} onClick={() => goToTab('prices')}>
                Sales prices
              </button>
              <button type="button" className={secondaryButton} onClick={() => goToTab('orders')}>
                Order history
              </button>
            </div>
          </RecordCard>

          <RecordCard title="Recent activity">
            <CustomerActivityRows entries={activity} />
          </RecordCard>
        </div>
      </div>
    </div>
  )
}
