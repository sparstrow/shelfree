import type { Dataset, GridColumn } from '@/components/data-grid/model'
import type { SettingsModuleId } from '@/components/settings/registry'
import type { CustomField } from '@/data/schemas'
import {
  CUSTOM_FIELD_ENTITY_IDS,
  FIELD_MODULE_LABELS,
  FIELD_TYPE_LABELS,
  entitiesForModule,
  entityLabel,
  moduleLabel,
  optionsText,
  parseOptions,
} from '@/domain/custom-fields'
import { EM_DASH } from '@/lib/format'

/** Editable row: choices are typed as one comma-separated text. */
export type CustomFieldRow = CustomField & { optionsText: string }

export const withOptionsText = (f: CustomField): CustomFieldRow => ({ ...f, optionsText: optionsText(f.options) })

/** Strict definition from a draft row: the typed choices become the `options` list. */
export function toCustomField(row: CustomFieldRow): CustomField {
  return {
    id: row.id,
    entity: row.entity,
    module: row.module,
    label: row.label,
    type: row.type,
    options: parseOptions(row.optionsText),
    required: row.required,
    active: row.active,
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

const statusOf = (f: CustomField) => (f.active ? 'Active' : 'Inactive')

export function customFieldsDataset(module?: SettingsModuleId): Dataset<CustomFieldRow> {
  const entities = module ? entitiesForModule(module) : CUSTOM_FIELD_ENTITY_IDS
  const raw = (f: CustomFieldRow, key: string): string => {
    switch (key) {
      case 'entity':
        return entityLabel(f.entity)
      case 'label':
        return f.label
      case 'module':
        return moduleLabel(f.module)
      case 'type':
        return FIELD_TYPE_LABELS[f.type]
      case 'options':
        return f.type === 'list' ? parseOptions(f.optionsText).join(', ') : ''
      case 'required':
        return f.required ? 'Required' : 'Optional'
      case 'status':
        return statusOf(f)
      default:
        return ''
    }
  }
  return {
    id: module ? `settings-fields-${module}` : 'settings-fields',
    noun: 'field',
    nounPlural: 'fields',
    idOf: (f) => f.id,
    columns: [
      col('entity', 'Added to', 150, { visible: false, groupable: true }),
      col('label', 'Field', 200, { frozen: 'left', hideable: false, min: 120 }),
      ...(!module ? [col('module', 'Module', 116)] : []),
      col('type', 'Type', 100),
      col('options', 'Choices', 220),
      col('required', 'Required', 100),
      col('status', 'Status', 100, { type: 'pill' }),
    ],
    raw,
    text: (f, key) => raw(f, key) || EM_DASH,
    searchBlob: (f) =>
      [f.id, entityLabel(f.entity), f.label, moduleLabel(f.module), FIELD_TYPE_LABELS[f.type], f.options.join(' '), statusOf(f)]
        .join(' \u0001 ')
        .toLowerCase(),
    views: [
      { id: 'all', name: 'All fields', system: true, filters: [] },
      { id: 'required', name: 'Required', filters: [{ key: 'required', op: 'isAny', value: ['Required'] }] },
      { id: 'inactive', name: 'Inactive', filters: [{ key: 'status', op: 'isAny', value: ['Inactive'] }] },
    ],
    filterColumns: [
      { key: 'entity', label: 'Added to', type: 'enum', options: entities.map(entityLabel) },
      { key: 'label', label: 'Field', type: 'text' },
      ...(!module
        ? [{ key: 'module', label: 'Module', type: 'enum' as const, options: Object.values(FIELD_MODULE_LABELS) }]
        : []),
      { key: 'type', label: 'Type', type: 'enum', options: Object.values(FIELD_TYPE_LABELS) },
      { key: 'required', label: 'Required', type: 'enum', options: ['Required', 'Optional'] },
      { key: 'status', label: 'Status', type: 'enum', options: ['Active', 'Inactive'] },
    ],
    defaultSort: { key: 'label', dir: 'asc' },
    defaultGroupBy: 'entity',
  }
}
