/**
 * THE LIST PAGE TEMPLATE.
 *
 * Every list screen (purchase orders, receipts, vendors, items, charges…) is
 * this component plus a short definition. The template owns the layout and all
 * shared behaviour — top bar, data grid, preview drawer and its footer, the
 * standard row actions (view, open, open in new tab, copy number, delete with
 * confirm + undo), page shortcuts — so a change here reaches every list.
 *
 * A page that needs to differ uses an option below (switch a standard part off,
 * add actions, add drawer buttons, add shortcuts). It never copies the template.
 */
import { useRouter } from '@tanstack/react-router'
import { Copy, CopyPlus, ExternalLink, Eye, type LucideIcon, Pencil, Trash2 } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { TopBar } from '@/app/shell/TopBar'
import { useUi } from '@/app/stores/ui'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import {
  DataGrid,
  type GridAction,
  type GridBulkAction,
  type GridBulkEdit,
  type GridBulkOp,
} from '@/components/data-grid/DataGrid'
import type { Dataset, GridFilter } from '@/components/data-grid/model'
import { EditableDrawer, type EditorField } from '@/components/record-drawer/EditableDrawer'
import {
  type DrawerFact,
  type DrawerStat,
  RecordDrawer,
  type RecordDrawerProps,
  drawerDangerIconButton,
  drawerPrimaryButton,
  drawerSecondaryButton,
} from '@/components/record-drawer/RecordDrawer'
import { pluralNoun } from '@/domain/bulk-actions'
import { int } from '@/lib/format'
import { isTypingTarget } from '@/lib/keyboard'
import type { ShortcutMeta } from '@/lib/shortcuts'

/** What the preview drawer shows for a row (the template adds the close button and footer). */
export type ListPreview = Omit<RecordDrawerProps, 'onClose' | 'footer'>

/** What a page action can ask of the template (only with an `editor`). */
export interface ListContext<T> {
  /** Open the New drawer, optionally pre-filled (e.g. "Change price", "Add quantity tier"). */
  startNew: (draft?: T) => void
  /** Open a row's drawer in edit mode. */
  startEdit: (row: T) => void
}

export type ListBulkAction<T> = GridBulkAction<T>
export type ListBulkEdit<T> = GridBulkEdit<T>
export type ListBulkOp<T> = GridBulkOp<T>

export interface ListBulkDelete<T> {
  /** Remove the eligible rows in one batch/command. */
  run: (rows: T[]) => Promise<unknown>
  /** Restore the removed rows (the toast's Undo). */
  undo: (rows: T[]) => void | Promise<unknown>
  /** Extra sentence in the confirm dialog. */
  note?: string
}

export interface ListAction<T> {
  label: string
  icon?: LucideIcon
  /** Hidden from the row menu when this returns false. */
  when?: (row: T) => boolean
  run: (row: T, list: ListContext<T>) => void
  /** Also show as a button in the preview footer. */
  inDrawer?: boolean
  /** Tooltip for the drawer button (shortcut hint etc.). */
  title?: string
}

/**
 * A single-key page shortcut. Fires on the active row when not typing. Declare
 * `key` / `shift` / `description` as a `ShortcutMeta` in the page's own
 * `shortcuts.ts` and spread it here, so the Keyboard shortcuts page
 * (`app/shortcuts.ts`) reads the same data.
 */
export interface ListShortcut<T> extends ShortcutMeta {
  when?: (row: T) => boolean
  run: (row: T, list: ListContext<T>) => void
}

export interface ListDelete<T> {
  /** Why this row can't be deleted, or null when it can. */
  blockedReason?: (row: T) => string | null
  /** One-line identification for the confirm dialog and the toast, e.g. `PO00011 · Kailash Ceramics`. */
  describe: (row: T) => string
  /** Extra sentence in the confirm dialog. */
  note?: string
  run: (row: T) => Promise<unknown>
  /** Put the record back (the toast's Undo). */
  undo: (row: T) => void
}

/** Header and extras of an editable record in view mode. */
export interface EditorView {
  no: string
  status?: string
  tags?: string[]
  title: string
  subtitle?: string
  /** KPI strip rendered below the header in view mode. */
  stats?: DrawerStat[]
  /** Warning shown in view mode. */
  notice?: string
  /** Read-only facts after the fields (Source, Last changed…). */
  facts?: DrawerFact[]
}

