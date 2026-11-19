/**
 * Commands — business actions that change more than one record at once.
 * Each is ONE future backend endpoint that must run in a single transaction
 * and re-validate everything server-side. The mock versions here apply the
 * same domain rules to the local collections.
 */
import {
  type AssemblyOrder,
  type Customer,
  type Favorite,
  type Item,
  type ItemUnitSet,
  type PurchaseOrder,
  type PurchaseReceipt,
  type SavedView,
  type Vendor,
  itemSchema,
  itemUnitSetSchema,
} from '@/data/schemas'
import { DEFAULT_PRODUCTION_SETTINGS, aoFinish } from '@/domain/assembly-order'
import { nextDupNo } from '@/domain/bulk-actions'
import { dropFavorite, favoritesOfView, nextFavoriteOrder, renumberFavorites, sortFavorites } from '@/domain/favorites'
import {
  duplicatePurchaseOrder,
  poCanCancel,
  poCanClose,
  poCanLock,
  poCanReopen,
  poLockState,
  poNextNo,
  poReceiptProgress,
  poStatusAfterReceipts,
} from '@/domain/purchase-order'
import { applyIssueTransition, poCanBulkIssue, priceLine } from '@/domain/purchase-order-editing'
import { postReceiptError, stockToAdd } from '@/domain/purchase-receipt'
import { type ViewStateData, dedupeViewName, withDefaultView } from '@/domain/saved-views'
import { CURRENT_USER_ID, newId } from './favorites'
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
import { type Api, type CollectionName, api } from './index'
import { settingsApi } from './settings'

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

// ── Saved views & favourites (per user) ─────────────────────────────────────
// Backend: `/me/views` and `/me/favorites`, always scoped to the session user.

export interface NewSavedView extends ViewStateData {
  name: string
  module: string
  page: string
  pageKey: string
  path: string
  pageLabel: string
  autoCreated?: boolean
}

const namesOnPage = (views: readonly SavedView[], pageKey: string, exceptId?: string) =>
  views.filter((v) => v.pageKey === pageKey && v.id !== exceptId).map((v) => v.name)

/**
 * `POST /me/views`. The name is made unique on its page (`Open`, `Open 2`…),
 * and `pin` also adds the new view to the favourites, in one step.
 */
