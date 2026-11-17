/**
 * Vendor domain helpers. Pure functions — no React, no storage — so the same
 * rules can be enforced server-side. See docs/vendor-page/README.md.
 */
import type { PurchaseOrder, PurchaseReceipt, TaxCalc, Vendor, VendorGstRegType } from '@/data/schemas'
import { int } from '@/lib/format'
import { gstStateByCode, vendorGstType, vendorGstTypeInfo, vendorTaxCalc } from './gst'
import { poOverdue, poReceiptProgress, poReceivable } from './purchase-order'
import { prQtyRejected } from './purchase-receipt'

export type VendorStatus = 'Active' | 'Blocked'

/** A vendor is Blocked when `blocked` is non-empty (`'Payment' | 'All'`). */
export function vendorStatus(v: Partial<Pick<Vendor, 'blocked'>> | null | undefined): VendorStatus {
  return v?.blocked ? 'Blocked' : 'Active'
}

const SUPPLIES_LABEL: Record<Vendor['supplies'], string> = {
  goods: 'Goods',
  services: 'Services',
  both: 'Goods + services',
}

export function vendorSuppliesLabel(v: Partial<Pick<Vendor, 'supplies'>> | null | undefined): string {
  const key = v?.supplies ?? 'goods'
  return SUPPLIES_LABEL[key] ?? 'Goods'
}

/** `City, State`, or whichever part is present, or `''`. */
export function vendorLocation(v: Partial<Pick<Vendor, 'city' | 'state'>> | null | undefined): string {
  const city = v?.city ?? ''
  const state = v?.state ?? ''
  if (city && state) return `${city}, ${state}`
  return city || state
}

// ── Profile page: derived figures ────────────────────────────────────────────

export interface VendorStats {
  orders: PurchaseOrder[]
  receipts: PurchaseReceipt[]
  posted: PurchaseReceipt[]
  /** Orders that can still receive goods. */
  open: PurchaseOrder[]
  /** Value still to receive on open orders (outstanding qty × unit cost). */
  openValue: number
  lateOpen: number
  onTime: number
  timed: number
  onTimePct: number | null
  rejectedQty: number
}

/** Derived purchasing figures for one vendor, from its orders and receipts. */
export function vendorStats(
  vendorNo: string,
  allOrders: readonly PurchaseOrder[],
  allReceipts: readonly PurchaseReceipt[],
  today: string,
): VendorStats {
  const orders = allOrders.filter((p) => p.vendor === vendorNo)
  const receipts = allReceipts.filter((r) => r.vendor === vendorNo)
  const posted = receipts.filter((r) => r.status === 'Posted')
  const byNo = new Map(orders.map((p) => [p.no, p]))
  let onTime = 0
  let timed = 0
  for (const r of posted) {
    const po = byNo.get(r.po)
    if (!po?.expectedDate) continue
    timed++
    if (r.receiptDate <= po.expectedDate) onTime++
  }
  const open = orders.filter((p) => poReceivable(p))
  const openValue = open.reduce(
    (sum, p) => sum + poReceiptProgress(p, allReceipts).reduce((n, l) => n + l.outstanding * l.unitCost, 0),
    0,
  )
  return {
    orders,
    receipts,
    posted,
    open,
    openValue,
    lateOpen: open.filter((p) => poOverdue(p, today)).length,
    onTime,
    timed,
    onTimePct: timed ? Math.round((onTime / timed) * 100) : null,
    rejectedQty: posted.reduce((n, r) => n + prQtyRejected(r), 0),
  }
}

export interface VendorActivityEntry {
  /** ISO date; '' when unknown. */
  date: string
  text: string
  meta: string
}

const plural = (n: number, one: string, many: string) => `${int(n)} ${n === 1 ? one : many}`

/** Latest non-cancelled order date, for the "Last order" row; '' when none. */
export function vendorLastOrderDate(orders: readonly PurchaseOrder[]): string {
  return orders.filter((p) => p.status !== 'Cancelled').reduce((max, p) => (p.orderDate > max ? p.orderDate : max), '')
}