/**
 * Edit records right in the drawer (reference lists). The page describes the
 * fields and rules; the template owns view ↔ edit, New, Duplicate, Save and the
 * shortcuts N / E / Ctrl+S / Esc.
 */
export interface ListEditor<T> {
  fields: (draft: T, mode: 'edit' | 'new') => EditorField<T>[]
  view: (record: T) => EditorView
  /** A new, empty record. */
  blank: (rows: readonly T[]) => T
  /** A copy of `row` as a new record (omit to hide Duplicate). */
  duplicate?: (row: T, rows: readonly T[]) => T
  /** Dependent-field adjustments after a change (e.g. clear an account when direction changes). */
  onChange?: (draft: T, key: string, mode: 'edit' | 'new') => T
  /** Trim / upper-case before validating and saving. */
  normalize?: (draft: T) => T
  /** Field errors by key; empty when valid. `others` excludes the record being edited. */
  validate: (draft: T, others: readonly T[]) => Record<string, string>
  save: (record: T, mode: 'edit' | 'new') => Promise<unknown>
  /** `CODE · Name`, for toasts and the edit sub-heading. */
  label: (record: T) => string
  /** Optional view-mode content rendered below fields and facts in the drawer. */
  extra?: (record: T) => ReactNode
  /** Optional edit/new-mode content rendered below fields and facts in the drawer. */
  extraEdit?: (draft: T, mode: 'edit' | 'new', onChange: (key: keyof T & string, value: unknown) => void) => ReactNode
}

interface Editing<T> {
  mode: 'edit' | 'new'
  draft: T
  /** Id of the record being edited (null for new). */
  orig: string | null
  errors: Record<string, string>
  formError: string
}

export interface ListPageProps<T> {
  dataset: Dataset<T>
  rows: T[] | undefined
  isLoading: boolean
  error?: unknown
  onRefresh: () => Promise<unknown> | void

  /** Breadcrumb label override when the page isn't a `/<module>/<page>` route (e.g. `/notes`). */
  pageLabel?: string
  /** URL of the record's own page. Enables Open, Open in new tab, double-click and Enter. */
  recordPath?: (row: T) => string
  /** Label of the open action, e.g. "Open purchase order". Default: "Open " + noun. */
  openLabel?: string
  /** The "New …" button in the top bar. */
  create?: { label: string; run: () => void }
  /** Delete with confirm + undo. Omit for read-only lists (reports). */
  remove?: ListDelete<T>
  /** Page-specific actions, after the standard open actions. */
  actions?: ListAction<T>[]
  /** Action buttons shown in the bulk bar when rows are selected. */
  bulkActions?: ListBulkAction<T>[]
  /** One-column bulk edit dialog across selected rows (bulk bar "Edit" + multi-row menu "Edit column…"). */
  bulkEdit?: ListBulkEdit<T>
  /** Duplicate one or more rows (returns the created record ids). Also adds Duplicate to the single-row menu when `editor` is absent. */
  duplicate?: (rows: T[]) => Promise<string[]>
  /** Bulk status transitions shown in the bulk bar (when 1+ apply) and multi-row context menu. */
  statusOps?: readonly ListBulkOp<T>[]
  /** Bulk lock/reopen transitions shown in the bulk bar (when 1+ apply) and multi-row context menu. */
  lockOps?: readonly ListBulkOp<T>[]
  /** Per-row bulk-delete eligibility (`true` when deletable, or a reason string). Enables bulk delete when set. */
  canDelete?: (row: T) => true | string
  /** Enable bulk delete in the bulk bar and multi-row menu (`true` reuses `remove`, or pass a batch `{ run, undo }`). */
  bulkDelete?: boolean | ListBulkDelete<T>
  /** Allow opening multiple selected rows in new browser tabs from the multi-row context menu (uses `recordPath`). */
  openInTabs?: boolean
  shortcuts?: ListShortcut<T>[]
  /** Preview drawer contents. Omit for lists without a preview. */
  preview?: (row: T) => ListPreview
  /** Edit records in the drawer instead of a read-only preview. */
  editor?: ListEditor<T>

  /** Row whose preview is open on arrival (`?sel=` deep links). */
  initialActiveId?: string | null
  /** Open the New drawer pre-filled on arrival (e.g. "Add price" from another tab). Needs `editor`. */
  initialDraft?: T
  /** Extra controls in the top bar, before the page search (e.g. a tab switch). */
  topBarExtra?: ReactNode
  initialFilters?: Omit<GridFilter, 'id'>[]
  emptyText?: string
  showTotals?: boolean
  /** Remount the grid when this changes (fresh filters for a new deep link). */
  gridKey?: string
}

