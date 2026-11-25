import { Ban, Copy, RotateCcw, Star, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { type ListAction, type ListDelete, type ListEditor, type ListShortcut, ListPage } from '@/components/list-page/ListPage'
import { SettingsPage } from '@/components/settings/SettingsPage'
import { useList } from '@/data/queries'
import {
  useCancelGstRegistration,
  useDeleteGstRegistration,
  useMakeGstRegistrationPrimary,
  useReactivateGstRegistration,
  useRestoreGstRegistration,
  useSaveGstRegistration,
} from '@/data/queries/gst-registrations'
import { useSettings } from '@/data/queries/settings'
import type { GstRegistration } from '@/data/schemas'
import { useWorkspace } from '@/data/queries/session'
import {
  GST_FILING_OPTIONS,
  GST_REG_TYPE_OPTIONS,
  GST_SCHEME_OPTIONS,
  type RegistrationGap,
  activeRegistrations,
  blankRegistration,
  cancelBlockReason,
  deleteBlockReason,
  gapText,
  isActive,
  isCasual,
  makePrimaryBlockReason,
  normalizeGstin,
  normalizeRegistration,
  orderRegistrations,
  primaryRegistration,
  reactivateBlockReason,
  registrationGaps,
  registrationSites,
  suggestSeries,
  validateRegistration,
} from '@/domain/gst-registrations'
import { fiscalYearNow } from '@/domain/regional'
import { EM_DASH, fmtDate, todayLocal } from '@/lib/format'
import { type GstRegistrationRow, gstRegistrationsDataset, toRegistrationRow } from './dataset'
import { GST_REGISTRATIONS_HELP as HELP } from './help'
import { REGISTRATION_CANCEL_SHORTCUT, REGISTRATION_PRIMARY_SHORTCUT } from './shortcuts'

/** The stored fields behind a row. */
function toRegistration(r: GstRegistrationRow): GstRegistration {
  const { stateName: _s, invoicePreview: _i, siteNames: _n, panMismatch: _p, ...rest } = r
  return rest
}

type Pending = { kind: 'cancel'; row: GstRegistrationRow } | null

/**
 * Settings ▸ Workspace ▸ GST registrations (`/settings/ws-gst`) — the business's own GSTINs, one per
 * state, edited in the drawer. A location's registration is the active Normal one of its state
 * (derived, see `domain/gst-registrations`); the amber banner lists states that have a trading
 * location but no registration.
 *
 * Parity note: the prototype drew a card per registration with a per-location row list (mark as
 * declared, make principal); here the registration is a list row and the location facts live in
 * Locations & warehouses (gap G-032).
 */
export function GstRegistrationsSection({ readOnly = false }: { readOnly?: boolean } = {}) {
  const regs = useList('gstRegistrations')
  const warehouses = useList('warehouses')
  const workspace = useWorkspace()
  const settings = useSettings()
  const save = useSaveGstRegistration()
  const makePrimary = useMakeGstRegistrationPrimary()
  const cancel = useCancelGstRegistration()
  const reactivate = useReactivateGstRegistration()
  const remove = useDeleteGstRegistration()
  const restore = useRestoreGstRegistration()
  const [pending, setPending] = useState<Pending>(null)
  const [prefill, setPrefill] = useState<{ code: string; n: number } | null>(null)

  const today = todayLocal()
  const fiscalStart = settings.data?.regional.fiscalStart ?? 'April'
  const fiscalLabel = fiscalYearNow(fiscalStart)
  const pan = (workspace.data?.pan ?? '').trim().toUpperCase()
  const list = useMemo(() => regs.data ?? [], [regs.data])
  const sites = useMemo(() => warehouses.data ?? [], [warehouses.data])

  const rows = useMemo<GstRegistrationRow[] | undefined>(() => {
    if (!regs.data || !warehouses.data) return undefined
    return orderRegistrations(regs.data).map((r) =>
      toRegistrationRow(r, { siteNames: registrationSites(r, sites).map((w) => w.name), pan, fiscalLabel }),
    )
  }, [regs.data, warehouses.data, sites, pan, fiscalLabel])
  const dataset = useMemo(() => gstRegistrationsDataset(), [])
  const gaps = useMemo<RegistrationGap[]>(() => registrationGaps(list, sites), [list, sites])
  const activeCount = activeRegistrations(list).length
  const cancelledCount = list.length - activeCount
  const hasPrimary = !!primaryRegistration(list)

  const blank = (code = ''): GstRegistrationRow => ({
    ...blankRegistration({ legal: workspace.data?.legal ?? '', trade: workspace.data?.name ?? '', hasPrimary, gstinPrefix: code }),
    stateName: '',
    invoicePreview: '',
    siteNames: [],
    panMismatch: false,
  })

  const refuse = (title: string, reason: string) => toast.error(title, { description: reason })

  const makePrimaryAction: ListAction<GstRegistrationRow> = {
    label: 'Make primary',
    icon: Star,
    when: (r) => !makePrimaryBlockReason(r),
    inDrawer: true,
    title: 'Make primary (P)',
    run: (r) => {
      void makePrimary.mutateAsync(r.id).then(
        () => toast('Primary registration changed', { description: r.gstin }),
        (e: Error) => refuse('Can’t make this primary', e.message),
      )
    },
  }
  const cancelAction: ListAction<GstRegistrationRow> = {
    label: 'Cancel registration…',
    icon: Ban,
    when: (r) => isActive(r),
    inDrawer: true,
    title: 'Cancel registration (C)',
    run: (r) => {
      const reason = cancelBlockReason(r, list, sites)
      if (reason) return refuse('Can’t cancel', reason)
      setPending({ kind: 'cancel', row: r })
    },
  }
  const reactivateAction: ListAction<GstRegistrationRow> = {
    label: 'Reactivate',
    icon: RotateCcw,
    when: (r) => !isActive(r),
    inDrawer: true,
    run: (r) => {
      const reason = reactivateBlockReason(r, list)
      if (reason) return refuse('Can’t reactivate', reason)
      void reactivate.mutateAsync(r.id).then(
        () => toast('Registration reactivated', { description: r.gstin }),
        (e: Error) => refuse('Can’t reactivate', e.message),
      )
    },
  }
  const copyAction: ListAction<GstRegistrationRow> = {
    label: 'Copy GSTIN',
    icon: Copy,
    run: (r) => {
      void navigator.clipboard
        .writeText(r.gstin)
        .then(() => toast('Copied', { description: r.gstin }))
        .catch(() => toast('Could not copy', { description: 'The browser blocked clipboard access.' }))
    },
  }

  const shortcuts: ListShortcut<GstRegistrationRow>[] = [
    { ...REGISTRATION_PRIMARY_SHORTCUT, when: (r) => !makePrimaryBlockReason(r), run: (r, ctx) => makePrimaryAction.run(r, ctx) },
    { ...REGISTRATION_CANCEL_SHORTCUT, when: (r) => isActive(r), run: (r, ctx) => cancelAction.run(r, ctx) },
  ]

  const del: ListDelete<GstRegistrationRow> = {
    blockedReason: (r) => deleteBlockReason(r, list, sites),
    describe: (r) => `${r.gstin} · ${r.stateName || r.legal}`,
    note: 'No document uses it yet.',
    run: (r) => remove.mutateAsync(r.id),
    undo: (r) => void restore.mutateAsync(toRegistration(r)),
  }

  const editor: ListEditor<GstRegistrationRow> = {
    fields: (d, mode) => {
      const composition = d.scheme === 'Composition'
      const casual = isCasual(d)
      return [
        {
          key: 'gstin',
          label: 'GSTIN',
          type: 'text',
          mono: true,
          maxLength: 15,
          locked: mode === 'edit',
          placeholder: 'e.g. 33ABCDE1234F1Z7',
          copyable: true,
          hint: HELP.gstin.body,
        },
        { key: 'registeredOn', label: 'Registered on', type: 'date', hint: HELP.registeredOn.body },
        { key: 'legal', label: 'Legal name', type: 'text', hint: HELP.legal.body },
        { key: 'trade', label: 'Trade name', type: 'text', hint: HELP.trade.body },
        { key: 'scheme', label: 'Scheme', type: 'select', options: GST_SCHEME_OPTIONS, hint: HELP.scheme.body },
        { key: 'regType', label: 'Registration type', type: 'select', options: GST_REG_TYPE_OPTIONS, hint: HELP.regType.body },
        ...(casual
          ? [
              { key: 'validFrom' as const, label: 'Valid from', type: 'date' as const, hint: HELP.validFrom.body },
              { key: 'validTo' as const, label: 'Valid to', type: 'date' as const, hint: HELP.validTo.body },
            ]
          : []),
        { key: 'filing', label: 'Returns filed', type: 'select', options: GST_FILING_OPTIONS, locked: composition, hint: HELP.filing.body },
        { key: 'series', label: 'Invoice number prefix', type: 'text', mono: true, maxLength: 20, placeholder: 'e.g. TN/{FY}/', hint: HELP.series.body },
        { key: 'ewayMin', label: 'E-way bill from (₹)', type: 'number', step: '1', hint: HELP.ewayMin.body },
        { key: 'eInvoice', label: 'E-invoice', type: 'toggle', onText: 'On', offText: 'Off', locked: composition, hint: HELP.eInvoice.body },
        { key: 'addr1', label: 'Address', type: 'text', hint: HELP.addr1.body },
        { key: 'city', label: 'City', type: 'text', hint: HELP.city.body },
        { key: 'postal', label: 'PIN code', type: 'text', mono: true, maxLength: 6, hint: HELP.postal.body },
        { key: 'primary', label: 'Primary', type: 'toggle', onText: 'Primary', offText: 'Not primary', locked: casual || !isActive(d), hint: HELP.primary.body },
      ]
    },
    view: (r) => {
      const ended = isCasual(r) && isActive(r) && !!r.validTo && r.validTo < today
      const notes = [
        ended ? `This casual registration’s validity ended on ${fmtDate(r.validTo)}.` : '',
        r.panMismatch ? 'The PAN in this GSTIN differs from the PAN in Business profile.' : '',
        isActive(r) && !isCasual(r) && r.siteNames.length === 0 ? 'No location is in this state yet.' : '',
      ].filter(Boolean)
      return {
        no: r.gstin || EM_DASH,
        status: isActive(r) ? 'Active' : 'Cancelled',
        tags: [...(r.primary && isActive(r) ? ['Primary'] : []), ...(r.scheme === 'Composition' ? ['Composition'] : []), ...(isCasual(r) ? ['Casual'] : [])],
        title: r.legal || 'Untitled registration',
        subtitle: [r.gstin.slice(0, 2), r.stateName].filter(Boolean).join(' · ') || undefined,
        notice: notes.length ? notes.join(' ') : undefined,
        facts: [
          { k: 'Invoice numbers', v: r.invoicePreview || EM_DASH },
          { k: 'Locations', v: r.siteNames.length ? r.siteNames.join(', ') : isCasual(r) ? 'Casual registrations own none' : 'None yet' },
          ...(!isActive(r) ? [{ k: 'Cancelled on', v: fmtDate(r.cancelledOn) }] : []),
        ],
      }
    },
    blank: () => blank(),
    onChange: (draft, key, mode) => {
      if (key === 'gstin') {
        const gstin = normalizeGstin(draft.gstin)
        const auto = draft.series === '' || /^[A-Z]{2}\/\{FY\}\/$/.test(draft.series)
        return { ...draft, gstin, series: mode === 'new' && auto ? suggestSeries(gstin) : draft.series }
      }
      if (key === 'scheme' && draft.scheme === 'Composition') return { ...draft, filing: 'Quarterly', eInvoice: false }
      if (key === 'regType' && draft.regType === 'Casual') return { ...draft, primary: false }
      if (key === 'postal') return { ...draft, postal: draft.postal.replace(/\D/g, '').slice(0, 6) }
      if (key === 'series') return { ...draft, series: draft.series.toUpperCase().replace(/\s+/g, '') }
      return draft
    },
    normalize: (draft) => ({ ...draft, ...normalizeRegistration(draft) }),
    validate: (draft, others) => {
      const original = list.find((r) => r.id === draft.id) ?? null
      return validateRegistration(draft, {
        mode: original ? 'edit' : 'new',
        others: others.map(toRegistration),
        original,
        pan,
        today,
        fiscalStart,
      })
    },
    save: async (record) => {
      await save.mutateAsync(toRegistration(record))
    },
    label: (r) => `${r.gstin} · ${r.stateName || r.legal}`,
  }

  const confirmCancel = async () => {
    const row = pending?.row
    setPending(null)
    if (!row) return
    try {
      await cancel.mutateAsync(row.id)
      toast('Registration cancelled', { description: row.gstin })
    } catch (e) {
      refuse('Can’t cancel', e instanceof Error ? e.message : 'Try again.')
    }
  }

  const pill =
    activeCount === 0 && cancelledCount === 0
      ? undefined
      : `${activeCount} active${cancelledCount ? ` · ${cancelledCount} cancelled` : ''}`

  return (
    <SettingsPage title="GST registrations" help={HELP.page} count={pill} flush readOnly={readOnly}>
      {gaps.length > 0 && (
        <div className="m-[14px] mb-0 flex flex-none flex-col gap-2">
          {gaps.map((g) => (
            <div
              key={g.state.code}
              role="status"
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-warn-bg px-3 py-2 text-[12.5px] text-warn-fg"
            >
              <TriangleAlert className="size-[14px] flex-none" strokeWidth={2} />
              <span className="min-w-0 flex-1">{gapText(g)}</span>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => setPrefill((p) => ({ code: g.state.code, n: (p?.n ?? 0) + 1 }))}
                  className="hover-lift inline-flex h-7 items-center rounded-md border border-current/40 bg-transparent px-2.5 text-[12px] font-semibold hover:bg-tint-12"
                >
                  Add {g.state.name} registration
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <ListPage<GstRegistrationRow>
        // A new key re-opens the New drawer with the state's code filled in (Add … registration).
        key={prefill?.n ?? 0}
        embedded
        readOnly={readOnly}
        dataset={dataset}
        rows={rows}
        isLoading={regs.isLoading || warehouses.isLoading}
        error={regs.error ?? warehouses.error}
        onRefresh={() => Promise.all([regs.refetch(), warehouses.refetch()])}
        remove={del}
        editor={editor}
        actions={[makePrimaryAction, cancelAction, reactivateAction, copyAction]}
        shortcuts={shortcuts}
        initialDraft={prefill ? blank(prefill.code) : undefined}
        emptyText="Add your GSTIN to start calculating tax."
      />
      <ConfirmDialog
        open={pending?.kind === 'cancel'}
        danger
        title="Cancel this registration?"
        description={
          pending
            ? `${pending.row.gstin} · ${pending.row.stateName} is kept on the list, dimmed, and is no longer offered to new documents. You can reactivate it later.`
            : ''
        }
        confirmLabel="Cancel registration"
        onConfirm={() => void confirmCancel()}
        onCancel={() => setPending(null)}
      />
    </SettingsPage>
  )
}