/** Newest-first activity feed derived from the vendor's record and documents. */
export function vendorActivity(vendor: Vendor, stats: VendorStats, today: string): VendorActivityEntry[] {
  const entries: VendorActivityEntry[] = [{ date: vendor.vendorSince, text: 'Vendor added', meta: 'Vendor since' }]
  const lastPo = [...stats.orders]
    .filter((p) => p.status !== 'Cancelled')
    .sort((a, b) => b.orderDate.localeCompare(a.orderDate))[0]
  if (lastPo) entries.push({ date: lastPo.orderDate, text: 'Last purchase order', meta: `${lastPo.no} · ${lastPo.status}` })
  const lastRc = [...stats.posted].sort((a, b) => b.receiptDate.localeCompare(a.receiptDate))[0]
  if (lastRc) {
    entries.push({
      date: lastRc.receiptDate,
      text: 'Last goods receipt posted',
      meta: lastRc.no + (lastRc.vendorDocNo ? ` · challan ${lastRc.vendorDocNo}` : ''),
    })
  }
  if (stats.rejectedQty > 0) {
    entries.push({
      date: lastRc?.receiptDate ?? '',
      text: `${plural(stats.rejectedQty, 'unit', 'units')} rejected on receipt`,
      meta: 'Performance',
    })
  }
  if (stats.lateOpen > 0) {
    entries.push({
      date: today,
      text: `${plural(stats.lateOpen, 'order is', 'orders are')} past the expected date`,
      meta: 'Purchase orders',
    })
  }
  if (vendor.blocked) {
    entries.push({
      date: today,
      text: vendor.blocked === 'All' ? 'Blocked for all transactions' : 'Payments blocked',
      meta: 'Payables & blocking',
    })
  }
  for (const e of vendor.gstRegLog ?? []) {
    entries.push({
      date: e.at.slice(0, 10),
      text: e.from !== e.to ? 'GST registration changed' : 'GSTIN updated',
      meta: e.from !== e.to ? `${vendorGstTypeInfo(e.from).short} → ${vendorGstTypeInfo(e.to).short}` : e.gstinTo || 'Removed',
    })
  }
  return entries.sort((a, b) => b.date.localeCompare(a.date))
}

/** One-line effect of a GST registration type on purchases. */
export function vendorGstEffect(type: VendorGstRegType): string {
  if (type === 'regular') return 'GST charged on purchases · credit claimed'
  if (type === 'composition' || type === 'unregistered') return 'No GST on purchases · no credit'
  return 'Import — tax paid at customs'
}

// ── Profile page: editing (form values, validation, save) ────────────────────

export const VENDOR_PAYMENT_METHODS = ['EFT', 'NEFT', 'RTGS', 'UPI', 'Cheque', 'Cash'] as const

/** Values the Overview tab edits. Everything is a string so inputs can hold partial text. */
export interface VendorForm {
  name: string
  category: string
  paymentTerms: string
  paymentMethod: string
  /** Employee id, '' = unassigned. */
  purchasePerson: string
  budgetedAmount: string
  gstRegType: VendorGstRegType
  gstin: string
  taxRules: 'workspace' | 'vendor'
  taxCalc: TaxCalc
  roundTotal: 'yes' | 'no'
}

export interface WorkspaceTax {
  taxCalc: TaxCalc
  roundTotal: boolean
}

/** Form values for a vendor. While inheriting, the tax values shown are the workspace's. */
export function vendorToForm(v: Vendor, ws: WorkspaceTax): VendorForm {
  const tax = vendorTaxCalc(v, ws)
  return {
    name: v.name,
    category: v.category,
    paymentTerms: v.paymentTerms,
    paymentMethod: v.paymentMethod,
    purchasePerson: v.purchasePerson ?? '',
    budgetedAmount: v.budgetedAmount ? String(v.budgetedAmount) : '',
    gstRegType: vendorGstType(v),
    gstin: v.gstin,
    taxRules: tax.src === 'vendor' ? 'vendor' : 'workspace',
    taxCalc: tax.taxCalc,
    roundTotal: tax.roundTotal ? 'yes' : 'no',
  }
}

/** Tidy typed values before they are validated or saved. */
export function normalizeVendorForm(form: VendorForm): VendorForm {
  const gstin = vendorGstTypeInfo(form.gstRegType).gstin ? form.gstin.replace(/\s+/g, '').toUpperCase() : form.gstin
  return {
    ...form,
    name: form.name.trim(),
    category: form.category.trim(),
    paymentTerms: form.paymentTerms.trim(),
    gstin,
  }
}

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/

