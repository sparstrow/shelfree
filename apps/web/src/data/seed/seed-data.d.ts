/**
 * Typings for the demo seed generator (`seed-data.js`, carried over unchanged from
 * the prototype's `lib/shelfree-data.js`).
 *
 * Every function returns `unknown[]` on purpose: seed rows only enter the app
 * through `data/store`, which parses them with the entity's zod schema. That
 * keeps one source of truth for shapes (`data/schemas`) and proves the seed
 * matches it (`data/schemas/seed.test.ts`).
 */
export function seedItems(): unknown[]
export function seedItemCategories(): unknown[]
export function reconcileItemCategories(cats: unknown[], items: unknown[]): unknown[]
export function seedOrders(): unknown[]
export function seedInvoices(): unknown[]
export function seedPurchaseOrders(): unknown[]
export function seedPurchaseReceipts(): unknown[]
export function seedAccounts(): unknown[]
export function seedCharges(): unknown[]
export function seedCarriers(): unknown[]
export function seedWarehouses(): unknown[]
export function seedProducts(): unknown[]
export function seedContacts(): unknown[]
export function seedVendors(): unknown[]
export function seedCustomers(): unknown[]
export function seedCustomerPrices(): unknown[]
export function seedBOMs(): unknown[]
export function seedAssemblyOrders(): unknown[]
export function seedEmployees(): unknown[]
export function seedUsers(): unknown[]
export function seedNotes(): unknown[]
