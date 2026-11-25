import type { Dataset, GridColumn } from '@/components/data-grid/model'
import type { ItemCategory } from '@/data/schemas'
import { EM_DASH } from '@/lib/format'

/** A category with what the grid shows about its place in the tree. */
export interface CategoryRow extends ItemCategory {
  depth: number
  /** Parent's name, '' for a top-level category. */
  parentName: string
  /** Top-level category it belongs to (itself when top-level). */
  group: string
  /** `Finished Goods › Sambrani Holder`. */
  path: string
  /** Items in this category and beneath it. */
  itemCount: number
  /** Direct sub-categories. */
  subCount: number
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

const statusOf = (c: Pick<ItemCategory, 'active'>) => (c.active ? 'Active' : 'Inactive')

/** `groups` = the top-level categories' names, for the group views and filter. */
export function itemCategoriesDataset(groups: readonly string[]): Dataset<CategoryRow> {
  const raw = (c: CategoryRow, key: string): string | number => {
    switch (key) {
      case 'code':
        return c.code
      case 'name':
        return c.name
      case 'desc':
        return c.desc
      case 'parent':
        return c.parentName
      case 'group':
        return c.group
      case 'items':
        return c.itemCount
      case 'status':
        return statusOf(c)
      default:
        return ''
    }
  }
  return {
    id: 'settings-item-categories',
    noun: 'category',
    nounPlural: 'categories',
    idOf: (c) => c.id,
    labelOf: (c) => c.code,
    columns: [
      col('code', 'Code', 96, { frozen: 'left', type: 'mono', hideable: false }),
      col('name', 'Category', 220, { min: 140 }),
      col('desc', 'Description', 320, { min: 160, muted: true }),
      col('parent', 'Parent', 160),
      col('group', 'Group', 150, { visible: false }),
      col('items', 'Items', 84, { type: 'num', align: 'right', agg: 'sum', aggFmt: 'int' }),
      col('status', 'Status', 104, { type: 'pill' }),
    ],
    raw,
    text: (c, key) => String(raw(c, key) === '' ? EM_DASH : raw(c, key)),
    searchBlob: (c) => [c.code, c.name, c.parentName, c.group, c.desc, c.path].join(' \u0001 ').toLowerCase(),
    views: [
      { id: 'all', name: 'All categories', system: true, filters: [] },
      { id: 'active', name: 'Active', filters: [{ key: 'status', op: 'isAny', value: ['Active'] }] },
      { id: 'inactive', name: 'Inactive', filters: [{ key: 'status', op: 'isAny', value: ['Inactive'] }] },
      ...groups.map((g) => ({
        id: `group:${g}`,
        name: g,
        filters: [{ key: 'group', op: 'isAny' as const, value: [g] }],
      })),
    ],
    filterColumns: [
      { key: 'code', label: 'Code', type: 'text' },
      { key: 'name', label: 'Category', type: 'text' },
      { key: 'group', label: 'Group', type: 'enum', options: [...groups] },
      { key: 'status', label: 'Status', type: 'enum', options: ['Active', 'Inactive'] },
    ],
  }
}
