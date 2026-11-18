import { FieldRows } from '@/components/record-fields/FieldRows'
import type { EditorField } from '@/components/record-fields/model'
import { RecordCard } from '@/components/record-page/RecordPage'
import type { Item, Vendor } from '@/data/schemas'
import type { ItemValuation } from '@/domain/item-profile'
import { EM_DASH, int, money, pct } from '@/lib/format'

interface OverviewCommercialValues {
  price: number
  cost: number
  margin: number | null
  stockValue: number
  uom: string
  type: string
  costing: string
}

interface OverviewSpecValues {
  lead: number
  tracksLot: boolean
  tracksExpiry: boolean
  tracksSerial: boolean
  barcode: string
}

const COMMERCIAL_FIELDS: readonly EditorField<OverviewCommercialValues>[] = [
  { key: 'price', label: 'Unit price', type: 'number', display: (r) => (r.price > 0 ? money(r.price) : EM_DASH) },
  { key: 'cost', label: 'Unit cost', type: 'number', display: (r) => money(r.cost) },
  { key: 'margin', label: 'Margin', type: 'text', display: (r) => (r.margin != null ? pct(r.margin) : EM_DASH) },
  { key: 'stockValue', label: 'Stock value', type: 'number', display: (r) => money(r.stockValue) },
  { key: 'uom', label: 'Unit of measure', type: 'text', mono: true },
  { key: 'type', label: 'Item type', type: 'text', display: (r) => r.type || 'Inventory' },
  { key: 'costing', label: 'Costing method', type: 'text', display: (r) => r.costing || 'FIFO' },
]

const SPEC_FIELDS: readonly EditorField<OverviewSpecValues>[] = [
  { key: 'lead', label: 'Lead time', type: 'number', display: (r) => `${int(r.lead)} days` },
  { key: 'tracksLot', label: 'Lot tracking', type: 'toggle', onText: 'Tracked', offText: 'Not tracked' },
  { key: 'tracksExpiry', label: 'Expiry tracking', type: 'toggle', onText: 'Tracked', offText: 'Not tracked' },
  { key: 'tracksSerial', label: 'Serial numbers', type: 'toggle', onText: 'Tracked', offText: 'Not tracked' },
  { key: 'barcode', label: 'Barcode', type: 'text', mono: true, copyable: true },
]

const NOOP = () => {}

export interface ItemOverviewTabProps {
  item: Item
  valuation: ItemValuation
  preferredVendor: Vendor | undefined
  onOpenVendor: (vendorNo: string) => void
}

export function ItemOverviewTab({ item, valuation, preferredVendor, onOpenVendor }: ItemOverviewTabProps) {
  const commercial: OverviewCommercialValues = {
    price: valuation.unitPrice,
    cost: valuation.unitCost,
    margin: valuation.margin,
    stockValue: valuation.stockValue,
    uom: item.uom,
    type: item.type,
    costing: item.costing,
  }
  const specs: OverviewSpecValues = {
    lead: item.lead,
    tracksLot: item.tracksLot,
    tracksExpiry: item.tracksExpiry,
    tracksSerial: item.tracksSerial,
    barcode: item.barcode,
  }
  const attrs = Object.entries(item.attrs ?? {})

  return (
    <div className="grid animate-sf-fade grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-start gap-4">
      <RecordCard title="Details" hint="Catalogue pricing, costing, sourcing and tracking rules. Click Edit to change item master fields.">
        <FieldRows
          fields={COMMERCIAL_FIELDS}
          values={commercial}
          editing={false}
          onChange={NOOP}
          idPrefix="ip-commercial"
          layout="wide"
        />
        <div
          data-field="vendor"
          className="grid grid-cols-[minmax(96px,2fr)_minmax(0,3fr)] items-start gap-x-2 border-b border-dashed border-border py-1"
        >
          <span className="flex min-h-8 items-center text-[12.5px] text-muted-foreground">Preferred vendor</span>
          <div className="min-w-0">
            {preferredVendor ? (
              <button
                type="button"
                onClick={() => onOpenVendor(preferredVendor.no)}
                className="flex min-h-8 max-w-full items-center truncate rounded-lg border border-transparent bg-transparent px-[10px] text-left text-[13px] font-medium text-primary hover:underline"
              >
                {preferredVendor.name}
              </button>
            ) : (
              <div className="flex min-h-8 items-center truncate rounded-lg border border-transparent px-[10px] text-[13px] font-medium">
                {item.vendor || EM_DASH}
              </div>
            )}
          </div>
        </div>
        <FieldRows
          fields={SPEC_FIELDS}
          values={specs}
          editing={false}
          onChange={NOOP}
          idPrefix="ip-specs"
          layout="wide"
        />
      </RecordCard>

      <RecordCard title="Attributes">
        {attrs.length > 0 ? (
          <div>
            {attrs.map(([k, v]) => (
              <div
                key={k}
                className="grid grid-cols-[minmax(96px,2fr)_minmax(0,3fr)] items-center gap-x-2 border-b border-dashed border-border py-1 last:border-b-0"
              >
                <span className="flex min-h-8 items-center text-[12.5px] text-muted-foreground">{k}</span>
                <span className="tnum flex min-h-8 items-center justify-end px-[10px] text-right text-[13px] font-medium">
                  {String(v)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-2 py-6 text-center text-[12.5px] text-muted-foreground">
            No attributes recorded for this item.
          </div>
        )}
      </RecordCard>
    </div>
  )
}
