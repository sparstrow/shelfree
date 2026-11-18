import type { Dataset, GridColumn } from '@/components/data-grid/model'
import type { Item, Vendor } from '@/data/schemas'
import {
  PRICE_EXPIRING_DAYS,
  type PriceEditableKey,
  type PriceRow,
  priceStatus,
  priceVsCost,
  priceVsCostText,
} from '@/domain/purchase-prices'
import { EM_DASH, fmtDate, int, money } from '@/lib/format'

export interface PriceDatasetOptions {
  vendors: readonly Vendor[]
  items: readonly Item[]
  today: string
  /** Save one edited cell (always the page's latest handler); return an error message to refuse it. */
  commit: (row: PriceRow, key: PriceEditableKey, value: string) => Promise<string | void>
}

/** Purchasing ▸ Purchase Prices — columns, views, filters and search. */
export function dataset({ vendors, items, today, commit }: PriceDatasetOptions): Dataset<PriceRow> {
  const vendorOf = (r: PriceRow) => vendors.find((v) => v.no === r.vendor)
  const itemOf = (r: PriceRow) => items.find((i) => i.no === r.item)
  const vName = (r: PriceRow) => vendorOf(r)?.name ?? r.vendor
  const status = (r: PriceRow) => priceStatus(r, today)

  const raw = (r: PriceRow, key: string): string | number => {
    switch (key) {
      case 'vendorName':
        return vName(r)
      case 'desc':
        return itemOf(r)?.desc ?? ''
      case 'uom':
        return itemOf(r)?.uom ?? ''
      case 'status':
        return status(r)
      case 'vsCost':
        return priceVsCost(r.price, itemOf(r)?.cost ?? 0) ?? ''
      default: {
        const v = r[key as keyof PriceRow]
        return v == null ? '' : (v as string | number)
      }
    }
  }

  const text = (r: PriceRow, key: string): string => {
    switch (key) {
      case 'price':
        return r.price === '' ? EM_DASH : money(Number(r.price) || 0)
      case 'minQty':
        return int(Number(r.minQty) || 1)
      case 'vsCost':
        return priceVsCostText(r.price, itemOf(r)?.cost ?? 0)
      case 'leadDays':
        return r.leadDays == null || r.leadDays === '' ? EM_DASH : `${r.leadDays} days`
      case 'effFrom':
        return r.effFrom ? fmtDate(r.effFrom) : 'Always'
      case 'effTo':
        return r.effTo ? fmtDate(r.effTo) : 'Open-ended'
      default: {
        const v = raw(r, key)
        return v === '' ? EM_DASH : String(v)
      }
    }
  }

  const col = (key: string, label: string, width: number, extra: Partial<GridColumn> = {}): GridColumn => ({
    key,
    label,
    width,
    min: Math.min(width, 80),
    visible: true,
    align: 'left',
    type: 'text',
    sortable: true,
    ...extra,
  })
  /** An editable column: typed text goes through `commit` (same rules as the drawer). */
  const edit = (key: PriceEditableKey, kind: 'text' | 'number' | 'date', extra: { step?: string; min?: string } = {}) => ({
    kind,
    ...extra,
    value: (r: PriceRow) => String(r[key] ?? ''),
    commit: (r: PriceRow, value: string) => commit(r, key, value),
  })

  return {
    id: 'purchase-prices',
    noun: 'purchase price',
    nounPlural: 'purchase prices',
    idOf: (r) => r.no,
    columns: [
      col('vendor', 'Vendor no.', 104, { frozen: 'left', type: 'mono', min: 80 }),
      col('vendorName', 'Vendor', 200, { frozen: 'left', min: 120 }),
      col('item', 'Item no.', 124, { type: 'mono' }),
      col('desc', 'Description', 260, { min: 140 }),
      col('vendorItemNo', 'Vendor item code', 150, { edit: edit('vendorItemNo', 'text') }),
      col('minQty', 'From qty', 96, { type: 'num', align: 'right', edit: edit('minQty', 'number', { step: '1', min: '1' }) }),
      col('price', 'Price ₹', 116, { type: 'num', align: 'right', edit: edit('price', 'number', { step: '0.01', min: '0' }) }),
      col('vsCost', 'vs item cost', 110, { align: 'right' }),
      col('leadDays', 'Lead time (days)', 130, { type: 'num', align: 'right', edit: edit('leadDays', 'number', { step: '1', min: '0' }) }),
      col('effFrom', 'Starts', 150, { edit: edit('effFrom', 'date') }),
      col('effTo', 'Ends', 150, { edit: edit('effTo', 'date') }),
      col('status', 'Status', 110, { type: 'pill' }),
      col('note', 'Note', 220, { edit: edit('note', 'text') }),
      col('uom', 'UoM', 70, { visible: false }),
      col('no', 'Price no.', 110, { type: 'mono', visible: false }),
    ],
    raw,
    text,
    searchBlob: (r) =>
      [r.no, vName(r), r.vendor, r.item, raw(r, 'desc'), r.vendorItemNo, status(r), r.note].join(' \u0001 ').toLowerCase(),
    views: [
      { id: 'all', name: 'All prices', system: true, filters: [], sorts: [{ key: 'no', dir: 'asc' }] },
      {
        id: 'active',
        name: 'Active',
        filters: [{ key: 'status', op: 'isAny', value: ['Active', 'Expiring'] }],
        sorts: [{ key: 'no', dir: 'asc' }],
      },
      {
        id: 'expiring',
        name: `Expiring in ${PRICE_EXPIRING_DAYS} days`,
        filters: [{ key: 'status', op: 'isAny', value: ['Expiring'] }],
        sorts: [{ key: 'effTo', dir: 'asc' }],
      },
      // The grid has no group headers; "By vendor" sorts by vendor, then item.
      {
        id: 'byVendor',
        name: 'By vendor',
        filters: [],
        sorts: [
          { key: 'vendorName', dir: 'asc' },
          { key: 'item', dir: 'asc' },
        ],
      },
    ],
    filterColumns: [
      { key: 'vendor', label: 'Vendor no.', type: 'text' },
      { key: 'vendorName', label: 'Vendor', type: 'enum', options: vendors.map((v) => v.name) },
      { key: 'item', label: 'Item no.', type: 'text' },
      { key: 'desc', label: 'Description', type: 'text' },
      { key: 'vendorItemNo', label: 'Vendor item code', type: 'text' },
      { key: 'minQty', label: 'From qty', type: 'num' },
      { key: 'price', label: 'Price', type: 'num' },
      { key: 'leadDays', label: 'Lead time (days)', type: 'num' },
      { key: 'status', label: 'Status', type: 'enum', options: ['Active', 'Expiring', 'Scheduled', 'Expired'] },
      { key: 'note', label: 'Note', type: 'text' },
    ],
    defaultSort: { key: 'no', dir: 'asc' },
    rowFlag: (r) => {
      if (!itemOf(r)) return 'This item no longer exists.'
      if (!vendorOf(r)) return 'This vendor no longer exists.'
      return status(r) === 'Expiring' ? 'Ends soon.' : null
    },
  }
}
