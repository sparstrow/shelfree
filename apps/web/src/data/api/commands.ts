/**
 * Commands — business actions that change more than one record at once.
 * Each is ONE future backend endpoint that must run in a single transaction
 * and re-validate everything server-side. The mock versions here apply the
 * same domain rules to the local collections.
 */
import type { AssemblyOrder, Favorite, PurchaseReceipt, SavedView } from '@/data/schemas'
import { DEFAULT_PRODUCTION_SETTINGS, aoFinish } from '@/domain/assembly-order'
import { dropFavorite, favoritesOfView, nextFavoriteOrder, renumberFavorites, sortFavorites } from '@/domain/favorites'
import { poStatusAfterReceipts } from '@/domain/purchase-order'
import { postReceiptError, stockToAdd } from '@/domain/purchase-receipt'
import { type ViewStateData, dedupeViewName, withDefaultView } from '@/domain/saved-views'
import { CURRENT_USER_ID, newId } from './favorites'
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
