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

/** Prototype mirror of the audit event `vendor.gst_registration.updated` — feeds the activity list. */
export const gstRegLogEntrySchema = z.object({
  at: isoDateTime,
  from: vendorGstRegTypeSchema,
  to: vendorGstRegTypeSchema,
  gstinFrom: z.string(),
  gstinTo: z.string(),
  openPOs: z.number(),
  by: z.string(),
})
export type GstRegLogEntry = z.infer<typeof gstRegLogEntrySchema>

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
  gstRegLog: z.array(gstRegLogEntrySchema).optional(),
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
  settings: z.record(z.string(), z.boolean()).default({}),
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
  /** Stamped when the site is saved from Settings (ISO date-time); seed rows have none. */
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
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

// ── Sales ▸ Sales Orders & Sales Invoices ────────────────────────────────────
export const SALES_ORDER_STATUSES = ['Open', 'Released', 'Shipped', 'Invoiced'] as const
export const salesOrderStatusSchema = z.enum(SALES_ORDER_STATUSES)
export type SalesOrderStatus = z.infer<typeof salesOrderStatusSchema>

/** Seed order line tuple: `[itemNo, qty]`. */
export const salesOrderLineSchema = z.tuple([z.string(), z.number()])
export type SalesOrderLine = z.infer<typeof salesOrderLineSchema>

export const salesOrderSchema = z.object({
  no: z.string(),
  /** Customer name (seed shape; future backend uses customer id). */
  customer: z.string(),
  orderDate: isoDate,
  shipDate: isoDate,
  location: z.string(),
  status: salesOrderStatusSchema,
  lines: z.array(salesOrderLineSchema),
})
export type SalesOrder = z.infer<typeof salesOrderSchema>

export const SALES_INVOICE_STATUSES = ['Draft', 'Open', 'Overdue', 'Paid'] as const
export const salesInvoiceStatusSchema = z.enum(SALES_INVOICE_STATUSES)
export type SalesInvoiceStatus = z.infer<typeof salesInvoiceStatusSchema>

export const salesInvoiceSchema = z.object({
  no: z.string(),
  /** Customer name (seed shape; future backend uses customer id). */
  customer: z.string(),
  invDate: isoDate,
  dueDate: isoDate,
  amount: z.number(),
  status: salesInvoiceStatusSchema,
})
export type SalesInvoice = z.infer<typeof salesInvoiceSchema>

// ── Sales ▸ Sales Prices (customer-specific price overrides) ─────────────────
export const customerPriceSchema = z.object({
  id: z.string(),
  /** Customer no. */
  customer: z.string(),
  /** Item no. */
  item: z.string(),
  price: z.number(),
  /** Minimum quantity floor; 1 = applies to any quantity. */
  minQty: z.number(),
  /** Active from / to (inclusive, ISO date). Empty = always / open-ended. */
  effFrom: z.string(),
  effTo: z.string(),
  /** Reserved for future per-UoM pricing. */
  uom: z.string(),
  currency: z.string(),
  note: z.string(),
})
export type CustomerPrice = z.infer<typeof customerPriceSchema>

// ── Production ▸ Bills of Materials ──────────────────────────────────────────
export const BOM_STATUSES = ['draft', 'active', 'archived'] as const
export const bomStatusSchema = z.enum(BOM_STATUSES)
export type BomStatus = z.infer<typeof bomStatusSchema>

export const BOM_KINDS = ['assembly', 'production'] as const
export const bomKindSchema = z.enum(BOM_KINDS)
export type BomKind = z.infer<typeof bomKindSchema>

export const bomLineSchema = z.object({
  lineNo: z.number(),
  item: z.string(),
  desc: z.string(),
  qtyPer: z.number(),
  uom: z.string(),
  scrapPct: z.number(),
  note: z.string(),
})
export type BomLine = z.infer<typeof bomLineSchema>

export const bomOperationSchema = z.object({
  seq: z.number(),
  name: z.string(),
  workCentre: z.string().nullable(),
  setupMin: z.number(),
  runMinPerUnit: z.number(),
  notes: z.string(),
})
export type BomOperation = z.infer<typeof bomOperationSchema>

