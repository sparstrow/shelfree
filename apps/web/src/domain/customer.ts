/**
 * Customer domain helpers. Pure functions — no React, no storage.
 * See docs/customer-page/README.md.
 */
import type {
  Customer,
  CustomerPrice,
  CustomerShipTo,
  CustomerStatus,
  Item,
  SalesInvoice,
  SalesOrder,
} from '@/data/schemas'
import { type SalesPricingSettings, resolveCustomerPrice } from './sales-prices'
import { type Tone, statusTone } from './status'
import { gstinFormatError } from './vendor'

/** Status badge label for a customer (`Active` | `On hold` | `Prospect`). */
export function customerStatus(
  c: Partial<Pick<Customer, 'status' | 'creditHold'>> | null | undefined,
): CustomerStatus {
  if (c?.status) return c.status
  return c?.creditHold ? 'On hold' : 'Active'
}

/** `City, State`, or whichever part is present, or `''`. */
export function customerLocation(c: Partial<Pick<Customer, 'city' | 'state'>> | null | undefined): string {
  const city = c?.city ?? ''
  const state = c?.state ?? ''
  if (city && state) return `${city}, ${state}`
  return city || state
}

/** A customer with open orders or a non-zero balance cannot be deleted. */
export function customerDeleteBlockedReason(
  c: Partial<Pick<Customer, 'openOrders' | 'balance'>> | null | undefined,
): string | null {
  if (!c) return null
  if ((c.openOrders || 0) > 0 || (c.balance || 0) !== 0) {
    return 'This customer has open orders or a balance — put it on hold instead'
  }
  return null
}

// ── Profile page: KPIs & activity ────────────────────────────────────────────

export interface CustomerKpis {
  balance: number
  creditLimit: number
  creditHold: boolean
  overdue: number
  openOrders: number
  headroom: number
}

/** Derived commercial KPIs for one customer. */
export function customerKpis(
  c: Partial<Pick<Customer, 'balance' | 'creditLimit' | 'creditHold' | 'overdue' | 'openOrders'>> | null | undefined,
): CustomerKpis {
  const balance = c?.balance || 0
  const creditLimit = c?.creditLimit || 0
  return {
    balance,
    creditLimit,
    creditHold: !!c?.creditHold,
    overdue: c?.overdue || 0,
    openOrders: c?.openOrders || 0,
    headroom: Math.max(0, creditLimit - balance),
  }
}

export interface CustomerActivityEntry {
  /** ISO date; '' when unknown. */
  date: string
  text: string
  meta: string
}

/** Newest-first activity feed derived from the customer's record and orders. */
export function customerActivity(
  customer: Pick<Customer, 'name' | 'createdAt' | 'lastOrder' | 'creditHold'>,
  orders: readonly Pick<SalesOrder, 'no' | 'customer' | 'orderDate'>[],
): CustomerActivityEntry[] {
  const entries: CustomerActivityEntry[] = [
    { date: customer.createdAt ?? '', text: 'Account opened', meta: 'Customer since' },
  ]
  if (customer.lastOrder) {
    const latest = [...orders]
      .filter((o) => o.customer === customer.name)
      .sort((a, b) => b.orderDate.localeCompare(a.orderDate))[0]
    entries.push({ date: customer.lastOrder, text: 'Last order placed', meta: latest?.no ?? '' })
  }
  if (customer.creditHold) {
    entries.push({
      date: customer.lastOrder || customer.createdAt || '',
      text: 'Put on credit hold',
      meta: 'Credit & risk',
    })
  }
  return entries.sort((a, b) => b.date.localeCompare(a.date))
}

// ── Profile page: documents & aging ──────────────────────────────────────────

export interface CustomerDocumentRow {
  kind: 'Order' | 'Invoice'
  no: string
  /** ISO date (YYYY-MM-DD) for chronological sorting. */
  date: string
  lineCount?: number
  dueDate?: string
  status: string
  amount: number
}

export interface CustomerOrderPricing {
  customer: Pick<Customer, 'no' | 'pricingEligible' | 'createdAt'>
  prices: readonly CustomerPrice[]
  settings?: SalesPricingSettings
  /** Date on which prices are resolved; defaults to `order.orderDate || ''`. */
  date?: string
}

/**
 * Total for a sales order: resolves agreed customer prices (and quantity tiers)
 * via `resolveCustomerPrice` when pricing context is provided, falling back to
 * each item's list price.
 */