export async function createSavedView(
  input: NewSavedView,
  pin = false,
): Promise<{ view: SavedView; favorite: Favorite | null }> {
  const views = await api.savedViews.list()
  const now = Date.now()
  const { autoCreated, ...rest } = input
  const view: SavedView = {
    ...rest,
    id: newId('v'),
    userId: CURRENT_USER_ID,
    name: dedupeViewName(input.name.trim(), namesOnPage(views, input.pageKey)),
    scope: 'private',
    isDefaultFor: false,
    autoCreated: !!autoCreated,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
  await api.savedViews.upsert(view)
  const favorite = pin ? await addFavoriteView(view.id) : null
  return { view, favorite }
}

/** `PUT /me/views/{id}` — save the grid's current state into the view (name, default flag and pins stay). */
export async function updateSavedViewState(id: string, state: ViewStateData): Promise<SavedView | null> {
  const current = await api.savedViews.get(id)
  if (!current) return null
  return api.savedViews.upsert({ ...current, ...state, updatedAt: Date.now() })
}

/** `PATCH /me/views/{id}` — rename; a name already used on the page gets a number. */
export async function renameSavedView(id: string, name: string): Promise<SavedView | null> {
  const nm = name.trim()
  const [current, views] = await Promise.all([api.savedViews.get(id), api.savedViews.list()])
  if (!nm || !current || nm === current.name) return current
  const next = {
    ...current,
    name: dedupeViewName(nm, namesOnPage(views, current.pageKey, id)),
    autoCreated: false,
    updatedAt: Date.now(),
  }
  return api.savedViews.upsert(next)
}

/** `POST /me/views/{id}/duplicate`. */
export async function duplicateSavedView(id: string): Promise<SavedView | null> {
  const [current, views] = await Promise.all([api.savedViews.get(id), api.savedViews.list()])
  if (!current) return null
  const now = Date.now()
  return api.savedViews.upsert({
    ...current,
    id: newId('v'),
    name: dedupeViewName(current.name + ' copy', namesOnPage(views, current.pageKey)),
    isDefaultFor: false,
    autoCreated: false,
    createdAt: now,
    updatedAt: now,
  })
}

/** `PUT /me/views/{id}/default` — makes it the page's one default, or clears it. Returns whether it is now the default. */
export async function toggleDefaultSavedView(id: string): Promise<{ view: SavedView; on: boolean } | null> {
  const views = await api.savedViews.list()
  const view = views.find((v) => v.id === id)
  if (!view) return null
  const on = !view.isDefaultFor
  const next = withDefaultView(views, id, on).filter((v) => v.pageKey === view.pageKey)
  await api.savedViews.upsertMany(next)
  return { view, on }
}

/** `DELETE /me/views/{id}` — also drops the favourites that point at it; returns both so Undo can put them back. */
export async function deleteSavedView(id: string): Promise<{ view: SavedView; favorites: Favorite[] } | null> {
  const [view, favs] = await Promise.all([api.savedViews.get(id), api.favorites.list()])
  if (!view) return null
  const dropped = favoritesOfView(favs, id)
  await Promise.all(dropped.map((f) => api.favorites.remove(f.id)))
  await api.savedViews.remove(id)
  return { view, favorites: dropped }
}

export async function restoreSavedView(view: SavedView, favorites: Favorite[]): Promise<void> {
  await api.savedViews.upsert(view)
  if (favorites.length) await api.favorites.upsertMany(favorites)
}

/** `POST /me/favorites` for a page. No-op when it is already a favourite. */
export async function addFavoritePage(module: string, page: string): Promise<Favorite> {
  const favs = await api.favorites.list()
  const found = favs.find((f) => f.kind === 'page' && f.module === module && f.page === page)
  if (found) return found
  return api.favorites.upsert({
    id: newId('f'),
    userId: CURRENT_USER_ID,
    kind: 'page',
    module,
    page,
    order: nextFavoriteOrder(favs),
    createdAt: Date.now(),
  })
}

/** `POST /me/favorites` for a saved view. No-op when it is already a favourite. */
export async function addFavoriteView(viewId: string): Promise<Favorite> {
  const favs = await api.favorites.list()
  const found = favs.find((f) => f.kind === 'view' && f.viewId === viewId)
  if (found) return found
  return api.favorites.upsert({
    id: newId('f'),
    userId: CURRENT_USER_ID,
    kind: 'view',
    viewId,
    order: nextFavoriteOrder(favs),
    createdAt: Date.now(),
  })
}

/** `PUT /me/favorites/order` — the whole sequence in one write. */
export async function saveFavoriteOrder(ordered: Favorite[]): Promise<void> {
  await api.favorites.upsertMany(renumberFavorites(ordered))
}

/** Drag `fromId` onto `toId`. */
export async function dropFavoriteOn(fromId: string, toId: string): Promise<void> {
  await saveFavoriteOrder(dropFavorite(await api.favorites.list(), fromId, toId))
}

/** Put a removed favourite back where it was (Undo). */
export async function restoreFavorite(favorite: Favorite): Promise<void> {
  const favs = await api.favorites.list()
  await saveFavoriteOrder(sortFavorites([...favs.filter((f) => f.id !== favorite.id), favorite]))
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

// ── Grid bulk actions (multi-record commands) ────────────────────────────────
// Backend: each command below is ONE transactional endpoint that re-validates
// every target record server-side and writes one audit event per changed record.

type CollectionRecord<K extends CollectionName> = Awaited<ReturnType<Api[K]['list']>>[number]

/** Write several records to one collection in a single batch (also used for Undo). */
export async function bulkUpsertCollection<K extends CollectionName>(
  collection: K,
  records: readonly CollectionRecord<K>[],
): Promise<CollectionRecord<K>[]> {
  if (records.length === 0) return []
  return (api[collection].upsertMany as (rows: CollectionRecord<K>[]) => Promise<CollectionRecord<K>[]>)(
    [...records],
  )
}

/** Delete several records from one collection (`DELETE /<collection>/bulk`). */
export async function bulkDeleteCollection<K extends CollectionName>(
  collection: K,
  ids: readonly string[],
): Promise<void> {
  for (const id of ids) {
    await api[collection].remove(id)
  }
}

export type PoBulkStatusAction = 'issue' | 'cancel' | 'close'
export type PoBulkLockAction = 'reopen' | 'lock'
export type PoBulkEditFieldKey = 'expectedDate' | 'orderDate' | 'location' | 'buyer'

export interface BulkPurchaseOrderMutationResult {
  updated: PurchaseOrder[]
  previous: PurchaseOrder[]
  skipped: number
}

/**
 * `POST /purchase-orders/bulk-status` — apply Issue / Cancel / Close to every
 * eligible order in `nos`, skipping ineligible ones.
 */
export async function bulkPurchaseOrderStatus(
  nos: readonly string[],
  action: PoBulkStatusAction,
): Promise<BulkPurchaseOrderMutationResult> {
  const [orders, receipts, vendors, warehouses, settings] = await Promise.all([
    api.purchaseOrders.list(),
    api.purchaseReceipts.list(),
    api.vendors.list(),
    api.warehouses.list(),
    settingsApi.get(),
  ])
  const selected = new Set(nos)
  const vendorByNo = new Map(vendors.map((v) => [v.no, v]))
  const updated: PurchaseOrder[] = []
  const previous: PurchaseOrder[] = []
  let skipped = 0

  for (const po of orders) {
    if (!selected.has(po.no)) continue
    const vendor = vendorByNo.get(po.vendor)
    const eligible =
      action === 'issue'
        ? poCanBulkIssue(po, vendor, warehouses, settings)
        : action === 'cancel'
          ? poCanCancel(po, receipts)
          : poCanClose(po)
    if (!eligible) {
      skipped += 1
      continue
    }
    previous.push(po)
    if (action === 'issue') {
      updated.push(applyIssueTransition(po, vendor, settings))
    } else if (action === 'cancel') {
      updated.push({ ...po, status: 'Cancelled' })
    } else {
      updated.push({ ...po, status: 'Closed' })
    }
  }

  if (updated.length > 0) await api.purchaseOrders.upsertMany(updated)
  return { updated, previous, skipped }
}

/**
 * `POST /purchase-orders/bulk-lock` — reopen locked issued orders or lock
 * reopened issued orders in one batch.
 */
export async function bulkPurchaseOrderLock(
  nos: readonly string[],
  action: PoBulkLockAction,
): Promise<BulkPurchaseOrderMutationResult> {
  const orders = await api.purchaseOrders.list()
  const selected = new Set(nos)
  const updated: PurchaseOrder[] = []
  const previous: PurchaseOrder[] = []
  let skipped = 0

  for (const po of orders) {
    if (!selected.has(po.no)) continue
    const eligible = action === 'reopen' ? poCanReopen(po) : poCanLock(po)
    if (!eligible) {
      skipped += 1
      continue
    }
    previous.push(po)
    updated.push({
      ...po,
      locked: action === 'lock',
      reopened: action === 'reopen',
    })
  }

  if (updated.length > 0) await api.purchaseOrders.upsertMany(updated)
  return { updated, previous, skipped }
}

export interface BulkEditPurchaseOrdersInput {
  nos: readonly string[]
  field: PoBulkEditFieldKey
  value: string
  reopen: boolean
}

export interface BulkEditPurchaseOrdersResult {
  updated: PurchaseOrder[]
  previous: PurchaseOrder[]
  edited: number
  reopened: number
  skipped: number
}

/**
 * `PATCH /purchase-orders/bulk` — update one header column across selected orders,
 * optionally reopening locked issued orders in the same transaction.
 */
export async function bulkEditPurchaseOrders(
  input: BulkEditPurchaseOrdersInput,
): Promise<BulkEditPurchaseOrdersResult> {
  const orders = await api.purchaseOrders.list()
  const selected = new Set(input.nos)
  const updated: PurchaseOrder[] = []
  const previous: PurchaseOrder[] = []
  let reopened = 0
  let skipped = 0

  for (const po of orders) {
    if (!selected.has(po.no)) continue
    const ls = poLockState(po)
    if (ls === 'final' || (ls === 'locked' && !input.reopen)) {
      skipped += 1
      continue
    }
    previous.push(po)
    let next: PurchaseOrder = { ...po }
    if (ls === 'locked') {
      next = { ...next, locked: false, reopened: true }
      reopened += 1
    }
    if (input.field === 'buyer') {
      next = { ...next, buyer: input.value || null }
    } else {
      next = { ...next, [input.field]: input.value }
    }
    updated.push(next)
  }

  if (updated.length > 0) await api.purchaseOrders.upsertMany(updated)
  return { updated, previous, edited: updated.length, reopened, skipped }
}

export interface BulkEditPurchaseLinesInput {
  lineIds: readonly string[]
  qty: number
  reopen: boolean
}

export interface BulkEditPurchaseLinesResult {
  updated: PurchaseOrder[]
  previous: PurchaseOrder[]
  edited: number
  reopened: number
  skipped: number
  short: number
}

/**
 * `PATCH /purchase-orders/lines:bulk` — update `qty` across selected purchase
 * lines, optionally reopening locked orders, skipping final orders and any line
 * where `qty` is below what has already been received. Draft lines re-price.
 */
export async function bulkEditPurchaseLines(
  input: BulkEditPurchaseLinesInput,
): Promise<BulkEditPurchaseLinesResult> {
  const [orders, receipts, prices, settings] = await Promise.all([
    api.purchaseOrders.list(),
    api.purchaseReceipts.list(),
    api.purchasePrices.list(),
    settingsApi.get(),
  ])
  const byPo = new Map<string, Set<number>>()
  for (const id of input.lineIds) {
    const sep = id.lastIndexOf('-')
    if (sep <= 0) continue
    const poNo = id.slice(0, sep)
    const idx = Number(id.slice(sep + 1)) - 1
    if (!Number.isInteger(idx) || idx < 0) continue
    const set = byPo.get(poNo) ?? new Set<number>()
    set.add(idx)
    byPo.set(poNo, set)
  }

  const updated: PurchaseOrder[] = []
  const previous: PurchaseOrder[] = []
  let edited = 0
  let reopened = 0
  let skipped = 0
  let short = 0

  for (const po of orders) {
    const indices = byPo.get(po.no)
    if (!indices || indices.size === 0) continue
    const ls = poLockState(po)
    if (ls === 'final' || (ls === 'locked' && !input.reopen)) {
      skipped += indices.size
      continue
    }
    const prog = poReceiptProgress(po, receipts)
    let poEdited = 0
    const nextLines = (po.lines || []).map((line, i) => {
      if (!indices.has(i)) return line
      if ((prog[i]?.received ?? 0) > input.qty) {
        short += 1
        skipped += 1
        return line
      }
      poEdited += 1
      edited += 1
      const nextLine = { ...line, qty: input.qty }
      return po.status === 'Draft' ? priceLine(nextLine, po, { prices, settings }) : nextLine
    })
    if (poEdited === 0) continue
    previous.push(po)
    let nextPo: PurchaseOrder = { ...po, lines: nextLines }
    if (ls === 'locked') {
      nextPo = { ...nextPo, locked: false, reopened: true }
      reopened += 1
    }
    updated.push(nextPo)
  }

  if (updated.length > 0) await api.purchaseOrders.upsertMany(updated)
  return { updated, previous, edited, reopened, skipped, short }
}

/** `POST /purchase-orders/duplicate` — clone orders as fresh Drafts with sequential numbers. */
export async function duplicatePurchaseOrders(
  nos: readonly string[],
  today: string,
): Promise<{ created: PurchaseOrder[] }> {
  const orders = await api.purchaseOrders.list()
  const byNo = new Map(orders.map((p) => [p.no, p]))
  const running: Pick<PurchaseOrder, 'no'>[] = orders.map((p) => ({ no: p.no }))
  const created: PurchaseOrder[] = []

  for (const no of nos) {
    const src = byNo.get(no)
    if (!src) continue
    const nextNumber = poNextNo(running)
    running.push({ no: nextNumber })
    created.push(duplicatePurchaseOrder(src, nextNumber, today))
  }

  if (created.length > 0) await api.purchaseOrders.upsertMany(created)
  return { created }
}

/**
 * `POST /items/duplicate` — clone items with `-COPY` numbers and `" (copy)"` descriptions.
 * Each copy also gets a copy of the source's unit set (base, pack units, conversions).
 */
export async function duplicateItems(nos: readonly string[]): Promise<{ created: Item[] }> {
  const [items, unitSets] = await Promise.all([api.items.list(), api.itemUnits.list()])
  const byNo = new Map(items.map((r) => [r.no, r]))
  const setByNo = new Map(unitSets.map((s) => [s.itemNo, s]))
  const taken = items.map((r) => r.no)
  const created: Item[] = []
  const createdSets: ItemUnitSet[] = []

  for (const no of nos) {
    const src = byNo.get(no)
    if (!src) continue
    const copyNo = nextDupNo(taken, src.no)
    taken.push(copyNo)
    created.push({
      ...structuredClone(src),
      no: copyNo,
      desc: `${src.desc || ''} (copy)`,
    })
    const set = setByNo.get(src.no)
    if (set) createdSets.push({ ...structuredClone(set), itemNo: copyNo })
  }

  if (created.length > 0) await api.items.upsertMany(created)
  if (createdSets.length > 0) await api.itemUnits.upsertMany(createdSets)
  return { created }
}

/** Undo of a duplicate: remove the copied items and their unit sets (`DELETE /items/bulk`). */
export async function removeDuplicatedItems(nos: readonly string[]): Promise<void> {
  for (const no of nos) {
    await api.items.remove(no)
    await api.itemUnits.remove(no)
  }
}

/** `POST /customers/duplicate` — clone customers with `-COPY` numbers and `" (copy)"` names. */
export async function duplicateCustomers(nos: readonly string[]): Promise<{ created: Customer[] }> {
  const customers = await api.customers.list()
  const byNo = new Map(customers.map((r) => [r.no, r]))
  const taken = customers.map((r) => r.no)
  const created: Customer[] = []

  for (const no of nos) {
    const src = byNo.get(no)
    if (!src) continue
    const copyNo = nextDupNo(taken, src.no)
    taken.push(copyNo)
    created.push({
      ...structuredClone(src),
      no: copyNo,
      name: `${src.name || ''} (copy)`,
    })
  }

  if (created.length > 0) await api.customers.upsertMany(created)
  return { created }
}

/** `POST /vendors/duplicate` — clone vendors with `-COPY` numbers and `" (copy)"` names. */
export async function duplicateVendors(nos: readonly string[]): Promise<{ created: Vendor[] }> {
  const vendors = await api.vendors.list()
  const byNo = new Map(vendors.map((r) => [r.no, r]))
  const taken = vendors.map((r) => r.no)
  const created: Vendor[] = []

  for (const no of nos) {
    const src = byNo.get(no)
    if (!src) continue
    const copyNo = nextDupNo(taken, src.no)
    taken.push(copyNo)
    created.push({
      ...structuredClone(src),
      no: copyNo,
      name: `${src.name || ''} (copy)`,
    })
  }

  if (created.length > 0) await api.vendors.upsertMany(created)
  return { created }
}
