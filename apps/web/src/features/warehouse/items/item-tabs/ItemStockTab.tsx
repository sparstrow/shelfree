import { AlertTriangle, Info } from 'lucide-react'
import { Notice } from '@/components/document/parts'
import { FieldRows } from '@/components/record-fields/FieldRows'
import type { EditorField } from '@/components/record-fields/model'
import { RecordCard } from '@/components/record-page/RecordPage'
import type { Item } from '@/data/schemas'
import type { ItemSiteStockBar, ItemTrackingCard, ItemValuation } from '@/domain/item-profile'
import { EM_DASH, int, money } from '@/lib/format'

interface ReplenishmentValues {
  rp: number
  rq: number
  ss: number
}

interface StockValuationValues {
  onHandLabel: string
  unitCost: number
  stockValue: number
  retailValue: number | null
}

const REPLENISHMENT_FIELDS: readonly EditorField<ReplenishmentValues>[] = [
  { key: 'rp', label: 'Reorder point', type: 'number', display: (r) => int(r.rp) },
  { key: 'rq', label: 'Reorder quantity', type: 'number', display: (r) => int(r.rq) },
  { key: 'ss', label: 'Safety stock', type: 'number', display: (r) => int(r.ss) },
]

const VALUATION_FIELDS: readonly EditorField<StockValuationValues>[] = [
  { key: 'onHandLabel', label: 'On hand', type: 'text' },
  { key: 'unitCost', label: 'Unit cost', type: 'number', display: (r) => money(r.unitCost) },
  { key: 'stockValue', label: 'Stock value', type: 'number', display: (r) => money(r.stockValue) },
  {
    key: 'retailValue',
    label: 'Retail value',
    type: 'number',
    display: (r) => (r.retailValue != null ? money(r.retailValue) : EM_DASH),
  },
]

const NOOP = () => {}

export interface ItemStockTabProps {
  item: Item
  valuation: ItemValuation
  siteBars: readonly ItemSiteStockBar[]
  trackingCards: readonly ItemTrackingCard[]
}

export function ItemStockTab({ item, valuation, siteBars, trackingCards }: ItemStockTabProps) {
  const replenishment: ReplenishmentValues = {
    rp: valuation.reorderPoint,
    rq: valuation.reorderQty,
    ss: valuation.safetyStock,
  }
  const valuationRows: StockValuationValues = {
    onHandLabel: `${int(valuation.onHand)} ${item.uom}`,
    unitCost: valuation.unitCost,
    stockValue: valuation.stockValue,
    retailValue: valuation.unitPrice > 0 ? valuation.retailValue : null,
  }

  return (
    <div className="grid animate-sf-fade grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <RecordCard title="Stock by location">
          {siteBars.length > 0 ? (
            <>
              <div className="space-y-3">
                {siteBars.map((row) => (
                  <div key={row.id} className="flex items-center gap-3">
                    <span className="w-28 flex-none truncate text-[12.5px] text-muted-foreground" title={row.name}>
                      {row.short}
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded bg-muted">
                      <span
                        className="block h-full rounded bg-primary transition-[width] duration-200"
                        style={{ width: `${row.pct}%` }}
                      />
                    </span>
                    <span className="tnum w-12 flex-none text-right text-[13px] font-medium">{int(row.qty)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-[13px]">
                <span className="font-medium text-muted-foreground">Total on hand</span>
                <span className="tnum font-bold">{int(valuation.onHand)}</span>
              </div>
            </>
          ) : (
            <div className="py-4 text-center text-[12.5px] text-muted-foreground">
              No active warehouses configured.
            </div>
          )}
        </RecordCard>

        {trackingCards.map((card) => (
          <RecordCard key={card.id} title={card.title}>
            <div
              role="status"
              className="flex items-start gap-2.5 rounded-[10px] bg-muted px-[13px] py-[11px] text-[12.5px] leading-normal text-muted-foreground"
            >
              <Info className="mt-0.5 size-[15px] flex-none" strokeWidth={2} />
              <span>{card.emptyText}</span>
            </div>
          </RecordCard>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {valuation.reorderNeeded && (
          <Notice
            tone="warn"
            icon={<AlertTriangle className="size-[17px] flex-none" strokeWidth={2} />}
          >
            Available ({int(valuation.available)}) is at or below the reorder point ({int(valuation.reorderPoint)}).
            Suggested order: {int(valuation.reorderQty)} {item.uom}.
          </Notice>
        )}

        <RecordCard title="Replenishment">
          <FieldRows
            fields={REPLENISHMENT_FIELDS}
            values={replenishment}
            editing={false}
            onChange={NOOP}
            idPrefix="ip-replenish"
            layout="wide"
          />
        </RecordCard>

        <RecordCard title="Valuation">
          <FieldRows
            fields={VALUATION_FIELDS}
            values={valuationRows}
            editing={false}
            onChange={NOOP}
            idPrefix="ip-valuation"
            layout="wide"
          />
        </RecordCard>
      </div>
    </div>
  )
}
