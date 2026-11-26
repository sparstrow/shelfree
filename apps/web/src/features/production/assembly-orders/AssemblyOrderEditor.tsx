import { Link, useNavigate } from '@tanstack/react-router'
import {
  Ban,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Lock,
  Play,
  RotateCcw,
  Search,
  TriangleAlert,
  XCircle,
} from 'lucide-react'
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useUi } from '@/app/stores/ui'
import { DocumentCard, DocumentPage, type DocumentState } from '@/components/document/DocumentPage'
import { type LineColumn, LineGrid } from '@/components/document/LineGrid'
import { Field, Notice, fieldClass, primaryButton, secondaryButton } from '@/components/document/parts'
import { NotesBlock } from '@/components/notes/NotesBlock'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CommandError } from '@/data/api/commands'
import { useFinishAssemblyOrder, useList, useUpsert } from '@/data/queries'
import { useSettings } from '@/data/queries/settings'
import { useMe } from '@/data/queries/session'
import { resolveAssemblyDefaults } from '@/domain/personal-preferences'
import type { AoStatus, AssemblyOrder, AssemblyOrderLine, Bom, Employee, Item, Warehouse } from '@/data/schemas'
import {
  DEFAULT_PRODUCTION_SETTINGS,
  type ProductionSettings,
  aoApplyItem,
  aoCancelOrder,
  aoEditable,
  aoProgressPct,
  aoReadOnly,
  aoReleaseOrder,
  aoReopenOrder,
  aoSaveError,
  aoSetQuantity,
  aoStartOrder,
  newAssemblyOrder,
} from '@/domain/assembly-order'
import {
  activeBomFor,
  aoBuildable,
  aoShortages,
  aoSiteName,
  aoStatusLabel,
  availAt,
  mainLocationId,
} from '@/domain/production'
import { int, todayLocal } from '@/lib/format'
import { isTypingTarget } from '@/lib/keyboard'
import { cn } from '@/lib/utils'
import { FinishDialog } from './FinishDialog'

const BACK_TO = '/production/assembly-orders'
const BACK_LABEL = 'Back to assembly orders'

const STATUS_ICONS: Record<AoStatus, ReactNode> = {
  planned: <Clock className="size-3" strokeWidth={2.2} />,
  draft: <FileText className="size-3" strokeWidth={2.2} />,
  released: <Check className="size-3" strokeWidth={2.2} />,
  inProgress: <Play className="size-3" strokeWidth={2.2} />,
  finished: <CheckCircle2 className="size-3" strokeWidth={2.2} />,
  cancelled: <XCircle className="size-3" strokeWidth={2.2} />,
}

interface Loaded {
  orders: AssemblyOrder[]
  items: Item[]
  boms: Bom[]
  warehouses: Warehouse[]
  employees: Employee[]
  /** Settings ▸ Assembly & production. */
  production: ProductionSettings
}

