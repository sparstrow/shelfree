import { Link } from '@tanstack/react-router'
import { useList } from '@/data/queries'
import { int } from '@/lib/format'

/** Footer of Sales pricing: how many customer price rows exist, and the way to edit them. */
export function PricesOnFile() {
  const prices = useList('customerPrices')
  const n = prices.data?.length
  return (
    <div className="mt-3 flex items-center gap-3 border-t border-dashed border-border pt-3 text-[12.5px] text-muted-foreground">
      <span className="tnum min-w-0 flex-1 text-pretty">
        {n === undefined ? 'Customer price rows' : `${int(n)} customer price ${n === 1 ? 'row is' : 'rows are'} on file`}. Prices themselves are edited on the Sales prices page.
      </span>
      <Link
        to="/sales/sales-prices"
        search={{ tab: 'customer' }}
        className="hover-lift inline-flex h-8 flex-none items-center rounded-lg border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground hover:bg-tint-12"
      >
        Open Sales prices
      </Link>
    </div>
  )
}
