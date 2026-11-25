import { Star } from 'lucide-react'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { type ListAction, type ListDelete, type ListEditor, ListPage } from '@/components/list-page/ListPage'
import { SettingsPage } from '@/components/settings/SettingsPage'
import type { SettingsModuleId } from '@/components/settings/registry'
import { CommandError } from '@/data/api/commands'
import {
  useDeleteNumberSequence,
  useNumberSequences,
  useSaveNumberSequence,
  useSetDefaultNumberSequence,
} from '@/data/queries/number-sequences'
import { NUMBER_SEQUENCE_DOC_TYPES, NUMBER_SEQUENCE_RESETS, type NumberSequenceDocType } from '@/data/schemas'
import {
  DOC_TYPE_LABELS,
  RESET_LABELS,
  canDeleteSeries,
  docTypesForModule,
  formatSeriesPattern,
  moduleOfDocType,
  nextSequenceId,
  previewNext,
  seriesStatus,
  validateSeries,
} from '@/domain/number-sequences'
import { EM_DASH, int } from '@/lib/format'
import { type NumberSequenceRow, numberSequencesDataset, toNumberSequence } from './dataset'
import { NUMBER_SEQUENCES_HELP } from './help'

const RESET_OPTIONS = NUMBER_SEQUENCE_RESETS.map((value) => ({ value, label: RESET_LABELS[value] }))

const DELETE_BLOCKED_REASON = 'Numbers were already issued from this series — make it inactive instead.'

function SeriesPreview({ series }: { series: NumberSequenceRow }) {
  const normalized = toNumberSequence(series)
  const validDigits = Number.isInteger(normalized.digits) && normalized.digits >= 1 && normalized.digits <= 10
  const validNext = Number.isInteger(normalized.next) && normalized.next >= 1
  const sample = validDigits && validNext ? previewNext(normalized) : EM_DASH
  const pattern = validDigits ? formatSeriesPattern(normalized) : EM_DASH
  return (
    <div
      aria-live="polite"
      className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-border bg-panel px-3 py-2"
    >
      <div className="min-w-0">
        <div className="text-[11px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
          Next number
        </div>
        <div className="mt-0.5 truncate font-mono text-[13.5px] font-semibold text-foreground">{sample}</div>
      </div>
      <div className="flex-none text-right">
        <div className="text-[11px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">Format</div>
        <div className="mt-0.5 font-mono text-xs text-muted-foreground">{pattern}</div>
      </div>
    </div>
  )
}

function parseOptionalNumber(raw: number | string): number | string {
  if (typeof raw === 'number') return raw
  const trimmed = raw.trim()
  if (trimmed === '') return ''
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : raw
}

/**
 * Settings ▸ Number sequences — shared list (`/settings/shared/sequences`)
 * and per-module slices (`/<module>/settings/sequences`).
 */