/** Production ▸ Assembly Orders ▸ document (`$no`, or `new`). */
export function AssemblyOrderEditor({ routeNo, initialItemNo }: { routeNo: string; initialItemNo?: string }) {
  const orders = useList('assemblyOrders')
  const items = useList('items')
  const boms = useList('boms')
  const warehouses = useList('warehouses')
  const employees = useList('employees')
  const settings = useSettings()
  const production = settings.data?.production ?? DEFAULT_PRODUCTION_SETTINGS
  const me = useMe()
  const myLoc = me.data?.defAssemblyLoc
  const myQty = me.data?.defAssemblyQty

  const queries = [orders, items, boms, warehouses, employees, settings, me]
  const failed = queries.find((q) => q.isError)
  const loading = queries.some((q) => q.isLoading)

  const state: DocumentState = failed
    ? { kind: 'error', message: 'Could not load assembly order details.', retry: () => void failed.refetch() }
    : loading
      ? { kind: 'loading' }
      : { kind: 'ready' }

  const isNew = routeNo === 'new'
  const saved = isNew ? undefined : orders.data?.find((o) => o.no === routeNo)
  const missing = state.kind === 'ready' && !isNew && !saved

  const initialDraft = useMemo(() => {
    if (state.kind !== 'ready') return null
    if (!isNew) return saved ?? null
    // Personal defaults (Settings ▸ Personal defaults ▸ Assembly orders) win over the workspace's output location.
    const mine = resolveAssemblyDefaults({ defAssemblyLoc: myLoc, defAssemblyQty: myQty }, production.outputLoc)
    const base = newAssemblyOrder(orders.data ?? [], todayLocal(), {
      defaultLoc: mine.location,
      defaultQty: mine.qty,
    })
    if (!initialItemNo) return base
    const foundItem = (items.data ?? []).find((it) => it.no === initialItemNo)
    return foundItem ? aoApplyItem(base, foundItem, boms.data ?? [], base.orderDate) : base
  }, [state.kind, isNew, saved, orders.data, initialItemNo, items.data, boms.data, production.outputLoc, myLoc, myQty])

  if (state.kind !== 'ready') {
    return (
      <DocumentPage
        pageLabel={isNew ? 'New assembly order' : `Assembly order ${routeNo}`}
        backTo={BACK_TO}
        header={{
          title: isNew ? 'New assembly order' : 'Assembly order',
          no: isNew ? undefined : routeNo,
          backLabel: BACK_LABEL,
        }}
        state={state}
      />
    )
  }

  if (missing || !initialDraft) {
    return (
      <DocumentPage
        pageLabel={`Assembly order ${routeNo}`}
        backTo={BACK_TO}
        header={{ title: 'Assembly order', no: routeNo, backLabel: BACK_LABEL }}
        state={{ kind: 'error', message: `Assembly order ${routeNo} was not found.` }}
      />
    )
  }

  const data: Loaded = {
    orders: orders.data ?? [],
    items: items.data ?? [],
    boms: boms.data ?? [],
    warehouses: warehouses.data ?? [],
    employees: employees.data ?? [],
    production,
  }

  return <Editor key={routeNo} initial={initialDraft} isNew={isNew} data={data} />
}