export function ListPage<T>({
  dataset,
  rows,
  isLoading,
  error,
  onRefresh,
  pageLabel,
  recordPath,
  openLabel,
  create,
  remove,
  actions = [],
  bulkActions = [],
  bulkEdit,
  duplicate,
  statusOps,
  lockOps,
  canDelete,
  bulkDelete,
  openInTabs = false,
  shortcuts = [],
  preview,
  editor,
  initialActiveId = null,
  initialDraft,
  topBarExtra,
  initialFilters,
  emptyText,
  showTotals,
  gridKey,
}: ListPageProps<T>) {
  const router = useRouter()
  const openTab = useUi((s) => s.openTab)
  const [activeId, setActiveId] = useState<string | null>(initialActiveId)
  const [deleting, setDeleting] = useState<T | null>(null)
  const [bulkDeleting, setBulkDeleting] = useState<{
    eligible: T[]
    skipped: number
    reason: string
    clearSelection: () => void
  } | null>(null)
  const [editing, setEditing] = useState<Editing<T> | null>(() =>
    editor && initialDraft ? { mode: 'new', draft: initialDraft, orig: null, errors: {}, formError: '' } : null,
  )

  const active = activeId ? (rows ?? []).find((r) => dataset.idOf(r) === activeId) : undefined
  const noun = dataset.noun
  const capNoun = noun.charAt(0).toUpperCase() + noun.slice(1)

  const open = recordPath ? (row: T) => router.history.push(recordPath(row)) : undefined
  const openInNewTab = recordPath
    ? (row: T) => {
        const path = recordPath(row)
        openTab(path)
        router.history.push(path)
      }
    : undefined

  const copyNo = async (row: T) => {
    const no = dataset.idOf(row)
    try {
      await navigator.clipboard.writeText(no)
      toast('Copied', { description: no })
    } catch {
      toast('Could not copy', { description: 'The browser blocked clipboard access.' })
    }
  }

  const confirmDelete = async () => {
    const row = deleting
    if (!row || !remove) return
    setDeleting(null)
    if (activeId === dataset.idOf(row)) setActiveId(null)
    try {
      await remove.run(row)
    } catch {
      toast(`Could not delete the ${noun}`, { description: 'Check your connection and try again.' })
      return
    }
    toast(`${capNoun} deleted`, {
      description: remove.describe(row),
      action: { label: 'Undo', onClick: () => remove.undo(row) },
    })
  }

  // ── bulk delete & open in browser tabs (opt-in per page) ───────────────────
  const hasBulkDelete =
    ((bulkDelete !== undefined && bulkDelete !== false) || !!canDelete) &&
    (typeof bulkDelete === 'object' || !!remove)

  const effectiveCanDelete: ((row: T) => true | string) | undefined = canDelete
    ? canDelete
    : remove?.blockedReason
      ? (row) => remove.blockedReason?.(row) ?? true
      : undefined

  const startBulkDelete = (
    eligible: T[],
    allSelected: T[],
    { clearSelection }: { clearSelection: () => void },
  ) => {
    if (allSelected.length === 0) return
    const blockedReason = effectiveCanDelete
      ? (allSelected.map(effectiveCanDelete).find((v): v is string => typeof v === 'string') ?? '')
      : ''
    if (eligible.length === 0) {
      toast('Can’t delete', {
        description: blockedReason || `None of the selected ${dataset.nounPlural} can be deleted.`,
      })
      return
    }
    setBulkDeleting({
      eligible,
      skipped: allSelected.length - eligible.length,
      reason: blockedReason,
      clearSelection,
    })
  }

  const confirmBulkDelete = async () => {
    const pending = bulkDeleting
    if (!pending) return
    const batch = typeof bulkDelete === 'object' ? bulkDelete : null
    if (!batch && !remove) return
    setBulkDeleting(null)
    const ids = new Set(pending.eligible.map(dataset.idOf))
    if (activeId && ids.has(activeId)) setActiveId(null)
    try {
      if (batch) {
        await batch.run(pending.eligible)
      } else if (remove) {
        for (const row of pending.eligible) await remove.run(row)
      }
    } catch {
      toast(`Could not delete the selected ${dataset.nounPlural}`, {
        description: 'Check your connection and try again.',
      })
      return
    }
    pending.clearSelection()
    toast(`${pluralNoun(pending.eligible.length, noun, dataset.nounPlural)} deleted`, {
      description:
        pending.skipped > 0
          ? `${int(pending.skipped)} skipped${pending.reason ? ` — ${pending.reason}` : ''}`
          : pending.eligible.map(dataset.idOf).join(', '),
      action: {
        label: 'Undo',
        onClick: () => {
          if (batch) void batch.undo(pending.eligible)
          else if (remove) pending.eligible.forEach((row) => remove.undo(row))
        },
      },
    })
  }

  const openSelectedInTabs =
    openInTabs && recordPath
      ? (selected: T[]) => {
          for (const row of selected) {
            window.open(recordPath(row), '_blank', 'noopener,noreferrer')
          }
          if (selected.length > 1) {
            toast(`Opened ${int(selected.length)} tabs`, {
              description: selected.map(dataset.idOf).join(', '),
            })
          }
        }
      : undefined

  // ── editor (reference lists) ────────────────────────────────────────────────
  const startNew = (draft?: T) => {
    if (!editor) return
    setActiveId(null)
    setEditing({ mode: 'new', draft: draft ?? editor.blank(rows ?? []), orig: null, errors: {}, formError: '' })
  }
  const startEdit = (row: T) => {
    if (!editor) return
    setActiveId(dataset.idOf(row))
    setEditing({ mode: 'edit', draft: structuredClone(row), orig: dataset.idOf(row), errors: {}, formError: '' })
  }
  const startDuplicate = (row: T) => {
    if (!editor?.duplicate) return
    setActiveId(null)
    setEditing({ mode: 'new', draft: editor.duplicate(row, rows ?? []), orig: null, errors: {}, formError: '' })
  }
  const cancelEdit = () => setEditing(null)
  const changeField = (key: string, value: unknown) =>
    setEditing((cur) => {
      if (!cur || !editor) return cur
      let draft = { ...cur.draft, [key]: value } as T
      if (editor.onChange) draft = editor.onChange(draft, key, cur.mode)
      const { [key]: _cleared, ...errors } = cur.errors
      return { ...cur, draft, errors, formError: '' }
    })
  const saveEdit = async () => {
    if (!editing || !editor) return
    const draft = editor.normalize ? editor.normalize(editing.draft) : editing.draft
    const others = (rows ?? []).filter((r) => dataset.idOf(r) !== editing.orig)
    const errors = editor.validate(draft, others)
    const count = Object.keys(errors).length
    if (count) {
      setEditing({ ...editing, draft, errors, formError: `Fix the highlighted ${count === 1 ? 'field' : 'fields'} to save.` })
      return
    }
    try {
      await editor.save(draft, editing.mode)
    } catch {
      setEditing({ ...editing, formError: `Could not save the ${noun}. Check your connection and try again.` })
      return
    }
    toast(`${capNoun} ${editing.mode === 'new' ? 'created' : 'saved'}`, { description: editor.label(draft) })
    setEditing(null)
    setActiveId(dataset.idOf(draft))
  }

  // Editor keys: N new, E edit the active row, Ctrl/Cmd+S or +Enter save, Esc cancel.
  // Capture phase, so Esc cancels the edit before the grid closes the drawer.
  useEffect(() => {
    if (!editor) return
    const onKey = (e: KeyboardEvent) => {
      if (editing) {
        if ((e.metaKey || e.ctrlKey) && (e.key === 'Enter' || e.key.toLowerCase() === 's')) {
          e.preventDefault()
          void saveEdit()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          cancelEdit()
        }
        return
      }
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      const key = e.key.toLowerCase()
      if (key === 'n') {
        e.preventDefault()
        startNew()
      } else if (key === 'e' && active) {
        e.preventDefault()
        startEdit(active)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  })

  const listContext: ListContext<T> = { startNew, startEdit }

  // Page shortcuts act on the active row.
  useEffect(() => {
    if (!shortcuts.length) return
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey || !active) return
      const hit = shortcuts.find(
        (s) => s.key === e.key.toLowerCase() && (s.shift === undefined || s.shift === e.shiftKey) && (!s.when || s.when(active)),
      )
      if (hit) {
        e.preventDefault()
        hit.run(active, listContext)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // ── row menu: standard actions + page actions, in a fixed order ─────────────
  const gridActions: GridAction<T>[] = []
  if (preview) gridActions.push({ label: 'View', icon: Eye, onSelect: (row) => setActiveId(dataset.idOf(row)) })
  if (editor) {
    gridActions.push({ label: 'View', icon: Eye, onSelect: (row) => { setEditing(null); setActiveId(dataset.idOf(row)) } })
    gridActions.push({ label: 'Edit', icon: Pencil, onSelect: startEdit })
    if (editor.duplicate) gridActions.push({ label: 'Duplicate', icon: CopyPlus, onSelect: startDuplicate })
  }
  if (open) gridActions.push({ label: openLabel ?? `Open ${noun}`, icon: ExternalLink, onSelect: open })
  if (openInNewTab) gridActions.push({ label: 'Open in new tab', icon: ExternalLink, onSelect: openInNewTab })
  if (duplicate && !editor) {
    gridActions.push({
      label: 'Duplicate',
      icon: CopyPlus,
      onSelect: (row) => {
        void duplicate([row]).then((made) => {
          if (made.length === 1) setActiveId(made[0])
        })
      },
    })
  }
  for (const a of actions) {
    gridActions.push({ label: a.label, icon: a.icon, disabled: a.when ? (row) => !a.when?.(row) : undefined, onSelect: (row) => a.run(row, listContext) })
  }
  gridActions.push({ label: 'Copy number', icon: Copy, onSelect: copyNo })
  if (remove) {
    gridActions.push({
      label: 'Delete',
      icon: Trash2,
      danger: true,
      disabled: remove.blockedReason ? (row) => !!remove.blockedReason?.(row) : undefined,
      onSelect: setDeleting,
    })
  }

  let drawer: ReactNode = null
  const editRecord = editing ? editing.draft : active
  if (editor && editRecord) {
    const v = editor.view(editRecord)
    const blocked = !editing && active ? (remove?.blockedReason?.(active) ?? null) : null
    drawer = (
      <EditableDrawer
        ariaLabel={editing ? `${editing.mode === 'new' ? 'New' : 'Edit'} ${noun}` : `${capNoun} ${v.no}`}
        mode={editing ? editing.mode : 'view'}
        record={editRecord}
        no={v.no}
        status={v.status}
        tags={v.tags}
        title={v.title}
        subtitle={v.subtitle}
        stats={v.stats}
        notice={v.notice}
        editHeading={editing?.mode === 'new' ? `New ${noun}` : `Edit ${noun}`}
        editSubheading={editing?.mode === 'edit' ? editor.label(editRecord) : undefined}
        fields={editor.fields(editRecord, editing?.mode ?? 'edit')}
        facts={editing?.mode === 'new' ? undefined : v.facts}
        errors={editing?.errors ?? {}}
        formError={editing?.formError}
        onChange={changeField}
        onClose={() => {
          setEditing(null)
          setActiveId(null)
        }}
        editChildren={editing ? editor.extraEdit?.(editing.draft, editing.mode, changeField) : undefined}
        footer={
          editing ? (
            <>
              <button type="button" onClick={cancelEdit} className={drawerSecondaryButton} title="Cancel (Esc)">
                Cancel
              </button>
              <button type="button" onClick={() => void saveEdit()} className={drawerPrimaryButton} title="Save (Ctrl/Cmd + S)">
                {editing.mode === 'new' ? `Create ${noun}` : 'Save changes'}
              </button>
            </>
          ) : (
            active && (
              <>
                <button type="button" onClick={() => startEdit(active)} className={drawerPrimaryButton} title="Edit (E)">
                  <Pencil className="size-[13px]" strokeWidth={2} />
                  Edit
                </button>
                {editor.duplicate && (
                  <button type="button" onClick={() => startDuplicate(active)} className={drawerSecondaryButton}>
                    <CopyPlus className="size-[13px]" strokeWidth={2} />
                    Duplicate
                  </button>
                )}
                {actions
                  .filter((a) => a.inDrawer && (!a.when || a.when(active)))
                  .map((a) => (
                    <button
                      key={a.label}
                      type="button"
                      onClick={() => a.run(active, listContext)}
                      title={a.title}
                      className={drawerSecondaryButton}
                    >
                      {a.icon && <a.icon className="size-[13px]" strokeWidth={2} />}
                      {a.label}
                    </button>
                  ))}
                {remove && (
                  <button
                    type="button"
                    onClick={() => setDeleting(active)}
                    disabled={!!blocked}
                    title={blocked ?? `Delete ${noun}`}
                    aria-label={`Delete ${noun}`}
                    className={drawerDangerIconButton}
                  >
                    <Trash2 className="size-[14px]" strokeWidth={2} />
                  </button>
                )}
              </>
            )
          )
        }
      >
        {!editing && active ? editor.extra?.(active) : null}
      </EditableDrawer>
    )
  } else if (preview && active) {
    const blocked = remove?.blockedReason?.(active) ?? null
    drawer = (
      <RecordDrawer
        {...preview(active)}
        onClose={() => setActiveId(null)}
        footer={
          <>
            {open && (
              <button type="button" onClick={() => open(active)} className={drawerPrimaryButton}>
                <ExternalLink className="size-[13px]" strokeWidth={2} />
                {openLabel ?? `Open ${noun}`}
              </button>
            )}
            {actions
              .filter((a) => a.inDrawer && (!a.when || a.when(active)))
              .map((a) => (
                <button key={a.label} type="button" onClick={() => a.run(active, listContext)} title={a.title} className={drawerSecondaryButton}>
                  {a.icon && <a.icon className="size-[13px]" strokeWidth={2} />}
                  {a.label}
                </button>
              ))}
            {remove && (
              <button
                type="button"
                onClick={() => setDeleting(active)}
                disabled={!!blocked}
                title={blocked ?? `Delete ${noun}`}
                aria-label={`Delete ${noun}`}
                className={drawerDangerIconButton}
              >
                <Trash2 className="size-[14px]" strokeWidth={2} />
              </button>
            )}
          </>
        }
      />
    )
  }

  return (
    <>
      <TopBar
        pageLabel={pageLabel}
        count={rows?.length}
        countTitle={rows ? `${rows.length} ${rows.length === 1 ? noun : dataset.nounPlural}` : undefined}
        newLabel={create?.label ?? (editor ? `New ${noun}` : undefined)}
        onNew={create?.run ?? (editor ? () => startNew() : undefined)}
      >
        {topBarExtra}
      </TopBar>
      <DataGrid
        key={gridKey}
        dataset={dataset}
        rows={rows}
        isLoading={isLoading}
        error={error}
        onRefresh={onRefresh}
        activeId={activeId}
        onActiveChange={(id) => {
          // Picking another row abandons an unsaved edit, as in the prototype.
          setEditing(null)
          setActiveId(id)
        }}
        onOpen={open ?? (editor ? startEdit : (row) => setActiveId(dataset.idOf(row)))}
        actions={gridActions}
        bulkActions={bulkActions}
        bulkEdit={bulkEdit}
        onDuplicate={duplicate}
        statusOps={statusOps}
        lockOps={lockOps}
        onOpenInTabs={openSelectedInTabs}
        onBulkDelete={hasBulkDelete ? startBulkDelete : undefined}
        canDelete={hasBulkDelete ? effectiveCanDelete : undefined}
        drawer={drawer}
        emptyText={emptyText}
        showTotals={showTotals}
        initialFilters={initialFilters}
      />
      {remove && (
        <ConfirmDialog
          open={!!deleting}
          danger
          title={`Delete this ${noun}?`}
          description={
            <>
              {deleting ? remove.describe(deleting) : ''} will be removed.{remove.note ? ` ${remove.note}` : ''} You can undo
              this right after deleting.
            </>
          }
          confirmLabel={`Delete ${noun}`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
      {hasBulkDelete && (
        <ConfirmDialog
          open={!!bulkDeleting}
          danger
          title={bulkDeleting ? `Delete ${pluralNoun(bulkDeleting.eligible.length, noun, dataset.nounPlural)}?` : ''}
          description={
            bulkDeleting ? (
              <>
                {pluralNoun(bulkDeleting.eligible.length, noun, dataset.nounPlural)} will be removed
                {bulkDeleting.skipped > 0
                  ? ` (${int(bulkDeleting.skipped)} skipped${bulkDeleting.reason ? ` — ${bulkDeleting.reason}` : ''})`
                  : ''}
                .
                {(typeof bulkDelete === 'object' ? bulkDelete.note : remove?.note)
                  ? ` ${typeof bulkDelete === 'object' ? bulkDelete.note : remove?.note}`
                  : ''}{' '}
                You can undo this right after deleting.
              </>
            ) : null
          }
          confirmLabel={
            bulkDeleting
              ? `Delete ${pluralNoun(bulkDeleting.eligible.length, noun, dataset.nounPlural)}`
              : 'Delete'
          }
          onConfirm={() => void confirmBulkDelete()}
          onCancel={() => setBulkDeleting(null)}
        />
      )}
    </>
  )
}