export function NumberSequencesSection({
  module,
  readOnly = false,
}: {
  module?: SettingsModuleId
  readOnly?: boolean
} = {}) {
  const sequences = useNumberSequences()
  const saveSeries = useSaveNumberSequence()
  const deleteSeries = useDeleteNumberSequence()
  const setDefault = useSetDefaultNumberSequence()

  const allSequences = useMemo(() => sequences.data ?? [], [sequences.data])
  const moduleDocTypes = useMemo<NumberSequenceDocType[]>(
    () => (module ? docTypesForModule(module) : [...NUMBER_SEQUENCE_DOC_TYPES]),
    [module],
  )
  const docTypeOptions = useMemo(
    () => moduleDocTypes.map((dt) => ({ value: dt, label: DOC_TYPE_LABELS[dt] })),
    [moduleDocTypes],
  )
  const rows = useMemo<NumberSequenceRow[] | undefined>(() => {
    if (sequences.data === undefined) return undefined
    if (!module) return allSequences
    return allSequences.filter((s) => s.module === module)
  }, [sequences.data, allSequences, module])

  const dataset = useMemo(() => numberSequencesDataset(module), [module])
  const effectiveReadOnly = readOnly || moduleDocTypes.length === 0

  const handleSetDefault = async (series: NumberSequenceRow) => {
    try {
      await setDefault.mutateAsync(series.id)
      const seq = toNumberSequence(series)
      toast.success('Default series updated', {
        description: `${seq.name} · ${previewNext(seq)}`,
      })
    } catch (e) {
      toast.error('Could not update default series', {
        description: e instanceof CommandError ? e.message : 'Check your connection and try again.',
      })
    }
  }

  const actions: ListAction<NumberSequenceRow>[] = [
    {
      label: 'Set as default',
      icon: Star,
      inDrawer: true,
      when: (s) => s.active && !s.isDefault,
      run: (s) => void handleSetDefault(s),
      title: 'Use this series for new documents of this type',
    },
  ]

  const remove: ListDelete<NumberSequenceRow> = {
    blockedReason: (s) => (canDeleteSeries(s) ? null : DELETE_BLOCKED_REASON),
    describe: (s) => {
      const seq = toNumberSequence(s)
      return `${seq.name} · ${previewNext(seq)}`
    },
    run: (s) => deleteSeries.mutateAsync(s.id),
    undo: (s) => void saveSeries.mutateAsync(toNumberSequence(s)),
  }

  const editor: ListEditor<NumberSequenceRow> = {
    fields: (d, mode) => [
      {
        key: 'docType',
        label: 'Document type',
        type: 'select',
        options: docTypeOptions,
        locked: mode === 'edit' && d.issued > 0,
        display: (s) => DOC_TYPE_LABELS[s.docType] ?? s.docType,
        hint: NUMBER_SEQUENCES_HELP.docType.body,
      },
      {
        key: 'name',
        label: 'Name',
        type: 'text',
        placeholder: 'e.g. Purchase orders (FY 26-27)',
        hint: NUMBER_SEQUENCES_HELP.name.body,
      },
      {
        key: 'prefix',
        label: 'Prefix',
        type: 'text',
        mono: true,
        placeholder: 'e.g. KPO',
        hint: NUMBER_SEQUENCES_HELP.prefix.body,
      },
      {
        key: 'digits',
        label: 'Digits',
        type: 'number',
        step: '1',
        hint: NUMBER_SEQUENCES_HELP.digits.body,
      },
      {
        key: 'suffix',
        label: 'Suffix',
        type: 'text',
        mono: true,
        placeholder: 'Optional',
        hint: NUMBER_SEQUENCES_HELP.suffix.body,
      },
      {
        key: 'next',
        label: 'Next number',
        type: 'number',
        step: '1',
        hint: NUMBER_SEQUENCES_HELP.next.body,
      },
      {
        key: 'resets',
        label: 'Resets',
        type: 'select',
        options: RESET_OPTIONS,
        hint: NUMBER_SEQUENCES_HELP.resets.body,
      },
      {
        key: 'active',
        label: 'Active',
        type: 'toggle',
        onText: 'Active',
        offText: 'Inactive',
        hint: NUMBER_SEQUENCES_HELP.active.body,
      },
      {
        key: 'isDefault',
        label: 'Default',
        type: 'toggle',
        onText: 'Default',
        offText: 'Not default',
        hint: NUMBER_SEQUENCES_HELP.isDefault.body,
      },
    ],
    view: (s) => {
      const seq = toNumberSequence(s)
      const status = seriesStatus(seq)
      return {
        no: previewNext(seq),
        status,
        title: seq.name || 'Untitled series',
        subtitle: DOC_TYPE_LABELS[seq.docType],
        notice: !canDeleteSeries(seq) ? DELETE_BLOCKED_REASON : undefined,
        facts: [
          { k: 'Format', v: formatSeriesPattern(seq) },
          { k: 'Issued', v: int(seq.issued) },
        ],
      }
    },
    blank: () => {
      const docType = moduleDocTypes[0] ?? 'purchase-order'
      const hasDefault = allSequences.some((s) => s.docType === docType && s.isDefault)
      return {
        id: nextSequenceId(allSequences),
        docType,
        module: moduleOfDocType(docType),
        name: '',
        prefix: '',
        digits: 5,
        suffix: '',
        next: 1,
        resets: 'never',
        isDefault: !hasDefault,
        active: true,
        issued: 0,
      }
    },
    onChange: (draft, key, mode) => {
      if (key === 'docType' && mode === 'new') {
        const hasDefault = allSequences.some((s) => s.docType === draft.docType && s.isDefault)
        return {
          ...draft,
          module: moduleOfDocType(draft.docType),
          isDefault: !hasDefault,
        }
      }
      return draft
    },
    normalize: (draft) => ({
      ...draft,
      name: draft.name.trim(),
      prefix: draft.prefix.trim(),
      suffix: draft.suffix?.trim() ?? '',
      digits: parseOptionalNumber(draft.digits),
      next: parseOptionalNumber(draft.next),
      module: moduleOfDocType(draft.docType),
    }),
    validate: (draft) => validateSeries(toNumberSequence(draft), allSequences),
    save: (record) => saveSeries.mutateAsync(toNumberSequence(record)),
    label: (s) => {
      const seq = toNumberSequence(s)
      return `${seq.name} · ${previewNext(seq)}`
    },
    extra: (s) => <SeriesPreview series={s} />,
    extraEdit: (draft) => <SeriesPreview series={draft} />,
  }

  return (
    <SettingsPage
      title="Number sequences"
      help={NUMBER_SEQUENCES_HELP.page}
      count={rows?.length}
      flush
      readOnly={readOnly}
    >
      <ListPage<NumberSequenceRow>
        embedded
        readOnly={effectiveReadOnly}
        dataset={dataset}
        rows={rows}
        isLoading={sequences.isLoading}
        error={sequences.error}
        onRefresh={() => sequences.refetch()}
        actions={actions}
        remove={remove}
        editor={editor}
        emptyText={
          module && moduleDocTypes.length === 0
            ? 'No document types use number sequences in this module yet.'
            : 'No number sequences yet. Add one to issue numbers automatically.'
        }
      />
    </SettingsPage>
  )
}
