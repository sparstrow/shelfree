import type { Dataset, GridColumn } from '@/components/data-grid/model'
import type { SettingsModuleId } from '@/components/settings/registry'
import type { StatusDef } from '@/data/schemas'
import {
  CATEGORY_LABELS,
  STATUS_MODULE_LABELS,
  TONE_LABELS,
  flowLabel,
  flowsForModule,
  moduleLabel,
  sourceOf,
  STATUS_FLOW_IDS,
} from '@/domain/statuses'
import { EM_DASH } from '@/lib/format'

/** Editable row: `order` is a string while the user types. */
export type StatusRow = Omit<StatusDef, 'order'> & { order: number | string }

/** Coerce a draft row into a strict `StatusDef`. */
export function toStatusDef(row: StatusRow): StatusDef {
  const order = typeof row.order === 'number' ? row.order : row.order.trim() === '' ? Number.NaN : Number(row.order)
  return { ...row, order }
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

export function statusesDataset(module?: SettingsModuleId): Dataset<StatusRow> {
  const flows = module ? flowsForModule(module) : STATUS_FLOW_IDS
  const raw = (r: StatusRow, key: string): string | number => {
    const s = toStatusDef(r)
    switch (key) {
      case 'flow':
        return flowLabel(s.flow)
      case 'name':
        return s.name
      case 'module':
        return moduleLabel(s.module)
      case 'category':
        return CATEGORY_LABELS[s.category]
      case 'tone':
        return TONE_LABELS[s.tone]
      case 'order':
        return Number.isFinite(s.order) ? s.order : 0
      case 'source':
        return sourceOf(s)
      default:
        return ''
    }
  }
  return {
    id: module ? `settings-statuses-${module}` : 'settings-statuses',
    noun: 'status',
    nounPlural: 'statuses',
    idOf: (r) => r.id,
    columns: [
      col('flow', 'Document', 150, { visible: false, groupable: true }),
      col('name', 'Status', 190, { frozen: 'left', hideable: false, min: 120 }),
      ...(!module ? [col('module', 'Module', 116)] : []),
      col('category', 'Type', 96),
      col('tone', 'Colour', 96),
      col('order', 'Order', 80, { type: 'num', align: 'right' }),
      col('source', 'Source', 96, { type: 'pill' }),
    ],
    raw,
    text: (r, key) => {
      const v = raw(r, key)
      return v === '' ? EM_DASH : String(v)
    },
    searchBlob: (r) =>
      [r.id, flowLabel(r.flow), r.name, moduleLabel(r.module), CATEGORY_LABELS[r.category], TONE_LABELS[r.tone], sourceOf(r)]
        .join(' \u0001 ')
        .toLowerCase(),
    views: [
      { id: 'all', name: 'All statuses', system: true, filters: [] },
      { id: 'open', name: 'Open', filters: [{ key: 'category', op: 'isAny', value: ['Open'] }] },
      { id: 'closed', name: 'Closed', filters: [{ key: 'category', op: 'isAny', value: ['Closed'] }] },
      { id: 'custom', name: 'Custom', filters: [{ key: 'source', op: 'isAny', value: ['Custom'] }] },
    ],
    filterColumns: [
      { key: 'flow', label: 'Document', type: 'enum', options: flows.map(flowLabel) },
      { key: 'name', label: 'Status', type: 'text' },
      ...(!module
        ? [{ key: 'module', label: 'Module', type: 'enum' as const, options: Object.values(STATUS_MODULE_LABELS) }]
        : []),
      { key: 'category', label: 'Type', type: 'enum', options: Object.values(CATEGORY_LABELS) },
      { key: 'source', label: 'Source', type: 'enum', options: ['System', 'Custom'] },
    ],
    defaultSort: { key: 'order', dir: 'asc' },
    defaultGroupBy: 'flow',
  }
}
