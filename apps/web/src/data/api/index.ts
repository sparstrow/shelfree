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
  carrierSchema,
  chargeSchema,
  contactSchema,
  customerSchema,
  employeeSchema,
  itemSchema,
  noteSchema,
  purchaseOrderSchema,
  purchaseReceiptSchema,
  userSchema,
  vendorSchema,
  warehouseSchema,
} from '@/data/schemas'
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
  purchaseOrders: createCollection({
    key: 'purchaseOrders',
    schema: purchaseOrderSchema,
    seed: seed.seedPurchaseOrders,
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
} as const

export type Api = typeof api
export type CollectionName = keyof Api
