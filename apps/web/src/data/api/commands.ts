/**
 * Commands — business actions that change more than one record at once.
 * Each is ONE future backend endpoint that must run in a single transaction
 * and re-validate everything server-side. The mock versions here apply the
 * same domain rules to the local collections.
 */
import {
  type AssemblyOrder,
  type Item,
  type ItemUnitSet,
  type PurchaseReceipt,
  itemSchema,
  itemUnitSetSchema,
} from '@/data/schemas'
import { DEFAULT_PRODUCTION_SETTINGS, aoFinish } from '@/domain/assembly-order'
import { poStatusAfterReceipts } from '@/domain/purchase-order'
import { postReceiptError, stockToAdd } from '@/domain/purchase-receipt'
import {
  type ItemUomUpdateResult,
  allUnits,
  applyItemUnitSet,
  itemUomAdd,
  itemUomDefault,
  itemUomNormalize,
  itemUomRemove,
  itemUomSetBase,
  itemUomSetQty,
  itemUomValidate,
  syncItemBaseUnit,
} from '@/domain/units-of-measure'
import { api } from './index'

export class CommandError extends Error {}

/**
 * Post a goods-in receipt: `POST /purchase-receipts/{no}/post`.
 * 1. the receipt becomes Posted (immutable from here on),
 * 2. accepted units are added to stock at the receiving location,
 * 3. the purchase order's status follows what has now arrived.
 */
export async function postPurchaseReceipt(draft: PurchaseReceipt): Promise<PurchaseReceipt> {
  const [orders, receipts, items, warehouses] = await Promise.all([
    api.purchaseOrders.list(),
    api.purchaseReceipts.list(),
    api.items.list(),
    api.warehouses.list(),
  ])
  if (receipts.some((r) => r.no === draft.no && r.status === 'Posted')) {
    throw new CommandError('This receipt is already posted.')
  }
  const po = orders.find((p) => p.no === draft.po)
  const problem = postReceiptError(draft, po, receipts)
  if (problem) throw new CommandError(problem)

  const posted: PurchaseReceipt = { ...draft, status: 'Posted', postedAt: new Date().toISOString() }
  await api.purchaseReceipts.upsert(posted)

  // Stock lands at the receiving site (item.locs is keyed by warehouse id).
  const site = warehouses.find((w) => w.code === posted.location) ?? warehouses[0]
  const add = stockToAdd(posted)
  const changed = items
    .filter((it) => add.has(it.no))
    .map((it) => ({ ...it, locs: { ...it.locs, [site.id]: (it.locs[site.id] ?? 0) + (add.get(it.no) ?? 0) } }))
  if (changed.length) await api.items.upsertMany(changed)

  // The order's status is a consequence of what has landed, never typed in.
  if (po && po.status !== 'Cancelled' && po.status !== 'Closed') {
    const after = [...receipts.filter((r) => r.no !== posted.no), posted]
    const next = poStatusAfterReceipts(po, after)
    if (next !== po.status) await api.purchaseOrders.upsert({ ...po, status: next })
  }
  return posted
}

export interface FinishAssemblyOrderInput {
  qtyFinished: number
  consumed?: Record<string, number>
}

/**
 * Finish (full or partial) an assembly order: `POST /assembly-orders/{no}/finish`.
 * All-or-nothing validation runs before any stock write:
 * 1. verifies consumed quantities (rejecting negatives, disallowed over-consumption, or shortages),
 * 2. subtracts consumed components and adds finished output at the order's site,
 * 3. updates qtyFinished, lines[].qtyConsumed, and status ('finished' once complete).
 */
export async function finishAssemblyOrder(
  no: string,
  input: FinishAssemblyOrderInput,
): Promise<AssemblyOrder> {
  const [orders, items, warehouses] = await Promise.all([
    api.assemblyOrders.list(),
    api.items.list(),
    api.warehouses.list(),
  ])
  const order = orders.find((o) => o.no === no)
  if (!order) throw new CommandError(`Assembly order ${no} not found.`)

  const result = aoFinish({
    order,
    qtyFinished: input.qtyFinished,
    consumed: input.consumed,
    items,
    warehouses,
    // Settings come from the workspace, never from the caller (no production settings store yet → defaults).
    cfg: DEFAULT_PRODUCTION_SETTINGS,
  })
  if (!result.ok) throw new CommandError(result.error)

  if (result.updatedItems.length) await api.items.upsertMany(result.updatedItems)
  await api.assemblyOrders.upsert(result.order)
  return result.order
}

