/**
 * Purchase Lines — every line of every purchase order as one flat report row.
 * Derived only, never stored. See docs/purchase-lines/README.md.
 */
import type { PurchaseOrder, PurchasePrice, PurchaseReceipt } from '@/data/schemas'
import { type PoLockState, poLockLabel, poReceiptProgress } from './purchase-order'
import { resolvePrice } from './purchase-prices'

export interface PurchaseLineRow {
  /** Synthetic id: `PO00001-2` (order + 1-based line number). */
  id: string
  po: string
  poStatus: PurchaseOrder['status']
  lock: ReturnType<typeof poLockLabel>
  vendor: string
  buyer: string | null
  location: string
  orderDate: string
  expectedDate: string
  item: string
  desc: string
  uom: string
  qty: number
  qtyReceived: number
  qtyOutstanding: number
  unitCost: number
  lineTotal: number
  /** Today's price from the vendor's price list; null when there is none. */
  currentPrice: number | null
  /** Current price vs the order's cost, in percent (one decimal); null when not comparable. */
  drift: number | null
}

export type { PoLockState }

export function purchaseLineRows(
  orders: readonly PurchaseOrder[],
  receipts: readonly PurchaseReceipt[],
  prices: readonly PurchasePrice[],
  today: string,
): PurchaseLineRow[] {
  return orders.flatMap((po) => {
    const progress = poReceiptProgress(po, receipts)
    return po.lines.map((line, i) => {
      const p = progress[i] ?? { ordered: Number(line.qty) || 0, received: 0, outstanding: Number(line.qty) || 0 }
      const unitCost = Number(line.unitCost) || 0
      const resolved = resolvePrice(prices, po.vendor, line.item, line.qty, today)
      const currentPrice = resolved.status === 'ok' ? resolved.price : null
      const drift =
        currentPrice === null || !(unitCost > 0) ? null : Math.round(((currentPrice - unitCost) / unitCost) * 1000) / 10
      return {
        id: `${po.no}-${i + 1}`,
        po: po.no,
        poStatus: po.status,
        lock: poLockLabel(po),
        vendor: po.vendor,
        buyer: po.buyer,
        location: po.location,
        orderDate: po.orderDate,
        expectedDate: po.expectedDate,
        item: line.item,
        desc: line.desc,
        uom: line.uom,
        qty: p.ordered,
        qtyReceived: p.received,
        qtyOutstanding: p.outstanding,
        unitCost,
        lineTotal: p.ordered * unitCost,
        currentPrice,
        drift,
      }
    })
  })
}

/** `+4.2%`, `−3%`, `Same`, or an em dash when there is nothing to compare. */
export function driftText(drift: number | null): string {
  if (drift === null) return '—'
  if (drift === 0) return 'Same'
  return (drift > 0 ? '+' : '−') + Math.abs(drift) + '%'
}