export function customerOrderTotal(
  order: Pick<SalesOrder, 'lines'> & { orderDate?: string },
  items: readonly (Pick<Item, 'no' | 'price'> & { uom?: string })[],
  pricing?: CustomerOrderPricing,
): number {
  const itemByNo = new Map(items.map((i) => [i.no, i]))
  return (order.lines || []).reduce((sum, [itemNo, qty]) => {
    const item = itemByNo.get(itemNo)
    if (!item) return sum
    let unit = Number(item.price) || 0
    if (pricing) {
      const resolved = resolveCustomerPrice({
        customer: pricing.customer,
        item: { no: item.no, price: item.price, uom: item.uom ?? '' },
        prices: pricing.prices,
        qty,
        date: pricing.date ?? order.orderDate ?? '',
        settings: pricing.settings,
      })
      if (resolved.price != null) unit = resolved.price
    }
    return sum + unit * (qty || 0)
  }, 0)
}

/** Combined sales orders and invoices for one customer (matched by name in seed), newest first. */
export function customerDocuments(
  customer: Pick<Customer, 'name'> & Partial<Pick<Customer, 'no' | 'pricingEligible' | 'createdAt'>>,
  orders: readonly SalesOrder[],
  invoices: readonly SalesInvoice[],
  items: readonly (Pick<Item, 'no' | 'price'> & { uom?: string })[],
  customerPrices?: readonly CustomerPrice[],
  pricingSettings?: SalesPricingSettings,
): CustomerDocumentRow[] {
  const pricing: CustomerOrderPricing | undefined =
    customerPrices && customer.no
      ? {
          customer: {
            no: customer.no,
            pricingEligible: customer.pricingEligible,
            createdAt: customer.createdAt,
          },
          prices: customerPrices,
          settings: pricingSettings,
        }
      : undefined
  const orderRows: CustomerDocumentRow[] = orders
    .filter((o) => o.customer === customer.name)
    .map((o) => ({
      kind: 'Order',
      no: o.no,
      date: o.orderDate,
      lineCount: (o.lines || []).length,
      status: o.status,
      amount: customerOrderTotal(o, items, pricing),
    }))
  const invoiceRows: CustomerDocumentRow[] = invoices
    .filter((v) => v.customer === customer.name)
    .map((v) => ({
      kind: 'Invoice',
      no: v.no,
      date: v.invDate,
      dueDate: v.dueDate,
      status: v.status,
      amount: v.amount || 0,
    }))
  return [...orderRows, ...invoiceRows].sort((a, b) => b.date.localeCompare(a.date) || b.no.localeCompare(a.no))
}

const DOC_TONES: Record<string, Tone> = {
  Shipped: 'ok',
  Invoiced: 'ok',
  Paid: 'ok',
}

/** Status tone for sales orders and sales invoices. */
export function customerDocStatusTone(status: string): Tone {
  return DOC_TONES[status] ?? statusTone(status)
}

export const AGING_BUCKET_LABELS = ['Current', '1–30 days', '31–60 days', '61–90 days', '90+ days'] as const

export interface CustomerAgingBucket {
  label: (typeof AGING_BUCKET_LABELS)[number]
  amount: number
  /** Percentage of the largest bucket (0–100), for bar widths. */
  pct: number
  isOverdue: boolean
}

export interface CustomerAgingSummary {
  buckets: CustomerAgingBucket[]
  openTotal: number
  invoiceCount: number
}

const utcDayMs = (iso: string): number => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim())
  if (!match) return Number.NaN
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

/** Aging buckets derived from a customer's unpaid invoices relative to `today` (`YYYY-MM-DD`). */
export function customerAging(
  customer: Pick<Customer, 'name'>,
  invoices: readonly SalesInvoice[],
  today: string,
): CustomerAgingSummary {
  const mine = invoices.filter((v) => v.customer === customer.name)
  const unpaid = mine.filter((v) => v.status !== 'Paid')
  const totals = [0, 0, 0, 0, 0]
  const todayMs = utcDayMs(today)

  for (const inv of unpaid) {
    const dueMs = utcDayMs(inv.dueDate)
    const days = Number.isFinite(todayMs) && Number.isFinite(dueMs) ? Math.floor((todayMs - dueMs) / 86_400_000) : 0
    const ix = days <= 0 ? 0 : days <= 30 ? 1 : days <= 60 ? 2 : days <= 90 ? 3 : 4
    totals[ix] += inv.amount || 0
  }

  const max = Math.max(1, ...totals)
  const buckets: CustomerAgingBucket[] = AGING_BUCKET_LABELS.map((label, i) => ({
    label,
    amount: totals[i],
    pct: Math.round((totals[i] / max) * 100),
    isOverdue: i > 0,
  }))

  return {
    buckets,
    openTotal: unpaid.reduce((sum, v) => sum + (v.amount || 0), 0),
    invoiceCount: mine.length,
  }
}

