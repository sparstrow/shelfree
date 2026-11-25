import { useMemo } from 'react'
import { type ListDelete, type ListEditor, ListPage } from '@/components/list-page/ListPage'
import { SettingsPage } from '@/components/settings/SettingsPage'
import { useList, useRemove, useUpsert } from '@/data/queries'
import { CARRIER_BEHAVIORS } from '@/domain/carriers'
import {
  behaviorLockReason,
  blankCarrierType,
  carrierTypeDeleteBlock,
  carrierTypeOnChange,
  countByType,
  normalizeCarrierType,
  validateCarrierType,
} from '@/domain/carrier-types'
import { EM_DASH, fmtDate } from '@/lib/format'
import { type CarrierTypeRow, carrierTypesDataset, toCarrierTypeRecord } from './dataset'
import { CARRIER_TYPES_HELP as HELP } from './help'

const BEHAVIOR_OPTIONS = CARRIER_BEHAVIORS.map((b) => ({ value: b.id, label: b.label }))
const LAST_ACTIVE = 'At least one carrier type must stay active.'

/** Purchasing ▸ Settings ▸ Carrier types (`/purchasing/settings/carrier-types`). */
export function CarrierTypesSection({ readOnly = false }: { readOnly?: boolean } = {}) {
  const types = useList('carrierTypes')
  const carriers = useList('carriers')
  const upsert = useUpsert('carrierTypes')
  const removeType = useRemove('carrierTypes')

  const used = useMemo(() => countByType(types.data ?? [], carriers.data ?? []), [types.data, carriers.data])
  const rows = useMemo<CarrierTypeRow[] | undefined>(
    () => types.data?.map((t) => ({ ...t, carriers: used.get(t.code) ?? 0 })),
    [types.data, used],
  )
  const dataset = useMemo(() => carrierTypesDataset(), [])

  const remove: ListDelete<CarrierTypeRow> = {
    blockedReason: (t) => {
      const reason = carrierTypeDeleteBlock(t, t.carriers)
      if (reason) return reason
      const otherActive = (types.data ?? []).some((o) => o.code !== t.code && o.active)
      return t.active && !otherActive ? LAST_ACTIVE : null
    },
    describe: (t) => `${t.code} · ${t.name}`,
    note: 'No carrier uses it.',
    run: (t) => removeType.mutateAsync(t.code),
    undo: (t) => void upsert.mutateAsync(toCarrierTypeRecord(t)),
  }

  const editor: ListEditor<CarrierTypeRow> = {
    fields: (d, mode) => [
      {
        key: 'code',
        label: 'Code',
        type: 'text',
        mono: true,
        maxLength: 12,
        locked: mode === 'edit',
        placeholder: 'e.g. RAIL',
        hint: HELP.code.body,
      },
      { key: 'name', label: 'Type', type: 'text', placeholder: 'e.g. Rail parcel', hint: HELP.name.body },
      {
        key: 'behavior',
        label: 'Behaves as',
        type: 'select',
        options: BEHAVIOR_OPTIONS,
        locked: mode === 'edit' && behaviorLockReason(d, d.carriers) !== null,
        hint: HELP.behavior.body,
      },
      ...(d.behavior !== 'own'
        ? [
            {
              key: 'refLabel' as const,
              label: 'Tracking ref.',
              type: 'text' as const,
              maxLength: 16,
              placeholder: 'Tracking no.',
              hint: HELP.refLabel.body,
            },
          ]
        : []),
      { key: 'desc', label: 'Description', type: 'area', placeholder: 'When to use this type.', hint: HELP.desc.body },
      {
        key: 'active',
        label: 'Status',
        type: 'toggle',
        onText: 'Active',
        offText: 'Inactive',
        hint: HELP.active.body,
      },
    ],
    view: (t) => ({
      no: t.code || EM_DASH,
      status: t.active ? 'Active' : 'Inactive',
      tags: t.system ? ['Built-in'] : undefined,
      title: t.name || 'Untitled type',
      subtitle: CARRIER_BEHAVIORS.find((b) => b.id === t.behavior)?.label,
      notice: behaviorLockReason(t, t.carriers) ?? undefined,
      facts: [
        { k: 'Carriers using it', v: String(t.carriers) },
        { k: 'Last changed', v: t.updatedAt ? fmtDate(t.updatedAt.slice(0, 10)) : EM_DASH },
      ],
    }),
    blank: () => ({ ...blankCarrierType(), carriers: 0 }),
    onChange: (draft, key) => ({ ...draft, ...carrierTypeOnChange(draft, key) }),
    normalize: (draft) => ({ ...draft, ...normalizeCarrierType(draft) }),
    validate: (draft, others) => validateCarrierType(toCarrierTypeRecord(draft), others.map(toCarrierTypeRecord)),
    save: (record, mode) => {
      const now = new Date().toISOString()
      const base = toCarrierTypeRecord(record)
      return upsert.mutateAsync({
        ...base,
        createdAt: mode === 'new' || !base.createdAt ? now : base.createdAt,
        updatedAt: now,
      })
    },
    label: (t) => `${t.code} · ${t.name}`,
  }

  return (
    <SettingsPage title="Carrier types" help={HELP.page} count={rows?.length} flush readOnly={readOnly}>
      <ListPage<CarrierTypeRow>
        embedded
        readOnly={readOnly}
        dataset={dataset}
        rows={rows}
        isLoading={types.isLoading || carriers.isLoading}
        error={types.error ?? carriers.error}
        onRefresh={() => Promise.all([types.refetch(), carriers.refetch()])}
        remove={remove}
        editor={editor}
        emptyText="No carrier types match."
      />
    </SettingsPage>
  )
}
