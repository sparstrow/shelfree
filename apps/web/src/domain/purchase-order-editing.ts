/**
 * Rules for editing a purchase order: pricing lines from the vendor's price
 * list, line problems that block saving, tax stamping, and what each status
 * allows. Pure functions; the backend must enforce the same rules (it
 * re-prices and re-validates on every save — never trusts the client).
 */
import type { Settings } from '@/data/api/settings'
import type {
  Item,
  PurchaseOrder,
  PurchaseOrderLine,
  PurchasePrice,
  Vendor,
  Warehouse,
} from '@/data/schemas'
import { int } from '@/lib/format'
import {
  type TaxCalcMethod,
  gstStateByCode,
  taxCalcText,
  vendorGstType,
  vendorGstTypeInfo,
  vendorTaxCalc,
  vendorTaxState,
} from './gst'
import { poEditable, poLockLabel, poLockState } from './purchase-order'
import { resolvePrice } from './purchase-prices'

export interface PricingContext {
  prices: readonly PurchasePrice[]
  settings: Settings
}

/** A blank draft for a new order. */
export function newPurchaseOrder(no: string, today: string): PurchaseOrder {
  return {
    no,
    vendor: '',
    orderDate: today,
    expectedDate: '',
    location: 'TVM-MAIN',
    status: 'Draft',
    buyer: null,
    notes: '',
    lines: [],
  }
}

/** Set a line's unit cost from the price list (when cost is locked to it). */
export function priceLine(line: PurchaseOrderLine, po: PurchaseOrder, ctx: PricingContext): PurchaseOrderLine {
  if (!ctx.settings.purchasing.lockCostToPriceList) return line
  const r = resolvePrice(ctx.prices, po.vendor, line.item, line.qty, po.orderDate)
  return r.status === 'ok' ? { ...line, unitCost: r.price } : line
}

/** Re-price every line of a draft. Non-drafts keep their saved costs. */
export function repriceOrder(po: PurchaseOrder, ctx: PricingContext): PurchaseOrder {
  if (po.status !== 'Draft') return po
  return { ...po, lines: po.lines.map((l) => priceLine(l, po, ctx)) }
}

/** A new line for an item: starts at the vendor's minimum quantity, at that tier's price. */
export function newOrderLine(item: Item, po: PurchaseOrder, ctx: PricingContext): PurchaseOrderLine {
  const r = resolvePrice(ctx.prices, po.vendor, item.no, 1e12, po.orderDate)
  const line: PurchaseOrderLine = {
    item: item.no,
    desc: item.desc,
    qty: r.status === 'noPrice' ? 1 : r.min,
    uom: item.uom || 'NOS',
    unitCost: r.status === 'noPrice' ? item.cost || 0 : Number(r.tiers[0].price) || 0,
  }
  return priceLine(line, po, ctx)
}

export type LineIssue =
  | { kind: 'noPrice'; text: string }
  | { kind: 'belowMoq'; text: string; min: number }

/** What is wrong with a draft line, if anything. Only drafts with a vendor are checked. */
export function lineIssue(line: PurchaseOrderLine, po: PurchaseOrder, ctx: PricingContext): LineIssue | null {
  if (po.status !== 'Draft' || !po.vendor) return null
  const r = resolvePrice(ctx.prices, po.vendor, line.item, line.qty, po.orderDate)
  if (r.status === 'noPrice') return { kind: 'noPrice', text: 'No active price from this vendor' }
  if (r.status === 'belowMoq' && ctx.settings.purchasing.blockBelowMinQty) {
    return { kind: 'belowMoq', text: 'Below minimum qty (min ' + int(r.min) + ')', min: r.min }
  }
  return null
}

export function lineIssues(po: PurchaseOrder, ctx: PricingContext): { index: number; issue: LineIssue }[] {
  return po.lines
    .map((line, index) => ({ index, issue: lineIssue(line, po, ctx) }))
    .filter((x): x is { index: number; issue: LineIssue } => !!x.issue)
}

/** The message that blocks Save / Issue while any line has a problem, or null. */
export function priceGuardMessage(po: PurchaseOrder, vendorName: string, ctx: PricingContext): string | null {
  const issues = lineIssues(po, ctx)
  if (!issues.length) return null
  const noPrice = issues.filter((x) => x.issue.kind === 'noPrice').length
  const belowMin = issues.length - noPrice
  const parts: string[] = []
  if (noPrice) {
    parts.push(noPrice + (noPrice === 1 ? ' line has' : ' lines have') + ' no active price from ' + vendorName.replace(/\.$/, ''))
  }
  if (belowMin) {
    parts.push(belowMin + (belowMin === 1 ? ' line is' : ' lines are') + ' below the vendor’s minimum qty')
  }
  return parts.join(' and ') + '. Fix or remove ' + (issues.length === 1 ? 'it' : 'them') + ' to save.'
}

