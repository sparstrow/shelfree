import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { HelpTarget } from '@/components/help/HelpTarget'
import { useSettingsReadOnly } from '@/components/settings/read-only'
import { Switch } from '@/components/ui/switch'
import { useList, useUpsert } from '@/data/queries'
import { fmtDate, int } from '@/lib/format'
import { cn } from '@/lib/utils'
import { SALES_PRICING_HELP } from './help'

type Filter = 'all' | 'selected' | 'unselected'
const FILTERS: readonly { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'selected', label: 'Selected' },
  { id: 'unselected', label: 'Unselected' },
]

/**
 * "Customers on customer pricing" — the per-customer switch that applies while the rule is
 * "Selected customers". The switch is stored on the customer, so it saves as it is flipped
 * (it is not part of the section's Save / Discard).
 */
export function EligibleCustomers() {
  const customers = useList('customers')
  const prices = useList('customerPrices')
  const save = useUpsert('customers')
  const readOnly = useSettingsReadOnly()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const priceCount = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of prices.data ?? []) counts.set(r.customer, (counts.get(r.customer) ?? 0) + 1)
    return counts
  }, [prices.data])

  const all = useMemo(() => customers.data ?? [], [customers.data])
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return all
      .filter(
        (c) =>
          (!needle || c.name.toLowerCase().includes(needle) || c.no.toLowerCase().includes(needle)) &&
          (filter === 'all' || (filter === 'selected') === !!c.pricingEligible),
      )
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [all, q, filter])
  const selectedCount = all.filter((c) => c.pricingEligible).length

  return (
    <div className="mt-3 border-t border-dashed border-border pt-3" data-setting-row="cust">
      <div className="mb-2 flex flex-wrap items-center gap-2.5">
        <HelpTarget help={SALES_PRICING_HELP.cust} label="Customers on customer pricing">
          <h3 className="m-0 text-[12.5px] font-semibold">Customers on customer pricing</h3>
        </HelpTarget>
        <span className="tnum text-xs text-muted-foreground">
          {int(selectedCount)} of {int(all.length)} selected
        </span>
        <div className="min-w-3 flex-1" />
        <span className="relative inline-flex">
          <Search aria-hidden className="pointer-events-none absolute top-2 left-2.5 size-[13px] text-muted-foreground" strokeWidth={2} />
          <input
            type="search"
            aria-label="Search customers"
            placeholder="Search customers…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-[30px] w-[190px] rounded-[7px] border border-input bg-transparent pr-2 pl-7 text-[12.5px] outline-none placeholder:text-muted-foreground focus:border-ring"
          />
        </span>
        <div role="group" aria-label="Show" className="inline-flex overflow-hidden rounded-[7px] border border-input">
          {FILTERS.map((f, i) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'h-[28px] px-[11px] text-xs font-semibold transition-[background-color,color] duration-[140ms]',
                i > 0 && 'border-l border-input',
                filter === f.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-tint-12 hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="max-h-[340px] overflow-y-auto rounded-xl border border-border">
        {customers.isPending ? (
          <div className="px-4 py-6 text-center text-[12.5px] text-muted-foreground">Loading customers…</div>
        ) : customers.isError ? (
          <div role="alert" className="px-4 py-6 text-center text-[12.5px] text-bad-fg">
            Could not load customers.
          </div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-6 text-center text-[12.5px] text-muted-foreground">
            {all.length === 0 ? 'No customers yet.' : 'No customers match your search.'}
          </div>
        ) : (
          rows.map((c) => {
            const n = priceCount.get(c.no) ?? 0
            return (
              <div
                key={c.no}
                data-customer={c.no}
                className="flex items-center gap-3 border-b border-border px-4 py-2.5 transition-colors last:border-b-0 hover:bg-tint-12"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold">{c.name}</span>
                  <span className="block text-[11.5px] text-muted-foreground">
                    {c.createdAt ? `Since ${fmtDate(c.createdAt)} · ` : ''}
                    {n ? `${int(n)} ${n === 1 ? 'price' : 'prices'}` : 'No prices yet'}
                  </span>
                </span>
                <Switch
                  aria-label={`Customer pricing for ${c.name}`}
                  checked={!!c.pricingEligible}
                  disabled={readOnly || save.isPending}
                  onCheckedChange={(next) =>
                    save.mutate({ ...c, pricingEligible: next }, { onError: () => toast.error('Could not update this customer. Try again.') })
                  }
                />
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
