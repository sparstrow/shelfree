import type { ItemUnitSet } from '@/data/schemas'
import { seedItems } from './seed-data.js'

interface SeedItem {
  no: string
  uom?: string
}

/**
 * Initial per-item unit sets derived from each seeded item's base unit (`item.uom`),
 * matching the prototype's `itemUomFor` default (base unit only).
 */
export function seedItemUnits(): ItemUnitSet[] {
  return (seedItems() as SeedItem[]).map((it) => {
    const base = (it.uom ?? '').trim().toUpperCase()
    return {
      itemNo: it.no,
      list: base ? [base] : [],
      base,
      pack: '',
      qty: {},
    }
  })
}
