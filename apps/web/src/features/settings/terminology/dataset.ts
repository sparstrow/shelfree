import type { Dataset, GridColumn } from '@/components/data-grid/model'
import { TERM_GROUPS, type TermRow } from '@/domain/terminology'
import { EM_DASH } from '@/lib/format'

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

const statusOf = (r: TermRow) => (r.renamed ? 'Renamed' : 'Original')

export function terminologyDataset(): Dataset<TermRow> {
  const raw = (r: TermRow, key: string): string | number => {
    switch (key) {
      case 'groupName':
        return r.groupName
      case 'origSingular':
        return r.origSingular
      case 'origPlural':
        return r.origPlural
      case 'singular':
        return r.singular
      case 'plural':
        return r.plural
      case 'status':
        return statusOf(r)
      default:
        return ''
    }
  }
  return {
    id: 'settings-terminology',
    noun: 'label',
    nounPlural: 'labels',
    idOf: (r) => r.id,
    labelOf: (r) => r.origSingular,
    columns: [
      col('origSingular', 'Original', 190, { frozen: 'left', hideable: false }),
      col('origPlural', 'Original plural', 170, { visible: false }),
      col('singular', 'Singular', 180),
      col('plural', 'Plural', 180),
      col('groupName', 'Group', 170),
      col('status', 'Status', 110, { type: 'pill' }),
    ],
    raw,
    text: (r, key) => String(raw(r, key) === '' ? EM_DASH : raw(r, key)),
    searchBlob: (r) => [r.origSingular, r.origPlural, r.singular, r.plural, r.groupName].join(' \u0001 ').toLowerCase(),
    views: [
      { id: 'all', name: 'All labels', system: true, filters: [] },
      { id: 'renamed', name: 'Renamed', filters: [{ key: 'status', op: 'isAny', value: ['Renamed'] }] },
      ...TERM_GROUPS.map((g) => ({ id: `group:${g.id}`, name: g.name, filters: [{ key: 'groupName', op: 'isAny' as const, value: [g.name] }] })),
    ],
    filterColumns: [
      { key: 'origSingular', label: 'Original', type: 'text' },
      { key: 'singular', label: 'Singular', type: 'text' },
      { key: 'groupName', label: 'Group', type: 'enum', options: TERM_GROUPS.map((g) => g.name) },
      { key: 'status', label: 'Status', type: 'enum', options: ['Renamed', 'Original'] },
    ],
  }
}
