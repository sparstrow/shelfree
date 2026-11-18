/**
 * Vendor domain helpers. Pure functions — no React, no storage — so the same
 * rules can be enforced server-side. See docs/vendor-page/README.md.
 */
import type { Item, PurchaseOrder, PurchasePrice, PurchaseReceipt, TaxCalc, Vendor, VendorGstRegType } from '@/data/schemas'
import { int } from '@/lib/format'
import { GST_STATES, gstStateByCode, gstStateByName, vendorGstType, vendorGstTypeInfo, vendorTaxCalc } from './gst'
import { poOverdue, poReceiptProgress, poReceivable, poSubtotal } from './purchase-order'
import { prQtyRejected, prValue } from './purchase-receipt'

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
  /** Draft, issued or part-received orders — the ones a registration change reaches. */
  taxPending: number
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
    taxPending: orders.filter((p) => p.status === 'Draft' || poReceivable(p)).length,
    onTime,
    timed,
    onTimePct: timed ? Math.round((onTime / timed) * 100) : null,
    rejectedQty: posted.reduce((n, r) => n + prQtyRejected(r), 0),
  }
}

export interface VendorSupply {
  /** Items linked to the vendor in any way. */
  total: number
  /** Of those, items that name this vendor as preferred. */
  preferred: number
  /** Items with a price row that has not expired. */
  priced: number
}

