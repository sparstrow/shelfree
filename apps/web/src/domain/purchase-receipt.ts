/**
 * Purchase receipt (goods-in) rules. A receipt records what actually arrived
 * against one purchase order; posting it moves stock and drives the order's
 * status. See docs/purchase-receipts/README.md.
 */
import type { PurchaseOrder, PurchaseReceipt, PurchaseReceiptLine } from '@/data/schemas'
import { int } from '@/lib/format'
import { nextNo } from './numbering'
import { type PoLineProgress, poReceiptProgress } from './purchase-order'

export function prQtyReceived(r: Pick<PurchaseReceipt, 'lines'>): number {
  return (r.lines || []).reduce((n, l) => n + (Number(l.qtyReceived) || 0), 0)
}

export function prQtyRejected(r: Pick<PurchaseReceipt, 'lines'>): number {
  return (r.lines || []).reduce((n, l) => n + (Number(l.qtyRejected) || 0), 0)
}

/** Value of what was accepted (rejected units carry no value). */
export function prValue(r: Pick<PurchaseReceipt, 'lines'>): number {
  return (r.lines || []).reduce((n, l) => n + (Number(l.qtyReceived) || 0) * (Number(l.unitCost) || 0), 0)
}

/** Lines with anything received or rejected. */
export function prTouchedLines(r: Pick<PurchaseReceipt, 'lines'>): PurchaseReceiptLine[] {
  return (r.lines || []).filter((l) => (Number(l.qtyReceived) || 0) > 0 || (Number(l.qtyRejected) || 0) > 0)
}

export function prNextNo(receipts: readonly Pick<PurchaseReceipt, 'no'>[]): string {
  return nextNo(
    'GRN',
    receipts.map((r) => r.no),
  )
}

/** A new draft receipt for an order: every line pre-filled with what is still outstanding. */
export function receiptDraftFromOrder(
  po: PurchaseOrder,
  receipts: readonly PurchaseReceipt[],
  today: string,
): PurchaseReceipt {
  return {
    no: prNextNo(receipts),
    po: po.no,
    vendor: po.vendor,
    receiptDate: today,
    location: po.location || 'TVM-MAIN',
    receivedBy: po.buyer || null,
    vendorDocNo: '',
    status: 'Draft',
    notes: '',
    postedAt: null,
    lines: poReceiptProgress(po, receipts).map((p) => ({
      item: p.item,
      desc: p.desc,
      uom: p.uom,
      qtyOrdered: p.ordered,
      qtyReceived: p.outstanding,
      qtyRejected: 0,
      rejectReason: '',
      unitCost: p.unitCost,
    })),
  }
}

/** Per-item progress on the order, not counting this receipt itself. */
export function outstandingByItem(
  receipt: Pick<PurchaseReceipt, 'no'>,
  po: PurchaseOrder | undefined,
  receipts: readonly PurchaseReceipt[],
): Map<string, PoLineProgress> {
  return new Map(poReceiptProgress(po, receipts, receipt.no).map((p) => [p.item, p]))
}

/** Is this line taking in (received + rejected) more than the order still has outstanding? */
export function lineOverReceives(line: PurchaseReceiptLine, progress: PoLineProgress | undefined): boolean {
  if (!progress) return false
  return (Number(line.qtyReceived) || 0) + (Number(line.qtyRejected) || 0) > progress.outstanding + 0.0001
}

/** Why a receipt can't be posted, or null when it can. */
export function postReceiptError(
  receipt: PurchaseReceipt,
  po: PurchaseOrder | undefined,
  receipts: readonly PurchaseReceipt[],
): string | null {
  if (!receipt.po) return 'A receipt has to be against a purchase order.'
  const moved = prTouchedLines(receipt)
  if (!moved.length) return 'Enter what actually arrived on at least one line before posting.'
  const progress = outstandingByItem(receipt, po, receipts)
  const over = moved.find((l) => lineOverReceives(l, progress.get(l.item)))
  if (over) {
    const p = progress.get(over.item) as PoLineProgress
    return `${over.item} — only ${int(p.outstanding)} ${over.uom || ''} are still outstanding on ${receipt.po}.`
  }
  return null
}

/** Units to add to stock per item when a receipt is posted. Rejected units never enter stock. */
export function stockToAdd(receipt: Pick<PurchaseReceipt, 'lines'>): Map<string, number> {
  const add = new Map<string, number>()
  for (const l of prTouchedLines(receipt)) {
    const qty = Number(l.qtyReceived) || 0
    if (qty > 0) add.set(l.item, (add.get(l.item) ?? 0) + qty)
  }
  return add
}

/** `Tiruvannamalai — Main` → `Main`. */
export function siteShortName(name: string): string {
  const i = name.indexOf(' — ')
  return i >= 0 ? name.slice(i + 3) : name
}
