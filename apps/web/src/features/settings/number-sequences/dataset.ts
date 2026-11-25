import type { Dataset, GridColumn } from '@/components/data-grid/model'
import type { SettingsModuleId } from '@/components/settings/registry'
import { NUMBER_SEQUENCE_DOC_TYPES, NUMBER_SEQUENCE_RESETS, type NumberSequence } from '@/data/schemas'
import {
  DOC_TYPE_LABELS,
  RESET_LABELS,
  SEQUENCE_MODULE_LABELS,
  type SequenceModuleId,
  docTypesForModule,
  formatSeriesPattern,
  moduleOfDocType,
  previewNext,
  seriesStatus,
} from '@/domain/number-sequences'
import { EM_DASH } from '@/lib/format'

/** Editable row shape (number inputs hold strings while the user types). */
export type NumberSequenceRow = Omit<NumberSequence, 'digits' | 'next'> & {
  digits: number | string
  next: number | string
}

/** Coerce a draft row into a strict `NumberSequence` for domain validation and saving. */
export function toNumberSequence(row: NumberSequenceRow): NumberSequence {
  const digits =
    typeof row.digits === 'number'
      ? row.digits
      : row.digits.trim() === ''
        ? Number.NaN
        : Number(row.digits)
  const next =
    typeof row.next === 'number'
      ? row.next
      : row.next.trim() === ''
        ? Number.NaN
        : Number(row.next)
  const suffix = row.suffix?.trim()
  const out: NumberSequence = {
    ...row,
    id: row.id.trim(),
    module: moduleOfDocType(row.docType),
    name: row.name.trim(),
    prefix: row.prefix.trim(),
    digits,
    next,
  }
  if (suffix) out.suffix = suffix
  else delete out.suffix
  return out
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

const moduleLabel = (mod: string) => SEQUENCE_MODULE_LABELS[mod as SequenceModuleId] ?? mod

export function numberSequencesDataset(module?: SettingsModuleId): Dataset<NumberSequenceRow> {
  const allowedDocTypes = module ? docTypesForModule(module) : [...NUMBER_SEQUENCE_DOC_TYPES]
  const raw = (s: NumberSequenceRow, key: string): string => {
    const seq = toNumberSequence(s)
    switch (key) {
      case 'docType':
        return DOC_TYPE_LABELS[seq.docType] ?? seq.docType
      case 'name':
        return seq.name
      case 'module':
        return moduleLabel(seq.module)
      case 'format':
        return formatSeriesPattern(seq)
      case 'nextPreview':
        return Number.isInteger(seq.next) && seq.next >= 1 ? previewNext(seq) : EM_DASH
      case 'resets':
        return RESET_LABELS[seq.resets] ?? seq.resets
      case 'status':
        return seriesStatus(seq)
      default:
        return ''
    }
  }

  const columns: GridColumn[] = [
    col('docType', 'Document type', 160, { visible: false, groupable: true }),
    col('name', 'Series', 200, { frozen: 'left', hideable: false, min: 140 }),
    ...(!module ? [col('module', 'Module', 116)] : []),
    col('format', 'Format', 148, { type: 'mono' }),
    col('nextPreview', 'Next number', 152, { type: 'mono' }),
    col('resets', 'Resets', 136),
    col('status', 'Status', 104, { type: 'pill' }),
  ]

  return {
    id: module ? `settings-sequences-${module}` : 'settings-sequences',
    noun: 'series',
    nounPlural: 'series',
    idOf: (s) => s.id,
    columns,
    raw,
    text: (s, key) => raw(s, key) || EM_DASH,
    searchBlob: (s) => {
      const seq = toNumberSequence(s)
      return [
        seq.id,
        seq.name,
        DOC_TYPE_LABELS[seq.docType],
        moduleLabel(seq.module),
        seq.prefix,
        seq.suffix ?? '',
        formatSeriesPattern(seq),
        Number.isInteger(seq.next) ? previewNext(seq) : '',
        RESET_LABELS[seq.resets],
        seriesStatus(seq),
      ]
        .join(' \u0001 ')
        .toLowerCase()
    },
    views: [
      { id: 'all', name: 'All series', system: true, filters: [] },
      { id: 'default', name: 'Default', filters: [{ key: 'status', op: 'isAny', value: ['Default'] }] },
      { id: 'active', name: 'Active', filters: [{ key: 'status', op: 'isAny', value: ['Default', 'Active'] }] },
      { id: 'inactive', name: 'Inactive', filters: [{ key: 'status', op: 'isAny', value: ['Inactive'] }] },
    ],
    filterColumns: [
      { key: 'docType', label: 'Document type', type: 'enum', options: allowedDocTypes.map((dt) => DOC_TYPE_LABELS[dt]) },
      { key: 'name', label: 'Series', type: 'text' },
      ...(!module
        ? [{ key: 'module', label: 'Module', type: 'enum' as const, options: Object.values(SEQUENCE_MODULE_LABELS) }]
        : []),
      { key: 'resets', label: 'Resets', type: 'enum', options: NUMBER_SEQUENCE_RESETS.map((r) => RESET_LABELS[r]) },
      { key: 'status', label: 'Status', type: 'enum', options: ['Default', 'Active', 'Inactive'] },
    ],
    defaultSort: { key: 'name', dir: 'asc' },
    defaultGroupBy: 'docType',
  }
}
