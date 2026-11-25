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
  carrierTypeSchema,
  chargeSchema,
  contactSchema,
  customerPriceSchema,
  customerSchema,
  customFieldSchema,
  employeeSchema,
  favoriteSchema,
  gstRegistrationSchema,
  gstStateSchema,
  itemCategorySchema,
  itemSchema,
  itemUnitSetSchema,
  noteSchema,
  numberSequenceSchema,
  paymentTermSchema,
  purchaseOrderSchema,
  purchasePriceSchema,
  purchaseReceiptSchema,
  roleDefSchema,
  salesInvoiceSchema,
  salesOrderSchema,
  savedViewSchema,
  statusDefSchema,
  taxCodeSchema,
  uomSchema,
  userSchema,
  vendorSchema,
  warehouseSchema,
} from '@/data/schemas'
import {
  seedCarrierTypes,
  seedCustomFields,
  seedPaymentTerms,
  seedStatuses,
} from '@/data/seed/settings-purchasing'
import { seedGstStates, seedTaxCodes } from '@/data/seed/settings-finance'
import { seedGstRegistrations } from '@/data/seed/settings-workspace'
import { seedItemUnits } from '@/data/seed/item-units'
import { seedNumberSequences } from '@/data/seed/number-sequences'
import { seedPurchasePrices } from '@/data/seed/purchase-prices'
import { seedRoleDefs } from '@/data/seed/roles'
import { seedUnitsOfMeasure } from '@/data/seed/units-of-measure'
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
  unitsOfMeasure: createCollection({
    key: 'unitsOfMeasure',
    schema: uomSchema,
    seed: seedUnitsOfMeasure,
    idOf: (r) => r.code,
  }),
  /** Per-user: grid views a user saved. Backend: scoped to the signed-in user. */
  savedViews: createCollection({
    key: 'savedViews',
    schema: savedViewSchema,
    seed: () => [],
    idOf: (r) => r.id,
  }),
  /** Per-user: sidebar favourites (pages and saved views). */
  favorites: createCollection({
    key: 'favorites',
    schema: favoriteSchema,
    seed: () => [],
    idOf: (r) => r.id,
  }),
  itemUnits: createCollection({
    key: 'itemUnits',
    schema: itemUnitSetSchema,
    seed: seedItemUnits,
    idOf: (r) => r.itemNo,
  }),
  /** Shared list across modules (`shelfree.v2.numberSequences`). */
  numberSequences: createCollection({
    key: 'numberSequences',
    schema: numberSequenceSchema,
    seed: seedNumberSequences,
    idOf: (r) => r.id,
  }),
  /** Settings ▸ Purchasing: the user-maintained list behind Carriers ▸ Type. */
  carrierTypes: createCollection({
    key: 'carrierTypes',
    schema: carrierTypeSchema,
    seed: seedCarrierTypes,
    idOf: (r) => r.code,
  }),
  /** Shared list: statuses per document flow (`shelfree.v2.statuses`). */
  statuses: createCollection({
    key: 'statuses',
    schema: statusDefSchema,
    seed: seedStatuses,
    idOf: (r) => r.id,
  }),
  /** Shared list: custom field definitions (`shelfree.v2.customFields`). */
  customFields: createCollection({
    key: 'customFields',
    schema: customFieldSchema,
    seed: seedCustomFields,
    idOf: (r) => r.id,
  }),
  /** Shared list: payment terms (`shelfree.v2.paymentTerms`). */
  paymentTerms: createCollection({
    key: 'paymentTerms',
    schema: paymentTermSchema,
    seed: seedPaymentTerms,
    idOf: (r) => r.code,
  }),
  /** Settings ▸ Item categories: the category tree (`shelfree.v2.itemCategories`). */
  itemCategories: createCollection({
    key: 'itemCategories',
    schema: itemCategorySchema,
    seed: seed.seedItemCategories,
    idOf: (r) => r.id,
  }),
  /** Settings ▸ Finance: GST tax codes with dated rates (`shelfree.v2.taxCodes`). */
  taxCodes: createCollection({
    key: 'taxCodes',
    schema: taxCodeSchema,
    seed: seedTaxCodes,
    idOf: (r) => r.code,
  }),
  /** Settings ▸ Workspace: the official GST state codes — reference data, never edited in the app. */
  gstStates: createCollection({
    key: 'gstStates',
    schema: gstStateSchema,
    seed: seedGstStates,
    idOf: (r) => r.code,
  }),
  /** Settings ▸ Workspace: the business's own GSTINs, one per state (`shelfree.v2.gstRegistrations`). */
  gstRegistrations: createCollection({
    key: 'gstRegistrations',
    schema: gstRegistrationSchema,
    seed: seedGstRegistrations,
    idOf: (r) => r.id,
  }),
  /** Settings ▸ Team & roles: each role's default module access (`shelfree.v2.roleDefs`). */
  roleDefs: createCollection({
    key: 'roleDefs',
    schema: roleDefSchema,
    seed: seedRoleDefs,
    idOf: (r) => r.id,
  }),
} as const

export type Api = typeof api
export type CollectionName = keyof Api
