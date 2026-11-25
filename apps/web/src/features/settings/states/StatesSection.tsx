import { Copy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { HelpTarget } from '@/components/help/HelpTarget'
import { type ListAction, type ListPreview, ListPage } from '@/components/list-page/ListPage'
import { SettingsPage } from '@/components/settings/SettingsPage'
import { useList } from '@/data/queries'
import { useWorkspace } from '@/data/queries/session'
import { gstStateByName } from '@/domain/gst'
import { checkGstin, gstinSplit, partiesText, partyCounts, sortStates, stateSplitText, stateTypeLabel } from '@/domain/gst-states'
import { cn } from '@/lib/utils'
import { type GstStateRow, gstStatesDataset } from './dataset'
import { STATES_HELP as HELP } from './help'

const NO_PARTIES = { vendors: 0, customers: 0 }

/** The "Check a GSTIN" card above the list: state, PAN and tax split for what was typed. Nothing is stored. */
function GstinCheckCard({ ourState }: { ourState: ReturnType<typeof gstStateByName> }) {
  const [value, setValue] = useState('')
  const result = checkGstin(value)
  const heading = <h2 className="m-0 text-[13px] font-bold">Check a GSTIN</h2>
  const split = result.status === 'valid' ? gstinSplit(ourState, result.state) : null

  return (
    <section aria-label="Check a GSTIN" className="m-[14px] mb-3 flex-none rounded-xl border border-border bg-card px-4 py-3">
      <div className="group/row mb-2 flex items-center">
        <HelpTarget help={HELP.check} label="Check a GSTIN">
          {heading}
        </HelpTarget>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-[260px] max-w-full">
          <input
            aria-label="GSTIN to check"
            value={value}
            maxLength={15}
            spellCheck={false}
            autoComplete="off"
            placeholder="e.g. 33AABCS1001K1Z5"
            onChange={(e) => setValue(e.target.value.toUpperCase().replace(/\s+/g, ''))}
            className={cn(
              'h-8 w-full rounded-lg border bg-transparent px-[10px] font-mono text-xs outline-none transition-colors duration-[140ms] placeholder:text-muted-foreground focus:border-ring',
              result.status === 'invalid' ? 'border-bad-fg' : 'border-input hover:border-ring/60',
            )}
          />
        </div>
        {value && (
          <button
            type="button"
            onClick={() => setValue('')}
            className="hover-lift inline-flex h-8 items-center rounded-lg border border-border bg-card px-3 text-[13px] font-medium hover:bg-tint-12"
          >
            Clear
          </button>
        )}
        <div aria-live="polite" className="min-w-0 flex-1 text-[12.5px]">
          {result.status === 'invalid' && (
            <span role="alert" className="text-bad-fg">
              {result.error}
            </span>
          )}
          {result.status === 'partial' && (
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">
                {result.state.code} · {result.state.name}
              </span>
              {' — '}
              {result.message}
            </span>
          )}
          {result.status === 'valid' && split && (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-medium">
                <span className="font-mono text-xs">{result.state.code}</span> · {result.state.name} · {stateTypeLabel(result.state)}
              </span>
              <span className={cn('rounded-full px-2 py-0.5 text-[11.5px] font-medium', split.same ? 'bg-ok-bg text-ok-fg' : 'bg-info-bg text-info-fg')}>{split.text}</span>
              <span className="text-muted-foreground">
                PAN <span className="font-mono text-xs text-foreground">{result.pan}</span>
              </span>
              {result.warning && <span className="text-warn-fg">{result.warning}</span>}
            </span>
          )}
        </div>
      </div>
    </section>
  )
}

/**
 * Settings ▸ Workspace ▸ States & territories (`/settings/cfg-states`) — the official GST state codes,
 * read-only for everyone (set by GSTN). Parties counts are derived from vendors and customers.
 */
export function StatesSection({ readOnly: _readOnly = false }: { readOnly?: boolean } = {}) {
  const states = useList('gstStates')
  const vendors = useList('vendors')
  const customers = useList('customers')
  const workspace = useWorkspace()

  const counts = useMemo(() => partyCounts(vendors.data ?? [], customers.data ?? []), [vendors.data, customers.data])
  const rows = useMemo<GstStateRow[] | undefined>(
    () => (states.data ? sortStates(states.data).map((s) => ({ ...s, parties: counts.get(s.code) ?? NO_PARTIES })) : undefined),
    [states.data, counts],
  )
  const dataset = useMemo(() => gstStatesDataset(), [])
  const ourState = gstStateByName(workspace.data?.region)

  const copyName: ListAction<GstStateRow> = {
    label: 'Copy name',
    icon: Copy,
    run: (row) => {
      void navigator.clipboard
        .writeText(row.name)
        .then(() => toast('Copied', { description: row.name }))
        .catch(() => toast('Could not copy', { description: 'The browser blocked clipboard access.' }))
    },
  }

  const preview = (row: GstStateRow): ListPreview => ({
    ariaLabel: `State ${row.code}`,
    no: row.code,
    status: row.legacy ? 'Retired' : undefined,
    title: row.name,
    subtitle: `${stateTypeLabel(row)} · ${row.abbr}`,
    notice: row.legacy ? row.note : undefined,
    facts: [
      { k: 'Same-state tax', v: stateSplitText(row) },
      { k: 'Parties here', v: partiesText(row.parties) || 'None yet' },
    ],
  })

  return (
    <SettingsPage title="States & territories" help={HELP.page} count={rows?.length} flush>
      <GstinCheckCard ourState={ourState} />
      <ListPage<GstStateRow>
        embedded
        // The list is set by GSTN: no create, edit or delete for anyone.
        readOnly
        dataset={dataset}
        rows={rows}
        isLoading={states.isLoading || vendors.isLoading || customers.isLoading}
        error={states.error ?? vendors.error ?? customers.error}
        onRefresh={() => Promise.all([states.refetch(), vendors.refetch(), customers.refetch()])}
        preview={preview}
        actions={[copyName]}
        emptyText="No state matches."
      />
    </SettingsPage>
  )
}
