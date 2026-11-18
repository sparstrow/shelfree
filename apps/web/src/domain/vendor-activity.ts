/**
 * Pure domain helpers for the Vendor profile's activity and supply tabs:
 * Items supplied, Purchase orders, Purchase receipts, and Performance.
 * No React, no storage — safe for server-side reuse.
 */
import type {
  Employee,
  Item,
  PoStatus,
  PrStatus,
  PurchaseOrder,
  PurchasePrice,
  PurchaseReceipt,
  Vendor,
} from '@/data/schemas'
import { EM_DASH, int } from '@/lib/format'
import { poLineCount, poOverdue, poReceiptProgress, poReceivable, poSubtotal } from './purchase-order'
import { prQtyReceived, prQtyRejected, prValue } from './purchase-receipt'
import type { VendorStats } from './vendor'

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MS_PER_DAY = 86_400_000

function parseIsoUtc(iso: string): number | null {
  if (!ISO_DATE_RE.test(iso)) return null
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

/** Shift a `YYYY-MM-DD` date by `days` calendar days; `''` for invalid input. */
export function addDaysIso(iso: string, days: number): string {
  const ms = parseIsoUtc(iso)
  if (ms === null) return ''
  const dt = new Date(ms + days * MS_PER_DAY)
  return (
    dt.getUTCFullYear() +
    '-' +
    String(dt.getUTCMonth() + 1).padStart(2, '0') +
    '-' +
    String(dt.getUTCDate()).padStart(2, '0')
  )
}

/** Whole calendar days from `fromIso` to `toIso`, or `null` when either is missing/invalid. */
export function daysBetween(fromIso: string, toIso: string): number | null {
  const a = parseIsoUtc(fromIso)
  const b = parseIsoUtc(toIso)
  if (a === null || b === null) return null
  return Math.round((b - a) / MS_PER_DAY)
}

// ── Items supplied ───────────────────────────────────────────────────────────

export type PurchasePriceStatus = 'Active' | 'Expiring' | 'Scheduled' | 'Expired'
export type VendorItemStatus = PurchasePriceStatus | 'No price'

/** Status of a purchase price row on `today` (Expiring within `expiringDays`, default 30). */
export function purchasePriceStatus(
  row: Pick<PurchasePrice, 'effFrom' | 'effTo'>,
  today: string,
  expiringDays = 30,
): PurchasePriceStatus {
  if (row.effFrom && row.effFrom > today) return 'Scheduled'
  if (row.effTo && row.effTo < today) return 'Expired'
  const cutoff = addDaysIso(today, expiringDays)
  if (row.effTo && cutoff && row.effTo <= cutoff) return 'Expiring'
  return 'Active'
}

export interface VendorItemRow {
  key: string
  itemNo: string
  desc: string
  uom: string
  preferred: boolean
  minQty: number | null
  price: number | null
  leadDays: number | null
  effFrom: string | null
  effTo: string | null
  lastOrdered: string
  status: VendorItemStatus
}

export interface VendorItemsSummary {
  /** Distinct real items linked via price list, preferred vendor, or non-cancelled orders. */
  itemCount: number
  /** Expired price rows for this vendor. */
  expiredCount: number
  rows: VendorItemRow[]
}

/** Items supplied for one vendor: active/scheduled (and optionally expired) price rows plus unpriced preferred/ordered items. */
export function vendorItemsSupplied(
  vendor: Pick<Vendor, 'no' | 'name'>,
  items: readonly Pick<Item, 'no' | 'desc' | 'uom' | 'vendor' | 'lead'>[],
  prices: readonly PurchasePrice[],
  orders: readonly PurchaseOrder[],
  today: string,
  options: { includeExpired?: boolean; expiringDays?: number } = {},
): VendorItemsSummary {
  const { includeExpired = false, expiringDays = 30 } = options
  const itemByNo = new Map(items.map((it) => [it.no, it]))

  const lastOrderedByItem = new Map<string, string>()
  for (const po of orders) {
    if (po.vendor !== vendor.no || po.status === 'Cancelled') continue
    for (const line of po.lines) {
      const prev = lastOrderedByItem.get(line.item) ?? ''
      if (po.orderDate > prev) lastOrderedByItem.set(line.item, po.orderDate)
    }
  }

  const myPrices = prices
    .filter((r) => r.vendor === vendor.no && itemByNo.has(r.item))
    .map((r) => ({ row: r, status: purchasePriceStatus(r, today, expiringDays) }))

  const expiredCount = myPrices.filter((p) => p.status === 'Expired').length
  const preferred = new Set(items.filter((it) => it.vendor === vendor.name).map((it) => it.no))
  const pricedItems = new Set(myPrices.filter((p) => p.status !== 'Expired').map((p) => p.row.item))

  const noPriceItems = [...new Set([...preferred, ...lastOrderedByItem.keys()])].filter(
    (no) => !pricedItems.has(no) && itemByNo.has(no),
  )
  const itemCount = new Set([...myPrices.map((p) => p.row.item), ...noPriceItems]).size

  const pricedEntries = myPrices
    .filter((p) => includeExpired || p.status !== 'Expired')
    .map(({ row, status }) => {
      const item = itemByNo.get(row.item)
      const minQty = Number(row.minQty) || 1
      return {
        sortKey: `${row.item}|${String(minQty).padStart(8, '0')}|${row.effFrom || ''}`,
        data: {
          key: row.no,
          itemNo: row.item,
          desc: item?.desc || EM_DASH,
          uom: item?.uom || EM_DASH,
          preferred: preferred.has(row.item),
          minQty,
          price: Number(row.price) || 0,
          leadDays: row.leadDays,
          effFrom: row.effFrom,
          effTo: row.effTo,
          lastOrdered: lastOrderedByItem.get(row.item) ?? '',
          status,
        } satisfies VendorItemRow,
      }
    })

  const unpricedEntries = noPriceItems.map((no) => {
    const item = itemByNo.get(no) as Pick<Item, 'no' | 'desc' | 'uom' | 'vendor' | 'lead'>
    return {
      sortKey: `${no}|~`,
      data: {
        key: `no-price:${no}`,
        itemNo: no,
        desc: item.desc || EM_DASH,
        uom: item.uom || EM_DASH,
        preferred: preferred.has(no),
        minQty: null,
        price: null,
        leadDays: item.lead ?? null,
        effFrom: null,
        effTo: null,
        lastOrdered: lastOrderedByItem.get(no) ?? '',
        status: 'No price',
      } satisfies VendorItemRow,
    }
  })

  const rows = [...pricedEntries, ...unpricedEntries]
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map((entry) => entry.data)

  return { itemCount, expiredCount, rows }
}

// ── Purchase orders ──────────────────────────────────────────────────────────

export type VendorOrderFilter = 'all' | 'open' | 'done' | 'cancelled'
export type VendorOrderGroup = Exclude<VendorOrderFilter, 'all'>

export function vendorOrderGroup(po: Pick<PurchaseOrder, 'status'>): VendorOrderGroup {
  if (po.status === 'Cancelled') return 'cancelled'
  if (po.status === 'Received' || po.status === 'Closed') return 'done'
  return 'open'
}

export interface VendorOrderRow {
  no: string
  orderDate: string
  expectedDate: string
  late: boolean
  lineCount: number
  buyerName: string
  orderedQty: number
  receivedQty: number
  receivedPct: number
  status: PoStatus
  total: number
  canReceive: boolean
  group: VendorOrderGroup
}

export interface VendorOrdersResult {
  rows: VendorOrderRow[]
  counts: Record<VendorOrderFilter, number>
}

/** Purchase orders for one vendor, newest first, with filter counts and receipt progress. */
export function vendorOrderRows(
  vendor: Pick<Vendor, 'no' | 'blocked'>,
  allOrders: readonly PurchaseOrder[],
  allReceipts: readonly PurchaseReceipt[],
  employees: readonly Pick<Employee, 'id' | 'name'>[],
  today: string,
  filter: VendorOrderFilter = 'all',
): VendorOrdersResult {
  const empNameById = new Map(employees.map((e) => [e.id, e.name]))
  const vendorOrders = allOrders
    .filter((po) => po.vendor === vendor.no)
    .sort((a, b) => b.orderDate.localeCompare(a.orderDate) || b.no.localeCompare(a.no))

  const counts: Record<VendorOrderFilter, number> = {
    all: vendorOrders.length,
    open: 0,
    done: 0,
    cancelled: 0,
  }
  for (const po of vendorOrders) counts[vendorOrderGroup(po)]++

  const rows = vendorOrders
    .filter((po) => filter === 'all' || vendorOrderGroup(po) === filter)
    .map((po): VendorOrderRow => {
      const progress = poReceiptProgress(po, allReceipts)
      const orderedQty = progress.reduce((sum, l) => sum + l.ordered, 0)
      const receivedQty = progress.reduce((sum, l) => sum + l.received, 0)
      const receivedPct = orderedQty > 0 ? Math.min(100, Math.round((receivedQty / orderedQty) * 100)) : 0
      return {
        no: po.no,
        orderDate: po.orderDate,
        expectedDate: po.expectedDate,
        late: poOverdue(po, today),
        lineCount: poLineCount(po),
        buyerName: po.buyer ? (empNameById.get(po.buyer) ?? '') : '',
        orderedQty,
        receivedQty,
        receivedPct,
        status: po.status,
        total: poSubtotal(po),
        canReceive: poReceivable(po) && vendor.blocked !== 'All',
        group: vendorOrderGroup(po),
      }
    })

  return { rows, counts }
}

// ── Purchase receipts ────────────────────────────────────────────────────────

export type VendorReceiptFilter = 'all' | PrStatus

export interface VendorReceiptRow {
  no: string
  receiptDate: string
  po: string
  vendorDocNo: string
  received: number
  rejected: number
  value: number
  status: PrStatus
}

export interface VendorReceiptsResult {
  rows: VendorReceiptRow[]
  counts: Record<VendorReceiptFilter, number>
}

/** Purchase receipts for one vendor, newest first, with status filter counts. */
export function vendorReceiptRows(
  vendorNo: string,
  allReceipts: readonly PurchaseReceipt[],
  filter: VendorReceiptFilter = 'all',
): VendorReceiptsResult {
  const vendorReceipts = allReceipts
    .filter((r) => r.vendor === vendorNo)
    .sort((a, b) => b.receiptDate.localeCompare(a.receiptDate) || b.no.localeCompare(a.no))

  const counts: Record<VendorReceiptFilter, number> = {
    all: vendorReceipts.length,
    Draft: 0,
    Posted: 0,
    Cancelled: 0,
  }
  for (const r of vendorReceipts) counts[r.status]++

  const rows = vendorReceipts
    .filter((r) => filter === 'all' || r.status === filter)
    .map((r): VendorReceiptRow => ({
      no: r.no,
      receiptDate: r.receiptDate,
      po: r.po,
      vendorDocNo: r.vendorDocNo,
      received: prQtyReceived(r),
      rejected: prQtyRejected(r),
      value: prValue(r),
      status: r.status,
    }))

  return { rows, counts }
}

// ── Performance ──────────────────────────────────────────────────────────────

export interface VendorDeliveryRow {
  no: string
  expectedDate: string
  receiptDate: string
  /** Days late (> 0), on the day (0), or early (< 0); null when expected date is unknown. */
  deltaDays: number | null
}

export interface VendorQualityRow {
  key: string
  receiptNo: string
  date: string
  item: string
  qty: number
  uom: string
  reason: string
}

export interface VendorPerformanceSummary {
  deliveries: VendorDeliveryRow[]
  qualityLog: VendorQualityRow[]
  onTime: number
  timed: number
  onTimePct: number | null
  avgLeadDays: number | null
  quotedLeadDays: number | null
  receivedQty: number
  rejectedQty: number
  rejectionPct: number | null
  lateOpenOrders: number
}

/** Delivery timing label (`7 days early`, `On the day`, `2 days late`, or `—`). */
export function formatDeliveryDelta(deltaDays: number | null): string {
  if (deltaDays === null) return EM_DASH
  if (deltaDays > 0) return `${int(deltaDays)} ${deltaDays === 1 ? 'day' : 'days'} late`
  if (deltaDays === 0) return 'On the day'
  const early = -deltaDays
  return `${int(early)} ${early === 1 ? 'day' : 'days'} early`
}

/** Delivery record, scorecard metrics, and quality rejection log for one vendor. */
export function vendorPerformance(
  vendor: Pick<Vendor, 'no' | 'name' | 'subInfo'>,
  stats: Pick<VendorStats, 'orders' | 'posted' | 'onTime' | 'timed' | 'onTimePct' | 'rejectedQty' | 'lateOpen'>,
  items: readonly Pick<Item, 'vendor' | 'lead'>[],
): VendorPerformanceSummary {
  const poByNo = new Map(stats.orders.map((po) => [po.no, po]))
  const postedNewest = [...stats.posted].sort(
    (a, b) => b.receiptDate.localeCompare(a.receiptDate) || b.no.localeCompare(a.no),
  )

  const deliveries: VendorDeliveryRow[] = postedNewest.map((r) => {
    const expectedDate = poByNo.get(r.po)?.expectedDate ?? ''
    return {
      no: r.no,
      expectedDate,
      receiptDate: r.receiptDate,
      deltaDays: expectedDate ? daysBetween(expectedDate, r.receiptDate) : null,
    }
  })

  const qualityLog: VendorQualityRow[] = []
  for (const r of postedNewest) {
    r.lines.forEach((line, index) => {
      const qty = Number(line.qtyRejected) || 0
      if (qty > 0) {
        qualityLog.push({
          key: `${r.no}:${line.item}:${index}`,
          receiptNo: r.no,
          date: r.receiptDate,
          item: line.item,
          qty,
          uom: line.uom || '',
          reason: line.rejectReason || 'No reason recorded',
        })
      }
    })
  }

  let leadSum = 0
  let leadCount = 0
  for (const r of stats.posted) {
    const orderDate = poByNo.get(r.po)?.orderDate
    if (!orderDate) continue
    const diff = daysBetween(orderDate, r.receiptDate)
    if (diff !== null) {
      leadSum += Math.max(0, diff)
      leadCount++
    }
  }
  const avgLeadDays = leadCount > 0 ? Math.round(leadSum / leadCount) : null

  const preferredLeads = items
    .filter((it) => it.vendor === vendor.name && it.lead > 0)
    .map((it) => it.lead)
  const quotedLeadDays = vendor.subInfo?.lead
    ? vendor.subInfo.lead
    : preferredLeads.length > 0
      ? Math.round(preferredLeads.reduce((sum, n) => sum + n, 0) / preferredLeads.length)
      : null

  const receivedQty = stats.posted.reduce((sum, r) => sum + prQtyReceived(r), 0)
  const rejectedQty = stats.rejectedQty
  const totalUnits = receivedQty + rejectedQty
  const rejectionPct = totalUnits > 0 ? (rejectedQty / totalUnits) * 100 : null

  return {
    deliveries,
    qualityLog,
    onTime: stats.onTime,
    timed: stats.timed,
    onTimePct: stats.onTimePct,
    avgLeadDays,
    quotedLeadDays,
    receivedQty,
    rejectedQty,
    rejectionPct,
    lateOpenOrders: stats.lateOpen,
  }
}
