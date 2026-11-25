import { useMemo } from 'react'
import { type ListDelete, type ListEditor, ListPage } from '@/components/list-page/ListPage'
import type { SettingsModuleId } from '@/components/settings/registry'
import { SettingsPage } from '@/components/settings/SettingsPage'
import { useList, useRemove, useUpsert } from '@/data/queries'
import { STATUS_CATEGORIES, STATUS_TONES } from '@/data/schemas'
import {
  CATEGORY_LABELS,
  TONE_LABELS,
  flowLabel,
  flowsForModule,
  moduleLabel,
  moduleOfFlow,
  nextOrder,
  nextStatusId,
  normalizeStatus,
  sourceOf,
  statusDeleteBlock,
  statusEditBlock,
  validateStatus,
  STATUS_FLOW_IDS,
} from '@/domain/statuses'
import { type StatusRow, statusesDataset, toStatusDef } from './dataset'
import { STATUSES_HELP as HELP } from './help'

const CATEGORY_OPTIONS = STATUS_CATEGORIES.map((value) => ({ value, label: CATEGORY_LABELS[value] }))
const TONE_OPTIONS = STATUS_TONES.map((value) => ({ value, label: TONE_LABELS[value] }))

/**
 * Settings ▸ Statuses & stages — shared list (`/settings/shared/statuses`) and
 * module slices (`/<module>/settings/statuses`). A status has one flow and a flow
 * one module, so a slice filters on `module` equality.
 */
export function StatusesSection({
  module,
  readOnly = false,
}: {
  module?: SettingsModuleId
  readOnly?: boolean
} = {}) {
  const statuses = useList('statuses')
  const upsert = useUpsert('statuses')
  const removeStatus = useRemove('statuses')

  const all = useMemo(() => statuses.data ?? [], [statuses.data])
  const flows = useMemo(() => (module ? flowsForModule(module) : STATUS_FLOW_IDS), [module])
  const flowOptions = useMemo(() => flows.map((f) => ({ value: f, label: flowLabel(f) })), [flows])
  const rows = useMemo<StatusRow[] | undefined>(() => {
    if (statuses.data === undefined) return undefined
    return module ? all.filter((s) => s.module === module) : all
  }, [statuses.data, all, module])
  const dataset = useMemo(() => statusesDataset(module), [module])
  const effectiveReadOnly = readOnly || flows.length === 0

  const remove: ListDelete<StatusRow> = {
    blockedReason: (s) => statusDeleteBlock(s),
    describe: (s) => `${flowLabel(s.flow)} · ${s.name}`,
    run: (s) => removeStatus.mutateAsync(s.id),
    undo: (s) => void upsert.mutateAsync(toStatusDef(s)),
  }

  const editor: ListEditor<StatusRow> = {
    editBlockedReason: (s) => statusEditBlock(s),
    fields: (_d, mode) => [
      {
        key: 'flow',
        label: 'Document',
        type: 'select',
        options: flowOptions,
        locked: mode === 'edit',
        display: (s) => flowLabel(s.flow),
        hint: HELP.flow.body,
      },
      { key: 'name', label: 'Status', type: 'text', maxLength: 24, placeholder: 'e.g. Packed', hint: HELP.name.body },
      { key: 'category', label: 'Type', type: 'select', options: CATEGORY_OPTIONS, hint: HELP.category.body },
      { key: 'tone', label: 'Colour', type: 'select', options: TONE_OPTIONS, hint: HELP.tone.body },
      { key: 'order', label: 'Order', type: 'number', step: '1', hint: HELP.order.body },
    ],
    view: (s) => ({
      no: s.id,
      status: sourceOf(s),
      title: s.name || 'Untitled status',
      subtitle: flowLabel(s.flow),
      notice: statusEditBlock(s) ?? undefined,
      facts: [{ k: 'Module', v: moduleLabel(s.module) }],
    }),
    blank: () => {
      const flow = flows[0] ?? 'purchase-order'
      return {
        id: nextStatusId(all),
        flow,
        module: moduleOfFlow(flow),
        name: '',
        category: 'open',
        tone: 'info',
        order: nextOrder(flow, all),
        system: false,
      }
    },
    onChange: (draft, key, mode) =>
      key === 'flow' && mode === 'new'
        ? { ...draft, module: moduleOfFlow(draft.flow), order: nextOrder(draft.flow, all) }
        : draft,
    normalize: (draft) => normalizeStatus(toStatusDef(draft)),
    validate: (draft, others) => validateStatus(toStatusDef(draft), others.map(toStatusDef)),
    save: (record) => upsert.mutateAsync(toStatusDef(record)),
    label: (s) => `${flowLabel(s.flow)} · ${s.name}`,
  }

  return (
    <SettingsPage title="Statuses & stages" help={HELP.page} count={rows?.length} flush readOnly={readOnly}>
      <ListPage<StatusRow>
        embedded
        readOnly={effectiveReadOnly}
        dataset={dataset}
        rows={rows}
        isLoading={statuses.isLoading}
        error={statuses.error}
        onRefresh={() => statuses.refetch()}
        remove={remove}
        editor={editor}
        emptyText={
          module && flows.length === 0
            ? 'No document in this module uses statuses yet.'
            : 'No statuses match.'
        }
      />
    </SettingsPage>
  )
}