export const bomSchema = z.object({
  no: z.string(),
  parentItem: z.string(),
  parentDesc: z.string(),
  kind: bomKindSchema,
  version: z.string(),
  status: bomStatusSchema,
  effectiveFrom: isoDate.nullable(),
  effectiveTo: isoDate.nullable(),
  outputQty: z.number(),
  uom: z.string(),
  labourCost: z.number(),
  overheadPct: z.number(),
  lines: z.array(bomLineSchema),
  /** Seed text source only; runtime notes live in the global `notes` collection. */
  notes: z.string().optional(),
  operations: z.array(bomOperationSchema),
  yieldPct: z.number(),
  wipLocation: z.string(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  createdBy: z.string(),
})
export type Bom = z.infer<typeof bomSchema>

// ── Production ▸ Assembly Orders ─────────────────────────────────────────────
export const AO_STATUSES = [
  'planned',
  'draft',
  'released',
  'inProgress',
  'finished',
  'cancelled',
] as const
export const aoStatusSchema = z.enum(AO_STATUSES)
export type AoStatus = z.infer<typeof aoStatusSchema>

export const assemblyOrderLineSchema = z.object({
  lineNo: z.number(),
  item: z.string(),
  desc: z.string(),
  uom: z.string(),
  scrapPct: z.number(),
  qtyRequired: z.number(),
  qtyConsumed: z.number(),
  note: z.string(),
})
export type AssemblyOrderLine = z.infer<typeof assemblyOrderLineSchema>

export const assemblyOrderSchema = z.object({
  no: z.string(),
  item: z.string(),
  desc: z.string(),
  uom: z.string(),
  bomId: z.string(),
  bomVersion: z.string(),
  qty: z.number(),
  qtyFinished: z.number(),
  location: z.string(),
  dueDate: isoDate,
  orderDate: isoDate,
  status: aoStatusSchema,
  assignee: z.string().nullable(),
  lines: z.array(assemblyOrderLineSchema),
  sourceSalesLine: z.string().nullable(),
  /** Seed text source only; runtime notes live in the global `notes` collection. */
  notes: z.string().optional(),
  createdAt: isoDateTime,
})
export type AssemblyOrder = z.infer<typeof assemblyOrderSchema>

// ── Settings ▸ Configuration ▸ Units of measure ──────────────────────────────
/** A unit the business added. The locked default units live in `domain/units-of-measure`. */
export const uomSchema = z.object({
  code: z.string(),
  name: z.string(),
  cat: z.enum(['count', 'weight', 'volume', 'liquid', 'length', 'area']),
  /** GST Unique Quantity Code. */
  uqc: z.string(),
  /** `1 PNL = 12 NOS`, or `—` for a standalone unit. */
  conv: z.string(),
  sym: z.string(),
  custom: z.literal(true),
})
export type CustomUom = z.infer<typeof uomSchema>

// ── Per-user: saved grid views and sidebar favourites ────────────────────────
// Both belong to one user (`userId`); the backend scopes them to the session.
export const savedViewSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  /** Sidebar module / page slug the view belongs to ('' when the page is not in the sidebar). */
  module: z.string(),
  page: z.string(),
  /** `module/page`, or the URL path for pages outside the sidebar. Names are unique per page. */
  pageKey: z.string(),
  /** Where the view opens. */
  path: z.string(),
  /** Page name for the favourite's second line. */
  pageLabel: z.string(),
  scope: z.literal('private'),
  filters: z.array(
    z.object({
      key: z.string(),
      op: z.string(),
      value: z.union([z.string(), z.array(z.string())]).optional(),
      value2: z.string().optional(),
    }),
  ),
  sorts: z.array(z.object({ key: z.string(), dir: z.enum(['asc', 'desc']) })),
  columns: z.array(
    z.object({
      key: z.string(),
      width: z.number(),
      visible: z.boolean(),
      frozen: z.enum(['left', 'right']).nullable(),
    }),
  ),
  density: z.enum(['default', 'compact']),
  groupBy: z.string().nullable(),
  collapsed: z.array(z.string()),
  /** Footer aggregate chosen per column key. Columns not listed use their default. */
  aggregates: z.record(z.string(), z.string()).optional(),
  /** At most one per user and page. Applied when the page opens. */
  isDefaultFor: z.boolean(),
  /** Born from pinning an unsaved state (the user has not named it yet). */
  autoCreated: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
})
export type SavedView = z.infer<typeof savedViewSchema>

/** A sidebar favourite: a live pointer to a page, or to a saved view. */
export const favoriteSchema = z.object({
  id: z.string(),
  userId: z.string(),
  kind: z.enum(['page', 'view']),
  /** `kind: 'page'` — module id and page slug. */
  module: z.string().optional(),
  page: z.string().optional(),
  /** `kind: 'view'` — the saved view it points to. */
  viewId: z.string().optional(),
  /** User-controlled sequence, 0…n-1. */
  order: z.number(),
  createdAt: z.number(),
})
export type Favorite = z.infer<typeof favoriteSchema>
// ── Warehouse ▸ Units of Measure (per-item unit sets) ────────────────────────
/** Per-item unit set: attached unit codes, base unit, auto-derived master pack, and manual conversions. */
export const itemUnitSetSchema = z.object({
  itemNo: z.string(),
  list: z.array(z.string()),
  base: z.string(),
  pack: z.string(),
  qty: z.record(z.string(), z.number()),
})
export type ItemUnitSet = z.infer<typeof itemUnitSetSchema>