/** Stamp (or clear) the tax method and vendor GST snapshot when the vendor changes. */
export function stampTax(po: PurchaseOrder, vendor: Vendor | undefined, settings: Settings): PurchaseOrder {
  if (!vendor) {
    const { taxCalc: _t, roundTotal: _r, taxCalcSrc: _s, vendorGstRegType: _g, vendorGstin: _n, ...rest } = po
    return rest
  }
  const method = vendorTaxCalc(vendor, settings.tax)
  return { ...po, taxCalc: method.taxCalc, roundTotal: method.roundTotal, taxCalcSrc: method.src, ...gstSnapshot(vendor) }
}

export function gstSnapshot(vendor: Vendor) {
  return {
    vendorGstRegType: vendorGstType(vendor),
    vendorGstin: vendor.gstin || '',
    vendorTaxStateCode: vendorTaxState(vendor)?.code ?? '',
  }
}

export interface CompositionInterState {
  vendorState: string
  shipState: string
  location: string
  /** True when Tax settings say to block issuing (not just warn). */
  block: boolean
}

/** A composition vendor can't supply to another state: detect vendor state ≠ ship-to state. */
export function compositionInterState(
  po: PurchaseOrder,
  vendor: Vendor | undefined,
  warehouses: readonly Warehouse[],
  settings: Settings,
): CompositionInterState | null {
  if (!po.vendor || !vendor || vendorGstType(vendor) !== 'composition') return null
  const site = warehouses.find((w) => w.code === po.location)
  const vendorState = vendorTaxState(vendor)
  if (!site || !vendorState || !site.state) return null
  const shipState = gstStateByCode(site.state)
  if (!shipState || shipState.code === vendorState.code) return null
  return {
    vendorState: vendorState.name,
    shipState: shipState.name,
    location: site.code,
    block: settings.tax.compInterState === 'block',
  }
}

/** An order can be issued with a vendor, at least one line, and no blocking GST problem. */
export function canIssue(po: PurchaseOrder, interState: CompositionInterState | null): boolean {
  return !!po.vendor && po.lines.length > 0 && !interState?.block
}

export interface TaxNote {
  text: string
  /** A draft whose stamped method differs from the vendor's current one. */
  stale: boolean
  staleText: string
}

/** The tax line under the totals. No tax amounts are computed on orders yet. */
export function taxNote(po: PurchaseOrder, vendor: Vendor | undefined, settings: Settings): TaxNote {
  if (!vendor) return { text: 'Pick a vendor to set how tax is calculated.', stale: false, staleText: '' }
  const type = vendorGstType(vendor)
  const info = vendorGstTypeInfo(type)
  if (!info.charges) {
    return {
      text:
        type === 'sez' || type === 'overseas'
          ? 'Import — no GST on this order. IGST is paid at customs on the bill of entry.'
          : 'No GST charged — ' + info.short.toLowerCase() + ' vendor, so there’s nothing to calculate and no input tax credit.',
      stale: false,
      staleText: '',
    }
  }
  const current = vendorTaxCalc(vendor, settings.tax)
  const own: TaxCalcMethod = po.taxCalc
    ? { taxCalc: po.taxCalc, roundTotal: !!po.roundTotal, src: po.taxCalcSrc ?? 'workspace' }
    : current
  const stale =
    po.status === 'Draft' &&
    !!po.taxCalc &&
    (own.taxCalc !== current.taxCalc || own.roundTotal !== current.roundTotal || own.src !== current.src)
  return {
    text: taxCalcText(own),
    stale,
    staleText: stale
      ? (current.src === 'vendor' ? 'This vendor' : 'The workspace') +
        ' now uses: ' +
        taxCalcText(current).replace(/^Tax /, 'tax ') +
        '. This draft still uses the method it was created with.'
      : '',
  }
}

/** Why the document can't be edited, for the banner; '' when it is editable. */
export function lockedBannerText(po: PurchaseOrder): string {
  if (poEditable(po)) return ''
  if (po.status === 'Issued') return 'Issued and locked — reopen it to edit the vendor, dates, or lines.'
  if (po.status === 'Partially received' || po.status === 'Received') {
    return 'Receiving has started against this order — it’s locked from edits.'
  }
  if (po.status === 'Closed') return 'This order is closed and locked from edits.'
  if (po.status === 'Cancelled') return 'This order is cancelled and locked from edits.'
  return ''
}

/** The explanation shown when a line action is attempted on a locked order. */
export function lockedActionMessage(po: PurchaseOrder): string {
  return (
    po.no +
    ' is ' +
    poLockLabel(po).toLowerCase() +
    (poLockState(po) === 'locked' ? ' — reopen it to edit lines.' : ' — it can’t be edited.')
  )
}