export type ItemUnitAction =
  | { type: 'add'; code: string }
  | { type: 'remove'; code: string }
  | { type: 'setBase'; code: string }
  | { type: 'setQty'; code: string; qty: number | string | null }
  | { type: 'replace'; unitSet: ItemUnitSet }

export interface ItemUnitsSyncResult {
  item: Item
  unitSet: ItemUnitSet
}

interface ItemUnitChange {
  prevItem: Item
  prevSet: ItemUnitSet | null
  nextItem: Item
  nextSet: ItemUnitSet
}

let itemUnitsQueue: Promise<unknown> = Promise.resolve()

function enqueueItemUnits<T>(task: () => Promise<T>): Promise<T> {
  const next = itemUnitsQueue.then(task, task)
  itemUnitsQueue = next.then(
    () => undefined,
    () => undefined,
  )
  return next
}

async function persistItemUnitChanges(changes: readonly ItemUnitChange[]): Promise<void> {
  if (changes.length === 0) return
  const nextSets = changes.map((c) => c.nextSet)
  const changedItems = changes.filter((c) => c.nextItem.uom !== c.prevItem.uom).map((c) => c.nextItem)

  await api.itemUnits.upsertMany(nextSets)
  if (changedItems.length === 0) return

  try {
    await api.items.upsertMany(changedItems)
  } catch (err) {
    const toRestore = changes.flatMap((c) => (c.prevSet ? [c.prevSet] : []))
    const toRemove = changes.filter((c) => c.prevSet === null).map((c) => c.nextSet.itemNo)
    if (toRestore.length) await api.itemUnits.upsertMany(toRestore).catch(() => {})
    for (const id of toRemove) await api.itemUnits.remove(id).catch(() => {})
    throw err
  }
}

/**
 * Update one item's unit set and keep `item.uom` equal to `unitSet.base`
 * (`PATCH /items/{no}/units`). Writes both or neither.
 */
export function updateItemUnits(itemNo: string, action: ItemUnitAction): Promise<ItemUnitsSyncResult> {
  return enqueueItemUnits(async () => {
    const [item, existingSet, customUnits] = await Promise.all([
      api.items.get(itemNo),
      api.itemUnits.get(itemNo),
      api.unitsOfMeasure.list(),
    ])
    if (!item) throw new CommandError(`Item ${itemNo} not found.`)

    const units = allUnits(customUnits)
    const current = itemUomNormalize(existingSet ?? itemUomDefault(item.no, item.uom), units)

    let result: ItemUomUpdateResult
    switch (action.type) {
      case 'add':
        result = itemUomAdd(current, action.code, units)
        break
      case 'remove':
        result = itemUomRemove(current, action.code, units)
        break
      case 'setBase':
        result = itemUomSetBase(current, action.code, units)
        break
      case 'setQty':
        result = itemUomSetQty(current, action.code, action.qty, units)
        break
      case 'replace':
        if (action.unitSet.itemNo !== item.no) {
          throw new CommandError(`Unit set ${action.unitSet.itemNo} does not match item ${item.no}.`)
        }
        result = itemUomValidate(action.unitSet, units)
        break
    }
    if (!result.ok) throw new CommandError(result.error)

    const synced = applyItemUnitSet(item, result.unitSet)
    const nextItem = itemSchema.parse(synced.item)
    const nextSet = itemUnitSetSchema.parse(synced.unitSet)

    await persistItemUnitChanges([{ prevItem: item, prevSet: existingSet, nextItem, nextSet }])
    return { item: nextItem, unitSet: nextSet }
  })
}

/**
 * Remove one or more `(itemNo, code)` pairs in a single transaction
 * (`DELETE /item-units/bulk`), keeping every affected item's `uom` in step.
 */
