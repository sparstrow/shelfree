/**
 * Vendor domain helpers. Pure functions — no React, no storage.
 * See docs/vendor-page/README.md.
 */
import type { Vendor } from '@/data/schemas'

export type VendorStatus = 'Active' | 'Blocked'

/** A vendor is Blocked when `blocked` is non-empty (`'Payment' | 'All'`). */
export function vendorStatus(v: Partial<Pick<Vendor, 'blocked'>> | null | undefined): VendorStatus {
  return v?.blocked ? 'Blocked' : 'Active'
}

const SUPPLIES_LABEL: Record<Vendor['supplies'], string> = {
  goods: 'Goods',
  services: 'Services',
  both: 'Goods + services',
}

export function vendorSuppliesLabel(v: Partial<Pick<Vendor, 'supplies'>> | null | undefined): string {
  const key = v?.supplies ?? 'goods'
  return SUPPLIES_LABEL[key] ?? 'Goods'
}

/** `City, State`, or whichever part is present, or `''`. */
export function vendorLocation(v: Partial<Pick<Vendor, 'city' | 'state'>> | null | undefined): string {
  const city = v?.city ?? ''
  const state = v?.state ?? ''
  if (city && state) return `${city}, ${state}`
  return city || state
}
