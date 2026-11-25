/**
 * Commands behind Settings ▸ Item categories and Settings ▸ Locations & warehouses.
 * Each function is one future backend endpoint (see the section docs).
 */
import { api } from '@/data/api'
import { CommandError } from '@/data/api/commands'
import { type ItemCategory, type Warehouse, itemCategorySchema, warehouseSchema } from '@/data/schemas'
import {
  categoriesWithout,
  categoryById,
  categoryDeleteBlockReason,
  categoryDirectItemCount,
  normalizeCategoryCode,
  reassignItemCategory,
  validateCategory,
} from '@/domain/item-categories'
import {
  type LocationUsage,
  applyPrincipal,
  locationDeleteBlockReason,
  locationUsage,
  normalizeLocation,
  validateLocation,
} from '@/domain/locations'

const firstError = (errors: Record<string, string>): string | undefined => Object.values(errors)[0]

/**
 * Create or update a category: `PUT /item-categories/{id}`. Renaming cascades to the
 * items that carry the old name, so no item is left pointing at a name that is gone.
 */
export async function saveItemCategory(input: ItemCategory): Promise<ItemCategory> {
  const all = await api.itemCategories.list()
  const existing = all.find((c) => c.id === input.id) ?? null
  const candidate: ItemCategory = {
    ...input,
    code: normalizeCategoryCode(input.code),
    name: input.name.trim(),
    desc: input.desc.trim(),
  }
  const problem = firstError(validateCategory(candidate, all, existing ? existing.id : null))
  if (problem) throw new CommandError(problem)
  const saved = await api.itemCategories.upsert(itemCategorySchema.parse(candidate))
  if (existing && existing.name !== saved.name) {
    const items = await api.items.list()
    const renamed = reassignItemCategory(items, existing.name, saved.name)
    if (renamed.length > 0) await api.items.upsertMany(renamed)
  }
  return saved
}

/**
 * Delete a category: `DELETE /item-categories/{id}`. Refused while an item carries its
 * name; its sub-categories move up to its parent. Returns the lifted children's ids.
 */
export async function deleteItemCategory(id: string): Promise<string[]> {
  const [all, items] = await Promise.all([api.itemCategories.list(), api.items.list()])
  const cat = categoryById(all, id)
  if (!cat) throw new CommandError('Category not found.')
  const reason = categoryDeleteBlockReason(categoryDirectItemCount(cat, items))
  if (reason) throw new CommandError(reason)
  const { list, lifted } = categoriesWithout(all, id)
  const moved = list.filter((c) => lifted.includes(c.id))
  if (moved.length > 0) await api.itemCategories.upsertMany(moved)
  await api.itemCategories.remove(id)
  return lifted
}

/** Put a deleted category back (Undo) and move the sub-categories that were lifted back under it. */
export async function restoreItemCategory(cat: ItemCategory, liftedIds: readonly string[]): Promise<void> {
  await api.itemCategories.upsert(itemCategorySchema.parse(cat))
  if (liftedIds.length === 0) return
  const all = await api.itemCategories.list()
  const children = all.filter((c) => liftedIds.includes(c.id)).map((c) => ({ ...c, parent: cat.id }))
  if (children.length > 0) await api.itemCategories.upsertMany(children)
}

/** Stock and open documents per site (`GET /locations/usage`). */
export async function loadLocationUsage(warehouses?: readonly Warehouse[]): Promise<Map<string, LocationUsage>> {
  const [sites, items, purchaseOrders, purchaseReceipts, assemblyOrders, salesOrders] = await Promise.all([
    warehouses ? Promise.resolve(warehouses) : api.warehouses.list(),
    api.items.list(),
    api.purchaseOrders.list(),
    api.purchaseReceipts.list(),
    api.assemblyOrders.list(),
    api.salesOrders.list(),
  ])
  return locationUsage(sites, { items, purchaseOrders, purchaseReceipts, assemblyOrders, salesOrders })
}

export interface SaveWarehouseResult {
  saved: Warehouse
  /** The site that lost "Principal" because this one took it. */
  moved: Warehouse | null
}

/** Create or update a site: `PUT /locations/{id}`. Enforces the location rules in `domain/locations`. */
export async function saveWarehouse(input: Warehouse): Promise<SaveWarehouseResult> {
  const [all, vendors, usage] = await Promise.all([api.warehouses.list(), api.vendors.list(), loadLocationUsage()])
  const original = all.find((w) => w.id === input.id) ?? null
  const now = new Date().toISOString()
  const candidate = normalizeLocation({
    ...input,
    createdAt: original?.createdAt ?? input.createdAt ?? now,
    updatedAt: now,
  })
  const others = all.filter((w) => w.id !== candidate.id)
  const problem = firstError(
    validateLocation(candidate, others, original, usage.get(candidate.id), new Set(vendors.map((v) => v.no))),
  )
  if (problem) throw new CommandError(problem)
  const withIt = original ? all.map((w) => (w.id === candidate.id ? candidate : w)) : [...all, candidate]
  const { list, moved } = applyPrincipal(withIt, candidate.id)
  const changed = list.filter((w) => w.id === candidate.id || w.id === moved?.id)
  await api.warehouses.upsertMany(changed.map((w) => warehouseSchema.parse(w)))
  return { saved: candidate, moved }
}

/** Delete a site: `DELETE /locations/{id}`. Refused while it holds stock, has open documents, or is the principal place. */
export async function deleteWarehouse(id: string): Promise<void> {
  const [all, usage] = await Promise.all([api.warehouses.list(), loadLocationUsage()])
  const site = all.find((w) => w.id === id)
  if (!site) throw new CommandError('Location not found.')
  const reason = locationDeleteBlockReason(site, all, usage.get(id))
  if (reason) throw new CommandError(reason)
  await api.warehouses.remove(id)
}
