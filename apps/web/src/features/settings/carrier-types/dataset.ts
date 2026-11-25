import type { Dataset, GridColumn } from '@/components/data-grid/model'
import type { CarrierTypeRecord } from '@/data/schemas'
import { CARRIER_BEHAVIORS, carrierBehaviorLabel } from '@/domain/carriers'
import { EM_DASH } from '@/lib/format'

/** A type plus how many carriers use it (worked out from the carriers, never stored). */
export type CarrierTypeRow = CarrierTypeRecord & { carriers: number }

export const toCarrierTypeRecord = (r: CarrierTypeRow): CarrierTypeRecord => ({
  code: r.code,
  name: r.name,
  behavior: r.behavior,
  refLabel: r.refLabel,
  desc: r.desc,
  active: r.active,
  system: r.system,
  ...(r.createdAt ? { createdAt: r.createdAt } : {}),
  ...(r.updatedAt ? { updatedAt: r.updatedAt } : {}),
})

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

const statusOf = (t: CarrierTypeRecord) => (t.active ? 'Active' : 'Inactive')
const sourceOf = (t: CarrierTypeRecord) => (t.system ? 'Built-in' : 'Custom')
const refOf = (t: CarrierTypeRecord) => (t.behavior === 'own' ? '' : t.refLabel || 'Tracking no.')

export function carrierTypesDataset(): Dataset<CarrierTypeRow> {
  const raw = (t: CarrierTypeRow, key: string): string | number => {
    switch (key) {
      case 'code':
        return t.code
      case 'name':
        return t.name
      case 'behavior':
        return carrierBehaviorLabel(t.behavior)
      case 'ref':
        return refOf(t)
      case 'carriers':
        return t.carriers
      case 'source':
        return sourceOf(t)
      case 'status':
        return statusOf(t)
      default:
        return ''
    }
  }
  return {
    id: 'settings-carrier-types',
    noun: 'type',
    nounPlural: 'types',
    idOf: (t) => t.code,
    columns: [
      col('code', 'Code', 112, { frozen: 'left', type: 'mono', hideable: false }),
      col('name', 'Type', 200, { min: 120 }),
      col('behavior', 'Behaves as', 200),
      col('ref', 'Tracking ref.', 120),
      col('carriers', 'Carriers', 88, { type: 'num', align: 'right' }),
      col('source', 'Source', 96),
      col('status', 'Status', 100, { type: 'pill' }),
    ],
    raw,
    text: (t, key) => {
      const v = raw(t, key)
      return v === '' ? EM_DASH : String(v)
    },
    searchBlob: (t) =>
      [t.code, t.name, carrierBehaviorLabel(t.behavior), refOf(t), t.desc, sourceOf(t), statusOf(t)]
        .join(' \u0001 ')
        .toLowerCase(),
    views: [
      { id: 'all', name: 'All types', system: true, filters: [] },
      { id: 'builtin', name: 'Built-in', filters: [{ key: 'source', op: 'isAny', value: ['Built-in'] }] },
      { id: 'custom', name: 'Custom', filters: [{ key: 'source', op: 'isAny', value: ['Custom'] }] },
      { id: 'inactive', name: 'Inactive', filters: [{ key: 'status', op: 'isAny', value: ['Inactive'] }] },
    ],
    filterColumns: [
      { key: 'code', label: 'Code', type: 'text' },
      { key: 'name', label: 'Type', type: 'text' },
      { key: 'behavior', label: 'Behaves as', type: 'enum', options: CARRIER_BEHAVIORS.map((b) => b.label) },
      { key: 'source', label: 'Source', type: 'enum', options: ['Built-in', 'Custom'] },
      { key: 'status', label: 'Status', type: 'enum', options: ['Active', 'Inactive'] },
    ],
    defaultSort: { key: 'source', dir: 'asc' },
  }
}
