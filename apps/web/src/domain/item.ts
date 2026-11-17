/**
 * Item stock, margin, category hierarchy, location breakdown and delete-guard
 * rules. Pure functions only; mirrors the prototype's item helpers.
 * See docs/item-page/README.md.
 */
import type { Item, PurchaseOrder, PurchaseReceipt, Warehouse } from '@/data/schemas'
import { int } from '@/lib/format'

export type ItemStockStatus = 'Out of stock' | 'Low stock' | 'Healthy'

export interface ItemSiteStock {
  id: string
  code: string
  name: string
  short: string
  status: Warehouse['status']
  qty: number
}

/** Leaf category → immediate parent category name (until an item-categories store lands). */
const DEFAULT_CATEGORY_PARENTS: Readonly<Record<string, string>> = {
  'Sambrani Holder': 'Finished Goods',
  'Combo Pack': 'Finished Goods',
  'Sambrani Cones': 'Consumables',
  'Ceramic Component': 'Components',
  'Raw Material': 'Components',
}

/** Total units held across all locations in `item.locs`. */
export function itemOnHand(item: Pick<Item, 'locs'>): number {
  return Object.values(item.locs ?? {}).reduce((sum, qty) => sum + (Number(qty) || 0), 0)
}

/** Units committed to open sales orders. */
export function itemCommitted(item: Pick<Item, 'qtySO'>): number {
  return Number(item.qtySO) || 0
}

/** Free-to-promise units (on hand minus committed). Can go negative when oversold. */
export function itemAvailable(item: Pick<Item, 'locs' | 'qtySO'>): number {
  return itemOnHand(item) - itemCommitted(item)
}

/** Low stock triggers at or below the reorder point (`onHand <= rp`). */
export function isItemLowStock(item: Pick<Item, 'locs' | 'rp'>): boolean {
  return itemOnHand(item) <= (Number(item.rp) || 0)
}

/** Tooltip text for the grid's low-stock warning dot, or null when stock is healthy. */
export function itemLowStockFlag(item: Pick<Item, 'locs' | 'rp'>): string | null {
  return isItemLowStock(item) ? `Low stock — on hand is at or below reorder point (${int(item.rp)})` : null
}

/** Prototype's `_status` classification used in the status filter, view, and drawer pill. */
export function itemStockStatus(item: Pick<Item, 'locs' | 'qtySO' | 'rp'>): ItemStockStatus {
  if (itemAvailable(item) <= 0) return 'Out of stock'
  if (isItemLowStock(item)) return 'Low stock'
  return 'Healthy'
}

/** Gross margin ratio `(price - cost) / price`, or null for non-priced/non-sellable items. */
export function itemMargin(item: Pick<Item, 'price' | 'cost'>): number | null {
  const price = Number(item.price) || 0
  if (price <= 0) return null
  return (price - (Number(item.cost) || 0)) / price
}

/** Ordered category path root-first (e.g. `['Finished Goods', 'Sambrani Holder']`). */
export function itemCategoryPathNames(
  category: string,
  parents: Readonly<Record<string, string>> = DEFAULT_CATEGORY_PARENTS,
): string[] {
  const name = category.trim()
  if (!name) return []
  const path = [name]
  const seen = new Set<string>(path)
  let cur = name
  while (parents[cur] && !seen.has(parents[cur])) {
    cur = parents[cur]
    seen.add(cur)
    path.unshift(cur)
  }
  return path
}

/** Top-level category name (or the category itself when it has no parent). */
export function itemCategoryParent(
  category: string,
  parents: Readonly<Record<string, string>> = DEFAULT_CATEGORY_PARENTS,
): string {
  return itemCategoryPathNames(category, parents)[0] ?? ''
}

/** Leaf sub-category name, or `''` when the item sits directly on a root category. */
export function itemCategorySub(
  category: string,
  parents: Readonly<Record<string, string>> = DEFAULT_CATEGORY_PARENTS,
): string {
  const path = itemCategoryPathNames(category, parents)
  return path.length > 1 ? category.trim() : ''
}

/** Full category breadcrumb string (e.g. `Finished Goods › Sambrani Holder`). */
export function itemCategoryPath(
  category: string,
  sep = ' › ',
  parents: Readonly<Record<string, string>> = DEFAULT_CATEGORY_PARENTS,
): string {
  return itemCategoryPathNames(category, parents).join(sep)
}

/** Short label for a warehouse (`Tiruvannamalai — Main` → `Main`). */
export function warehouseShortName(name: string): string {
  const s = String(name || '')
  const i = s.indexOf(' \u2014 ')
  return i >= 0 ? s.slice(i + 3) : s
}

/** Stock per warehouse, dropping inactive sites that hold zero stock. */
export function itemSiteRows(item: Pick<Item, 'locs'>, warehouses: readonly Warehouse[]): ItemSiteStock[] {
  const locs = item.locs ?? {}
  return warehouses
    .filter((w) => w.status !== 'inactive' || (Number(locs[w.id]) || 0) > 0)
    .map((w) => ({
      id: w.id,
      code: w.code,
      name: w.name,
      short: warehouseShortName(w.name),
      status: w.status,
      qty: Number(locs[w.id]) || 0,
    }))
}

/** Warehouse holding the most stock for this item, or null when unstocked. */
export function itemPrimarySite(item: Pick<Item, 'locs'>, warehouses: readonly Warehouse[]): ItemSiteStock | null {
  const stocked = itemSiteRows(item, warehouses)
    .filter((s) => s.qty > 0)
    .sort((a, b) => b.qty - a.qty)
  return stocked[0] ?? null
}

/** Count of distinct warehouses currently holding positive stock. */
export function itemSiteSpread(item: Pick<Item, 'locs'>, warehouses: readonly Warehouse[]): number {
  return itemSiteRows(item, warehouses).filter((s) => s.qty > 0).length
}

/** Why an item cannot be deleted, or null when safe to remove. */
export function itemDeleteBlockedReason(
  item: Pick<Item, 'no' | 'locs'>,
  orders: readonly Pick<PurchaseOrder, 'lines'>[],
  receipts: readonly Pick<PurchaseReceipt, 'lines'>[],
): string | null {
  const hasStock = itemOnHand(item) > 0
  const onOrder = orders.some((po) => (po.lines ?? []).some((l) => l.item === item.no))
  const onReceipt = receipts.some((r) => (r.lines ?? []).some((l) => l.item === item.no))
  if (hasStock || onOrder || onReceipt) {
    return 'This item has stock or is on purchase documents — block it instead'
  }
  return null
}
