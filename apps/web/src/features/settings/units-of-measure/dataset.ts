import type { Dataset, GridColumn } from '@/components/data-grid/model'
import {
  UOM_CATEGORIES,
  type Uom,
  categoryName,
  uqcLabel,
} from '@/domain/units-of-measure'
import { EM_DASH } from '@/lib/format'

export interface UomRow extends Uom {
  /** Base units in one of this unit; blank for standalone or default units. */
  factor: string
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

const sourceOf = (u: Uom) => (u.custom ? 'Custom' : 'Default')

export function uomDataset(): Dataset<UomRow> {
  const raw = (u: UomRow, key: string): string => {
    switch (key) {
      case 'code':
        return u.code
      case 'name':
        return u.name
      case 'cat':
        return categoryName(u.cat)
      case 'uqc':
        return uqcLabel(u.uqc)
      case 'conv':
        return u.conv
      case 'sym':
        return u.sym === EM_DASH ? '' : u.sym
      case 'source':
        return sourceOf(u)
      default:
        return ''
    }
  }

  return {
    id: 'settings-uom',
    noun: 'unit',
    nounPlural: 'units',
    idOf: (u) => u.code,
    columns: [
      col('code', 'Code', 96, { frozen: 'left', type: 'mono', hideable: false }),
      col('name', 'Name', 180, { min: 120 }),
      col('cat', 'Category', 110),
      col('uqc', 'GST UQC', 170, { type: 'mono' }),
      col('conv', 'Conversion', 180),
      col('sym', 'Symbol', 84),
      col('source', 'Source', 100, { type: 'pill' }),
    ],
    raw,
    text: (u, key) => raw(u, key) || EM_DASH,
    searchBlob: (u) =>
      [u.code, u.name, categoryName(u.cat), u.uqc, uqcLabel(u.uqc), u.conv, u.sym, sourceOf(u)]
        .join(' \u0001 ')
        .toLowerCase(),
    views: [
      { id: 'all', name: 'All units', system: true, filters: [] },
      { id: 'custom', name: 'Custom', filters: [{ key: 'source', op: 'isAny', value: ['Custom'] }] },
      ...UOM_CATEGORIES.map((c) => ({
        id: c.id,
        name: c.name,
        filters: [{ key: 'cat', op: 'isAny' as const, value: [c.name] }],
      })),
    ],
    filterColumns: [
      { key: 'code', label: 'Code', type: 'text' },
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'cat', label: 'Category', type: 'enum', options: UOM_CATEGORIES.map((c) => c.name) },
      { key: 'uqc', label: 'GST UQC', type: 'text' },
      { key: 'source', label: 'Source', type: 'enum', options: ['Default', 'Custom'] },
    ],
    // Custom units first, then GST defaults in their canonical category order.
    defaultSort: { key: 'source', dir: 'asc' },
  }
}