// ── Settings ▸ Number sequences (shared list across modules) ─────────────────
export const NUMBER_SEQUENCE_DOC_TYPES = [
  'purchase-order',
  'purchase-receipt',
  'sales-order',
  'sales-invoice',
  'item',
  'bom',
  'assembly-order',
  'employee',
] as const
export const numberSequenceDocTypeSchema = z.enum(NUMBER_SEQUENCE_DOC_TYPES)
export type NumberSequenceDocType = z.infer<typeof numberSequenceDocTypeSchema>

export const NUMBER_SEQUENCE_RESETS = ['never', 'yearly-apr', 'yearly-jan'] as const
export const numberSequenceResetSchema = z.enum(NUMBER_SEQUENCE_RESETS)
export type NumberSequenceReset = z.infer<typeof numberSequenceResetSchema>

export const numberSequenceScopeSchema = z.object({
  warehouseId: z.string().optional(),
  gstin: z.string().optional(),
})
export type NumberSequenceScope = z.infer<typeof numberSequenceScopeSchema>

export const numberSequenceSchema = z.object({
  id: z.string(),
  docType: numberSequenceDocTypeSchema,
  module: z.string(),
  name: z.string(),
  prefix: z.string(),
  digits: z.number().int().min(1).max(10),
  suffix: z.string().optional(),
  next: z.number().int().min(1),
  resets: numberSequenceResetSchema,
  isDefault: z.boolean(),
  active: z.boolean(),
  issued: z.number().int().min(0),
  scope: numberSequenceScopeSchema.optional(),
})
export type NumberSequence = z.infer<typeof numberSequenceSchema>

// ── Settings ▸ Purchasing (run 2.1): carrier types, statuses, custom fields, payment terms ──
export const CARRIER_BEHAVIOR_IDS = ['courier', 'gta', 'own'] as const
export const carrierTypeSchema = z.object({
  /** 2–12 chars A–Z 0–9 -, immutable (carriers reference it). */
  code: z.string(),
  name: z.string(),
  behavior: z.enum(CARRIER_BEHAVIOR_IDS),
  /** Label of the tracking reference ("AWB", "LR no."); blank shows "Tracking no.". */
  refLabel: z.string(),
  desc: z.string(),
  active: z.boolean(),
  system: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})
export type CarrierTypeRecord = z.infer<typeof carrierTypeSchema>

export const STATUS_FLOWS = [
  'purchase-order',
  'purchase-receipt',
  'sales-order',
  'sales-invoice',
  'bom',
  'assembly-order',
] as const
export const STATUS_CATEGORIES = ['open', 'closed'] as const
export const STATUS_TONES = ['neutral', 'info', 'warn', 'ok', 'bad'] as const
export const statusDefSchema = z.object({
  id: z.string(),
  flow: z.enum(STATUS_FLOWS),
  /** The one module that owns the flow (decided from the flow, never chosen). */
  module: z.string(),
  name: z.string(),
  category: z.enum(STATUS_CATEGORIES),
  tone: z.enum(STATUS_TONES),
  order: z.number().int().min(1),
  /** System statuses are used by the app's own rules and are locked. */
  system: z.boolean(),
})
export type StatusDef = z.infer<typeof statusDefSchema>

export const CUSTOM_FIELD_ENTITIES = [
  'item',
  'vendor',
  'purchase-order',
  'customer',
  'sales-order',
  'bom',
  'assembly-order',
  'employee',
] as const
export const CUSTOM_FIELD_TYPES = ['text', 'number', 'date', 'list', 'yesno'] as const
export const customFieldSchema = z.object({
  id: z.string(),
  entity: z.enum(CUSTOM_FIELD_ENTITIES),
  /** The one module that owns the entity (decided from the entity, never chosen). */
  module: z.string(),
  label: z.string(),
  type: z.enum(CUSTOM_FIELD_TYPES),
  /** Choices of a `list` field, in display order; empty for other types. */
  options: z.array(z.string()),
  required: z.boolean(),
  active: z.boolean(),
})
export type CustomField = z.infer<typeof customFieldSchema>

