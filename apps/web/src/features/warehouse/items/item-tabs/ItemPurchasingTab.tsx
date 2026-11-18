import { StatusPill } from '@/components/StatusPill'
import { secondaryButton } from '@/components/document/parts'
import { FieldRows } from '@/components/record-fields/FieldRows'
import type { EditorField } from '@/components/record-fields/model'
import { RecordCard } from '@/components/record-page/RecordPage'
import type { Item, Vendor } from '@/data/schemas'
import type { ItemPurchaseOrderRow } from '@/domain/item-profile'
import { EM_DASH, fmtDate, int, money } from '@/lib/format'
import { cn } from '@/lib/utils'

interface SourcingValues {
  cost: number
  lead: number
  rp: number
  rq: number
}

const SOURCING_FIELDS: readonly EditorField<SourcingValues>[] = [
  { key: 'cost', label: 'Unit cost', type: 'number', display: (r) => money(r.cost) },
  { key: 'lead', label: 'Lead time', type: 'number', display: (r) => `${int(r.lead)} days` },
  { key: 'rp', label: 'Reorder point', type: 'number', display: (r) => int(r.rp) },
  { key: 'rq', label: 'Reorder quantity', type: 'number', display: (r) => int(r.rq) },
]

const NOOP = () => {}

export interface ItemPurchasingTabProps {
  item: Item
  preferredVendor: Vendor | undefined
  purchaseOrders: readonly ItemPurchaseOrderRow[]
  openPoCount: number
  onOpenVendor: (vendorNo: string) => void
  onOpenPo: (poNo: string) => void
  onViewAllLines: () => void
}

export function ItemPurchasingTab({
  item,
  preferredVendor,
  purchaseOrders,
  openPoCount,
  onOpenVendor,
  onOpenPo,
  onViewAllLines,
}: ItemPurchasingTabProps) {
  const sourcing: SourcingValues = {
    cost: item.cost,
    lead: item.lead,
    rp: item.rp,
    rq: item.rq,
  }

  return (
    <div className="grid animate-sf-fade grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <RecordCard title="Sourcing">
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
          fields={SOURCING_FIELDS}
          values={sourcing}
          editing={false}
          onChange={NOOP}
          idPrefix="ip-sourcing"
          layout="wide"
        />
      </RecordCard>

      <section aria-label="Purchase orders" className="rounded-xl border border-border bg-card px-[18px] py-4">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">
            Purchase orders
          </h2>
          <div className="flex items-center gap-2.5">
            {purchaseOrders.length > 0 && (
              <span className="text-[11.5px] text-muted-foreground">
                {int(purchaseOrders.length)} {purchaseOrders.length === 1 ? 'order' : 'orders'}
                {openPoCount > 0 ? ` · ${int(openPoCount)} open` : ''}
              </span>
            )}
            <button type="button" onClick={onViewAllLines} className={cn(secondaryButton, 'h-7 px-2.5 text-xs')}>
              View all lines
            </button>
          </div>
        </div>

        {purchaseOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border text-[10.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                  <th className="px-2 pb-2 text-left">PO no</th>
                  <th className="px-2 pb-2 text-left">Vendor</th>
                  <th className="px-2 pb-2 text-left">Status</th>
                  <th className="px-2 pb-2 text-right">Qty</th>
                  <th className="px-2 pb-2 text-right">Ordered</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map((po) => (
                  <tr
                    key={po.no}
                    onClick={() => onOpenPo(po.no)}
                    className="cursor-pointer border-b border-border transition-colors duration-100 last:border-b-0 hover:bg-muted/60"
                  >
                    <td className="px-2 py-2.5 font-mono text-[12.5px] font-semibold">{po.no}</td>
                    <td className="px-2 py-2.5 text-[13px]">
                      {po.vendorNo ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpenVendor(po.vendorNo)
                          }}
                          className="border-0 bg-transparent p-0 text-left font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {po.vendorName}
                        </button>
                      ) : (
                        po.vendorName
                      )}
                    </td>
                    <td className="px-2 py-2.5">
                      <StatusPill label={po.status} />
                    </td>
                    <td className="tnum px-2 py-2.5 text-right text-[13px]">{int(po.qty)}</td>
                    <td className="tnum px-2 py-2.5 text-right text-[12.5px] whitespace-nowrap text-muted-foreground">
                      {fmtDate(po.orderDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-[13px] text-muted-foreground">
            No purchase orders reference this item yet.
          </div>
        )}
      </section>
    </div>
  )
}