export function bulkRemoveItemUnits(
  targets: readonly { itemNo: string; code: string }[],
): Promise<{ updated: ItemUnitsSyncResult[]; previousSets: ItemUnitSet[] }> {
  return enqueueItemUnits(async () => {
    if (targets.length === 0) return { updated: [], previousSets: [] }
    const [items, existingSets, customUnits] = await Promise.all([
      api.items.list(),
      api.itemUnits.list(),
      api.unitsOfMeasure.list(),
    ])
    const units = allUnits(customUnits)
    const itemsByNo = new Map(items.map((it) => [it.no, it]))
    const setsByNo = new Map(existingSets.map((s) => [s.itemNo, s]))

    const grouped = new Map<string, string[]>()
    for (const target of targets) {
      const codes = grouped.get(target.itemNo) ?? []
      if (!codes.includes(target.code)) codes.push(target.code)
      grouped.set(target.itemNo, codes)
    }

    const previousSets: ItemUnitSet[] = []
    const changes: ItemUnitChange[] = []
    for (const [itemNo, codes] of grouped) {
      const item = itemsByNo.get(itemNo)
      if (!item) throw new CommandError(`Item ${itemNo} not found.`)
      const prevSetRaw = setsByNo.get(itemNo) ?? null
      let current = itemUomNormalize(prevSetRaw ?? itemUomDefault(item.no, item.uom), units)
      previousSets.push(current)

      for (const code of codes) {
        const res = itemUomRemove(current, code, units)
        if (!res.ok) throw new CommandError(res.error)
        current = res.unitSet
      }

      const synced = applyItemUnitSet(item, current)
      changes.push({
        prevItem: item,
        prevSet: prevSetRaw,
        nextItem: itemSchema.parse(synced.item),
        nextSet: itemUnitSetSchema.parse(synced.unitSet),
      })
    }

    await persistItemUnitChanges(changes)
    return {
      updated: changes.map((c) => ({ item: c.nextItem, unitSet: c.nextSet })),
      previousSets,
    }
  })
}

/**
 * Restore saved per-item unit set snapshots (used for Undo), keeping each
 * item's `uom` in step. Writes all or none.
 */
export function restoreItemUnits(previousSets: readonly ItemUnitSet[]): Promise<ItemUnitsSyncResult[]> {
  return enqueueItemUnits(async () => {
    if (previousSets.length === 0) return []
    const [items, existingSets, customUnits] = await Promise.all([
      api.items.list(),
      api.itemUnits.list(),
      api.unitsOfMeasure.list(),
    ])
    const units = allUnits(customUnits)
    const itemsByNo = new Map(items.map((it) => [it.no, it]))
    const setsByNo = new Map(existingSets.map((s) => [s.itemNo, s]))

    const byItem = new Map<string, ItemUnitSet>()
    for (const s of previousSets) byItem.set(s.itemNo, s)

    const changes: ItemUnitChange[] = []
    for (const prev of byItem.values()) {
      const item = itemsByNo.get(prev.itemNo)
      if (!item) throw new CommandError(`Item ${prev.itemNo} not found.`)
      const validated = itemUomValidate(prev, units)
      if (!validated.ok) throw new CommandError(validated.error)
      const synced = applyItemUnitSet(item, validated.unitSet)
      changes.push({
        prevItem: item,
        prevSet: setsByNo.get(prev.itemNo) ?? null,
        nextItem: itemSchema.parse(synced.item),
        nextSet: itemUnitSetSchema.parse(synced.unitSet),
      })
    }

    await persistItemUnitChanges(changes)
    return changes.map((c) => ({ item: c.nextItem, unitSet: c.nextSet }))
  })
}

/**
 * Create or update an item record and keep its unit set in step with `item.uom`
 * (`POST /items` / `PATCH /items/{no}`). Writes both or neither.
 */
export function saveItemWithUnits(item: Item): Promise<ItemUnitsSyncResult> {
  return enqueueItemUnits(async () => {
    const [existingItem, existingSet, customUnits] = await Promise.all([
      api.items.get(item.no),
      api.itemUnits.get(item.no),
      api.unitsOfMeasure.list(),
    ])
    const units = allUnits(customUnits)
    const synced = syncItemBaseUnit(item, existingSet, units)
    const nextItem = itemSchema.parse(synced.item)
    const nextSet = itemUnitSetSchema.parse(synced.unitSet)

    await api.items.upsert(nextItem)
    try {
      await api.itemUnits.upsert(nextSet)
    } catch (err) {
      if (existingItem) await api.items.upsert(existingItem).catch(() => {})
      else await api.items.remove(nextItem.no).catch(() => {})
      throw err
    }
    return { item: nextItem, unitSet: nextSet }
  })
}