export const paymentTermSchema = z.object({
  /** Short code, immutable once a vendor or customer uses it. */
  code: z.string(),
  name: z.string(),
  /** Days until due; null for "end of month" style terms. */
  days: z.number().int().min(0).nullable(),
  /** Modules that offer this term (a term can serve Purchasing and Sales). */
  modules: z.array(z.string()).min(1),
  active: z.boolean(),
})
export type PaymentTerm = z.infer<typeof paymentTermSchema>

// ── Settings ▸ Item categories (Phase 2 run 2.2) ─────────────────────────────
/**
 * A node of the item-category tree. Items store the category *name* (their most
 * specific category) in `item.category`; the full path is derived from `parent`.
 * `parent` is the parent node's id, or '' for a top-level category.
 */
export const itemCategorySchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  parent: z.string(),
  color: z.string(),
  desc: z.string(),
  active: z.boolean(),
})
export type ItemCategory = z.infer<typeof itemCategorySchema>

// ── Settings ▸ Tax codes (Phase 2 run 2.3) ───────────────────────────────────
export const TAX_CODE_APPLIES = ['Goods', 'Services', 'Both'] as const
/** One dated rate: the rate in force from `from` until the next row. */
export const taxRateRowSchema = z.object({
  /** Percent, 0–100, up to two decimals. */
  rate: z.number().min(0).max(100),
  from: isoDate,
})
export type TaxRateRow = z.infer<typeof taxRateRowSchema>
/**
 * A national GST rate code. `kind: 'goods'` (GOODS only) has no rates — the line takes the rate
 * of the goods on the same document. Rates are the same in every state; the document engine
 * decides CGST + SGST vs IGST.
 */
export const taxCodeSchema = z.object({
  /** 2–12 characters, A–Z 0–9 `-`. Fixed once created. */
  code: z.string(),
  name: z.string(),
  kind: z.enum(['rate', 'goods']),
  appliesTo: z.enum(TAX_CODE_APPLIES),
  /** Dated rates, any order; `taxRateOn` sorts them. */
  rates: z.array(taxRateRowSchema),
  desc: z.string(),
  active: z.boolean(),
  /** Built-in: the code and kind are fixed and it can't be deleted. */
  system: z.boolean(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
})
export type TaxCode = z.infer<typeof taxCodeSchema>

// ── Settings ▸ States & territories (Phase 2 run 2.3) ────────────────────────
/** Reference data: the official GST state codes. Read-only in the app; changes only by migration. */
export const gstStateSchema = z.object({
  code: z.string(),
  name: z.string(),
  abbr: z.string(),
  type: z.enum(['state', 'ut-leg', 'ut', 'other', 'foreign']),
  ut: z.boolean(),
  legacy: z.boolean(),
  note: z.string(),
})

// ── Settings ▸ Workspace ▸ GST registrations (Phase 2 run 2.5a) ──────────────
export const GST_SCHEMES = ['Regular', 'Composition'] as const
export const GST_REG_TYPES = ['Normal', 'Casual'] as const
export const GST_FILINGS = ['Monthly', 'Quarterly'] as const
/** One of the business's own GSTINs. The state is the first two digits of the GSTIN (never stored separately). */
export const gstRegistrationSchema = z.object({
  id: z.string(),
  gstin: z.string(),
  legal: z.string(),
  trade: z.string(),
  scheme: z.enum(GST_SCHEMES),
  regType: z.enum(GST_REG_TYPES),
  /** Casual registrations only: the fixed period (ISO dates), '' otherwise. */
  validFrom: z.string(),
  validTo: z.string(),
  registeredOn: z.string(),
  filing: z.enum(GST_FILINGS),
  eInvoice: z.boolean(),
  /** E-way bill threshold in whole rupees. */
  ewayMin: z.number(),
  /** Invoice number prefix; may hold `{FY}`. */
  series: z.string(),
  addr1: z.string(),
  city: z.string(),
  postal: z.string(),
  primary: z.boolean(),
  status: z.enum(['Active', 'Cancelled']),
  cancelledOn: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})
export type GstRegistration = z.infer<typeof gstRegistrationSchema>
// ── Settings ▸ Team & roles (Phase 2 run 2.5b) ───────────────────────────────
/**
 * A role's default module access — what People ▸ Users starts a person with when the role is chosen.
 * `id` is the role name users carry (`User.role`). Built-in roles are seeded from `ROLE_PRESETS`.
 */
export const roleDefSchema = z.object({
  id: z.string(),
  desc: z.string(),
  /** Module key → `none | read | write`. */
  perms: z.record(z.string(), z.string()),
  /** Module key → may manage that module's settings by default. */
  settings: z.record(z.string(), z.boolean()).default({}),
  updatedAt: isoDateTime.optional(),
})
export type RoleDef = z.infer<typeof roleDefSchema>
