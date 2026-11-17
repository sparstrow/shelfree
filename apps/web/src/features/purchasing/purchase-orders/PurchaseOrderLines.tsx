/**
 * Purchase order lines: the shared LineGrid plus what is specific to a PO —
 * price-list hints and errors under each item, the locked unit cost, the
 * unpriced-lines banner, and adding lines from the vendor's priced items.
 */
import { CircleAlert, Lock, Search, TriangleAlert, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { type AddLineContext, type LineColumn, LineGrid } from '@/components/document/LineGrid'
import { numberInputClass } from '@/components/document/parts'
import type { Item, PurchaseOrder, PurchaseOrderLine } from '@/data/schemas'
import { poEditable, poLineTotal } from '@/domain/purchase-order'
import { type PricingContext, lineIssue, lockedActionMessage, newOrderLine, priceLine } from '@/domain/purchase-order-editing'
import { resolvePrice, vendorPricedItems } from '@/domain/purchase-prices'
import { int, money } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface PurchaseOrderLinesProps {
  draft: PurchaseOrder
  vendorName: string
  items: readonly Item[]
  pricing: PricingContext
  today: string
  /** Replace the draft's lines (also clears the page error). */
  onLinesChange: (lines: PurchaseOrderLine[]) => void
  onOpenPrices: () => void
}

export function PurchaseOrderLines({
  draft,
  vendorName,
  items,
  pricing,
  today,
  onLinesChange,
  onOpenPrices,
}: PurchaseOrderLinesProps) {
  const lines = draft.lines
  const isDraft = draft.status === 'Draft'
  const lockCost = pricing.settings.purchasing.lockCostToPriceList
  const cleanVendor = vendorName.replace(/\.$/, '')

  /** Mutations on a locked order are attempted and explained, never hidden. */
  const guard = (): boolean => {
    if (poEditable(draft)) return false
    toast('Locked', { description: lockedActionMessage(draft) })
    return true
  }

  const setLine = (index: number, field: 'qty' | 'unitCost', raw: string | number) => {
    if (guard()) return
    const value = Math.max(0, Number.parseFloat(String(raw)) || 0)
    if (field === 'unitCost' && lockCost) return
    onLinesChange(
      lines.map((l, i) =>
        i !== index ? l : field === 'qty' ? priceLine({ ...l, qty: value }, draft, pricing) : { ...l, unitCost: value },
      ),
    )
  }

  const unpricedCount = isDraft ? lines.filter((l) => lineIssue(l, draft, pricing)?.kind === 'noPrice').length : 0
  const removeUnpriced = () => {
    if (guard()) return
    const before = lines
    const kept = lines.filter((l) => lineIssue(l, draft, pricing)?.kind !== 'noPrice')
    const dropped = before.length - kept.length
    if (!dropped) return
    onLinesChange(kept)
    toast(dropped + (dropped === 1 ? ' unpriced line removed' : ' unpriced lines removed'), {
      description: draft.no,
      action: { label: 'Undo', onClick: () => onLinesChange(before) },
    })
  }

  const columns: LineColumn<PurchaseOrderLine>[] = [
    {
      key: 'item',
      label: 'Item',
      align: 'left',
      width: 150,
      sortValue: (l) => l.item,
      cell: (l) => <div className="font-mono text-xs font-medium">{l.item}</div>,
    },
    {
      key: 'desc',
      label: 'Description',
      align: 'left',
      width: 300,
      sortValue: (l) => l.desc,
      cell: (l, index) => {
        const issue = isDraft ? lineIssue(l, draft, pricing) : null
        const resolved = isDraft && draft.vendor ? resolvePrice(pricing.prices, draft.vendor, l.item, l.qty, draft.orderDate) : null
        const costHint =
          resolved?.status === 'ok' && lockCost
            ? ((Number(resolved.row.minQty) || 1) > 1 ? 'Tier from ' + int(Number(resolved.row.minQty)) : 'Base price') +
              (resolved.next ? ' · ' + money(Number(resolved.next.price) || 0) + ' each from ' + int(Number(resolved.next.minQty) || 1) : '')
            : ''
        const current =
          !isDraft && draft.status !== 'Cancelled' && draft.vendor ? resolvePrice(pricing.prices, draft.vendor, l.item, l.qty, today) : null
        const drift = current?.status === 'ok' && Math.abs(current.price - (Number(l.unitCost) || 0)) > 0.005
        return (
          <>
            <div className="mt-px text-[12.5px] leading-[1.4] text-pretty text-muted-foreground">{l.desc}</div>
            {costHint && <div className="tnum mt-1 text-[11.5px] text-muted-foreground">{costHint}</div>}
            {drift && current?.status === 'ok' && (
              <span
                title="Cost ≠ current price. This order keeps its saved cost."
                className="tnum mt-[5px] inline-flex h-5 items-center gap-1 rounded-full bg-warn-bg px-2 text-[11px] font-semibold whitespace-nowrap text-warn-fg"
              >
                <TriangleAlert className="size-[11px]" strokeWidth={2.2} />
                Cost ≠ current price · now {money(current.price)}
              </span>
            )}
            {issue && (
              <div role="alert" className="mt-[5px] flex animate-sf-slide flex-wrap items-center gap-1.5 text-xs font-medium text-bad-fg">
                <CircleAlert className="size-[13px] flex-none" strokeWidth={2} />
                <span>{issue.text}</span>
                {issue.kind === 'belowMoq' && (
                  <button
                    type="button"
                    onClick={() => setLine(index, 'qty', issue.min)}
                    className="h-[22px] rounded-md border border-current bg-transparent px-2 text-[11.5px] font-semibold text-inherit transition-colors duration-[140ms] hover:bg-bad-bg"
                  >
                    Set to {int(issue.min)}
                  </button>
                )}
              </div>
            )}
          </>
        )
      },
    },
    {
      key: 'uom',
      label: 'UoM',
      align: 'left',
      width: 70,
      sortValue: (l) => l.uom,
      cellClassName: 'px-[10px] py-[9px] text-[12.5px] text-muted-foreground',
      cell: (l) => l.uom,
    },
    {
      key: 'qty',
      label: 'Qty',
      align: 'right',
      width: 110,
      sortValue: (l) => Number(l.qty) || 0,
      cell: (l, index) => {
        const belowMin = isDraft && lineIssue(l, draft, pricing)?.kind === 'belowMoq'
        return (
          <input
            type="number"
            min={0}
            data-col="qty"
            value={l.qty}
            onChange={(e) => setLine(index, 'qty', e.target.value)}
            aria-label={`Quantity, line ${index + 1}`}
            aria-invalid={belowMin}
            className={cn(numberInputClass, belowMin && 'border-bad-fg')}
          />
        )
      },
    },
    {
      key: 'unitCost',
      label: 'Unit cost',
      align: 'right',
      width: 140,
      sortValue: (l) => Number(l.unitCost) || 0,
      cell: (l, index) =>
        isDraft && !lockCost ? (
          <input
            type="number"
            min={0}
            step={0.01}
            data-col="unitCost"
            value={l.unitCost}
            onChange={(e) => setLine(index, 'unitCost', e.target.value)}
            aria-label={`Unit cost, line ${index + 1}`}
            className={numberInputClass}
          />
        ) : (
          <div
            title={isDraft ? `Set by ${vendorName || 'the vendor'}’s price list — change the price in Purchase Prices` : undefined}
            className="tnum flex h-8 min-w-0 items-center justify-end gap-[5px] overflow-hidden border border-transparent px-[9px] text-[13px]"
          >
            {isDraft && lockCost && <Lock className="size-[11px] flex-none text-muted-foreground" strokeWidth={2} />}
            <span className="min-w-0 truncate">{money(Number(l.unitCost) || 0)}</span>
          </div>
        ),
    },
    {
      key: 'total',
      label: 'Line total',
      align: 'right',
      width: 140,
      sortValue: poLineTotal,
      cellClassName: 'tnum px-4 py-[9px] text-right text-[13px] font-medium',
      cell: (l) => money(poLineTotal(l)),
    },
  ]

  return (
    <LineGrid
      gridId="purchase-order-lines"
      title="Line items"
      lines={lines}
      columns={columns}
      onChange={onLinesChange}
      guard={guard}
      rowHasIssue={(l) => !!lineIssue(l, draft, pricing)}
      banner={
        unpricedCount > 0 && (
          <div
            role="status"
            className="flex animate-sf-slide flex-wrap items-center gap-[10px] border-b border-border bg-bad-bg px-4 py-[9px] text-[12.5px] font-medium text-bad-fg"
          >
            <CircleAlert className="size-[14px] flex-none" strokeWidth={2} />
            <span className="min-w-[180px] flex-1">
              {unpricedCount} {unpricedCount === 1 ? 'line has' : 'lines have'} no active price from {cleanVendor}.
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onOpenPrices}
                className="h-[26px] rounded-[7px] border border-current bg-transparent px-[10px] text-xs font-semibold text-inherit transition-transform duration-[140ms] hover:-translate-y-px"
              >
                Open Purchase Prices
              </button>
              <button
                type="button"
                onClick={removeUnpriced}
                className="h-[26px] rounded-[7px] border-0 bg-bad-fg px-[10px] text-xs font-semibold text-background transition-transform duration-[140ms] hover:-translate-y-px"
              >
                Remove unpriced lines
              </button>
            </div>
          </div>
        )
      }
      renderAddLine={(ctx) => (
        <AddPricedItem
          ctx={ctx}
          draft={draft}
          vendorName={vendorName}
          items={items}
          pricing={pricing}
          today={today}
          onOpenPrices={onOpenPrices}
        />
      )}
    />
  )
}

