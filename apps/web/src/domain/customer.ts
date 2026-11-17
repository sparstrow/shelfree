/**
 * Customer domain helpers. Pure functions — no React, no storage.
 * See docs/customer-page/README.md.
 */
import type { Customer, CustomerStatus } from '@/data/schemas'

/** Status badge label for a customer (`Active` | `On hold` | `Prospect`). */
export function customerStatus(
  c: Partial<Pick<Customer, 'status' | 'creditHold'>> | null | undefined,
): CustomerStatus {
  if (c?.status) return c.status
  return c?.creditHold ? 'On hold' : 'Active'
}

/** `City, State`, or whichever part is present, or `''`. */
export function customerLocation(c: Partial<Pick<Customer, 'city' | 'state'>> | null | undefined): string {
  const city = c?.city ?? ''
  const state = c?.state ?? ''
  if (city && state) return `${city}, ${state}`
  return city || state
}

/** A customer with open orders or a non-zero balance cannot be deleted. */
export function customerDeleteBlockedReason(
  c: Partial<Pick<Customer, 'openOrders' | 'balance'>> | null | undefined,
): string | null {
  if (!c) return null
  if ((c.openOrders || 0) > 0 || (c.balance || 0) !== 0) {
    return 'This customer has open orders or a balance — put it on hold instead'
  }
  return null
}
