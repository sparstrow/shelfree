import { useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { StatusPill } from '@/components/StatusPill'
import { primaryButton } from '@/components/document/parts'
import type { Item, PurchaseOrder, PurchasePrice, Vendor } from '@/data/schemas'
import { vendorItemsSupplied } from '@/domain/vendor-activity'
import { EM_DASH, fmtDate, int, money } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface VendorItemsTabProps {
  vendor: Pick<Vendor, 'no' | 'name'>
  items: readonly Item[]
  prices: readonly PurchasePrice[]
  orders: readonly PurchaseOrder[]
  today: string
}

const GRID_COLS = 'grid-cols-[120px_minmax(200px,2fr)_60px_80px_110px_84px_190px_104px_104px]'

export function VendorItemsTab({ vendor, items, prices, orders, today }: VendorItemsTabProps) {
  const navigate = useNavigate()
  const [showExpired, setShowExpired] = useState(false)

  const summary = useMemo(
    () => vendorItemsSupplied(vendor, items, prices, orders, today, { includeExpired: showExpired }),
    [vendor, items, prices, orders, today, showExpired],
  )

  const openItem = (itemNo: string) => void navigate({ to: '/warehouse/items/$no', params: { no: itemNo } })
  const openPriceList = () =>
    void navigate({ to: '/$module/$page', params: { module: 'purchasing', page: 'purchase-prices' } })

  return (
    <div className="animate-sf-fade">
      <div className="mb-[11px] flex flex-wrap items-center gap-2.5">
        <span className="text-[13px] font-semibold">Items supplied</span>
        <span className="tnum text-xs text-muted-foreground">
          {int(summary.itemCount)} {summary.itemCount === 1 ? 'item' : 'items'}
        </span>
        <div className="min-w-3 flex-1" />
        <button type="button" onClick={openPriceList} className={cn(primaryButton, 'h-[30px] px-[13px]')}>
          Manage prices
        </button>
      </div>

      <section aria-label="Items supplied" className="overflow-x-auto rounded-xl border border-border bg-card">
        <div className="min-w-[1120px]">
          <div
            className={cn(
              'grid h-[38px] items-center gap-2.5 border-b border-border bg-[color-mix(in_oklab,var(--foreground)_3%,transparent)] px-4 text-[11px] font-semibold tracking-[0.04em] text-muted-foreground uppercase',
              GRID_COLS,
            )}
          >
            <span>Item no.</span>
            <span>Description</span>
            <span>UoM</span>
            <span className="text-right">From qty</span>
            <span className="text-right">Unit cost</span>
            <span>Lead time</span>
            <span>Valid</span>
            <span>Last ordered</span>
            <span>Status</span>
          </div>

          {summary.rows.map((row) => {
            const validText =
              row.effFrom === null
                ? EM_DASH
                : `${row.effFrom ? fmtDate(row.effFrom) : 'Always'} \u2013 ${row.effTo ? fmtDate(row.effTo) : 'Open-ended'}`
            return (
              <button
                key={row.key}
                type="button"
                onClick={() => openItem(row.itemNo)}
                title="Open item"
                className={cn(
                  'grid min-h-[50px] w-full items-center gap-2.5 border-0 border-b border-border bg-transparent px-4 text-left text-[12.5px] text-foreground transition-colors duration-[140ms] last:border-b-0 hover:bg-tint-7 focus-visible:bg-tint-7 focus-visible:shadow-[inset_0_0_0_1px_var(--ring)] focus-visible:outline-none',
                  GRID_COLS,
                )}
              >
                <span className="truncate font-mono text-[11.5px] font-semibold">{row.itemNo}</span>
                <span className="flex min-w-0 items-center gap-[7px]">
                  <span title={row.desc} className="min-w-0 truncate">
                    {row.desc}
                  </span>
                  {row.preferred && (
                    <span
                      title="Preferred vendor for this item"
                      className="flex-none rounded-full bg-primary-tint px-[7px] py-px text-[10.5px] font-semibold text-primary"
                    >
                      Preferred
                    </span>
                  )}
                </span>
                <span className="font-mono text-[11.5px] text-muted-foreground">{row.uom}</span>
                <span className="tnum text-right text-muted-foreground">
                  {row.minQty != null ? `${int(row.minQty)}+` : EM_DASH}
                </span>
                <span className="tnum text-right font-semibold">{row.price != null ? money(row.price) : EM_DASH}</span>
                <span className="tnum text-muted-foreground">
                  {row.leadDays != null ? `${int(row.leadDays)} days` : EM_DASH}
                </span>
                <span className="tnum truncate text-muted-foreground">{validText}</span>
                <span className="tnum whitespace-nowrap text-muted-foreground">
                  {row.lastOrdered ? fmtDate(row.lastOrdered) : 'Never'}
                </span>
                <span>
                  <StatusPill label={row.status} />
                </span>
              </button>
            )
          })}

          {summary.rows.length === 0 && (
            <div role="status" className="px-6 py-10 text-center">
              <div className="text-sm font-semibold">No items linked to this vendor yet</div>
              <div className="mx-auto mt-1.5 max-w-[420px] text-[12.5px] text-pretty text-muted-foreground">
                Add a purchase price for this vendor, or make it an item&apos;s preferred vendor.
              </div>
            </div>
          )}
        </div>
      </section>

      {summary.expiredCount > 0 && (
        <button
          type="button"
          onClick={() => setShowExpired((v) => !v)}
          className="mt-2.5 h-7 rounded-[7px] border-0 bg-transparent px-2.5 text-xs font-semibold text-muted-foreground transition-colors duration-[140ms] hover:bg-tint-7 hover:text-foreground"
        >
          {showExpired
            ? 'Hide expired prices'
            : `Show ${int(summary.expiredCount)} expired ${summary.expiredCount === 1 ? 'price' : 'prices'}`}
        </button>
      )}
    </div>
  )
}
