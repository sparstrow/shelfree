/**
 * THE DATA SEAM.
 *
 * Every read and write the UI performs goes through `api.<entity>.<method>()`.
 * Today each entity is a localStorage-backed collection seeded with demo data;
 * when a backend exists, these become HTTP calls with the same signatures and
 * nothing above this file changes. Each method here is one future endpoint.
 */
import {
  accountSchema,
  assemblyOrderSchema,
  bomSchema,
  carrierSchema,
  chargeSchema,
  contactSchema,
  customerPriceSchema,
  customerSchema,
  employeeSchema,
  itemSchema,
  noteSchema,
  purchaseOrderSchema,
  purchasePriceSchema,
  purchaseReceiptSchema,
  salesInvoiceSchema,
  salesOrderSchema,
  userSchema,
  vendorSchema,
  warehouseSchema,
} from '@/data/schemas'
import { seedPurchasePrices } from '@/data/seed/purchase-prices'
import * as seed from '@/data/seed/seed-data.js'
import { createCollection } from '@/data/store/collection'

export const api = {
  items: createCollection({
    key: 'items',
    schema: itemSchema,
    seed: seed.seedItems,
    idOf: (r) => r.no,
  }),
  vendors: createCollection({
    key: 'vendors',
    schema: vendorSchema,
    seed: seed.seedVendors,
    idOf: (r) => r.no,
  }),
  customers: createCollection({
    key: 'customers',
    schema: customerSchema,
    seed: seed.seedCustomers,
    idOf: (r) => r.no,
  }),
  customerPrices: createCollection({
    key: 'customerPrices',
    schema: customerPriceSchema,
    seed: seed.seedCustomerPrices,
    idOf: (r) => r.id,
  }),
  salesOrders: createCollection({
    key: 'salesOrders',
    schema: salesOrderSchema,
    seed: seed.seedOrders,
    idOf: (r) => r.no,
  }),
  salesInvoices: createCollection({
    key: 'salesInvoices',
    schema: salesInvoiceSchema,
    seed: seed.seedInvoices,
    idOf: (r) => r.no,
  }),
  purchaseOrders: createCollection({
    key: 'purchaseOrders',
    schema: purchaseOrderSchema,
    seed: seed.seedPurchaseOrders,
    idOf: (r) => r.no,
  }),
  purchasePrices: createCollection({
    key: 'purchasePrices',
    schema: purchasePriceSchema,
    seed: seedPurchasePrices,
    idOf: (r) => r.no,
  }),
  purchaseReceipts: createCollection({
    key: 'purchaseReceipts',
    schema: purchaseReceiptSchema,
    seed: seed.seedPurchaseReceipts,
    idOf: (r) => r.no,
  }),
  accounts: createCollection({
    key: 'accounts',
    schema: accountSchema,
    seed: seed.seedAccounts,
    idOf: (r) => r.no,
  }),
  charges: createCollection({
    key: 'charges',
    schema: chargeSchema,
    seed: seed.seedCharges,
    idOf: (r) => r.no,
  }),
  carriers: createCollection({
    key: 'carriers',
    schema: carrierSchema,
    seed: seed.seedCarriers,
    idOf: (r) => r.no,
  }),
  contacts: createCollection({
    key: 'contacts',
    schema: contactSchema,
    seed: seed.seedContacts,
    idOf: (r) => r.no,
  }),
  employees: createCollection({
    key: 'employees',
    schema: employeeSchema,
    seed: seed.seedEmployees,
    idOf: (r) => r.id,
  }),
  users: createCollection({
    key: 'users',
    schema: userSchema,
    seed: seed.seedUsers,
    idOf: (r) => r.id,
  }),
  warehouses: createCollection({
    key: 'warehouses',
    schema: warehouseSchema,
    seed: seed.seedWarehouses,
    idOf: (r) => r.id,
  }),
  notes: createCollection({
    key: 'notes',
    schema: noteSchema,
    seed: seed.seedNotes,
    idOf: (r) => r.id,
  }),
  boms: createCollection({
    key: 'boms',
    schema: bomSchema,
    seed: seed.seedBOMs,
    idOf: (r) => r.no,
  }),
  assemblyOrders: createCollection({
    key: 'assemblyOrders',
    schema: assemblyOrderSchema,
    seed: seed.seedAssemblyOrders,
    idOf: (r) => r.no,
  }),
} as const

export type Api = typeof api
export type CollectionName = keyof Api
