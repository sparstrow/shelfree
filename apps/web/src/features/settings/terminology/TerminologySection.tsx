import { RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { type ListAction, type ListEditor, ListPage } from '@/components/list-page/ListPage'
import { SettingsPage } from '@/components/settings/SettingsPage'
import { usePatchTerms, useResetTerms } from '@/data/queries/regional-terminology'
import { useSettings } from '@/data/queries/settings'
import {
  type TermCapability,
  type TermRow,
  renamedCount,
  termPatch,
  termResetPatch,
  termRows,
  validateTermRow,
} from '@/domain/terminology'
import { terminologyDataset } from './dataset'
import { TERMINOLOGY_HELP as HELP } from './help'

/**
 * Settings ▸ Workspace ▸ Terminology (`/settings/terminology`) — a list of the renamable labels,
 * edited in the drawer. The set of labels is fixed by the app (`fixedRows`: no New). Parity note:
 * the prototype showed Fields rows only while their capability was on; here Customer price follows
 * the Sales pricing switch and Lot/Batch stays hidden until Modules & capabilities exists (gap G-031).
 */
export function TerminologySection({ readOnly = false }: { readOnly?: boolean } = {}) {
  const settings = useSettings()
  const patch = usePatchTerms()
  const reset = useResetTerms()
  const [confirmAll, setConfirmAll] = useState(false)
  const terms = settings.data?.terms
  const customerPricing = settings.data?.salesPricing.enabled === true
  const capabilities = useMemo<TermCapability[]>(() => (customerPricing ? ['customerPricing'] : []), [customerPricing])
  const rows = useMemo(() => (settings.data ? termRows(terms, capabilities) : undefined), [settings.data, terms, capabilities])
  const dataset = useMemo(() => terminologyDataset(), [])
  const count = renamedCount(terms)

  const restore: ListAction<TermRow> = {
    label: 'Restore original',
    icon: RotateCcw,
    when: (r) => r.renamed,
    inDrawer: true,
    run: (r) => {
      void patch.mutateAsync(termResetPatch(r)).then(() => toast('Restored', { description: r.origSingular }))
    },
  }

  const editor: ListEditor<TermRow> = {
    fixedRows: true,
    fields: (d) => [
      { key: 'origSingular', label: 'Original', type: 'text', locked: true, hint: HELP.origSingular.body },
      { key: 'singular', label: 'Singular', type: 'text', maxLength: 40, placeholder: d.origSingular, hint: HELP.singular.body },
      ...(d.pair
        ? [
            { key: 'origPlural' as const, label: 'Original plural', type: 'text' as const, locked: true, hint: HELP.origPlural.body },
            { key: 'plural' as const, label: 'Plural', type: 'text' as const, maxLength: 40, placeholder: d.origPlural, hint: HELP.plural.body },
          ]
        : []),
      { key: 'groupName', label: 'Group', type: 'text', locked: true, hint: HELP.groupName.body },
    ],
    view: (r) => ({
      no: r.origSingular,
      status: r.renamed ? 'Renamed' : 'Original',
      title: r.pair ? `${r.singular} · ${r.plural}` : r.singular,
      subtitle: r.groupName,
    }),
    blank: (all) => structuredClone(all[0]),
    validate: (draft) => validateTermRow(draft),
    save: async (record) => {
      await patch.mutateAsync(termPatch(record))
    },
    label: (r) => r.origSingular,
  }

  const resetAll = async () => {
    setConfirmAll(false)
    await reset.mutateAsync()
    toast('All labels restored', { description: 'Every label is back to its original wording.' })
  }

  return (
    <SettingsPage
      title="Terminology"
      help={HELP.page}
      count={count > 0 ? `${count} ${count === 1 ? 'override' : 'overrides'}` : undefined}
      isLoading={settings.isLoading}
      error={settings.error}
      onRetry={() => void settings.refetch()}
      flush
      readOnly={readOnly}
      actions={
        !readOnly && count > 0 ? (
          <button
            type="button"
            onClick={() => setConfirmAll(true)}
            className="hover-lift inline-flex h-8 items-center gap-1.5 rounded-lg border border-input bg-transparent px-3 text-[12.5px] font-medium text-muted-foreground hover:bg-bad-bg hover:text-bad-fg"
          >
            <RotateCcw className="size-[13px]" strokeWidth={2} />
            Reset all
          </button>
        ) : undefined
      }
    >
      <ListPage<TermRow>
        embedded
        readOnly={readOnly}
        dataset={dataset}
        rows={rows}
        isLoading={settings.isLoading}
        error={settings.error}
        onRefresh={() => settings.refetch()}
        editor={editor}
        actions={[restore]}
        emptyText="No label matches."
      />
      <ConfirmDialog
        open={confirmAll}
        danger
        title="Reset all terminology?"
        description={`Every renamed label goes back to its original wording (${count} ${count === 1 ? 'override' : 'overrides'}). Your data isn’t touched.`}
        confirmLabel="Reset all"
        onConfirm={() => void resetAll()}
        onCancel={() => setConfirmAll(false)}
      />
    </SettingsPage>
  )
}
