import { useNavigate } from '@tanstack/react-router'
import { Archive, Check, IndianRupee, Layers } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DocumentCard, DocumentPage, type DocumentState, TotalsCard } from '@/components/document/DocumentPage'
import {
  Field,
  Notice,
  fieldClass,
  numberInputClass,
  primaryButton,
  secondaryButton,
} from '@/components/document/parts'
import { NotesBlock } from '@/components/notes/NotesBlock'
import { useList, useUpsert } from '@/data/queries'
import { useMe } from '@/data/queries/session'
import type { Bom, BomKind, BomStatus, Employee, Item, Warehouse } from '@/data/schemas'
import {
  type BomEditableField,
  applyBomCostToItem,
  bomCostDelta,
  bomNextNo,
  bomSaveDraftError,
  bomSetField,
  bomToggleSub,
  bomValidate,
  newBom,
  prepareBomActivate,
  prepareBomArchive,
  prepareBomSave,
} from '@/domain/bom-document'
import {
  aoSiteName,
  bomBuildable,
  bomRollup,
  bomShortages,
  bomStatusLabel,
  mainLocationId,
} from '@/domain/production'
import { int, money, todayLocal } from '@/lib/format'
import { isTypingTarget } from '@/lib/keyboard'
import { cn } from '@/lib/utils'
import { BomLines } from './BomLines'

const BACK_TO = '/production/bills-of-materials'
const BACK_LABEL = 'Back to bills of materials'

interface Loaded {
  boms: Bom[]
  items: Item[]
  warehouses: Warehouse[]
  employees: Employee[]
  meName: string
}

/** Production ▸ Bills of Materials ▸ document. `routeNo` is a BOM number or `new`. */
export function BomEditor({
  routeNo,
  parentItem,
  showProductionAxis = false,
}: {
  routeNo: string
  parentItem?: string
  showProductionAxis?: boolean
}) {
  const boms = useList('boms')
  const items = useList('items')
  const warehouses = useList('warehouses')
  const employees = useList('employees')
  const me = useMe()
  const queries = [boms, items, warehouses, employees, me]

  const isNew = routeNo === 'new'
  const allBoms = useMemo(() => boms.data ?? [], [boms.data])
  const saved = allBoms.find((b) => b.no === routeNo)

  let state: DocumentState | null = null
  if (queries.some((q) => q.isError)) {
    state = {
      kind: 'error',
      message: 'Could not load this bill of materials.',
      retry: () => queries.forEach((q) => void q.refetch()),
    }
  } else if (!queries.every((q) => q.data !== undefined)) {
    state = { kind: 'loading' }
  } else if (!isNew && !saved) {
    state = {
      kind: 'error',
      message: `Bill of materials ${routeNo} was not found. It may have been deleted.`,
    }
  }
  if (state) {
    return (
      <DocumentPage
        pageLabel="Bill of materials"
        backTo={BACK_TO}
        header={{ title: 'Bill of materials', backLabel: BACK_LABEL }}
        state={state}
      />
    )
  }

  const data: Loaded = {
    boms: allBoms,
    items: items.data ?? [],
    warehouses: warehouses.data ?? [],
    employees: employees.data ?? [],
    meName: me.data?.name ?? '',
  }

  return (
    <Editor
      key={`${routeNo}:${parentItem ?? ''}`}
      routeNo={routeNo}
      parentItem={parentItem}
      showProductionAxis={showProductionAxis}
      data={data}
    />
  )
}

