/**
 * Commands — business actions that change more than one record at once.
 * Each is ONE future backend endpoint that must run in a single transaction
 * and re-validate everything server-side. The mock versions here apply the
 * same domain rules to the local collections.
 */
import type { AssemblyOrder, PurchaseReceipt } from '@/data/schemas'
import { DEFAULT_PRODUCTION_SETTINGS, aoFinish } from '@/domain/assembly-order'
import { poStatusAfterReceipts } from '@/domain/purchase-order'
import { postReceiptError, stockToAdd } from '@/domain/purchase-receipt'
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