/** Format problem with a GSTIN, or '' when it is fine. */
export function gstinFormatError(gstin: string): string {
  const g = gstin.replace(/\s+/g, '').toUpperCase()
  if (!g) return 'Enter the GSTIN, or change the type to Unregistered.'
  if (!GSTIN_PATTERN.test(g)) return 'A GSTIN is 15 characters — state code, PAN, entity number, Z, check character.'
  if (!gstStateByCode(g.slice(0, 2))) return `${g.slice(0, 2)} isn’t a GST state code.`
  return ''
}

/** Blocking problems, by field key. Empty = saveable. */
export function validateVendorForm(form: VendorForm, vendor: Pick<Vendor, 'country'>): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.name.trim()) errors.name = 'Vendor name is required.'
  const budget = form.budgetedAmount.trim()
  if (budget && !(Number(budget) >= 0)) errors.budgetedAmount = 'Enter an amount of 0 or more.'
  const country = vendor.country.trim().toLowerCase()
  const india = !country || country === 'india' || country === 'in'
  if (form.gstRegType === 'overseas' && india) {
    errors.gstRegType =
      'An overseas vendor’s country can’t be India — change the country on Address & payment, or pick another type.'
  }
  if (vendorGstTypeInfo(form.gstRegType).gstin) {
    const gstinError = gstinFormatError(form.gstin)
    if (gstinError) errors.gstin = gstinError
  }
  return errors
}

/** The amber review shown before changing the type while orders are open. '' = none needed. */
export function vendorGstReview(vendor: Vendor, form: VendorForm, openOrders: number): string {
  if (!openOrders || vendorGstType(vendor) === form.gstRegType) return ''
  const from = vendorGstTypeInfo(vendorGstType(vendor)).short
  const to = vendorGstTypeInfo(form.gstRegType).short
  const one = openOrders === 1
  return (
    `${one ? '1 open purchase order uses ' : `${openOrders} open purchase orders use `}${from}. ` +
    `${one ? 'It switches' : 'They switch'} to ${to} the next time ${one ? 'it is' : 'they are'} edited or received. ` +
    'Posted receipts and bills keep their tax.'
  )
}

export interface VendorSaveContext {
  openOrders: number
  /** Who made the change, for the registration log. */
  by: string
  /** ISO timestamp. */
  now: string
}

/** The vendor record after saving a (normalised) form. */
export function applyVendorForm(vendor: Vendor, form: VendorForm, ctx: VendorSaveContext): Vendor {
  const type = vendorGstTypeInfo(form.gstRegType)
  const gstin = type.gstin ? form.gstin : ''
  const before = vendorGstType(vendor)
  const registrationChanged = before !== form.gstRegType || vendor.gstin.toUpperCase() !== gstin
  const next: Vendor = {
    ...vendor,
    name: form.name,
    category: form.category,
    paymentTerms: form.paymentTerms,
    paymentMethod: form.paymentMethod,
    purchasePerson: form.purchasePerson,
    budgetedAmount: Math.max(0, parseFloat(form.budgetedAmount) || 0),
    gstRegType: form.gstRegType,
    gstin,
  }
  if (registrationChanged) {
    next.gstRegLog = [
      ...(vendor.gstRegLog ?? []),
      {
        at: ctx.now,
        from: before,
        to: form.gstRegType,
        gstinFrom: vendor.gstin.toUpperCase(),
        gstinTo: gstin,
        openPOs: ctx.openOrders,
        by: ctx.by,
      },
    ]
  }
  // Tax rules only apply to vendors that charge GST; for the rest they stay as they were.
  if (type.charges) {
    if (form.taxRules === 'vendor') {
      next.taxCalcOverride = true
      next.taxCalc = form.taxCalc
      next.roundTotal = form.roundTotal === 'yes'
    } else {
      next.taxCalcOverride = false
      delete next.taxCalc
      delete next.roundTotal
    }
  }
  return next
}

/** Toast wording after a save (empty when nothing tax-related changed). */
export function vendorSavedNote(before: Vendor, after: Vendor, ws: WorkspaceTax): string {
  const type = vendorGstTypeInfo(vendorGstType(after))
  if (vendorGstType(before) !== vendorGstType(after)) {
    return ` · now ${type.short.toLowerCase()} — applies to new purchase orders`
  }
  const a = vendorTaxCalc(before, ws)
  const b = vendorTaxCalc(after, ws)
  if (type.charges && (a.taxCalc !== b.taxCalc || a.roundTotal !== b.roundTotal || a.src !== b.src)) {
    return ' · new tax calculation applies to new purchase orders'
  }
  return ''
}
