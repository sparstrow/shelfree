import { useMemo } from 'react'
import { type ListDelete, type ListEditor, ListPage } from '@/components/list-page/ListPage'
import type { SettingsModuleId } from '@/components/settings/registry'
import { SettingsPage } from '@/components/settings/SettingsPage'
import { useList, useRemove, useUpsert } from '@/data/queries'
import { CUSTOM_FIELD_TYPES } from '@/data/schemas'
import {
  CUSTOM_FIELD_ENTITY_IDS,
  FIELD_TYPE_LABELS,
  entitiesForModule,
  entityLabel,
  fieldDeleteBlock,
  moduleLabel,
  moduleOfEntity,
  nextFieldId,
  normalizeField,
  parseOptions,
  validateField,
} from '@/domain/custom-fields'
import { EM_DASH } from '@/lib/format'
import { type CustomFieldRow, customFieldsDataset, toCustomField, withOptionsText } from './dataset'
import { CUSTOM_FIELDS_HELP as HELP } from './help'

const TYPE_OPTIONS = CUSTOM_FIELD_TYPES.map((value) => ({ value, label: FIELD_TYPE_LABELS[value] }))

/**
 * Settings ▸ Custom fields — shared list (`/settings/shared/fields`) and module
 * slices (`/<module>/settings/fields`). A field belongs to one entity and an entity
 * to one module, so a slice filters on `module` equality.
 */
export function CustomFieldsSection({
  module,
  readOnly = false,
}: {
  module?: SettingsModuleId
  readOnly?: boolean
} = {}) {
  const fields = useList('customFields')
  const upsert = useUpsert('customFields')
  const removeField = useRemove('customFields')

  const all = useMemo(() => fields.data ?? [], [fields.data])
  const entities = useMemo(() => (module ? entitiesForModule(module) : CUSTOM_FIELD_ENTITY_IDS), [module])
  const entityOptions = useMemo(() => entities.map((e) => ({ value: e, label: entityLabel(e) })), [entities])
  const rows = useMemo<CustomFieldRow[] | undefined>(() => {
    if (fields.data === undefined) return undefined
    return (module ? all.filter((f) => f.module === module) : all).map(withOptionsText)
  }, [fields.data, all, module])
  const dataset = useMemo(() => customFieldsDataset(module), [module])
  const effectiveReadOnly = readOnly || entities.length === 0

  const remove: ListDelete<CustomFieldRow> = {
    blockedReason: () => fieldDeleteBlock(),
    describe: (f) => `${entityLabel(f.entity)} · ${f.label}`,
    run: (f) => removeField.mutateAsync(f.id),
    undo: (f) => void upsert.mutateAsync(toCustomField(f)),
  }

  const editor: ListEditor<CustomFieldRow> = {
    fields: (d, mode) => [
      {
        key: 'entity',
        label: 'Added to',
        type: 'select',
        options: entityOptions,
        locked: mode === 'edit',
        display: (f) => entityLabel(f.entity),
        hint: HELP.entity.body,
      },
      { key: 'label', label: 'Field', type: 'text', maxLength: 40, placeholder: 'e.g. Country of origin', hint: HELP.label.body },
      { key: 'type', label: 'Type', type: 'select', options: TYPE_OPTIONS, hint: HELP.type.body },
      ...(d.type === 'list'
        ? [
            {
              key: 'optionsText' as const,
              label: 'Choices',
              type: 'text' as const,
              placeholder: 'e.g. Low, Medium, High',
              display: (f: CustomFieldRow) => parseOptions(f.optionsText).join(', ') || EM_DASH,
              hint: HELP.optionsText.body,
            },
          ]
        : []),
      {
        key: 'required',
        label: 'Required',
        type: 'toggle',
        onText: 'Required',
        offText: 'Optional',
        hint: HELP.required.body,
      },
      {
        key: 'active',
        label: 'Status',
        type: 'toggle',
        onText: 'Active',
        offText: 'Inactive',
        hint: HELP.active.body,
      },
    ],
    view: (f) => ({
      no: f.id,
      status: f.active ? 'Active' : 'Inactive',
      title: f.label || 'Untitled field',
      subtitle: entityLabel(f.entity),
      facts: [{ k: 'Module', v: moduleLabel(f.module) }],
    }),
    blank: () => {
      const entity = entities[0] ?? 'item'
      return {
        id: nextFieldId(all),
        entity,
        module: moduleOfEntity(entity),
        label: '',
        type: 'text',
        options: [],
        optionsText: '',
        required: false,
        active: true,
      }
    },
    onChange: (draft, key, mode) =>
      key === 'entity' && mode === 'new' ? { ...draft, module: moduleOfEntity(draft.entity) } : draft,
    normalize: (draft) => withOptionsText(normalizeField(toCustomField(draft))),
    validate: (draft, others) => validateField(toCustomField(draft), others.map(toCustomField)),
    save: (record) => upsert.mutateAsync(toCustomField(record)),
    label: (f) => `${entityLabel(f.entity)} · ${f.label}`,
  }

  return (
    <SettingsPage title="Custom fields" help={HELP.page} count={rows?.length} flush readOnly={readOnly}>
      <ListPage<CustomFieldRow>
        embedded
        readOnly={effectiveReadOnly}
        dataset={dataset}
        rows={rows}
        isLoading={fields.isLoading}
        error={fields.error}
        onRefresh={() => fields.refetch()}
        remove={remove}
        editor={editor}
        emptyText={
          module && entities.length === 0
            ? 'No record type in this module can have custom fields yet.'
            : 'No custom fields yet. Add one to capture something Shelfree doesn’t track.'
        }
      />
    </SettingsPage>
  )
}