// ── Profile page: editing (form values, validation, save) ────────────────────

/** Editable scalar fields across Overview ▸ Details and Billing & address. */
export interface CustomerForm {
  name: string
  terms: string
  creditLimit: string
  /** Employee id, '' = unassigned. */
  salesRep: string
  city: string
  state: string
  gstin: string
}

/** Form values for a customer. */
export function customerToForm(c: Customer): CustomerForm {
  return {
    name: c.name,
    terms: c.terms,
    creditLimit: c.creditLimit != null ? String(c.creditLimit) : '',
    salesRep: c.salesRep ?? '',
    city: c.city,
    state: c.state,
    gstin: c.gstin ?? '',
  }
}

/** Tidy typed values before they are validated or saved. */
export function normalizeCustomerForm<T extends CustomerForm>(form: T): T {
  return {
    ...form,
    name: form.name.trim(),
    terms: form.terms.trim(),
    creditLimit: form.creditLimit.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
    gstin: form.gstin.replace(/\s+/g, '').toUpperCase(),
  }
}

/** Blocking problems, by field key. Empty = saveable. */
export function validateCustomerForm(form: CustomerForm): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.name.trim()) errors.name = 'Customer name is required.'
  const limit = form.creditLimit.trim()
  if (limit && !(Number.isFinite(Number(limit)) && Number(limit) >= 0)) {
    errors.creditLimit = 'Enter an amount of 0 or more.'
  }
  const gstin = form.gstin.replace(/\s+/g, '').toUpperCase()
  if (gstin) {
    const gstinError = gstinFormatError(gstin)
    if (gstinError) errors.gstin = gstinError
  }
  return errors
}

/** The customer record after saving a (normalised) form. */
export function applyCustomerForm(customer: Customer, form: CustomerForm): Customer {
  const parsed = parseFloat(form.creditLimit)
  return {
    ...customer,
    name: form.name,
    terms: form.terms,
    creditLimit: Number.isFinite(parsed) ? Math.max(0, parsed) : 0,
    salesRep: form.salesRep,
    city: form.city,
    state: form.state,
    gstin: form.gstin,
  }
}

// ── Profile page: ship-to addresses & credit hold ────────────────────────────

export interface CustomerShipToDraft {
  id: string
  label: string
  address: string
}

/** Blocking problems for a ship-to address draft. */
export function validateCustomerShipTo(draft: CustomerShipToDraft): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!draft.label.trim()) errors.label = 'Label is required.'
  return errors
}

/** Add or update a ship-to address. The first address becomes default automatically. */
export function upsertCustomerShipTo(
  shipTo: readonly CustomerShipTo[],
  draft: CustomerShipToDraft,
  newId: string,
): CustomerShipTo[] {
  const label = draft.label.trim()
  const address = draft.address.trim()
  if (draft.id) {
    return shipTo.map((s) => (s.id === draft.id ? { ...s, label, address } : s))
  }
  return [...shipTo, { id: newId, label, address, isDefault: shipTo.length === 0 }]
}

/** Remove a ship-to address; if the default was removed, promote the first remaining one. */
export function deleteCustomerShipTo(shipTo: readonly CustomerShipTo[], id: string): CustomerShipTo[] {
  const next = shipTo.filter((s) => s.id !== id)
  if (next.length && !next.some((s) => s.isDefault)) {
    next[0] = { ...next[0], isDefault: true }
  }
  return next
}

/** Mark one ship-to address as the exclusive default. */
export function setDefaultCustomerShipTo(shipTo: readonly CustomerShipTo[], id: string): CustomerShipTo[] {
  return shipTo.map((s) => ({ ...s, isDefault: s.id === id }))
}

/** Flip a customer's credit-hold flag. */
export function toggleCustomerCreditHold(customer: Customer): Customer {
  return { ...customer, creditHold: !customer.creditHold }
}