/** The inline item search: only items the vendor has an active price for, not already on the order. */
function AddPricedItem({
  ctx,
  draft,
  vendorName,
  items,
  pricing,
  today,
  onOpenPrices,
}: {
  ctx: AddLineContext<PurchaseOrderLine>
  draft: PurchaseOrder
  vendorName: string
  items: readonly Item[]
  pricing: PricingContext
  today: string
  onOpenPrices: () => void
}) {
  const [query, setQuery] = useState('')
  const date = draft.orderDate || today
  const priced = useMemo(
    () => (draft.vendor ? vendorPricedItems(pricing.prices, draft.vendor, date) : new Set<string>()),
    [pricing.prices, draft.vendor, date],
  )
  const taken = new Set(draft.lines.map((l) => l.item))
  const q = query.trim().toLowerCase()
  const matches = items
    .filter((it) => priced.has(it.no) && !taken.has(it.no) && (!q || (it.no + ' ' + it.desc).toLowerCase().includes(q)))
    .slice(0, 6)
  const mode = !draft.vendor ? 'noVendor' : !priced.size ? 'noPrices' : matches.length ? 'list' : 'noMatch'
  const pick = (item: Item) => ctx.insert(newOrderLine(item, draft, pricing))

  return (
    <>
      <div className="flex items-center gap-2">
        <Search className="size-[14px] flex-none text-muted-foreground" strokeWidth={2} />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && matches[0]) {
              e.preventDefault()
              pick(matches[0])
            }
          }}
          placeholder={mode === 'noVendor' ? 'Choose a vendor first' : `Search ${vendorName}’s priced items… (Enter adds the first, Esc cancels)`}
          aria-label="Search items to add"
          className="h-8 flex-1 rounded-[7px] border border-ring bg-background px-[10px] text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button
          type="button"
          onClick={ctx.close}
          title="Cancel (Esc)"
          aria-label="Cancel adding a line"
          className="inline-flex size-7 flex-none items-center justify-center rounded-[7px] border-0 bg-transparent text-muted-foreground transition-colors duration-[140ms] hover:bg-tint-12 hover:text-foreground"
        >
          <X className="size-[14px]" strokeWidth={2} />
        </button>
      </div>
      {mode === 'noMatch' && <div className="px-1 pt-[10px] pb-0.5 text-xs text-muted-foreground">No matching priced items.</div>}
      {mode === 'noVendor' && (
        <div className="px-1 pt-[10px] pb-0.5 text-xs text-muted-foreground">
          Lines are priced from the vendor’s price list — pick the vendor above first.
        </div>
      )}
      {mode === 'noPrices' && (
        <div className="flex flex-wrap items-center gap-[10px] px-1 pt-[10px] pb-0.5 text-xs text-muted-foreground">
          <span>No prices for {vendorName.replace(/\.$/, '')}. Add them in Purchase Prices.</span>
          <button
            type="button"
            onClick={onOpenPrices}
            className="hover-lift h-[26px] rounded-[7px] border border-border bg-card px-[10px] text-xs font-semibold text-foreground hover:bg-tint-12"
          >
            Open Purchase Prices
          </button>
        </div>
      )}
      {matches.map((it) => {
        const r = resolvePrice(pricing.prices, draft.vendor, it.no, 1e12, date)
        const first = r.tiers[0]
        const min = Number(first?.minQty) || 1
        const tierText = (min > 1 ? 'min ' + int(min) : '') + (r.tiers.length > 1 ? (min > 1 ? ' · ' : '') + r.tiers.length + ' tiers' : '')
        return (
          <button
            key={it.no}
            type="button"
            onClick={() => pick(it)}
            className="mt-1 flex w-full items-center gap-3 rounded-[7px] border-0 bg-transparent px-[10px] py-[7px] text-left text-foreground transition-colors duration-[140ms] hover:bg-tint-10"
          >
            <span className="w-[110px] flex-none font-mono text-xs font-medium">{it.no}</span>
            <span className="min-w-0 flex-1 truncate text-[12.5px]">{it.desc}</span>
            <span className="flex-none text-[11.5px] text-muted-foreground">{it.uom || 'NOS'}</span>
            <span className="tnum flex-none text-[11.5px] text-muted-foreground">{tierText}</span>
            <span className="tnum flex-none text-xs font-medium">{money(Number(first?.price) || 0)}</span>
          </button>
        )
      })}
    </>
  )
}
