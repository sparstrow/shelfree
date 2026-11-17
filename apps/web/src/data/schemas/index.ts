/**
 * Entity shapes. One zod schema per record type; TypeScript types are inferred
 * from them. These are the frontend's proposal for the future API contract —
 * see docs/<page>/README.md for the field-level meaning of each.
 */
import { z } from 'zod'

const isoDate = z.string() // YYYY-MM-DD
const isoDateTime = z.string() // ISO 8601

// ── Warehouse ▸ Items ────────────────────────────────────────────────────────
export const itemSchema = z.object({
  no: z.string(),
  desc: z.string(),
  category: z.string(),
  type: z.string(),
  uom: z.string(),
  /** Preferred vendor, by display name (legacy — purchase prices are the real link). */
  vendor: z.string(),
  cost: z.number(),
  price: z.number(),
  /** Lead time in days. */
  lead: z.number(),
  /** Reorder point / reorder quantity / safety stock. */
  rp: z.number(),
  rq: z.number(),
  ss: z.number(),
  costing: z.string(),
  /** On-hand quantity per warehouse id. */
  locs: z.record(z.string(), z.number()),
  qtySO: z.number(),
  qtySupply: z.number(),
  attrs: z.record(z.string(), z.string()),
  blocked: z.boolean(),
  sellable: z.boolean(),
  tracksLot: z.boolean(),
  tracksExpiry: z.boolean(),
  tracksSerial: z.boolean(),
  barcode: z.string(),
})
export type Item = z.infer<typeof itemSchema>

