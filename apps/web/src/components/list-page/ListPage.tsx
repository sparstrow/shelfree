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
import { Copy, ExternalLink, Eye, type LucideIcon, Trash2 } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { TopBar } from '@/app/shell/TopBar'
import { useUi } from '@/app/stores/ui'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataGrid, type GridAction } from '@/components/data-grid/DataGrid'
import type { Dataset, GridFilter } from '@/components/data-grid/model'
import {
  RecordDrawer,
  type RecordDrawerProps,
  drawerDangerIconButton,
  drawerPrimaryButton,
  drawerSecondaryButton,
} from '@/components/record-drawer/RecordDrawer'
import { isTypingTarget } from '@/lib/keyboard'

/** What the preview drawer shows for a row (the template adds the close button and footer). */
export type ListPreview = Omit<RecordDrawerProps, 'onClose' | 'footer'>

export interface ListAction<T> {
  label: string
  icon?: LucideIcon
  /** Hidden from the row menu when this returns false. */
  when?: (row: T) => boolean
  run: (row: T) => void
  /** Also show as a button in the preview footer. */
  inDrawer?: boolean
  /** Tooltip for the drawer button (shortcut hint etc.). */
  title?: string
}

export interface ListShortcut<T> {
  /** Single key, e.g. `r`. Fires on the active row when not typing. */
  key: string
  /** Shown on the Keyboard shortcuts page. */
  description: string
  when?: (row: T) => boolean
  run: (row: T) => void
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

export interface ListPageProps<T> {
  dataset: Dataset<T>
  rows: T[] | undefined
  isLoading: boolean
  error?: unknown
  onRefresh: () => Promise<unknown> | void

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
  shortcuts?: ListShortcut<T>[]
  /** Preview drawer contents. Omit for lists without a preview. */
  preview?: (row: T) => ListPreview

  /** Row whose preview is open on arrival (`?sel=` deep links). */
  initialActiveId?: string | null
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
  recordPath,
  openLabel,
  create,
  remove,
  actions = [],
  shortcuts = [],
  preview,
  initialActiveId = null,
  initialFilters,
  emptyText,
  showTotals,
  gridKey,
}: ListPageProps<T>) {
  const router = useRouter()
  const openTab = useUi((s) => s.openTab)
  const [activeId, setActiveId] = useState<string | null>(initialActiveId)
  const [deleting, setDeleting] = useState<T | null>(null)

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

  // Page shortcuts act on the active row.
  useEffect(() => {
    if (!shortcuts.length) return
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey || !active) return
      const hit = shortcuts.find((s) => s.key === e.key.toLowerCase() && (!s.when || s.when(active)))
      if (hit) {
        e.preventDefault()
        hit.run(active)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shortcuts, active])

  // ── row menu: standard actions + page actions, in a fixed order ─────────────
  const gridActions: GridAction<T>[] = []
  if (preview) gridActions.push({ label: 'View', icon: Eye, onSelect: (row) => setActiveId(dataset.idOf(row)) })
  if (open) gridActions.push({ label: openLabel ?? `Open ${noun}`, icon: ExternalLink, onSelect: open })
  if (openInNewTab) gridActions.push({ label: 'Open in new tab', icon: ExternalLink, onSelect: openInNewTab })
  for (const a of actions) {
    gridActions.push({ label: a.label, icon: a.icon, disabled: a.when ? (row) => !a.when?.(row) : undefined, onSelect: a.run })
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
  if (preview && active) {
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
                <button key={a.label} type="button" onClick={() => a.run(active)} title={a.title} className={drawerSecondaryButton}>
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
        count={rows?.length}
        countTitle={rows ? `${rows.length} ${rows.length === 1 ? noun : dataset.nounPlural}` : undefined}
        newLabel={create?.label}
        onNew={create?.run}
      />
      <DataGrid
        key={gridKey}
        dataset={dataset}
        rows={rows}
        isLoading={isLoading}
        error={error}
        onRefresh={onRefresh}
        activeId={activeId}
        onActiveChange={setActiveId}
        onOpen={open ?? ((row) => setActiveId(dataset.idOf(row)))}
        actions={gridActions}
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
    </>
  )
}
