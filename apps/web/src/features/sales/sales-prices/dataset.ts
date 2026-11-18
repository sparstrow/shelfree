import type { Dataset, GridColumn } from '@/components/data-grid/model'
import type { Customer, Item } from '@/data/schemas'
import { itemCategoryParent } from '@/domain/item'
import {
  type CustomerPriceEditableKey,
  type CustomerPriceRow,
  type ListPriceRow,
  type SalesPricingSettings,
  customerPriceStatus,
  isCustomerPricingEligible,
  priceDeltaVsList,
  priceDeltaVsListText,
} from '@/domain/sales-prices'
import { EM_DASH, fmtDate, int, money } from '@/lib/format'

export interface ListPriceDatasetOptions {
  items: readonly Item[]
  commit: (row: ListPriceRow, value: string) => Promise<string | void>
}

/** Sales ▸ Sales Prices ▸ List prices tab — all items with inline-editable list prices. */
export function listPriceDataset({ items, commit }: ListPriceDatasetOptions): Dataset<ListPriceRow> {
  const categories = [...new Set(items.map((it) => itemCategoryParent(it.category)).filter(Boolean))].sort()

  const raw = (r: ListPriceRow, key: string): string | number => {
    switch (key) {
      case 'margin':
        return r.margin == null ? -9999 : r.margin
      case 'markup':
        return r.markup == null ? -9999 : r.markup
      case 'custCount':
        return r.custCount
      default: {
        const v = r[key as keyof ListPriceRow]
        return v == null ? '' : (v as string | number)
      }
    }
  }

  const text = (r: ListPriceRow, key: string): string => {
    switch (key) {
      case 'cost':
        return money(r.cost)
      case 'price':
        return money(r.price)
      case 'margin':
        return r.margin == null ? EM_DASH : `${r.margin}%`
      case 'markup':
        return r.markup == null ? EM_DASH : `${r.markup}%`
      case 'custCount':
        return r.custCount ? int(r.custCount) : EM_DASH
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
    min: Math.min(width, 72),
    visible: true,
    align: 'left',
    type: 'text',
    sortable: true,
    ...extra,
  })

  return {
    id: 'sales-list-prices',
    noun: 'list price',
    nounPlural: 'list prices',
    idOf: (r) => r.no,
    columns: [
      col('no', 'Item', 142, { min: 100, frozen: 'left', type: 'mono' }),
      col('desc', 'Description', 280, { min: 160 }),
      col('uom', 'UoM', 80, { min: 62, type: 'mono' }),
      col('cost', 'Unit cost', 116, { min: 90, align: 'right', type: 'num' }),
      col('price', 'List price', 128, {
        min: 100,
        align: 'right',
        type: 'num',
        edit: {
          kind: 'number',
          step: '0.01',
          min: '0',
          value: (r: ListPriceRow) => String(r.price),
          commit: (r: ListPriceRow, value: string) => commit(r, value),
        },
      }),
      col('margin', 'Margin %', 104, { min: 84, align: 'right', type: 'num' }),
      col('priceState', 'Price status', 122, { min: 96, type: 'pill' }),
      col('custCount', 'Customer prices', 132, { min: 96, align: 'right', type: 'num', agg: 'sum', aggFmt: 'int' }),
      col('markup', 'Markup %', 104, { min: 84, visible: false, align: 'right', type: 'num' }),
      col('category', 'Category', 148, { min: 100, visible: false }),
    ],
    raw,
    text,
    searchBlob: (r) => [r.no, r.desc, r.category, r.uom, r.cost, r.price, r.priceState].join(' \u0001 ').toLowerCase(),
    views: [
      { id: 'all', name: 'All list prices', system: true, filters: [], sorts: [{ key: 'no', dir: 'asc' }] },
      {
        id: 'unpriced',
        name: 'Needs a price',
        filters: [{ key: 'priceState', op: 'isAny', value: ['No price'] }],
        sorts: [{ key: 'no', dir: 'asc' }],
      },
      {
        id: 'belowcost',
        name: 'Below cost',
        filters: [{ key: 'priceState', op: 'isAny', value: ['Below cost'] }],
        sorts: [{ key: 'no', dir: 'asc' }],
      },
      {
        id: 'thin',
        name: 'Thin margin',
        filters: [
          { key: 'priceState', op: 'isNot', value: ['No price'] },
          { key: 'margin', op: '<', value: '25' },
        ],
        sorts: [{ key: 'margin', dir: 'asc' }],
      },
      {
        id: 'agreed',
        name: 'Has agreed prices',
        filters: [{ key: 'custCount', op: '>', value: '0' }],
        sorts: [{ key: 'no', dir: 'asc' }],
      },
    ],
    filterColumns: [
      { key: 'no', label: 'Item', type: 'text' },
      { key: 'desc', label: 'Description', type: 'text' },
      { key: 'category', label: 'Category', type: 'enum', options: categories },
      { key: 'uom', label: 'UoM', type: 'text' },
      { key: 'cost', label: 'Unit cost', type: 'num' },
      { key: 'price', label: 'List price', type: 'num' },
      { key: 'margin', label: 'Margin %', type: 'num' },
      { key: 'priceState', label: 'Price status', type: 'enum', options: ['Priced', 'No price', 'Below cost'] },
      { key: 'custCount', label: 'Customer prices', type: 'num' },
    ],
    defaultSort: { key: 'no', dir: 'asc' },
    rowFlag: (r) => {
      if (r.priceState === 'No price') return 'Needs a list price.'
      if (r.priceState === 'Below cost') return 'Priced below unit cost.'
      return null
    },
  }
}

export interface CustomerPriceDatasetOptions {
  customers: readonly Customer[]
  items: readonly Item[]
  today: string
  settings: SalesPricingSettings
  commit: (row: CustomerPriceRow, key: CustomerPriceEditableKey, value: string) => Promise<string | void>
}

