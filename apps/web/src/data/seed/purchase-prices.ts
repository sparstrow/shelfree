/**
 * Demo purchase prices. The prototype had no hand-written price list: it built
 * one from the seeded purchase orders — one base price (from qty 1) per
 * vendor + item, effective from the first order date, at the cost on the most
 * recent order. This reproduces that so every seeded order line has a price.
 */
import { seedItems, seedPurchaseOrders } from './seed-data.js'

interface SeedItem {
  no: string
  lead?: number
}
interface SeedOrder {
  vendor: string
  orderDate: string
  status: string
  lines: { item: string; unitCost: number }[]
}

const SEEDED_AT = '2026-10-17T09:00:00.000Z'

export function seedPurchasePrices(): unknown[] {
  const items = new Map((seedItems() as SeedItem[]).map((i) => [i.no, i]))
  const pairs = new Map<string, { vendor: string; item: string; first: string; last: string; cost: number }>()

  for (const po of seedPurchaseOrders() as SeedOrder[]) {
    if (po.status === 'Cancelled' || !po.vendor) continue
    for (const line of po.lines ?? []) {
      if (!line.item || !items.has(line.item)) continue
      const key = po.vendor + '|' + line.item
      const date = String(po.orderDate || '')
      const cost = Number(line.unitCost) || 0
      const current = pairs.get(key)
      if (!current) {
        pairs.set(key, { vendor: po.vendor, item: line.item, first: date, last: date, cost })
      } else {
        if (date && date < current.first) current.first = date
        if (date >= current.last) {
          current.last = date
          current.cost = cost
        }
      }
    }
  }

  return [...pairs.values()]
    .sort((a, b) => (a.vendor + a.item).localeCompare(b.vendor + b.item))
    .map((pair, index) => ({
      no: 'PP' + String(index + 1).padStart(5, '0'),
      vendor: pair.vendor,
      item: pair.item,
      vendorItemNo: '',
      minQty: 1,
      price: pair.cost,
      currency: 'INR',
      leadDays: items.get(pair.item)?.lead ?? null,
      effFrom: pair.first,
      effTo: '',
      note: 'From existing purchase orders',
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
    }))
}
