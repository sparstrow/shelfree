/**
 * Vendor price list rules. A vendor + item can have several rows: quantity
 * tiers (minQty) and date ranges. See docs/purchase-prices/README.md and
 * docs/superpowers/specs/2026-10-17-purchase-prices.md.
 */
import type { PurchasePrice } from '@/data/schemas'
import { nextNo } from './numbering'

const isActiveOn = (row: PurchasePrice, date: string) =>
  (!row.effFrom || row.effFrom <= date) && (!row.effTo || row.effTo >= date)

/** Price rows for a vendor + item that are active on a date, lowest tier first. */
export function activePriceRows(
  prices: readonly PurchasePrice[],
  vendor: string,
  item: string,
  date: string,
): PurchasePrice[] {
  return prices
    .filter((r) => r.vendor === vendor && r.item === item && r.price != null && isActiveOn(r, date))
    .sort((a, b) => (Number(a.minQty) || 1) - (Number(b.minQty) || 1))
}

export type PriceResolution =
  | { status: 'noPrice'; tiers: PurchasePrice[]; min: number }
  | { status: 'belowMoq'; tiers: PurchasePrice[]; min: number; next: PurchasePrice }
  | { status: 'ok'; tiers: PurchasePrice[]; min: number; row: PurchasePrice; price: number; next: PurchasePrice | null }

/**
 * The price a vendor charges for a quantity on a date: the tier with the
 * largest minQty that is ≤ qty. No active rows → `noPrice`; every tier above
 * the quantity → `belowMoq` (min = the lowest tier's minQty).
 */
export function resolvePrice(
  prices: readonly PurchasePrice[],
  vendor: string,
  item: string,
  qty: number,
  date: string,
): PriceResolution {
  const tiers = vendor && item ? activePriceRows(prices, vendor, item, date) : []
  if (!tiers.length) return { status: 'noPrice', tiers, min: 1 }
  const q = Number(qty) || 0
  const min = Number(tiers[0].minQty) || 1
  let row: PurchasePrice | null = null
  for (const tier of tiers) if ((Number(tier.minQty) || 1) <= q) row = tier
  if (!row) return { status: 'belowMoq', tiers, min, next: tiers[0] }
  return {
    status: 'ok',
    tiers,
    min,
    row,
    price: Number(row.price) || 0,
    next: tiers.find((t) => (Number(t.minQty) || 1) > q) ?? null,
  }
}

/** Items a vendor has at least one active price for on a date. */
export function vendorPricedItems(prices: readonly PurchasePrice[], vendor: string, date: string): Set<string> {
  return new Set(prices.filter((r) => r.vendor === vendor && r.price != null && isActiveOn(r, date)).map((r) => r.item))
}

export function purchasePriceNextNo(prices: readonly Pick<PurchasePrice, 'no'>[]): string {
  return nextNo(
    'PP',
    prices.map((p) => p.no),
  )
}
