import type { Dataset, GridColumn, RawValue } from '@/components/data-grid/model'
import { type ItemUnitRow, UOM_CATEGORIES, formatFactor } from '@/domain/units-of-measure'
import { EM_DASH } from '@/lib/format'

const COLUMNS: GridColumn[] = [
  { key: 'itemNo', label: 'Item', width: 142, min: 100, frozen: 'left', visible: true, align: 'left', type: 'mono', sortable: true },
  { key: 'itemDesc', label: 'Description', width: 280, min: 160, frozen: false, visible: true, align: 'left', type: 'text', sortable: true },
  { key: 'code', label: 'Unit', width: 96, min: 72, frozen: false, visible: true, align: 'left', type: 'mono', sortable: true },
  { key: 'name', label: 'Unit name', width: 138, min: 96, frozen: false, visible: true, align: 'left', type: 'text', sortable: true },
  { key: 'catName', label: 'Measurement', width: 122, min: 92, frozen: false, visible: true, align: 'left', type: 'text', sortable: true },
  { key: 'uqc', label: 'UQC', width: 86, min: 66, frozen: false, visible: true, align: 'left', type: 'mono', sortable: true },
  { key: 'qtyInBase', label: 'Qty in base', width: 118, min: 90, frozen: false, visible: true, align: 'right', type: 'num', sortable: true },
  { key: 'base', label: 'Base unit', width: 106, min: 82, frozen: false, visible: true, align: 'left', type: 'mono', sortable: true },
  { key: 'role', label: 'Role', width: 122, min: 92, frozen: false, visible: true, align: 'left', type: 'pill', sortable: true },
  { key: 'category', label: 'Item category', width: 138, min: 100, frozen: false, visible: false, align: 'left', type: 'text', sortable: true },
  { key: 'source', label: 'Source', width: 100, min: 80, frozen: false, visible: false, align: 'left', type: 'text', sortable: true },
]

/**
 * Warehouse ▸ Units of Measure grid definition — one derived row per item × unit,
 * matching the prototype's `itemUnits` dataset.
 */
export function itemUnitDataset(rows: readonly ItemUnitRow[]): Dataset<ItemUnitRow> {
  const categories = [...new Set(rows.map((r) => r.category).filter(Boolean))].sort()

  const raw = (r: ItemUnitRow, key: string): RawValue => {
    switch (key) {
      case 'no':
        return r.no
      case 'qtyInBase':
        return r.qtyInBase == null ? -1 : r.qtyInBase
      case 'convSet':
        return r.qtyInBase == null ? 'Not set' : 'Set'
      case 'itemNo':
        return r.itemNo
      case 'itemDesc':
        return r.itemDesc
      case 'code':
        return r.code
      case 'name':
        return r.name
      case 'catName':
        return r.catName
      case 'uqc':
        return r.uqc
      case 'base':
        return r.base
      case 'role':
        return r.role
      case 'category':
        return r.category
      case 'source':
        return r.source
      default:
        return ''
    }
  }

  const text = (r: ItemUnitRow, key: string): string => {
    switch (key) {
      case 'qtyInBase':
        return r.qtyInBase == null ? EM_DASH : `${formatFactor(r.qtyInBase)}${r.base ? ` ${r.base}` : ''}`
      case 'base':
        return r.base || EM_DASH
      case 'itemNo':
      case 'itemDesc':
      case 'code':
      case 'name':
      case 'catName':
      case 'uqc':
      case 'role':
      case 'category':
      case 'source': {
        const val = r[key]
        return val !== '' && val != null ? String(val) : EM_DASH
      }
      default:
        return ''
    }
  }

  return {
    id: 'item-units',
    noun: 'item unit',
    nounPlural: 'item units',
    idOf: (r) => r.no,
    rowFlag: (r) => (r.qtyInBase == null ? 'Missing conversion — set how many base units this unit holds' : null),
    columns: COLUMNS,
    raw,
    text,
    searchBlob: (r) =>
      [r.itemNo, r.itemDesc, r.code, r.name, r.catName, r.uqc, r.base, r.role, r.source, r.qtyInBase ?? '']
        .filter((v) => v !== '')
        .join(' \u0001 ')
        .toLowerCase(),
    views: [
      { id: 'all', name: 'All item units', system: true, filters: [] },
      { id: 'packs', name: 'Pack units', filters: [{ key: 'role', op: 'isAny', value: ['Master pack', 'Pack unit'] }] },
      { id: 'unset', name: 'Missing conversion', filters: [{ key: 'convSet', op: 'isAny', value: ['Not set'] }] },
    ],
    filterColumns: [
      { key: 'itemNo', label: 'Item', type: 'text' },
      { key: 'itemDesc', label: 'Description', type: 'text' },
      { key: 'code', label: 'Unit', type: 'text' },
      { key: 'catName', label: 'Measurement', type: 'enum', options: UOM_CATEGORIES.map((c) => c.name) },
      { key: 'uqc', label: 'UQC', type: 'text' },
      { key: 'role', label: 'Role', type: 'enum', options: ['Base', 'Master pack', 'Pack unit'] },
      { key: 'base', label: 'Base unit', type: 'text' },
      { key: 'convSet', label: 'Conversion', type: 'enum', options: ['Set', 'Not set'] },
      { key: 'source', label: 'Source', type: 'enum', options: ['System', 'Custom'] },
      { key: 'qtyInBase', label: 'Qty in base', type: 'num' },
      { key: 'category', label: 'Item category', type: 'enum', options: categories },
    ],
    defaultSort: { key: 'no', dir: 'asc' },
  }
}
