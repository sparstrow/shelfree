import type { Dataset } from '@/components/data-grid/model'
import type { Item, Warehouse } from '@/data/schemas'
import {
  itemAvailable,
  itemCategoryParent,
  itemCategorySub,
  itemCommitted,
  itemLowStockFlag,
  itemMargin,
  itemOnHand,
  itemPrimarySite,
  itemSiteSpread,
  itemStockStatus,
} from '@/domain/item'
import { EM_DASH, int, money, pct } from '@/lib/format'

export interface ItemLookups {
  items: readonly Item[]
  warehouses: readonly Warehouse[]
}

/**
 * Warehouse ▸ Items grid definition (columns, default visibility, widths,
 * views, filters, search and low-stock row flag).
 */
export function itemDataset({ items, warehouses }: ItemLookups): Dataset<Item> {
  const categories = [...new Set(items.map((it) => itemCategoryParent(it.category)).filter(Boolean))].sort()
  const subCategories = [...new Set(items.map((it) => itemCategorySub(it.category)).filter(Boolean))].sort()
  const warehouseNames = warehouses.map((w) => w.name).filter(Boolean)

  return {
    id: 'items',
    noun: 'item',
    nounPlural: 'items',
    idOf: (it) => it.no,
    rowFlag: (it) => itemLowStockFlag(it),
    columns: [
      { key: 'no', label: 'No.', width: 142, min: 90, frozen: 'left', visible: true, align: 'left', type: 'mono', sortable: true },
      { key: 'desc', label: 'Description', width: 300, min: 160, visible: true, align: 'left', type: 'text', sortable: true },
      { key: 'category', label: 'Category', width: 124, min: 90, visible: true, align: 'left', type: 'text', sortable: true },
      { key: 'subCategory', label: 'Sub-category', width: 142, min: 96, visible: true, align: 'left', type: 'text', sortable: true },
      { key: 'baseUom', label: 'Base UoM', width: 112, min: 80, visible: true, align: 'left', type: 'mono', sortable: true },
      { key: 'masterPack', label: 'Master Pack UoM', width: 150, min: 110, visible: true, align: 'left', type: 'mono', sortable: true },
      { key: 'location', label: 'Location', width: 150, min: 100, visible: true, align: 'left', type: 'text', sortable: true },
      { key: 'onHand', label: 'Qty on hand', width: 114, min: 84, visible: true, align: 'right', type: 'num', sortable: true, agg: 'sum', aggFmt: 'int' },
      { key: 'available', label: 'Available', width: 104, min: 80, visible: true, align: 'right', type: 'num', sortable: true, agg: 'sum', aggFmt: 'int' },
      { key: 'committed', label: 'Committed', width: 110, min: 80, visible: false, align: 'right', type: 'num', sortable: true, agg: 'sum', aggFmt: 'int' },
      { key: 'price', label: 'Unit price', width: 112, min: 84, visible: true, align: 'right', type: 'num', sortable: true },
      { key: 'cost', label: 'Unit cost', width: 112, min: 84, visible: false, align: 'right', type: 'num', sortable: true },
      { key: 'margin', label: 'Margin', width: 92, min: 70, visible: false, align: 'right', type: 'num', sortable: true },
      { key: 'vendor', label: 'Vendor', width: 184, min: 120, visible: false, align: 'left', type: 'text', sortable: true },
      { key: 'lead', label: 'Lead time', width: 104, min: 80, visible: false, align: 'right', type: 'num', sortable: true },
      { key: 'expiry', label: 'Expiry', width: 112, min: 88, visible: true, align: 'left', type: 'text', sortable: true },
      { key: 'barcode', label: 'Barcode', width: 146, min: 110, visible: true, align: 'left', type: 'mono', sortable: true },
    ],
    raw: (it, key) => {
      switch (key) {
        case 'no':
          return it.no
        case 'desc':
          return it.desc
        case 'category':
          return itemCategoryParent(it.category)
        case 'subCategory':
          return itemCategorySub(it.category)
        case 'baseUom':
          return it.uom || ''
        case 'masterPack':
          return ''
        case 'vendor':
          return it.vendor || ''
        case 'onHand':
          return itemOnHand(it)
        case 'available':
          return itemAvailable(it)
        case 'committed':
          return itemCommitted(it)
        case 'price':
          return it.price
        case 'cost':
          return it.cost
        case 'margin':
          return itemMargin(it) ?? -1
        case 'lead':
          return it.lead
        case 'location':
          return itemPrimarySite(it, warehouses)?.name ?? ''
        case 'expiry':
          return it.tracksExpiry ? 'Tracked' : ''
        case 'barcode':
          return it.barcode || ''
        case '_status':
          return itemStockStatus(it)
        default:
          return ''
      }
    },
    text: (it, key) => {
      switch (key) {
        case 'no':
          return it.no
        case 'desc':
          return it.desc
        case 'category':
          return itemCategoryParent(it.category) || EM_DASH
        case 'subCategory':
          return itemCategorySub(it.category) || EM_DASH
        case 'baseUom':
          return it.uom || EM_DASH
        case 'masterPack':
          return EM_DASH
        case 'onHand':
          return int(itemOnHand(it))
        case 'available':
          return int(itemAvailable(it))
        case 'committed':
          return int(itemCommitted(it))
        case 'price':
          return money(it.price)
        case 'cost':
          return money(it.cost)
        case 'margin': {
          const margin = itemMargin(it)
          return margin == null ? EM_DASH : pct(margin)
        }
        case 'vendor':
          return it.vendor || EM_DASH
        case 'lead':
          return `${it.lead} d`
        case 'location': {
          const site = itemPrimarySite(it, warehouses)
          if (!site) return EM_DASH
          const extra = itemSiteSpread(it, warehouses) - 1
          return extra > 0 ? `${site.short}  +${extra}` : site.short
        }
        case 'expiry':
          return it.tracksExpiry ? 'Tracked' : EM_DASH
        case 'barcode':
          return it.barcode || EM_DASH
        default:
          return ''
      }
    },
    searchBlob: (it) => {
      const margin = itemMargin(it)
      const marginText = margin == null ? '' : `${Math.round(margin * 100)}%`
      return [
        it.no,
        it.desc,
        itemCategoryParent(it.category),
        itemCategorySub(it.category),
        it.uom,
        itemOnHand(it),
        itemAvailable(it),
        itemCommitted(it),
        it.price,
        it.cost,
        marginText,
        it.lead,
        it.vendor,
        it.barcode,
        itemPrimarySite(it, warehouses)?.name ?? '',
      ]
        .filter((v) => v !== '' && v != null)
        .join(' \u0001 ')
        .toLowerCase()
    },
    views: [
      { id: 'all', name: 'All items', system: true, filters: [] },
      { id: 'low', name: 'Low stock', filters: [{ key: '_status', op: 'isAny', value: ['Low stock', 'Out of stock'] }] },
    ],
    filterColumns: [
      { key: 'no', label: 'No.', type: 'text' },
      { key: 'desc', label: 'Description', type: 'text' },
      { key: 'category', label: 'Category', type: 'enum', options: categories },
      { key: 'subCategory', label: 'Sub-category', type: 'enum', options: subCategories },
      { key: 'vendor', label: 'Vendor', type: 'text' },
      { key: '_status', label: 'Stock status', type: 'enum', options: ['Low stock', 'Healthy', 'Out of stock'] },
      { key: 'onHand', label: 'Qty on hand', type: 'num' },
      { key: 'available', label: 'Available', type: 'num' },
      { key: 'committed', label: 'Committed', type: 'num' },
      { key: 'price', label: 'Unit price', type: 'num' },
      { key: 'cost', label: 'Unit cost', type: 'num' },
      { key: 'lead', label: 'Lead time (days)', type: 'num' },
      { key: 'location', label: 'Location', type: 'enum', options: warehouseNames },
      { key: 'expiry', label: 'Expiry', type: 'enum', options: ['Tracked'] },
      { key: 'barcode', label: 'Barcode', type: 'text' },
    ],
  }
}