/** Sales ▸ Sales Prices ▸ Customer prices tab — agreed customer price overrides. */
export function customerPriceDataset({
  customers,
  items,
  today,
  settings,
  commit,
}: CustomerPriceDatasetOptions): Dataset<CustomerPriceRow> {
  const customerOf = (r: CustomerPriceRow) => customers.find((c) => c.no === r.customer)
  const itemOf = (r: CustomerPriceRow) => items.find((i) => i.no === r.item)
  const cName = (r: CustomerPriceRow) => customerOf(r)?.name ?? r.customer
  const status = (r: CustomerPriceRow) => customerPriceStatus(r, today)

  const raw = (r: CustomerPriceRow, key: string): string | number => {
    switch (key) {
      case 'customerName':
        return cName(r)
      case 'desc':
        return itemOf(r)?.desc ?? ''
      case 'uom':
        return itemOf(r)?.uom ?? ''
      case 'status':
        return status(r)
      case 'vsList':
        return priceDeltaVsList(r.price, itemOf(r)?.price ?? 0) ?? ''
      default: {
        const v = r[key as keyof CustomerPriceRow]
        return v == null ? '' : (v as string | number)
      }
    }
  }

  const text = (r: CustomerPriceRow, key: string): string => {
    switch (key) {
      case 'price':
        return r.price === '' ? EM_DASH : money(Number(r.price) || 0)
      case 'minQty':
        return int(Number(r.minQty) || 1)
      case 'vsList':
        return priceDeltaVsListText(r.price, itemOf(r)?.price ?? 0)
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
    min: Math.min(width, 72),
    visible: true,
    align: 'left',
    type: 'text',
    sortable: true,
    ...extra,
  })

  const edit = (
    key: CustomerPriceEditableKey,
    kind: 'text' | 'number' | 'date',
    extra: { step?: string; min?: string } = {},
  ) => ({
    kind,
    ...extra,
    value: (r: CustomerPriceRow) => String(r[key] ?? ''),
    commit: (r: CustomerPriceRow, value: string) => commit(r, key, value),
  })

  return {
    id: 'customer-prices',
    noun: 'customer price',
    nounPlural: 'customer prices',
    idOf: (r) => r.id,
    columns: [
      col('customer', 'Customer no.', 110, { frozen: 'left', type: 'mono', min: 84 }),
      col('customerName', 'Customer', 210, { frozen: 'left', min: 130 }),
      col('item', 'Item no.', 124, { type: 'mono' }),
      col('desc', 'Description', 260, { min: 140 }),
      col('minQty', 'From qty', 96, {
        type: 'num',
        align: 'right',
        edit: edit('minQty', 'number', { step: '1', min: '1' }),
      }),
      col('price', 'Price ₹', 116, {
        type: 'num',
        align: 'right',
        edit: edit('price', 'number', { step: '0.01', min: '0' }),
      }),
      col('vsList', 'vs list', 96, { align: 'right' }),
      col('effFrom', 'Starts', 150, { edit: edit('effFrom', 'date') }),
      col('effTo', 'Ends', 150, { edit: edit('effTo', 'date') }),
      col('status', 'Status', 110, { type: 'pill' }),
      col('note', 'Note', 220, { edit: edit('note', 'text') }),
      col('uom', 'UoM', 70, { visible: false }),
      col('id', 'Price no.', 104, { type: 'mono', visible: false }),
    ],
    raw,
    text,
    searchBlob: (r) =>
      [r.id, cName(r), r.customer, r.item, raw(r, 'desc'), status(r), r.note].join(' \u0001 ').toLowerCase(),
    views: [
      { id: 'all', name: 'All customer prices', system: true, filters: [], sorts: [{ key: 'id', dir: 'asc' }] },
      {
        id: 'active',
        name: 'Active',
        filters: [{ key: 'status', op: 'isAny', value: ['Active'] }],
        sorts: [{ key: 'id', dir: 'asc' }],
      },
      {
        id: 'scheduled',
        name: 'Scheduled',
        filters: [{ key: 'status', op: 'isAny', value: ['Scheduled'] }],
        sorts: [{ key: 'effFrom', dir: 'asc' }],
      },
      {
        id: 'expired',
        name: 'Expired',
        filters: [{ key: 'status', op: 'isAny', value: ['Expired'] }],
        sorts: [{ key: 'effTo', dir: 'desc' }],
      },
      {
        id: 'byCustomer',
        name: 'By customer',
        filters: [],
        sorts: [
          { key: 'customerName', dir: 'asc' },
          { key: 'item', dir: 'asc' },
          { key: 'minQty', dir: 'asc' },
        ],
      },
    ],
    filterColumns: [
      { key: 'customer', label: 'Customer no.', type: 'text' },
      { key: 'customerName', label: 'Customer', type: 'enum', options: customers.map((c) => c.name) },
      { key: 'item', label: 'Item no.', type: 'text' },
      { key: 'desc', label: 'Description', type: 'text' },
      { key: 'minQty', label: 'From qty', type: 'num' },
      { key: 'price', label: 'Price', type: 'num' },
      { key: 'status', label: 'Status', type: 'enum', options: ['Active', 'Scheduled', 'Expired'] },
      { key: 'note', label: 'Note', type: 'text' },
    ],
    defaultSort: { key: 'id', dir: 'asc' },
    rowFlag: (r) => {
      if (!itemOf(r)) return 'This item no longer exists.'
      const cust = customerOf(r)
      if (!cust) return 'This customer no longer exists.'
      if (!isCustomerPricingEligible(cust, settings)) {
        return `Ignored for now — ${cust.name} is not eligible under the current pricing rule.`
      }
      return null
    },
  }
}