/** Items supplied: preferred-vendor items ∪ price-list rows ∪ anything ordered before (real items only). */
export function vendorSupply(
  vendor: Pick<Vendor, 'no' | 'name'>,
  items: readonly Pick<Item, 'no' | 'vendor'>[],
  prices: readonly PurchasePrice[],
  orders: readonly PurchaseOrder[],
  today: string,
): VendorSupply {
  const known = new Set(items.map((i) => i.no))
  const mine = prices.filter((r) => r.vendor === vendor.no && known.has(r.item))
  const preferred = new Set(items.filter((i) => i.vendor === vendor.name).map((i) => i.no))
  const ordered = orders
    .filter((p) => p.vendor === vendor.no && p.status !== 'Cancelled')
    .flatMap((p) => p.lines.map((l) => l.item))
    .filter((no) => known.has(no))
  const all = new Set([...mine.map((r) => r.item), ...preferred, ...ordered])
  return {
    total: all.size,
    preferred: [...all].filter((no) => preferred.has(no)).length,
    priced: new Set(mine.filter((r) => !r.effTo || r.effTo >= today).map((r) => r.item)).size,
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

// ── Profile page: payables & blocking ────────────────────────────────────────

export interface VendorPayables {
  balance: number
  notYetDue: number
  dueNow: number
  overdue: number
  /** Posted receipts on orders that are not Closed (Closed = invoiced). */
  grni: number
  /** Subtotal of issued, received and closed orders (excludes Draft and Cancelled). */
  committed: number
  budget: number
  /** Committed / budget percentage (rounded), or 0 when no budget is set. */
  budgetPct: number
}

/** Payables aging buckets, GRNI and purchase-budget commitment for one vendor. */
export function vendorPayables(
  vendor: Pick<Vendor, 'no' | 'balance' | 'balanceDue' | 'overdue' | 'budgetedAmount'>,
  allOrders: readonly PurchaseOrder[],
  allReceipts: readonly PurchaseReceipt[],
): VendorPayables {
  const orders = allOrders.filter((p) => p.vendor === vendor.no)
  const receipts = allReceipts.filter((r) => r.vendor === vendor.no)
  const poByNo = new Map(orders.map((p) => [p.no, p]))
  const grni = receipts
    .filter((r) => {
      if (r.status !== 'Posted') return false
      const po = poByNo.get(r.po)
      return !po || po.status !== 'Closed'
    })
    .reduce((sum, r) => sum + prValue(r), 0)
  const committed = orders
    .filter((p) => p.status !== 'Cancelled' && p.status !== 'Draft')
    .reduce((sum, p) => sum + poSubtotal(p), 0)
  const balance = vendor.balance || 0
  const due = vendor.balanceDue || 0
  const overdue = vendor.overdue || 0
  const budget = vendor.budgetedAmount || 0
  return {
    balance,
    notYetDue: Math.max(0, balance - due),
    dueNow: Math.max(0, due - overdue),
    overdue,
    grni,
    committed,
    budget,
    budgetPct: budget ? Math.round((committed / budget) * 100) : 0,
  }
}

export type VendorBlocked = '' | 'Payment' | 'All'

export interface VendorBlockOption {
  value: VendorBlocked
  label: string
  desc: string
}

export const VENDOR_BLOCK_OPTIONS: readonly VendorBlockOption[] = [
  { value: '', label: 'Not blocked', desc: 'Orders, receipts and payments all allowed.' },
  {
    value: 'Payment',
    label: 'Block payments',
    desc: 'Keep ordering and receiving, but hold payments — e.g. while a quality dispute is open.',
  },
  {
    value: 'All',
    label: 'Block all transactions',
    desc: 'No new purchase orders, receipts or payments with this vendor.',
  },
]

/** Normalised blocked state (`'' | 'Payment' | 'All'`). */
export function vendorBlocked(v: Partial<Pick<Vendor, 'blocked'>> | null | undefined): VendorBlocked {
  if (v?.blocked === 'All' || v?.blocked === 'Payment') return v.blocked
  return ''
}

/** Vendor record with an updated blocked state. */
export function applyVendorBlocked(vendor: Vendor, blocked: VendorBlocked): Vendor {
  return { ...vendor, blocked }
}

/** Toast copy after changing a vendor's blocked state (matches prototype `vendSetBlocked`). */
export function vendorBlockToast(vendorNo: string, blocked: VendorBlocked): { title: string; description: string } {
  if (blocked === 'All') {
    return { title: 'Vendor blocked', description: `${vendorNo} · no new orders, receipts or payments` }
  }
  if (blocked === 'Payment') {
    return { title: 'Payments blocked', description: `${vendorNo} · orders and receipts still allowed` }
  }
  return { title: 'Vendor unblocked', description: `${vendorNo} · all transactions allowed` }
}

/** State <select> options (current GST states A–Z; preserves an unrecognised saved value). */
export function vendorStateOptions(current: string): { value: string; label: string }[] {
  const v = String(current || '').trim()
  const hit = gstStateByName(v)
  const names = GST_STATES.filter((s) => !s.legacy && s.code !== '96')
    .map((s) => s.name)
    .sort((a, b) => a.localeCompare(b))
  const opts = names.map((n) => ({ value: n, label: n }))
  if (v && !hit) {
    opts.unshift({ value: v, label: `${v} (not a GST state)` })
  } else if (v && hit && !names.includes(v)) {
    opts.unshift({ value: v, label: `${v} (${hit.name})` })
  }
  return [{ value: '', label: 'Select state…' }, ...opts]
}

// ── Profile page: editing (form values, validation, save) ────────────────────

export const VENDOR_PAYMENT_METHODS = ['EFT', 'NEFT', 'RTGS', 'UPI', 'Cheque', 'Cash'] as const

/** Values the Overview and Address & payment tabs edit. Everything is a string so inputs can hold partial text. */
export interface VendorForm {
  name: string
  category: string
  addr1: string
  addr2: string
  city: string
  state: string
  zip: string
  country: string
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
    addr1: v.addr1,
    addr2: v.addr2,
    city: v.city,
    state: v.state,
    zip: v.zip,
    country: v.country,
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
export function normalizeVendorForm<T extends VendorForm>(form: T): T {
  const gstin = vendorGstTypeInfo(form.gstRegType).gstin ? form.gstin.replace(/\s+/g, '').toUpperCase() : form.gstin
  return {
    ...form,
    name: form.name.trim(),
    category: form.category.trim(),
    addr1: form.addr1.trim(),
    addr2: form.addr2.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
    zip: form.zip.trim(),
    country: form.country.trim(),
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
export function validateVendorForm(form: VendorForm, _vendor?: Pick<Vendor, 'country'>): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.name.trim()) errors.name = 'Vendor name is required.'
  const budget = form.budgetedAmount.trim()
  if (budget && !(Number(budget) >= 0)) errors.budgetedAmount = 'Enter an amount of 0 or more.'
  const country = form.country.trim().toLowerCase()
  const india = !country || country === 'india' || country === 'in'
  const zip = form.zip.trim()
  if (zip && india && !/^\d{6}$/.test(zip)) {
    errors.zip = 'A PIN code has 6 digits.'
  }
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
    addr1: form.addr1,
    addr2: form.addr2,
    city: form.city,
    state: form.state,
    zip: form.zip,
    country: form.country,
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
