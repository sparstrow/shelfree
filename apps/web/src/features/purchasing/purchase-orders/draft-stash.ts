/**
 * Keeps an unsaved purchase-order draft alive while the user steps out to
 * Purchase Prices to fix a price ("Back to order" in the toast). In memory
 * only — nothing unsaved is written to storage, and it is gone on reload.
 */
import type { PurchaseOrder } from '@/data/schemas'

/** Keyed by the route param (`new` or the order number). */
const drafts = new Map<string, PurchaseOrder>()

export const draftStash = {
  put: (key: string, draft: PurchaseOrder) => void drafts.set(key, draft),
  peek: (key: string) => drafts.get(key),
  clear: (key: string) => void drafts.delete(key),
}