// ── People ▸ Contacts (one person, many links) ───────────────────────────────
export const contactSchema = z.object({
  no: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string(),
  desc: z.string(),
  active: z.boolean(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
})
export type Contact = z.infer<typeof contactSchema>

/** A link from an owning record to a contact. Role and primary belong to the link. */
export const contactLinkSchema = z.object({
  id: z.string(),
  contactId: z.string(),
  role: z.string(),
  isPrimary: z.boolean(),
})
export type ContactLink = z.infer<typeof contactLinkSchema>

// ── Purchasing ▸ Vendors ─────────────────────────────────────────────────────
export const VENDOR_GST_REG_TYPES = ['regular', 'composition', 'unregistered', 'sez', 'overseas'] as const
export const vendorGstRegTypeSchema = z.enum(VENDOR_GST_REG_TYPES)
export type VendorGstRegType = z.infer<typeof vendorGstRegTypeSchema>

/** How tax is calculated on a document: per line, or per tax-rate total. */
export const taxCalcSchema = z.enum(['line', 'rate'])
export type TaxCalc = z.infer<typeof taxCalcSchema>

export const vendorSchema = z.object({
  no: z.string(),
  name: z.string(),
  name2: z.string(),
  category: z.string(),
  /** Read mirror of the primary contact link — never an independent source. */
  contact: z.string(),
  email: z.string(),
  phone: z.string(),
  addr1: z.string(),
  addr2: z.string(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
  country: z.string(),
  respCenter: z.string(),
  locationCode: z.string(),
  blocked: z.string(),
  paymentMethod: z.string(),
  paymentTerms: z.string(),
  currency: z.string(),
  balance: z.number(),
  balanceDue: z.number(),
  budgetedAmount: z.number(),
  overdue: z.number(),
  outstandingOrders: z.number(),
  vendorSince: isoDate,
  hist: z.object({
    quotes: z.number(),
    orders: z.number(),
    invoices: z.number(),
    returnOrders: z.number(),
    creditMemos: z.number(),
    pstdReceipts: z.number(),
    pstdInvoices: z.number(),
  }),
  subInfo: z.object({
    sub: z.boolean(),
    ops: z.array(z.string()).optional(),
    wc: z.string().optional(),
    cost: z.number().optional(),
    lead: z.number().optional(),
    cert: z.string().optional(),
  }),
  /** Employee id of the purchaser responsible for this vendor. */
  purchasePerson: z.string(),
  supplies: z.enum(['goods', 'services', 'both']),
  gstRegType: vendorGstRegTypeSchema,
  gstin: z.string(),
  /** Vendor-specific tax rules; when false/absent the workspace tax settings apply. */
  taxCalcOverride: z.boolean().optional(),
  taxCalc: taxCalcSchema.optional(),
  roundTotal: z.boolean().optional(),
  contacts: z.array(contactLinkSchema),
})
export type Vendor = z.infer<typeof vendorSchema>

// ── Purchasing ▸ Purchase Orders ─────────────────────────────────────────────
export const PO_STATUSES = [
  'Draft',
  'Issued',
  'Partially received',
  'Received',
  'Closed',
  'Cancelled',
] as const
export const poStatusSchema = z.enum(PO_STATUSES)
export type PoStatus = z.infer<typeof poStatusSchema>

export const purchaseOrderLineSchema = z.object({
  item: z.string(),
  desc: z.string(),
  qty: z.number(),
  uom: z.string(),
  unitCost: z.number(),
})
export type PurchaseOrderLine = z.infer<typeof purchaseOrderLineSchema>

export const purchaseOrderSchema = z.object({
  no: z.string(),
  /** Vendor no. */
  vendor: z.string(),
  orderDate: isoDate,
  expectedDate: isoDate,
  /** Receiving location code (warehouse.code). */
  location: z.string(),
  status: poStatusSchema,
  /** Employee id, or null when unassigned. */
  buyer: z.string().nullable(),
  notes: z.string(),
  /** Issued orders are locked unless explicitly reopened (`locked === false`). */
  locked: z.boolean().optional(),
  /** True once an issued order has been reopened for editing. */
  reopened: z.boolean().optional(),
  /** Tax calculation method stamped from the vendor / workspace when the vendor is picked. */
  taxCalc: taxCalcSchema.optional(),
  roundTotal: z.boolean().optional(),
  taxCalcSrc: z.enum(['workspace', 'vendor']).optional(),
  /** Snapshot of the vendor's GST registration at the time of the order. */
  vendorGstRegType: vendorGstRegTypeSchema.optional(),
  vendorGstin: z.string().optional(),
  vendorTaxStateCode: z.string().optional(),
  lines: z.array(purchaseOrderLineSchema),
})
export type PurchaseOrder = z.infer<typeof purchaseOrderSchema>

// ── Purchasing ▸ Purchase Prices (vendor price list, with quantity tiers) ────
export const purchasePriceSchema = z.object({
  no: z.string(),
  /** Vendor no. */
  vendor: z.string(),
  /** Item no. */
  item: z.string(),
  vendorItemNo: z.string(),
  /** The price applies from this quantity (1 = base price). */
  minQty: z.number(),
  price: z.number(),
  currency: z.string(),
  leadDays: z.number().nullable(),
  /** Active from / to (inclusive, ISO date). Empty = open-ended. */
  effFrom: z.string(),
  effTo: z.string(),
  note: z.string(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
})
export type PurchasePrice = z.infer<typeof purchasePriceSchema>

// ── Purchasing ▸ Purchase Receipts (goods-in) ────────────────────────────────
export const PR_STATUSES = ['Draft', 'Posted', 'Cancelled'] as const
export const prStatusSchema = z.enum(PR_STATUSES)
export type PrStatus = z.infer<typeof prStatusSchema>

export const purchaseReceiptLineSchema = z.object({
  item: z.string(),
  desc: z.string(),
  uom: z.string(),
  qtyOrdered: z.number(),
  qtyReceived: z.number(),
  qtyRejected: z.number(),
  rejectReason: z.string(),
  unitCost: z.number(),
})
export type PurchaseReceiptLine = z.infer<typeof purchaseReceiptLineSchema>

export const purchaseReceiptSchema = z.object({
  no: z.string(),
  /** Purchase order no. this receipt is against. */
  po: z.string(),
  vendor: z.string(),
  receiptDate: isoDate,
  location: z.string(),
  status: prStatusSchema,
  receivedBy: z.string().nullable(),
  vendorDocNo: z.string(),
  notes: z.string(),
  postedAt: isoDateTime.nullable(),
  lines: z.array(purchaseReceiptLineSchema),
})
export type PurchaseReceipt = z.infer<typeof purchaseReceiptSchema>

// ── Finance ▸ Chart of Accounts ──────────────────────────────────────────────
export const accountSchema = z.object({
  no: z.string(),
  name: z.string(),
  type: z.string(),
  group: z.string(),
  desc: z.string(),
  system: z.boolean(),
  active: z.boolean(),
  directPosting: z.boolean(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
})
export type Account = z.infer<typeof accountSchema>

// ── Purchasing ▸ Charges ─────────────────────────────────────────────────────
export const chargeSchema = z.object({
  no: z.string(),
  name: z.string(),
  direction: z.string(),
  purchaseAcct: z.string(),
  salesAcct: z.string(),
  gst: z.string(),
  sac: z.string(),
  allocate: z.boolean(),
  system: z.boolean(),
  active: z.boolean(),
  desc: z.string(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
})
export type Charge = z.infer<typeof chargeSchema>

// ── Purchasing ▸ Carriers ────────────────────────────────────────────────────
export const carrierSchema = z.object({
  no: z.string(),
  name: z.string(),
  type: z.string(),
  gstin: z.string(),
  /** Reverse-charge default for this carrier. */
  rcm: z.boolean(),
  trackUrl: z.string(),
  service: z.string(),
  desc: z.string(),
  active: z.boolean(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  contactId: z.string(),
})
export type Carrier = z.infer<typeof carrierSchema>

// ── People ▸ Employees / Users ───────────────────────────────────────────────
export const employeeSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  dept: z.string(),
  managerId: z.string().nullable(),
  status: z.string(),
  type: z.string(),
  email: z.string(),
  phone: z.string(),
  location: z.string(),
  joinDate: isoDate,
})
export type Employee = z.infer<typeof employeeSchema>

export const userSchema = z.object({
  id: z.string(),
  empId: z.string().nullable(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  status: z.string(),
  twoFA: z.boolean(),
  lastActive: isoDateTime.nullable(),
  perms: z.record(z.string(), z.string()),
})
export type User = z.infer<typeof userSchema>

// ── Settings ▸ Locations & warehouses ────────────────────────────────────────
export const warehouseSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  type: z.string(),
  addr: z.string(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
  country: z.string(),
  area: z.number(),
  status: z.string(),
  pobStatus: z.string(),
  managerEmpId: z.string(),
  operatorVendorId: z.string(),
})
export type Warehouse = z.infer<typeof warehouseSchema>

// ── Notes (append-only log on every record) ──────────────────────────────────
export const noteSchema = z.object({
  id: z.string(),
  entityType: z.string(),
  entityNo: z.string(),
  text: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  createdAt: isoDateTime,
  status: z.enum(['valid', 'invalid']),
  invalidReason: z.string().nullable(),
  invalidatedBy: z.string().nullable(),
  invalidatedByName: z.string().nullable(),
  invalidatedAt: isoDateTime.nullable(),
})
export type Note = z.infer<typeof noteSchema>

// ── Sales ▸ Customers ────────────────────────────────────────────────────────
export const CUSTOMER_STATUSES = ['Active', 'On hold', 'Prospect'] as const
export const customerStatusSchema = z.enum(CUSTOMER_STATUSES)
export type CustomerStatus = z.infer<typeof customerStatusSchema>

export const customerShipToSchema = z.object({
  id: z.string(),
  label: z.string(),
  address: z.string(),
  isDefault: z.boolean(),
})
export type CustomerShipTo = z.infer<typeof customerShipToSchema>

export const customerSeedNoteSchema = z.object({
  id: z.string(),
  at: isoDate,
  by: z.string(),
  text: z.string(),
})
export type CustomerSeedNote = z.infer<typeof customerSeedNoteSchema>

export const customerSchema = z.object({
  no: z.string(),
  name: z.string(),
  /** Read mirror of the primary contact link — never an independent source. */
  contact: z.string(),
  phone: z.string(),
  email: z.string(),
  city: z.string(),
  state: z.string(),
  terms: z.string(),
  balance: z.number(),
  creditLimit: z.number(),
  overdue: z.number(),
  status: customerStatusSchema,
  lastOrder: isoDate,
  /** Employee id of the sales rep responsible for this customer. */
  salesRep: z.string(),
  openOrders: z.number(),
  createdAt: isoDate.optional(),
  pricingEligible: z.boolean().optional(),
  gstin: z.string().optional(),
  creditHold: z.boolean().optional(),
  riskNote: z.string().optional(),
  shipTo: z.array(customerShipToSchema),
  contacts: z.array(contactLinkSchema),
  /** Seed text source only; runtime notes live in the global `notes` collection. */
  notes: z.array(customerSeedNoteSchema).optional(),
})
export type Customer = z.infer<typeof customerSchema>