function ItemPickerDialog({
  open,
  onOpenChange,
  items,
  boms,
  orderDate,
  onPick,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: readonly Item[]
  boms: readonly Bom[]
  orderDate: string
  onPick: (item: Item) => void
}) {
  const [query, setQuery] = useState('')

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches: Array<{ item: Item; bom: Bom }> = []
    for (const item of items) {
      if (item.blocked) continue
      const bom = activeBomFor(boms, item.no, orderDate)
      if (!bom) continue
      if (q && !`${item.no} ${item.desc}`.toLowerCase().includes(q)) continue
      matches.push({ item, bom })
      if (matches.length >= 60) break
    }
    return matches
  }, [items, boms, orderDate, query])

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setQuery('')
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[70vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[540px]">
        <DialogHeader className="border-b border-border px-4 py-[14px]">
          <DialogTitle className="text-[14px] font-semibold">What are you building?</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Only items with an active bill of materials can be assembled.
          </DialogDescription>
        </DialogHeader>

        <div className="border-b border-border px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-[10px] left-[11px] size-[14px] text-muted-foreground" />
            <input
              autoFocus
              aria-label="Search assembled items"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search assembled items…"
              className={cn(fieldClass, 'pl-[34px]')}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-1.5">
          {candidates.length === 0 ? (
            <div className="px-4 py-7 text-center text-[13px] text-muted-foreground">
              No assembled items match — create a bill of materials first.
            </div>
          ) : (
            candidates.map(({ item, bom }) => (
              <button
                key={item.no}
                type="button"
                onClick={() => {
                  onPick(item)
                  setQuery('')
                }}
                className="flex w-full items-center gap-3 rounded-lg border-0 bg-transparent px-[11px] py-[9px] text-left text-foreground transition-colors duration-[120ms] hover:bg-tint-7"
              >
                <span className="w-[110px] flex-none font-mono text-xs font-medium">{item.no}</span>
                <span className="min-w-0 flex-1 truncate text-[13px]">{item.desc}</span>
                <span className="tnum flex-none text-[11.5px] text-muted-foreground">
                  {bom.no} · {item.uom}
                </span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Editor({ initial, isNew, data }: { initial: AssemblyOrder; isNew: boolean; data: Loaded }) {
  const navigate = useNavigate()
  const upsert = useUpsert('assemblyOrders')
  const finishMutation = useFinishAssemblyOrder()
  const demoRole = useUi((s) => s.demoRole)
  const isAdmin = demoRole === 'owner' || demoRole === 'admin'

  const [draft, setDraft] = useState<AssemblyOrder>(initial)
  const [error, setError] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)

  const editable = aoEditable(draft)
  const readOnly = aoReadOnly(draft)
  const mainLocId = useMemo(() => mainLocationId(data.warehouses), [data.warehouses])
  const busy = upsert.isPending || finishMutation.isPending

  const locationOptions = useMemo(
    () => data.warehouses.filter((w) => w.status !== 'inactive' || w.id === draft.location),
    [data.warehouses, draft.location],
  )

  const assigneeOptions = useMemo(
    () =>
      data.employees
        .filter((e) => (e.dept === 'Manufacturing' && e.status !== 'Terminated') || e.id === draft.assignee)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [data.employees, draft.assignee],
  )

  const shortages = useMemo(
    () => aoShortages(draft, data.items, mainLocId),
    [draft, data.items, mainLocId],
  )

  const shortMap = useMemo(
    () => new Map(shortages.map((s) => [s.item, s])),
    [shortages],
  )

  const buildable = useMemo(
    () => aoBuildable(draft, data.items, mainLocId),
    [draft, data.items, mainLocId],
  )

  const progressPct = aoProgressPct(draft)

  const goBack = useCallback(() => {
    void navigate({ to: BACK_TO })
  }, [navigate])

  const commit = useCallback(
    async (next: AssemblyOrder, toastTitle: string, stay: boolean) => {
      try {
        await upsert.mutateAsync(next)
      } catch {
        setError('Could not save the assembly order. Check your connection and try again.')
        return
      }
      setError('')
      toast(toastTitle, { description: `${next.no} · ${next.item}` })
      if (stay) {
        setDraft(next)
        if (isNew) {
          void navigate({ to: '/production/assembly-orders/$no', params: { no: next.no }, replace: true })
        }
      } else {
        void navigate({ to: BACK_TO, search: { sel: next.no } })
      }
    },
    [upsert, isNew, navigate],
  )

  const handleSave = useCallback(async () => {
    const problem = aoSaveError(draft)
    if (problem) {
      setError(problem)
      return
    }
    await commit(draft, 'Assembly order saved', false)
  }, [draft, commit])

  const handleRelease = useCallback(async () => {
    const res = aoReleaseOrder(draft, data.items, mainLocId, data.production)
    if (!res.ok) {
      setError(res.error)
      return
    }
    await commit(
      res.order,
      res.shortages.length > 0 ? 'Released with shortages' : 'Assembly order released',
      true,
    )
  }, [draft, data.items, mainLocId, data.production, commit])

  const handleStart = useCallback(async () => {
    const res = aoStartOrder(draft)
    if (!res.ok) {
      setError(res.error)
      return
    }
    await commit(res.order, 'Assembly started', true)
  }, [draft, commit])

  const handleCancelOrder = useCallback(async () => {
    const res = aoCancelOrder(draft)
    if (!res.ok) {
      setError(res.error)
      return
    }
    await commit(res.order, 'Assembly order cancelled', false)
  }, [draft, commit])

  const handleReopen = useCallback(async () => {
    const res = aoReopenOrder(draft, isAdmin)
    if (!res.ok) {
      setError(res.error)
      return
    }
    await commit(res.order, 'Assembly order reopened', true)
  }, [draft, isAdmin, commit])

  const handleFinishSubmit = useCallback(
    async (input: { qtyFinished: number; consumed?: Record<string, number> }): Promise<string | null> => {
      try {
        // Persist any unsaved header changes (such as location) so Finish posts to the shown site.
        if (
          draft.location !== initial.location ||
          draft.dueDate !== initial.dueDate ||
          draft.assignee !== initial.assignee
        ) {
          await upsert.mutateAsync(draft)
        }
        const updated = await finishMutation.mutateAsync({
          no: draft.no,
          qtyFinished: input.qtyFinished,
          consumed: input.consumed,
        })
        setDraft(updated)
        setFinishOpen(false)
        setError('')
        const siteName = aoSiteName(updated.location || mainLocId, data.warehouses)
        toast(updated.status === 'finished' ? 'Assembly order finished' : 'Output posted', {
          description: `${int(input.qtyFinished)} × ${updated.item} → ${siteName}`,
        })
        return null
      } catch (err) {
        return err instanceof CommandError ? err.message : 'Could not finish the assembly order.'
      }
    },
    [draft, initial.location, initial.dueDate, initial.assignee, upsert, finishMutation, mainLocId, data.warehouses],
  )

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (pickerOpen || finishOpen) return
      if (e.key === 'Escape') {
        if (isTypingTarget(e.target)) return
        if (document.querySelector('[role="menu"], [role="listbox"], [role="dialog"]')) return
        e.preventDefault()
        goBack()
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !isTypingTarget(e.target) && !busy) {
        if (draft.status === 'draft' || draft.status === 'planned') {
          e.preventDefault()
          void handleRelease()
        } else if (draft.status === 'released') {
          e.preventDefault()
          void handleStart()
        } else if (draft.status === 'inProgress') {
          e.preventDefault()
          setFinishOpen(true)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pickerOpen, finishOpen, busy, draft.status, goBack, handleRelease, handleStart])

  function handlePickItem(item: Item) {
    setError('')
    setDraft((prev) => aoApplyItem(prev, item, data.boms, prev.orderDate))
    setPickerOpen(false)
  }

  function handleQtyChange(raw: string) {
    const qty = Math.max(0, Number.parseFloat(raw) || 0)
    const bom = draft.bomId ? data.boms.find((b) => b.no === draft.bomId) : undefined
    setError('')
    setDraft((prev) => aoSetQuantity(prev, qty, bom))
  }

  function setHeaderField<K extends 'location' | 'dueDate' | 'assignee'>(field: K, value: AssemblyOrder[K]) {
    setError('')
    setDraft((prev) => ({ ...prev, [field]: value }))
  }

  const columns: LineColumn<AssemblyOrderLine>[] = useMemo(
    () => [
      {
        key: 'item',
        label: 'Component',
        align: 'left',
        width: 280,
        cell: (line) => (
          <Link to="/warehouse/items/$no" params={{ no: line.item }} className="group block min-w-0">
            <div className="font-mono text-xs font-medium text-foreground group-hover:underline">{line.item}</div>
            <div className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{line.desc}</div>
          </Link>
        ),
      },
      {
        key: 'uom',
        label: 'UoM',
        align: 'left',
        width: 64,
        cell: (line) => <span className="text-[12.5px] text-muted-foreground">{line.uom}</span>,
      },
      {
        key: 'scrap',
        label: 'Scrap',
        align: 'right',
        width: 80,
        cell: (line) => <span className="tnum text-[12.5px] text-muted-foreground">{line.scrapPct || 0}%</span>,
      },
      {
        key: 'qtyRequired',
        label: 'Required',
        align: 'right',
        width: 110,
        cell: (line) => <span className="tnum text-[12.5px]">{int(line.qtyRequired)}</span>,
      },
      {
        key: 'available',
        label: 'Available',
        align: 'right',
        width: 110,
        cell: (line) => (
          <span className="tnum text-[12.5px]">{int(availAt(line.item, draft.location, data.items, mainLocId))}</span>
        ),
      },
      {
        key: 'qtyConsumed',
        label: 'Consumed',
        align: 'right',
        width: 110,
        cell: (line) => <span className="tnum text-[12.5px]">{int(line.qtyConsumed || 0)}</span>,
      },
      {
        key: 'status',
        label: 'Status',
        align: 'left',
        width: 110,
        cell: (line) => {
          const short = !readOnly ? shortMap.get(line.item) : undefined
          return (
            <span className="tnum inline-flex items-center gap-[6px] text-xs font-medium whitespace-nowrap">
              <span
                className={cn('size-[7px] flex-none rounded-full', short ? 'bg-bad-fg' : 'bg-ok-fg')}
                aria-hidden="true"
              />
              {short ? `short ${int(short.short)}` : 'ok'}
            </span>
          )
        },
      },
    ],
    [draft.location, data.items, mainLocId, readOnly, shortMap],
  )

  return (
    <>
      <DocumentPage
        pageLabel={isNew ? 'New assembly order' : `Assembly order ${draft.no}`}
        backTo={BACK_TO}
        header={{
          title: isNew ? 'New assembly order' : 'Assembly order',
          no: draft.no,
          status: aoStatusLabel(draft.status),
          statusIcon: STATUS_ICONS[draft.status],
          backLabel: BACK_LABEL,
          actions: draft.bomId ? (
            <Link
              to="/production/bills-of-materials/$no"
              params={{ no: draft.bomId }}
              className={cn(secondaryButton, 'h-8 flex-none px-[14px] font-semibold')}
            >
              {draft.bomId} · {draft.bomVersion}
            </Link>
          ) : undefined,
        }}
        footerStart={
          !isNew &&
          !readOnly && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleCancelOrder()}
              className={cn(secondaryButton, 'px-[14px] font-medium text-muted-foreground hover:text-bad-fg')}
            >
              <Ban className="size-[13px]" strokeWidth={2} />
              Cancel order
            </button>
          )
        }
        footerEnd={
          <>
            <button type="button" onClick={goBack} className={cn(secondaryButton, 'font-medium')}>
              Back
            </button>
            {!readOnly && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSave()}
                className={cn(secondaryButton, 'font-semibold')}
              >
                Save
              </button>
            )}
            {draft.status === 'finished' && isAdmin && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleReopen()}
                className={cn(secondaryButton, 'font-semibold')}
              >
                <RotateCcw className="size-[13px]" strokeWidth={2} />
                Reopen
              </button>
            )}
            {editable && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleRelease()}
                className={primaryButton}
              >
                <Check className="size-[14px]" strokeWidth={2.2} />
                Release
              </button>
            )}
            {draft.status === 'released' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleStart()}
                className={primaryButton}
              >
                <Play className="size-[14px]" strokeWidth={2} />
                Start
              </button>
            )}
            {draft.status === 'inProgress' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setError('')
                  setFinishOpen(true)
                }}
                className={primaryButton}
              >
                <Check className="size-[14px]" strokeWidth={2.4} />
                Finish
              </button>
            )}
          </>
        }
      >
        {readOnly && (
          <Notice tone="muted" icon={<Lock className="size-[15px] flex-none" strokeWidth={2} />}>
            {draft.status === 'finished'
              ? 'Finished — this order is a closed record.'
              : 'Cancelled — this order is a closed record.'}
          </Notice>
        )}

        {!readOnly && shortages.length > 0 && (
          <Notice tone="warn" icon={<TriangleAlert className="size-[15px] flex-none" strokeWidth={2} />}>
            Short {int(shortages[0].short)} × {shortages[0].desc} — you can build {int(buildable)} of {int(draft.qty)}.
          </Notice>
        )}

        {error && <Notice tone="bad">{error}</Notice>}

        <DocumentCard>
          <div className="grid grid-cols-1 gap-x-[18px] gap-y-[14px] md:grid-cols-3">
            <Field label="Item to assemble" htmlFor="ao-item">
              {editable ? (
                <button
                  id="ao-item"
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className={cn(
                    fieldClass,
                    'flex items-center justify-between gap-2 text-left hover:border-ring hover:bg-tint-7',
                  )}
                >
                  {draft.item ? (
                    <span className="min-w-0 truncate">
                      <span className="font-mono text-xs">{draft.item}</span> {draft.desc}
                    </span>
                  ) : (
                    <span className="truncate text-muted-foreground">Choose an item to assemble…</span>
                  )}
                  <ChevronDown className="size-[13px] flex-none text-muted-foreground" strokeWidth={2} />
                </button>
              ) : (
                <div id="ao-item" className="flex h-[34px] items-center gap-2 text-[13px]">
                  <span className="font-mono text-xs">{draft.item}</span>
                  <span className="min-w-0 truncate text-muted-foreground">{draft.desc}</span>
                </div>
              )}
            </Field>

            <Field label="Quantity" htmlFor="ao-qty">
              {editable ? (
                <input
                  id="ao-qty"
                  type="number"
                  min="1"
                  step="1"
                  value={draft.qty}
                  onChange={(e) => handleQtyChange(e.target.value)}
                  className={cn(fieldClass, 'tnum')}
                />
              ) : (
                <div id="ao-qty" className="tnum flex h-[34px] items-center text-[13px]">
                  {int(draft.qty)}
                </div>
              )}
            </Field>

            <Field label="Output location" htmlFor="ao-location">
              <select
                id="ao-location"
                value={draft.location}
                disabled={readOnly}
                onChange={(e) => setHeaderField('location', e.target.value)}
                className={fieldClass}
              >
                {locationOptions.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Due date" htmlFor="ao-due-date">
              <input
                id="ao-due-date"
                type="date"
                value={draft.dueDate || ''}
                disabled={readOnly}
                onChange={(e) => setHeaderField('dueDate', e.target.value)}
                className={fieldClass}
              />
            </Field>

            <Field label="Assignee" htmlFor="ao-assignee">
              <select
                id="ao-assignee"
                value={draft.assignee || ''}
                disabled={readOnly}
                onChange={(e) => setHeaderField('assignee', e.target.value || null)}
                className={fieldClass}
              >
                <option value="">Unassigned</option>
                {assigneeOptions.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Progress" htmlFor="ao-progress">
              <div id="ao-progress" className="flex h-[34px] items-center gap-[10px]">
                <div className="h-[7px] flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <span className="tnum flex-none text-[12.5px] text-muted-foreground">
                  {int(draft.qtyFinished)} / {int(draft.qty)}
                </span>
              </div>
            </Field>
          </div>
        </DocumentCard>

        <LineGrid
          gridId="assembly-order-lines"
          title="Components"
          lines={draft.lines}
          columns={columns}
          headerActions={
            <div className="text-xs text-muted-foreground">
              Buildable now: <strong className="tnum text-foreground">{int(buildable)}</strong>
            </div>
          }
          rowHasIssue={(line) => !readOnly && shortMap.has(line.item)}
          emptyText="Choose an item with an active bill of materials — its components will be listed here."
          minWidth={720}
        />

        <DocumentCard className="px-4 py-[14px]">
          <NotesBlock
            entityType="assemblyOrder"
            entityNo={draft.no}
            placeholder="Batch notes, breakage, who is building it…"
          />
        </DocumentCard>
      </DocumentPage>

      <ItemPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        items={data.items}
        boms={data.boms}
        orderDate={draft.orderDate}
        onPick={handlePickItem}
      />

      <FinishDialog
        open={finishOpen}
        onOpenChange={setFinishOpen}
        order={draft}
        items={data.items}
        warehouses={data.warehouses}
        mainLocId={mainLocId}
        manualConsumption={data.production.manualConsumption}
        pending={busy}
        onSubmit={handleFinishSubmit}
      />
    </>
  )
}