function Editor({
  routeNo,
  parentItem,
  showProductionAxis,
  data,
}: {
  routeNo: string
  parentItem?: string
  showProductionAxis: boolean
  data: Loaded
}) {
  const navigate = useNavigate()
  const saveBom = useUpsert('boms')
  const saveItem = useUpsert('items')
  const isNew = routeNo === 'new'
  const today = useMemo(() => todayLocal(), [])

  const [draft, setDraft] = useState<Bom>(() => {
    if (!isNew) {
      return structuredClone(data.boms.find((b) => b.no === routeNo) as Bom)
    }
    const myEmpId = data.employees.find((e) => e.name === data.meName)?.id ?? ''
    return newBom(bomNextNo(data.boms), today, {
      parentItem,
      items: data.items,
      wipLocation: 'WH-ASSY',
      createdBy: myEmpId,
    })
  })
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [error, setError] = useState('')
  const [applyOpen, setApplyOpen] = useState(false)

  const busy = saveBom.isPending || saveItem.isPending
  const mainLocId = useMemo(() => mainLocationId(data.warehouses), [data.warehouses])
  const buildLocLabel = useMemo(() => aoSiteName(mainLocId, data.warehouses), [mainLocId, data.warehouses])

  const rollup = useMemo(
    () => bomRollup(draft, data.boms, data.items, today),
    [draft, data.boms, data.items, today],
  )
  const buildable = useMemo(
    () => bomBuildable(draft, data.items, mainLocId, mainLocId),
    [draft, data.items, mainLocId],
  )
  const shortages = useMemo(
    () => bomShortages(draft.lines, 1, data.items, mainLocId, draft.outputQty, mainLocId),
    [draft.lines, draft.outputQty, data.items, mainLocId],
  )
  const parentItemObj = useMemo(
    () => data.items.find((i) => i.no === draft.parentItem),
    [data.items, draft.parentItem],
  )
  const currentCost = parentItemObj?.cost ?? 0
  const delta = useMemo(() => bomCostDelta(rollup.unit, parentItemObj), [rollup.unit, parentItemObj])
  const parentOptions = useMemo(
    () => data.items.map((it) => ({ value: it.no, label: `${it.no} · ${it.desc}` })),
    [data.items],
  )

  const setField = <K extends BomEditableField>(field: K, value: Bom[K]) => {
    setError('')
    setDraft((d) => bomSetField(d, field, value, data.items))
  }

  const back = () => navigate({ to: BACK_TO })

  const commit = async (next: Bom, title: string) => {
    try {
      await saveBom.mutateAsync(next)
    } catch {
      setError('Could not save the bill of materials. Check your connection and try again.')
      return
    }
    toast(title, { description: `${next.no} · ${next.parentItem}` })
    void navigate({ to: BACK_TO, search: { sel: next.no } })
  }

  const saveDraft = () => {
    const msg = bomSaveDraftError(draft, data.boms, today)
    if (msg) {
      setError(msg)
      return
    }
    void commit(prepareBomSave(draft, new Date().toISOString().slice(0, 19)), 'Bill of materials saved')
  }

  const activate = () => {
    const msg = bomValidate({ ...draft, status: 'active' }, data.boms, today)
    if (msg) {
      setError(msg)
      return
    }
    void commit(prepareBomActivate(draft, new Date().toISOString().slice(0, 19)), 'Bill of materials activated')
  }

  const archive = () => {
    if (!draft.parentItem) {
      setError('Choose the item this BOM makes.')
      return
    }
    void commit(
      prepareBomArchive(draft, today, new Date().toISOString().slice(0, 19)),
      'Bill of materials archived',
    )
  }

  const confirmApplyCost = async () => {
    if (!parentItemObj) return
    const updated = applyBomCostToItem(parentItemObj, rollup.unit)
    try {
      await saveItem.mutateAsync(updated)
    } catch {
      setApplyOpen(false)
      setError('Could not update the item cost. Check your connection and try again.')
      return
    }
    setApplyOpen(false)
    toast('Item cost updated', { description: `${updated.no} · ${money(updated.cost)}` })
  }

  const newOrder = () => {
    if (!draft.parentItem) return
    void navigate({
      to: '/production/assembly-orders/$no',
      params: { no: 'new' },
      search: { item: draft.parentItem } as never,
    })
  }

  // E focus first component qty · Ctrl/Cmd+S save · Esc blur field or return to list.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (!applyOpen && !busy) saveDraft()
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (document.querySelector('[role="dialog"], [role="menu"], [role="listbox"]')) return

      if (e.key === 'Escape') {
        if (isTypingTarget(e.target)) {
          ;(e.target as HTMLElement).blur()
          return
        }
        e.preventDefault()
        void back()
        return
      }
      if (isTypingTarget(e.target)) return
      if (e.key.toLowerCase() === 'e') {
        const firstQty = document.querySelector<HTMLInputElement>('[data-bom-first-qty="1"]')
        if (firstQty) {
          e.preventDefault()
          firstQty.focus()
          firstQty.select?.()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const canOrder = draft.status === 'active' && !!draft.parentItem
  const showArchive = draft.status === 'active'
  const showActivate = draft.status !== 'active'
  const showProduction = showProductionAxis && draft.kind === 'production'

  return (
    <DocumentPage
      pageLabel="Bill of materials"
      backTo={BACK_TO}
      header={{
        title: isNew ? 'New bill of materials' : 'Bill of materials',
        no: draft.no,
        status: bomStatusLabel(draft.status),
        subtitle: 'What this item is made of — assembly orders explode their components from the active version.',
        backLabel: BACK_LABEL,
        actions: canOrder && (
          <button
            type="button"
            onClick={newOrder}
            className={cn(secondaryButton, 'h-8 flex-none px-[14px] font-semibold')}
          >
            <Layers className="size-[14px]" strokeWidth={2} />
            New assembly order
          </button>
        ),
      }}
      footerStart={
        showArchive && (
          <button
            type="button"
            onClick={archive}
            disabled={busy}
            className={cn(
              secondaryButton,
              'px-[14px] font-medium text-muted-foreground hover:border-bad-fg hover:bg-bad-bg hover:text-bad-fg',
            )}
          >
            Archive version
          </button>
        )
      }
      footerEnd={
        <>
          <button type="button" onClick={back} className={cn(secondaryButton, 'font-medium')}>
            Discard
          </button>
          <button
            type="button"
            onClick={saveDraft}
            disabled={busy}
            title="Save (Ctrl/Cmd + S)"
            className={cn(secondaryButton, 'font-semibold')}
          >
            Save
          </button>
          {showActivate && (
            <button type="button" onClick={activate} disabled={busy} className={primaryButton}>
              <Check className="size-[14px]" strokeWidth={2.4} />
              Activate
            </button>
          )}
        </>
      }
    >
      {draft.status === 'archived' && (
        <Notice tone="muted" icon={<Archive className="size-[15px] flex-none" strokeWidth={2} />}>
          Archived version — kept for history. Orders placed while it was active still reference it.
        </Notice>
      )}

      <DocumentCard>
        <div className="grid grid-cols-1 gap-x-[18px] gap-y-[14px] md:grid-cols-3">
          <Field label="Makes" htmlFor="bom-parent">
            <select
              id="bom-parent"
              value={draft.parentItem}
              onChange={(e) => setField('parentItem', e.target.value)}
              className={fieldClass}
            >
              <option value="">Select the item this makes…</option>
              {parentOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Version" htmlFor="bom-version">
            <input
              id="bom-version"
              value={draft.version}
              onChange={(e) => setField('version', e.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Status" htmlFor="bom-status">
            <select
              id="bom-status"
              value={draft.status}
              onChange={(e) => setField('status', e.target.value as BomStatus)}
              className={fieldClass}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </Field>
          <Field label="Effective from" htmlFor="bom-effective-from">
            <input
              id="bom-effective-from"
              type="date"
              value={draft.effectiveFrom ?? ''}
              onChange={(e) => setField('effectiveFrom', e.target.value || null)}
              className={fieldClass}
            />
          </Field>
          <Field label="Effective to" htmlFor="bom-effective-to">
            <input
              id="bom-effective-to"
              type="date"
              value={draft.effectiveTo ?? ''}
              onChange={(e) => setField('effectiveTo', e.target.value || null)}
              className={fieldClass}
            />
          </Field>
          <Field label="Output per run" htmlFor="bom-output-qty">
            <div className="flex items-center gap-2">
              <input
                id="bom-output-qty"
                type="number"
                min={1}
                value={draft.outputQty}
                onChange={(e) => setField('outputQty', Math.max(1, Number.parseFloat(e.target.value) || 1))}
                className={cn(fieldClass, 'tnum flex-1')}
              />
              <span className="flex-none text-[12.5px] text-muted-foreground">{draft.uom || 'NOS'}</span>
            </div>
          </Field>
          {showProductionAxis && (
            <Field label="Kind" htmlFor="bom-kind">
              <select
                id="bom-kind"
                value={draft.kind}
                onChange={(e) => setField('kind', e.target.value as BomKind)}
                className={fieldClass}
              >
                <option value="assembly">Assembly — parts list, one step</option>
                <option value="production">Production — routed, with yield</option>
              </select>
            </Field>
          )}
          {showProduction && (
            <Field label="Yield %" htmlFor="bom-yield">
              <input
                id="bom-yield"
                type="number"
                min={1}
                max={100}
                value={draft.yieldPct}
                onChange={(e) => setField('yieldPct', Math.max(1, Number.parseFloat(e.target.value) || 100))}
                className={cn(fieldClass, 'tnum')}
              />
            </Field>
          )}
        </div>
      </DocumentCard>

      <BomLines
        draft={draft}
        boms={data.boms}
        items={data.items}
        today={today}
        expanded={expanded}
        onToggleSub={(key) => setExpanded((cur) => bomToggleSub(cur, key))}
        onLinesChange={(lines) => {
          setError('')
          setDraft((d) => ({ ...d, lines }))
        }}
      />

      <div className="grid flex-shrink-0 grid-cols-1 items-start gap-[18px] lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-[18px]">
          <DocumentCard className="px-4 py-[14px]">
            <div className="mb-2.5 flex items-baseline justify-between gap-3">
              <div className="text-[13px] font-semibold">Availability</div>
              <div className="text-[11.5px] text-muted-foreground">at {buildLocLabel}</div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn('tnum text-[22px] font-bold', buildable > 0 ? 'text-foreground' : 'text-bad-fg')}>
                {int(buildable)}
              </span>
              <span className="text-[12.5px] text-muted-foreground">buildable from stock on hand</span>
            </div>
            {shortages.length > 0 ? (
              <div className="mt-3 flex flex-col gap-1.5">
                {shortages.map((r) => (
                  <div
                    key={r.item}
                    className="flex items-center justify-between gap-2.5 rounded-lg bg-warn-bg px-[10px] py-[7px] text-xs text-warn-fg"
                  >
                    <span className="min-w-0 truncate">
                      <span className="font-mono text-[11.5px]">{r.item}</span> · {r.desc}
                    </span>
                    <span className="tnum flex-none font-semibold">short {int(r.short)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-2.5 text-xs text-muted-foreground">
                Every component is in stock for at least one build.
              </div>
            )}
          </DocumentCard>

          <DocumentCard className="px-4 py-[14px]">
            <NotesBlock
              entityType="bom"
              entityNo={draft.no}
              placeholder="Assembly instructions, QC checks, handling notes…"
            />
          </DocumentCard>
        </div>

        <TotalsCard
          title="Cost rollup"
          rows={[
            { label: 'Materials', value: money(rollup.materials) },
            {
              label: 'Labour',
              value: (
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  aria-label="Labour"
                  value={draft.labourCost}
                  onChange={(e) =>
                    setField('labourCost', Math.max(0, Number.parseFloat(e.target.value) || 0))
                  }
                  className={cn(numberInputClass, 'h-7 w-[92px] text-[12.5px]')}
                />
              ),
            },
            {
              label: 'Overhead %',
              value: (
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  aria-label="Overhead %"
                  value={draft.overheadPct}
                  onChange={(e) =>
                    setField('overheadPct', Math.max(0, Number.parseFloat(e.target.value) || 0))
                  }
                  className={cn(numberInputClass, 'h-7 w-[92px] text-[12.5px]')}
                />
              ),
            },
          ]}
          total={{ label: 'Unit cost', value: money(rollup.unit) }}
        >
          <div className="flex items-center justify-between pt-0.5 pb-2.5 text-[11.5px] text-muted-foreground">
            <span>Item cost today</span>
            <span className="tnum">{money(currentCost)}</span>
          </div>
          {delta.text && (
            <div
              className={cn(
                'text-[11.5px]',
                delta.tone === 'ok'
                  ? 'text-ok-fg'
                  : delta.tone === 'warn'
                    ? 'text-warn-fg'
                    : 'text-muted-foreground',
              )}
            >
              {delta.text}
            </div>
          )}
          <button
            type="button"
            disabled={!parentItemObj || busy}
            onClick={() => setApplyOpen(true)}
            className="hover-lift mt-3 inline-flex h-8 w-full items-center justify-center gap-[7px] rounded-lg border border-border bg-card text-[12.5px] font-semibold text-foreground hover:bg-primary-tint hover:text-primary disabled:pointer-events-none disabled:opacity-50"
          >
            <IndianRupee className="size-[13px]" strokeWidth={2} />
            Apply as item cost
          </button>
        </TotalsCard>
      </div>

      {draft.operations.length > 0 && (
        <DocumentCard className="px-4 py-[14px]">
          <div className="mb-2.5 text-[13px] font-semibold">Operations</div>
          <div className="flex flex-col">
            {draft.operations.map((op) => (
              <div
                key={op.seq}
                className="flex items-center gap-3 border-b border-dashed border-border py-[7px] text-[12.5px] last:border-b-0"
              >
                <span className="w-[34px] flex-none font-mono text-[11.5px] text-muted-foreground">
                  {op.seq}
                </span>
                <span className="min-w-0 flex-1 font-medium">{op.name}</span>
                <span className="tnum flex-none text-muted-foreground">
                  {op.setupMin || 0} min setup · {op.runMinPerUnit || 0} min/unit
                </span>
              </div>
            ))}
          </div>
        </DocumentCard>
      )}

      {error && <Notice tone="bad">{error}</Notice>}

      <ConfirmDialog
        open={applyOpen}
        title="Apply rolled-up cost?"
        description={
          parentItemObj ? (
            <>
              Set {parentItemObj.no}’s unit cost to {money(rollup.unit)} (currently {money(currentCost)}). Past
              orders and costing history are unaffected.
            </>
          ) : (
            ''
          )
        }
        confirmLabel="Apply cost"
        onConfirm={() => void confirmApplyCost()}
        onCancel={() => setApplyOpen(false)}
      />
    </DocumentPage>
  )
}
