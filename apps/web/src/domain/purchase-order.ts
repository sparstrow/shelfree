/**
 * Purchase order rules. Pure functions — no React, no storage — so the same
 * rules can be enforced server-side. See docs/purchase-orders/README.md and
 * docs/purchase-receipts/README.md.
 */
import type {
  PoStatus,
  PurchaseOrder,
  PurchaseOrderLine,
  PurchaseReceipt,
} from '@/data/schemas'
import { nextNo } from './numbering'

export function poLineTotal(line: Pick<PurchaseOrderLine, 'qty' | 'unitCost'>): number {
  return (Number(line.qty) || 0) * (Number(line.unitCost) || 0)
}

export function poSubtotal(po: Pick<PurchaseOrder, 'lines'>): number {
  return (po.lines || []).reduce((sum, line) => sum + poLineTotal(line), 0)
}

export function poLineCount(po: Pick<PurchaseOrder, 'lines'>): number {
  return (po.lines || []).length
}

/** An order can still receive goods while it is Issued or Partially received. */
export function poReceivable(po: Pick<PurchaseOrder, 'status'> | null | undefined): boolean {
  return !!po && (po.status === 'Issued' || po.status === 'Partially received')
}

/** Overdue = still receivable and the expected date is before today. */
export function poOverdue(
  po: Pick<PurchaseOrder, 'status' | 'expectedDate'> | null | undefined,
  today: string,
): boolean {
  if (!po || !po.expectedDate) return false
  if (!poReceivable(po)) return false
  return po.expectedDate < today
}

export type PoLockState = 'open' | 'locked' | 'final'

/**
 * Drafts are open. Issued orders are locked unless reopened (`locked === false`).
 * Anything past Issued (received, closed, cancelled) is final.
 */
export function poLockState(
  po: Pick<PurchaseOrder, 'status' | 'locked'> | null | undefined,
): PoLockState {
  if (!po || po.status === 'Draft') return 'open'
  if (po.status === 'Issued') return po.locked === false ? 'open' : 'locked'
  return 'final'
}

export function poEditable(po: Pick<PurchaseOrder, 'status' | 'locked'> | null | undefined): boolean {
  return poLockState(po) === 'open'
}

const LOCK_LABELS: Record<PoLockState, string> = { open: 'Open', locked: 'Locked', final: 'Final' }

export function poLockLabel(po: Pick<PurchaseOrder, 'status' | 'locked'> | null | undefined): string {
  return LOCK_LABELS[poLockState(po)]
}

export function poNextNo(orders: readonly Pick<PurchaseOrder, 'no'>[]): string {
  return nextNo(
    'PO',
    orders.map((p) => p.no),
  )
}

/** Quantity of one item already received against an order (posted receipts only). */
export function poReceivedQty(
  poNo: string,
  itemNo: string,
  receipts: readonly PurchaseReceipt[],
  exceptReceiptNo?: string,
): number {
  return receipts
    .filter((r) => r.po === poNo && r.status === 'Posted' && r.no !== exceptReceiptNo)
    .reduce(
      (total, r) =>
        total +
        (r.lines || [])
          .filter((l) => l.item === itemNo)
          .reduce((sum, l) => sum + (Number(l.qtyReceived) || 0), 0),
      0,
    )
}

export interface PoLineProgress {
  item: string
  desc: string
  uom: string
  unitCost: number
  ordered: number
  received: number
  outstanding: number
}

export function poReceiptProgress(
  po: PurchaseOrder | null | undefined,
  receipts: readonly PurchaseReceipt[],
  exceptReceiptNo?: string,
): PoLineProgress[] {
  if (!po) return []
  return (po.lines || []).map((line) => {
    const ordered = Number(line.qty) || 0
    const received = poReceivedQty(po.no, line.item, receipts, exceptReceiptNo)
    return {
      item: line.item,
      desc: line.desc,
      uom: line.uom,
      unitCost: Number(line.unitCost) || 0,
      ordered,
      received,
      outstanding: Math.max(0, Math.round((ordered - received) * 1000) / 1000),
    }
  })
}

export function poOutstandingQty(po: PurchaseOrder, receipts: readonly PurchaseReceipt[]): number {
  return poReceiptProgress(po, receipts).reduce((n, r) => n + r.outstanding, 0)
}

/** The status an order should have given what has been received so far. */
export function poStatusAfterReceipts(
  po: PurchaseOrder,
  receipts: readonly PurchaseReceipt[],
  exceptReceiptNo?: string,
): PoStatus {
  const progress = poReceiptProgress(po, receipts, exceptReceiptNo)
  if (progress.length && progress.every((r) => r.received >= r.ordered)) return 'Received'
  if (progress.some((r) => r.received > 0)) return 'Partially received'
  return po.status === 'Draft' ? 'Draft' : 'Issued'
}

/** True when any non-cancelled goods receipt exists against this order. */
export function poHasActiveReceipt(
  poNo: string,
  receipts: readonly Pick<PurchaseReceipt, 'po' | 'status'>[],
): boolean {
  return receipts.some((r) => r.po === poNo && r.status !== 'Cancelled')
}

/** Only Draft and Issued orders with no non-cancelled goods receipts can be cancelled. */
export function poCanCancel(
  po: Pick<PurchaseOrder, 'no' | 'status'>,
  receipts: readonly Pick<PurchaseReceipt, 'po' | 'status'>[],
): boolean {
  return (po.status === 'Draft' || po.status === 'Issued') && !poHasActiveReceipt(po.no, receipts)
}

/** Only Partially received or Received orders can be closed. */
export function poCanClose(po: Pick<PurchaseOrder, 'status'>): boolean {
  return po.status === 'Partially received' || po.status === 'Received'
}

/** Only locked Issued orders can be reopened. */
export function poCanReopen(po: Pick<PurchaseOrder, 'status' | 'locked'>): boolean {
  return poLockState(po) === 'locked'
}

/** Only reopened Issued orders can be locked (drafts lock when issued). */
export function poCanLock(po: Pick<PurchaseOrder, 'status' | 'locked'>): boolean {
  return po.status === 'Issued' && poLockState(po) === 'open'
}

/**
 * Clone a purchase order as a new Draft: fresh order number, today's order date,
 * expected date cleared, lines copied, lock/reopen/tax snapshot dropped so they
 * are freshly stamped on save/issue.
 */
export function duplicatePurchaseOrder(source: PurchaseOrder, no: string, today: string): PurchaseOrder {
  const {
    reopened: _reopened,
    locked: _locked,
    taxCalc: _taxCalc,
    roundTotal: _roundTotal,
    taxCalcSrc: _taxCalcSrc,
    ...rest
  } = source
  return {
    ...rest,
    no,
    status: 'Draft',
    orderDate: today,
    expectedDate: '',
    lines: (source.lines || []).map((line) => ({ ...line })),
  }
}
