import { useRouter } from '@tanstack/react-router'
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsDownUp,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  CircleAlert,
  Copy,
  Download,
  Eye,
  Funnel,
  List,
  Pencil,
  type LucideIcon,
  Pin,
  RefreshCw,
  RotateCcw,
  Rows3,
  Rows4,
  Search,
  SlidersVertical,
  SquareCheckBig,
  TextSearch,
  Ungroup,
  X,
} from 'lucide-react'
import {
  Fragment,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { toast } from 'sonner'
import { useGridPrefs } from '@/app/stores/grid-prefs'
import { useGridViews } from '@/app/stores/grid-views'
import { StatusPill } from '@/components/StatusPill'
import { ViewsMenu } from '@/components/saved-views/ViewsMenu'
import { useFavoriteActions } from '@/components/saved-views/use-favorite-actions'
import { usePageIdentity } from '@/components/saved-views/use-page-identity'
import { useViewActions } from '@/components/saved-views/use-view-actions'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useList } from '@/data/queries'
import type { SavedView } from '@/data/schemas'
import {
  AGG_OPTIONS,
  type AggKind,
  type Pin as PinSide,
  aggKindsFor,
  aggregate,
  findMatches,
  fitWidth,
  groupRows,
  groupSections,
  isAggKind,
  moveColumn,
  normalizeOrder,
  resolveColumns,
  shiftColumn,
  stepMatch,
  textMatches,
  togglePin,
  visibleGroupRows,
  withOverride,
} from '@/domain/grid-layout'
import {
  type GridDefaults,
  type GridSnapshot,
  isViewDirty,
  snapshotFromView,
  viewsForPage,
} from '@/domain/saved-views'
import { int, money } from '@/lib/format'
import { isTypingTarget } from '@/lib/keyboard'
import { useLatest, useLatestCallback } from '@/lib/use-latest-callback'
import { cn } from '@/lib/utils'
import { CellEditor } from './CellEditor'
import { ColumnMenuItems } from './ColumnMenu'
import { contextKit, dropdownKit } from './column-menu-kits'
import { FilterChips } from './FilterChips'
import { FindBar } from './FindBar'
import {
  type Dataset,
  type GridColumn,
  type GridFilter,
  type SortSpec,
  applyPipeline,
  defaultFilter,
  paginate,
  toCsv,
  toggleSort,
} from './model'

const SELECT_WIDTH = 42
const MIN_RESIZE = 48

/** Find-in-view highlight colours (a yellow that reads on both themes). */
const FIND_CELL = 'bg-[color-mix(in_oklab,oklch(0.82_0.17_95)_32%,var(--card))]'
const FIND_ROW = 'bg-[color-mix(in_oklab,oklch(0.82_0.17_95)_14%,var(--card))]'

/** `?group=<column key>` — group-by is part of the shareable URL state. */
const GROUP_PARAM = 'group'

export interface GridAction<T> {
  label: string
  icon?: LucideIcon
  /** Shown in red with a separator above. */
  danger?: boolean
  disabled?: (row: T) => boolean
  onSelect: (row: T) => void
}

export interface GridBulkAction<T> {
  label: string
  icon?: LucideIcon
  danger?: boolean
  /** Hidden from the bulk bar when this returns false for the selected rows. */
  when?: (rows: T[]) => boolean
  run: (rows: T[], ctx: { clearSelection: () => void }) => void | Promise<void>
}

export interface DataGridProps<T> {
  dataset: Dataset<T>
  rows: T[] | undefined
  isLoading: boolean
  error?: unknown
  onRefresh: () => Promise<unknown> | void
  /** The highlighted row (drives the side drawer). */
  activeId: string | null
  onActiveChange: (id: string | null) => void
  /** Double-click / Enter. */
  onOpen: (row: T) => void
  /** Row right-click menu and the toolbar Actions menu (acts on the active row). */
  actions?: GridAction<T>[]
  /** Action buttons shown in the bulk bar when one or more rows are checked. */
  bulkActions?: GridBulkAction<T>[]
  /** Side drawer rendered beside the table. */
  drawer?: ReactNode
  emptyText?: string
  /** Footer totals row (sum of numeric columns over the current view). Off by default. */
  showTotals?: boolean
  /** Filters applied when the grid first opens (deep links such as "lines for item X"). */
  initialFilters?: Omit<GridFilter, 'id'>[]
}

const toolButton =
  'hover-lift inline-flex h-8 items-center gap-[7px] rounded-lg border border-input bg-transparent px-[11px] text-[13px] font-medium text-foreground hover:bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)] data-[state=open]:border-[color-mix(in_oklab,var(--primary)_50%,transparent)]'
const toolIcon =
  'hover-lift inline-flex size-8 flex-none items-center justify-center rounded-lg border border-input bg-transparent text-muted-foreground hover:bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)] hover:text-foreground'
const pageButton =
  'hover-lift inline-flex size-8 flex-none items-center justify-center rounded-lg border border-input bg-transparent text-foreground hover:bg-tint-16 disabled:pointer-events-none disabled:opacity-40'
const groupBarButton =
  'hover-lift inline-flex h-6 items-center gap-1 rounded-md border-0 bg-transparent px-2 text-xs font-medium text-muted-foreground hover:bg-tint-16 hover:text-foreground'
const bulkButton =
  'hover-lift inline-flex h-7 items-center gap-1.5 rounded-[7px] border-0 bg-transparent px-[9px] text-xs font-medium text-foreground hover:bg-tint-16'

function CheckBox({ state }: { state: 'on' | 'off' | 'some' }) {
  return (
    <span
      className={cn(
        'flex size-[17px] flex-none items-center justify-center rounded-[5px] border transition-colors duration-[140ms]',
        state === 'off' ? 'border-input bg-card' : 'border-primary bg-primary',
      )}
    >
      {state === 'on' && <Check className="size-[11px] text-primary-foreground" strokeWidth={3.2} />}
      {state === 'some' && <span className="h-0.5 w-2 rounded-[1px] bg-primary-foreground" />}
    </span>
  )
}

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}


let filterSeq = 0
const nextFilterId = () => 'f' + ++filterSeq

/**
 * The standard list-page grid: views, filters, quick search, sorting, column
 * visibility, density, selection, totals, paging, export, and a side drawer.
 */
export function DataGrid<T>({
  dataset,
  rows,
  isLoading,
  error,
  onRefresh,
  activeId,
  onActiveChange,
  onOpen,
  actions = [],
  bulkActions = [],
  drawer,
  emptyText,
  showTotals = false,
  initialFilters,
}: DataGridProps<T>) {
  const [viewId, setViewId] = useState(dataset.views[0]?.id ?? 'all')
  const [filters, setFilters] = useState<GridFilter[]>(() =>
    (initialFilters ?? []).map((f) => ({ ...f, id: nextFilterId() })),
  )
  const [search, setSearch] = useState('')
  const [sorts, setSorts] = useState<SortSpec[]>(() => [dataset.defaultSort ?? { key: 'no', dir: 'asc' }])
  const [hidden, setHidden] = useState<Set<string>>(
    () => new Set(dataset.columns.filter((c) => !c.visible).map((c) => c.key)),
  )
  const [compact, setCompact] = useState(true)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [refreshing, setRefreshing] = useState(false)
  const [cell, setCell] = useState<{ id: string; key: string } | null>(null)
  const [scrolledX, setScrolledX] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const anchorRef = useRef<string | null>(null)
  const rowRefs = useRef(new Map<string, HTMLDivElement>())

  // Column layout: differences from the dataset's defaults (order is always the full list).
  const router = useRouter()
  const prefs = useGridPrefs()
  const [order, setOrder] = useState<string[]>(() => dataset.columns.map((c) => c.key))
  const [widths, setWidths] = useState<Record<string, number>>({})
  const [pins, setPins] = useState<Record<string, PinSide | null>>({})
  const groupableKeys = useMemo(
    () => new Set(dataset.columns.filter((c) => c.groupable !== false).map((c) => c.key)),
    [dataset.columns],
  )
  // A link that names a grouping opens the grid grouped (kept over a default saved view's).
  const [urlGroup, setUrlGroup] = useState<string | null>(() => {
    const key = new URLSearchParams(window.location.search).get(GROUP_PARAM)
    return key && groupableKeys.has(key) ? key : null
  })
  const [groupBy, setGroupBy] = useState<string | null>(urlGroup)
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const [aggs, setAggs] = useState<Record<string, string>>(() => prefs.aggregates[dataset.id] ?? {})
  const [totalsOn, setTotalsOn] = useState(() => prefs.totals[dataset.id] ?? showTotals)
  const [dragKey, setDragKey] = useState<string | null>(null)
  const [dropKey, setDropKey] = useState<string | null>(null)
  const [findOpen, setFindOpen] = useState(false)
  const [findQuery, setFindQuery] = useState('')
  const [findIndex, setFindIndex] = useState(0)
  const findRef = useRef<HTMLInputElement>(null)

  const layout = useMemo(
    () => ({
      order: normalizeOrder(
        dataset.columns.map((c) => c.key),
        order,
      ),
      widths,
      pins,
    }),
    [dataset.columns, order, widths, pins],
  )
  const columns = useMemo(() => resolveColumns(dataset.columns, layout, hidden), [dataset.columns, layout, hidden])
  const defaultColumn = useMemo(() => new Map(dataset.columns.map((c) => [c.key, c])), [dataset.columns])

  const filtered = useMemo(
    () => applyPipeline({ rows: rows ?? [], dataset, search, filters, sorts }),
    [rows, dataset, search, filters, sorts],
  )
  // Grouping: groups of the filtered rows; collapsed groups' rows leave the paged list.
  const groups = useMemo(
    () =>
      groupBy && groupableKeys.has(groupBy)
        ? groupRows(
            filtered,
            (r) => dataset.raw(r, groupBy),
            (r) => dataset.text(r, groupBy),
          )
        : null,
    [filtered, groupBy, groupableKeys, dataset],
  )
  const shown = useMemo(() => (groups ? visibleGroupRows(groups, collapsed) : filtered), [groups, collapsed, filtered])
  const slice = useMemo(() => paginate(shown, page, pageSize), [shown, page, pageSize])
  const sections = useMemo(
    () => (groups ? groupSections(groups, collapsed, slice.page * pageSize, pageSize) : null),
    [groups, collapsed, slice.page, pageSize],
  )
  const pageIds = useMemo(() => slice.rows.map(dataset.idOf), [slice.rows, dataset])
  const selectedRows = useMemo(
    () => filtered.filter((r) => selected.has(dataset.idOf(r))),
    [filtered, selected, dataset],
  )
  const activeRow = useMemo(
    () => (activeId ? (rows ?? []).find((r) => dataset.idOf(r) === activeId) : undefined),
    [activeId, rows, dataset],
  )

  // Any change to what is listed returns to the first page.
  const changeSearch = (value: string) => {
    setSearch(value)
    setPage(0)
  }
  const changeFilters = (next: GridFilter[]) => {
    setFilters(next)
    setPage(0)
  }
  const changeSort = (key: string, additive: boolean) => {
    setSorts((prev) => toggleSort(prev, key, additive))
    setPage(0)
  }
  // Footer aggregate overrides are remembered per dataset (and travel with saved views).
  const changeAggs = (next: Record<string, string>) => {
    setAggs(next)
    prefs.setAggregates(dataset.id, next)
  }
  const changeTotals = (on: boolean) => {
    setTotalsOn(on)
    prefs.setTotals(dataset.id, on)
  }
  const changeGroup = (key: string | null) => {
    setUrlGroup(null)
    setGroupBy(key)
    setCollapsed(new Set())
    setPage(0)
  }
  const toggleGroupCollapsed = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const applyView = (id: string) => {
    const view = dataset.views.find((v) => v.id === id)
    if (!view) return
    setViewId(id)
    changeFilters(view.filters.map((f) => ({ ...f, id: nextFilterId() })))
    if (view.sorts) setSorts(view.sorts)
  }

  // ── saved views (the user's own, per page) ─────────────────────────────────
  const identity = usePageIdentity()
  const savedList = useList('savedViews')
  const saved = useMemo(() => viewsForPage(savedList.data ?? [], identity.pageKey), [savedList.data, identity.pageKey])
  const favoriteActions = useFavoriteActions()
  const intent = useGridViews((s) => s.intent)
  const clearIntent = useGridViews((s) => s.clearIntent)
  const setActiveView = useGridViews((s) => s.setActive)
  const [saveSignal, setSaveSignal] = useState(0)
  const startedRef = useRef(false)

  const defaults = useMemo<GridDefaults>(
    () => ({
      columns: dataset.columns.map((c) => ({ key: c.key, width: c.width, visible: c.visible, frozen: c.frozen })),
      sort: dataset.defaultSort ?? { key: 'no', dir: 'asc' },
    }),
    [dataset.columns, dataset.defaultSort],
  )
  const snapshot = useMemo<GridSnapshot>(
    () => ({
      filters: filters.map(({ id: _id, ...rest }) => rest),
      sorts,
      hidden: [...hidden],
      compact,
      order: layout.order,
      widths,
      pins,
      groupBy,
      collapsed: [...collapsed],
      aggregates: aggs,
    }),
    [filters, sorts, hidden, compact, layout.order, widths, pins, groupBy, collapsed, aggs],
  )
  const snapshotRef = useLatest(snapshot)
  const viewActions = useViewActions(identity, defaults, () => snapshotRef.current)

  const activeSaved = saved.find((v) => v.id === viewId)
  const activeBuiltIn = dataset.views.find((v) => v.id === viewId)
  const dirty = activeSaved
    ? isViewDirty(snapshotFromView(activeSaved, defaults), snapshot)
    : activeBuiltIn
      ? isViewDirty({ filters: activeBuiltIn.filters, ...(activeBuiltIn.sorts ? { sorts: activeBuiltIn.sorts } : {}) }, snapshot)
      : false

  const applySaved = (view: SavedView) => {
    const next = snapshotFromView(view, defaults)
    setViewId(view.id)
    changeFilters(next.filters.map((f) => ({ ...f, id: nextFilterId() })) as GridFilter[])
    setSorts(next.sorts)
    setHidden(new Set(next.hidden))
    setCompact(next.compact)
    setOrder(next.order ?? dataset.columns.map((c) => c.key))
    setWidths(next.widths ?? {})
    setPins(next.pins ?? {})
    setGroupBy(next.groupBy ?? null)
    setCollapsed(new Set(next.collapsed ?? []))
    changeAggs(next.aggregates ?? {})
    setPage(0)
    setSelected(new Set())
  }
  const applySavedLatest = useLatestCallback(applySaved)
  // The page's default view opens on arrival; a link that names a grouping keeps it over the view's.
  const applyDefaultLatest = useLatestCallback((view: SavedView) => {
    applySaved(view)
    if (urlGroup) setGroupBy(urlGroup)
  })

  // Group-by lives in the URL (`?group=`) so a link opens the grid grouped. Other params are kept.
  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.get(GROUP_PARAM) === groupBy) return
    if (groupBy) url.searchParams.set(GROUP_PARAM, groupBy)
    else url.searchParams.delete(GROUP_PARAM)
    router.history.replace(url.pathname + url.search + url.hash)
  }, [groupBy, router])

  // A view favourite was opened (its grid applies the view), else the page's default view opens on arrival.
  useEffect(() => {
    if (!savedList.isSuccess) return
    if (intent && intent.pageKey === identity.pageKey) {
      clearIntent()
      startedRef.current = true
      const view = saved.find((v) => v.id === intent.viewId)
      if (view) applySavedLatest(view)
      return
    }
    if (startedRef.current) return
    startedRef.current = true
    if (initialFilters?.length) return
    const preferred = saved.find((v) => v.isDefaultFor)
    if (preferred) applyDefaultLatest(preferred)
  }, [savedList.isSuccess, saved, intent, identity.pageKey, clearIntent, applySavedLatest, applyDefaultLatest, initialFilters])

  // Tell the sidebar which saved view this grid shows (its favourite lights up).
  const activeSavedId = activeSaved?.id ?? null
  useEffect(() => {
    setActiveView(identity.pageKey, activeSavedId)
    return () => setActiveView(identity.pageKey, null)
  }, [identity.pageKey, activeSavedId, setActiveView])

  const toggleViewFavorite = (view: SavedView) => favoriteActions.toggleView(view)
  const pinBuiltIn = async (view: (typeof dataset.views)[number]) => {
    // Pinning a built-in view the second time must not pile up copies: reuse the one already made.
    const made = saved.find((v) => v.autoCreated && v.name === view.name)
    if (made) return favoriteActions.toggleView(made)
    await viewActions.pinBuiltIn(view.name, {
      ...snapshotRef.current,
      filters: view.filters,
      sorts: view.sorts ?? snapshotRef.current.sorts,
    })
  }
  const deleteView = async (view: SavedView) => {
    await viewActions.remove(view)
    if (viewId === view.id) setViewId(dataset.views[0]?.id ?? 'all')
  }
  const saveAs = async (name: string) => {
    const view = await viewActions.saveAs(name)
    if (view) setViewId(view.id)
    return view
  }

  // Ctrl/Cmd+S saves into the active view (or opens "save as"), Ctrl/Cmd+Shift+S always opens "save as",
  // Ctrl/Cmd+D pins the page or the view you are looking at.
  const onViewKey = useLatestCallback(async (e: globalThis.KeyboardEvent) => {
    if (e.defaultPrevented || e.altKey || !(e.metaKey || e.ctrlKey)) return
    const key = e.key.toLowerCase()
    if (key !== 's' && key !== 'd') return
    if (isTypingTarget(e.target) || document.querySelector('[role="alertdialog"]')) return
    e.preventDefault()
    if (key === 's') {
      if (e.shiftKey || !activeSaved) setSaveSignal((n) => n + 1)
      else await viewActions.update(activeSaved)
      return
    }
    if (activeSaved && !dirty) return toggleViewFavorite(activeSaved)
    if (filters.length > 0 && (!activeSaved || dirty)) {
      const view = await viewActions.pinCurrent()
      setViewId(view.id)
      return
    }
    if (activeBuiltIn && activeBuiltIn.id !== dataset.views[0]?.id) return pinBuiltIn(activeBuiltIn)
    if (identity.module) favoriteActions.togglePage(identity.module, identity.page, identity.pageLabel)
  })
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => void onViewKey(e)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onViewKey])

  // ── in-place cell editing (columns with `edit`) ────────────────────────────
  const cellRefs = useRef(new Map<string, HTMLDivElement>())
  const editableColumns = columns.filter((c) => c.edit)
  const cellText = (row: T, c: GridColumn): string => {
    const custom = (c.edit?.value as ((r: T) => string) | undefined)?.(row)
    if (custom !== undefined) return custom
    const raw = dataset.raw(row, c.key)
    return raw === '' || (typeof raw === 'number' && Number.isNaN(raw)) ? '' : String(raw)
  }
  const finishCell = async (row: T, c: GridColumn, value: string | null, move: 1 | -1 | 0) => {
    const id = dataset.idOf(row)
    const target = move ? editableColumns[editableColumns.findIndex((x) => x.key === c.key) + move] : undefined
    if (target) setCell({ id, key: target.key })
    else {
      setCell(null)
      requestAnimationFrame(() => cellRefs.current.get(`${id}|${c.key}`)?.focus())
    }
    if (value === null || !c.edit) return
    try {
      const message = await (c.edit.commit as (r: T, v: string) => string | void | Promise<string | void>)(row, value)
      if (message) toast('Not saved', { description: message })
    } catch {
      toast('Not saved', { description: 'Check your connection and try again.' })
    }
  }

  const refresh = async () => {
    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      window.setTimeout(() => setRefreshing(false), 400)
    }
  }

  const exportRows = (which: 'current' | 'all') => {
    const list = which === 'current' ? filtered : applyPipeline({ rows: rows ?? [], dataset, search: '', filters: [], sorts })
    download(`${dataset.id}.csv`, toCsv(list, dataset, columns))
    toast('Export ready', { description: `${int(list.length)} ${list.length === 1 ? dataset.noun : dataset.nounPlural} saved as CSV.` })
  }

  const exportSelected = () => {
    download(`${dataset.id}-selected.csv`, toCsv(selectedRows, dataset, columns))
  }

  const copySelected = async () => {
    const text = selectedRows.map((r) => columns.map((c) => dataset.text(r, c.key)).join('\t')).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      toast('Copied', { description: `${int(selectedRows.length)} ${selectedRows.length === 1 ? 'row' : 'rows'} copied to the clipboard.` })
    } catch {
      toast('Could not copy', { description: 'The browser blocked clipboard access.' })
    }
  }

  // ── selection ──────────────────────────────────────────────────────────────
  const allChecked = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
  const someChecked = !allChecked && pageIds.some((id) => selected.has(id))

  const toggleRow = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const selectRange = (toId: string) => {
    const ids = shown.map(dataset.idOf)
    const from = ids.indexOf(anchorRef.current ?? toId)
    const to = ids.indexOf(toId)
    if (from < 0 || to < 0) return
    const [a, b] = from < to ? [from, to] : [to, from]
    setSelected((prev) => new Set([...prev, ...ids.slice(a, b + 1)]))
  }

  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (allChecked) for (const id of pageIds) next.delete(id)
      else for (const id of pageIds) next.add(id)
      return next
    })

  const onRowClick = (e: MouseEvent, id: string) => {
    if (e.shiftKey) return selectRange(id)
    anchorRef.current = id
    if (e.metaKey || e.ctrlKey) {
      toggleRow(id)
      onActiveChange(id)
      return
    }
    onActiveChange(activeId === id ? null : id)
  }

  // ── keyboard ───────────────────────────────────────────────────────────────
  const moveActive = useCallback(
    (delta: number) => {
      if (pageIds.length === 0) return
      const index = activeId ? pageIds.indexOf(activeId) : -1
      const next = pageIds[Math.min(pageIds.length - 1, Math.max(0, index + delta))] ?? pageIds[0]
      onActiveChange(next)
      rowRefs.current.get(next)?.scrollIntoView({ block: 'nearest' })
    },
    [activeId, pageIds, onActiveChange],
  )

  const onGridKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (isTypingTarget(e.target)) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      moveActive(1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      moveActive(-1)
    } else if (e.key === 'Enter' && activeRow) {
      e.preventDefault()
      onOpen(activeRow)
    } else if (e.key === ' ' && activeId) {
      e.preventDefault()
      toggleRow(activeId)
    } else if (e.key === 'Escape') {
      // Same order as the prototype's Esc: the preview drawer, then find, then the selection.
      if (activeId) onActiveChange(null)
      else if (findOpen) closeFind()
      else if (selected.size) setSelected(new Set())
    }
  }

  // ── find in view (highlights; never removes rows) ──────────────────────────
  const findQ = findOpen ? findQuery.trim().toLowerCase() : ''
  const matches = useMemo(
    () => (findOpen ? findMatches(shown, (row) => columns.map((c) => dataset.text(row, c.key)), findQuery) : []),
    [findOpen, shown, columns, dataset, findQuery],
  )
  const matchIndex = Math.min(findIndex, Math.max(0, matches.length - 1))
  const currentPos = matches.length ? matches[matchIndex] : -1
  const currentFindId = currentPos >= 0 ? dataset.idOf(shown[currentPos]) : null

  function openFind() {
    setFindOpen(true)
    requestAnimationFrame(() => findRef.current?.focus())
  }
  function closeFind() {
    setFindOpen(false)
    setFindQuery('')
    setFindIndex(0)
  }
  const stepFind = (dir: -1 | 1) => {
    const next = stepMatch(matchIndex, matches.length, dir)
    setFindIndex(next)
    if (matches.length) setPage(Math.floor(matches[next] / pageSize))
  }
  const changeFindQuery = (value: string) => {
    setFindQuery(value)
    setFindIndex(0)
    const first = findMatches(shown, (row) => columns.map((c) => dataset.text(row, c.key)), value)[0]
    if (first !== undefined) setPage(Math.floor(first / pageSize))
  }

  // Bring the current match's row into view (its page is already showing).
  useEffect(() => {
    if (currentFindId) rowRefs.current.get(currentFindId)?.scrollIntoView({ block: 'nearest' })
  }, [currentFindId, slice.page])

  // Ctrl/Cmd+F opens find (the browser's own find is not useful on a paged grid).
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== 'f') return
      if (isTypingTarget(e.target) && e.target !== findRef.current) return
      if (document.querySelector('[role="alertdialog"]')) return
      e.preventDefault()
      if (findOpen) findRef.current?.select()
      else openFind()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [findOpen])

  // Page-level shortcuts: "/" focuses the quick search, Alt+←/→ pages.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey) return
      if (e.key === '/' && !e.altKey) {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault()
        setPage((p) => Math.min(p + 1, slice.pageCount - 1))
      } else if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault()
        setPage((p) => Math.max(p - 1, 0))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [slice.pageCount])

  // ── layout helpers ─────────────────────────────────────────────────────────
  const leftOffsets = useMemo(() => {
    const map = new Map<string, number>()
    let left = SELECT_WIDTH
    for (const c of columns) {
      if (c.frozen === 'left') {
        map.set(c.key, left)
        left += c.width
      }
    }
    return map
  }, [columns])
  const rightOffsets = useMemo(() => {
    const map = new Map<string, number>()
    let right = 0
    for (const c of [...columns].reverse()) {
      if (c.frozen === 'right') {
        map.set(c.key, right)
        right += c.width
      }
    }
    return map
  }, [columns])
  const lastFrozen = [...columns].reverse().find((c) => c.frozen === 'left')?.key
  const firstRight = columns.find((c) => c.frozen === 'right')?.key
  const hasFrozen = !!lastFrozen

  // Sticky offsets are measured from the column widths, so they are inline by necessity.
  const frozenStyle = (c: GridColumn) =>
    c.frozen === 'left'
      ? { left: leftOffsets.get(c.key), width: c.width }
      : c.frozen === 'right'
        ? { right: rightOffsets.get(c.key), width: c.width }
        : { width: c.width }
  const frozenClass = (c: GridColumn, base: string) =>
    cn(
      c.frozen && 'sticky',
      c.frozen && base,
      c.key === lastFrozen && 'border-r border-border',
      c.key === lastFrozen && scrolledX && 'shadow-[7px_0_8px_-7px_rgba(0,0,0,.4)]',
      c.key === firstRight && 'border-l border-border',
      c.key === firstRight && moreRight && 'shadow-[-7px_0_8px_-7px_rgba(0,0,0,.4)]',
    )

  // ── column layout actions ──────────────────────────────────────────────────
  const shownKeys = columns.map((c) => c.key)
  const textsOf = (key: string) => filtered.map((row) => dataset.text(row, key))
  const autofit = (keys: string[]) => {
    const fitted = keys.flatMap((key) => {
      const c = defaultColumn.get(key)
      return c ? [{ c, width: fitWidth({ label: c.label, texts: textsOf(key), type: c.type, min: c.min }) }] : []
    })
    setWidths((prev) => fitted.reduce((acc, { c, width }) => withOverride(acc, c.key, width, c.width), prev))
  }
  const autofitAll = () => {
    autofit(shownKeys)
    toast('Columns auto-fit', { description: 'All columns sized to their content.' })
  }
  const resetLayout = () => {
    setOrder(dataset.columns.map((c) => c.key))
    setWidths({})
    setPins({})
    setHidden(new Set(dataset.columns.filter((c) => !c.visible).map((c) => c.key)))
    toast('Layout reset', { description: 'Columns restored to defaults' })
  }
  const hideColumn = (key: string) => setHidden((prev) => new Set(prev).add(key))
  const sortBy = (key: string, dir: 'asc' | 'desc') => {
    setSorts([{ key, dir }])
    setPage(0)
  }

  const startResize = (e: ReactPointerEvent<HTMLDivElement>, c: GridColumn) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    const handle = e.currentTarget
    const base = defaultColumn.get(c.key)
    if (!base) return
    handle.setPointerCapture(e.pointerId)
    const startX = e.clientX
    const startWidth = c.width
    const move = (ev: PointerEvent) => {
      const width = Math.max(MIN_RESIZE, Math.round(startWidth + ev.clientX - startX))
      setWidths((prev) => withOverride(prev, c.key, width, base.width))
    }
    const stop = () => {
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', stop)
      handle.removeEventListener('pointercancel', stop)
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', stop)
    handle.addEventListener('pointercancel', stop)
  }

  // Column drag-and-drop: the header label is the drag handle, every header is a drop target.
  const dragRef = useRef<string | null>(null)
  const onHeaderDragStart = (e: DragEvent, key: string) => {
    dragRef.current = key
    e.dataTransfer.effectAllowed = 'move'
    try {
      e.dataTransfer.setData('text/plain', key)
    } catch {
      // Some browsers refuse custom drag data; the ref carries the key anyway.
    }
    window.setTimeout(() => setDragKey(key), 0)
  }
  const endHeaderDrag = () => {
    dragRef.current = null
    setDragKey(null)
    setDropKey(null)
  }
  const onHeaderDrop = (e: DragEvent, targetKey: string) => {
    e.preventDefault()
    const from = dragRef.current
    endHeaderDrag()
    if (from && from !== targetKey) setOrder(moveColumn(layout.order, from, targetKey))
  }

  // Is there more grid to the right of the view (drives the right-pin divider shadow)?
  const gridRef = useRef<HTMLDivElement>(null)
  const [moreRight, setMoreRight] = useState(false)
  const measureScroll = useCallback(() => {
    const el = gridRef.current
    if (!el) return
    setScrolledX(el.scrollLeft > 0)
    setMoreRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }, [])
  useEffect(() => {
    const el = gridRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measureScroll)
    observer.observe(el)
    if (el.firstElementChild) observer.observe(el.firstElementChild)
    return () => observer.disconnect()
  }, [measureScroll])

  const rangeLabel =
    slice.total === 0
      ? `No ${dataset.nounPlural}`
      : `Showing ${int(slice.page * pageSize + 1)}–${int(slice.page * pageSize + slice.rows.length)} of ${int(slice.total)} ${slice.total === 1 ? dataset.noun : dataset.nounPlural}`
  const rowActions = (row: T) => actions.filter((a) => !a.disabled?.(row))

  // ── footer aggregates (over every row of the current view) ─────────────────
  const effectiveAgg = (c: GridColumn): AggKind => {
    const chosen = aggs[c.key]
    if (isAggKind(chosen)) return chosen
    return c.agg ?? 'none'
  }
  const aggValues = useMemo(() => {
    const out = new Map<string, number | null>()
    if (!totalsOn) return out
    for (const c of columns) {
      const chosen = aggs[c.key]
      const kind: AggKind = isAggKind(chosen) ? chosen : (c.agg ?? 'none')
      if (kind === 'none') continue
      out.set(c.key, aggregate(filtered.map((row) => dataset.raw(row, c.key)), kind))
    }
    return out
  }, [totalsOn, columns, aggs, filtered, dataset])
  const aggText = (c: GridColumn, kind: AggKind): string => {
    const value = aggValues.get(c.key)
    if (kind === 'none' || value == null) return ''
    if (kind === 'count') return int(value)
    return c.aggFmt === 'money' ? money(value) : int(Math.round(value))
  }
  const pickAgg = (c: GridColumn, kind: AggKind) => {
    const base = c.agg ?? 'none'
    changeAggs(withOverride(aggs, c.key, kind, base) as Record<string, string>)
  }

  const renderRow = (row: T, rowNumber: number) => {
    const id = dataset.idOf(row)
    const isActive = id === activeId
    const checked = selected.has(id)
    const menu = rowActions(row)
    const isFindCurrent = id === currentFindId
    const rowEl = (
      <div
        role="row"
        aria-rowindex={rowNumber + 2}
        aria-selected={isActive}
        ref={(el) => {
          if (el) rowRefs.current.set(id, el)
          else rowRefs.current.delete(id)
        }}
        onClick={(e) => onRowClick(e, id)}
        onMouseDown={(e) => e.shiftKey && e.preventDefault()}
        onDoubleClick={() => onOpen(row)}
        className={cn(
          'flex w-max min-w-full cursor-default items-stretch border-b border-border transition-colors duration-[140ms] select-none',
          isActive
            ? 'bg-row-sel'
            : isFindCurrent
              ? cn(FIND_ROW, 'shadow-[inset_3px_0_0_oklch(0.78_0.16_95)] hover:bg-row-hover')
              : 'bg-card hover:bg-row-hover',
        )}
      >
        <div
          className={cn(
            'sticky left-0 z-[3] flex flex-none items-center justify-center self-stretch bg-inherit',
            !hasFrozen && 'border-r border-border',
          )}
          style={{ width: SELECT_WIDTH }}
        >
          <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            aria-label={`Select ${id}`}
            onClick={(e) => {
              e.stopPropagation()
              if (e.shiftKey) return selectRange(id)
              anchorRef.current = id
              toggleRow(id)
            }}
            onDoubleClick={(e) => e.stopPropagation()}
            className="border-0 bg-transparent p-0"
          >
            <CheckBox state={checked ? 'on' : 'off'} />
          </button>
        </div>
        {columns.map((c, colIndex) => {
          const text = dataset.text(row, c.key)
          const negative = c.type === 'num' && Number(dataset.raw(row, c.key)) < 0
          const flag = colIndex === 0 ? (dataset.rowFlag?.(row) ?? null) : null
          const editing = !!c.edit && cell?.id === id && cell.key === c.key
          const hit = !!findQ && textMatches(text, findQ)
          return (
            <div
              key={c.key}
              role="gridcell"
              data-col-key={c.key}
              data-editable={c.edit ? '' : undefined}
              ref={
                c.edit
                  ? (el) => {
                      if (el) cellRefs.current.set(`${id}|${c.key}`, el)
                      else cellRefs.current.delete(`${id}|${c.key}`)
                    }
                  : undefined
              }
              tabIndex={c.edit && !editing ? 0 : undefined}
              title={c.edit && !editing ? 'Click or press Enter to edit' : undefined}
              // A plain click edits the cell and leaves the row selection alone (the layout must not
              // jump under the pointer); Shift / Ctrl / Cmd-click still select as usual.
              onClick={
                c.edit
                  ? (e) => {
                      if (e.shiftKey || e.ctrlKey || e.metaKey) return
                      e.stopPropagation()
                      if (!editing) setCell({ id, key: c.key })
                    }
                  : undefined
              }
              onDoubleClick={c.edit ? (e) => e.stopPropagation() : undefined}
              onKeyDown={
                c.edit && !editing
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === 'F2') {
                        e.preventDefault()
                        e.stopPropagation()
                        setCell({ id, key: c.key })
                      }
                    }
                  : undefined
              }
              style={frozenStyle(c)}
              className={cn(
                'group/cell flex flex-none items-center gap-[7px] overflow-hidden px-3 transition-[padding,background-color] duration-[180ms] ease-[cubic-bezier(.4,0,.2,1)]',
                compact ? 'py-1.5' : 'py-[9px]',
                c.align === 'right' ? 'justify-end' : 'justify-start',
                c.frozen ? 'z-[2] bg-inherit' : 'z-[1]',
                negative && 'bg-bad-bg',
                hit && FIND_CELL,
                c.edit && 'cursor-text outline-none hover:bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)] focus-visible:shadow-[inset_0_0_0_1.5px_var(--ring)]',
                frozenClass(c, ''),
              )}
            >
              {flag && <span title={flag} className="size-1.5 flex-none rounded-full bg-warn-fg" />}
              {editing && c.edit ? (
                <CellEditor
                  kind={c.edit.kind}
                  step={c.edit.step}
                  min={c.edit.min}
                  initial={cellText(row, c)}
                  label={c.label}
                  align={c.align}
                  mono={c.type === 'mono'}
                  onFinish={(value, move) => void finishCell(row, c, value, move)}
                />
              ) : c.type === 'pill' ? (
                <StatusPill label={text} />
              ) : (
                <span
                  className={cn(
                    'truncate',
                    c.type === 'mono' ? 'font-mono text-xs' : compact ? 'text-xs' : 'text-[12.5px]',
                    c.type === 'num' && 'tnum',
                    negative ? 'font-bold text-bad-fg' : c.muted && 'text-muted-foreground',
                  )}
                >
                  {text}
                </span>
              )}
              {c.edit && !editing && (
                <Pencil
                  aria-hidden
                  className="size-[10px] flex-none text-muted-foreground opacity-0 transition-opacity duration-[140ms] group-hover/cell:opacity-70 group-focus-visible/cell:opacity-70"
                  strokeWidth={2}
                />
              )}
            </div>
          )
        })}
      </div>
    )
    if (menu.length === 0) return <div key={id}>{rowEl}</div>
    return (
      <ContextMenu key={id} onOpenChange={(open) => open && onActiveChange(id)}>
        <ContextMenuTrigger asChild>{rowEl}</ContextMenuTrigger>
        <ContextMenuContent className="w-[212px] rounded-[10px] p-1.5">
          {menu
            .filter((a) => !a.danger)
            .map((action) => (
              <ContextMenuItem key={action.label} className="gap-[9px] text-[12.5px]" onSelect={() => action.onSelect(row)}>
                {action.icon && <action.icon className="size-[14px]" strokeWidth={2} />}
                {action.label}
              </ContextMenuItem>
            ))}
          {menu.some((a) => a.danger) && <ContextMenuSeparator />}
          {menu
            .filter((a) => a.danger)
            .map((action) => (
              <ContextMenuItem
                key={action.label}
                className="gap-[9px] text-[12.5px] focus:bg-bad-bg focus:text-bad-fg"
                onSelect={() => action.onSelect(row)}
              >
                {action.icon && <action.icon className="size-[14px]" strokeWidth={2} />}
                {action.label}
              </ContextMenuItem>
            ))}
        </ContextMenuContent>
      </ContextMenu>
    )
  }

  return (
    <section
      data-screen-label={dataset.nounPlural}
      className="flex min-h-0 min-w-0 flex-1 animate-sf-fade flex-col"
    >
      {/* ── Toolbar ── */}
      <div className="relative z-20 flex-none border-b border-border bg-panel">
        <div className="flex flex-wrap items-center gap-2 px-5 py-[11px]">
          <ViewsMenu
            builtIn={dataset.views}
            saved={saved}
            activeId={viewId}
            label={activeSaved?.name ?? activeBuiltIn?.name ?? 'Views'}
            dirty={dirty}
            saveSignal={saveSignal}
            isFavorite={(view) => !!favoriteActions.viewFavorite(view.id)}
            onApplyBuiltIn={applyView}
            onApplySaved={applySaved}
            onSaveAs={saveAs}
            onUpdate={(view) => void viewActions.update(view)}
            onRename={(view, name) => void viewActions.rename(view, name)}
            onDuplicate={(view) => void viewActions.duplicate(view)}
            onToggleDefault={(view) => void viewActions.toggleDefault(view)}
            onToggleFavorite={toggleViewFavorite}
            onDelete={(view) => void deleteView(view)}
            onPinBuiltIn={(view) => void pinBuiltIn(view)}
          />

          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className={toolButton}>
                <Funnel className="size-[13px] text-muted-foreground" strokeWidth={2} />
                Add filter
                {filters.length > 0 && (
                  <span className="inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-primary px-[5px] text-[10.5px] font-bold text-primary-foreground">
                    {filters.length}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[212px] rounded-[10px] p-1.5">
              <div className="px-2 pt-[5px] pb-1.5 text-[10.5px] font-semibold tracking-[0.06em] text-muted-foreground">
                FILTER BY
              </div>
              {dataset.filterColumns.map((column) => (
                <button
                  key={column.key}
                  type="button"
                  onClick={() => changeFilters([...filters, defaultFilter(column, nextFilterId())])}
                  className="flex w-full items-center rounded-[7px] border-0 bg-transparent px-[9px] py-[7px] text-left text-[12.5px] text-foreground transition-colors duration-[140ms] hover:bg-tint-10"
                >
                  {column.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          <div className="flex-1" />

          <span className="relative inline-flex max-w-[280px] min-w-[140px] flex-1">
            <Search
              className="pointer-events-none absolute top-[9px] left-[10px] size-[14px] text-muted-foreground"
              strokeWidth={2}
            />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => changeSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  changeSearch('')
                  e.currentTarget.blur()
                }
              }}
              placeholder="Search all columns…"
              title="Searches every column shown in the table ( / )"
              aria-label="Search all columns"
              className="h-8 w-full rounded-lg border border-input bg-transparent pr-[10px] pl-[31px] text-[13px] text-foreground outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground focus:border-ring focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_20%,transparent)]"
            />
          </span>

          <span className="inline-flex items-center gap-1.5">
            <button type="button" onClick={refresh} title="Refresh" aria-label="Refresh" className={toolIcon}>
              <RefreshCw className={cn('size-[15px]', refreshing && 'animate-sf-spin')} strokeWidth={2} />
            </button>
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" title="Columns" aria-label="Columns" className={toolIcon}>
                  <SlidersVertical className="size-[15px]" strokeWidth={2} />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[230px] rounded-[10px] p-1.5">
                <div className="px-2 pt-[5px] pb-1.5 text-[10.5px] font-semibold tracking-[0.06em] text-muted-foreground">
                  COLUMNS
                </div>
                {layout.order.map((key) => {
                  const column = defaultColumn.get(key)!
                  const on = !hidden.has(column.key)
                  return (
                    <button
                      key={column.key}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      disabled={on && (columns.length <= 1 || column.hideable === false)}
                      onClick={() =>
                        setHidden((prev) => {
                          const next = new Set(prev)
                          if (on) next.add(column.key)
                          else next.delete(column.key)
                          return next
                        })
                      }
                      className="flex w-full items-center gap-[9px] rounded-[7px] border-0 bg-transparent px-[9px] py-[6px] text-left text-[12.5px] text-foreground transition-colors duration-[140ms] hover:bg-tint-10 disabled:pointer-events-none disabled:opacity-60"
                    >
                      <CheckBox state={on ? 'on' : 'off'} />
                      <span className="flex-1">{column.label}</span>
                    </button>
                  )
                })}
                <div className="my-1.5 h-px bg-border" />
                {dataset.columns.some((c) => c.type === 'num') && (
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={totalsOn}
                    onClick={() => changeTotals(!totalsOn)}
                    className="flex w-full items-center gap-[9px] rounded-[7px] border-0 bg-transparent px-[9px] py-[6px] text-left text-[12.5px] text-foreground transition-colors duration-[140ms] hover:bg-tint-10"
                  >
                    <CheckBox state={totalsOn ? 'on' : 'off'} />
                    <span className="flex-1">Totals row</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={resetLayout}
                  className="flex w-full items-center gap-[9px] rounded-[7px] border-0 bg-transparent px-[9px] py-[6px] text-left text-[12.5px] text-foreground transition-colors duration-[140ms] hover:bg-tint-10"
                >
                  <RotateCcw className="size-[14px] text-muted-foreground" strokeWidth={2} />
                  <span className="flex-1">Reset layout</span>
                </button>
              </PopoverContent>
            </Popover>
            <button
              type="button"
              onClick={() => (findOpen ? closeFind() : openFind())}
              title="Find in view (Ctrl+F)"
              aria-label="Find in view"
              aria-pressed={findOpen}
              className={cn(toolIcon, findOpen && 'border-primary/50 text-primary')}
            >
              <TextSearch className="size-[15px]" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => setCompact((c) => !c)}
              title={compact ? 'Switch to comfortable rows' : 'Switch to compact rows'}
              aria-label={compact ? 'Switch to comfortable rows' : 'Switch to compact rows'}
              className={toolIcon}
            >
              {compact ? <Rows4 className="size-[15px]" strokeWidth={2} /> : <Rows3 className="size-[15px]" strokeWidth={2} />}
            </button>
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className={toolButton}>
                Actions
                <ChevronDown className="size-[11px] opacity-70" strokeWidth={2} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[212px] rounded-[10px] p-1.5">
              <DropdownMenuLabel className="truncate px-2 pt-[5px] pb-1.5 text-[10.5px] font-semibold tracking-[0.06em] text-muted-foreground">
                {activeRow ? dataset.idOf(activeRow) : 'NO ROW SELECTED'}
              </DropdownMenuLabel>
              {actions
                .filter((a) => !a.danger)
                .map((action) => (
                  <DropdownMenuItem
                    key={action.label}
                    disabled={!activeRow || action.disabled?.(activeRow)}
                    className="gap-[9px] text-[12.5px]"
                    onSelect={() => activeRow && action.onSelect(activeRow)}
                  >
                    {action.icon && <action.icon className="size-[14px]" strokeWidth={2} />}
                    {action.label}
                  </DropdownMenuItem>
                ))}
              <DropdownMenuItem
                className="gap-[9px] text-[12.5px]"
                onSelect={() => setSelected(new Set(filtered.map(dataset.idOf)))}
              >
                <SquareCheckBig className="size-[14px]" strokeWidth={2} />
                Select all rows
              </DropdownMenuItem>
              {actions.some((a) => a.danger) && <DropdownMenuSeparator />}
              {actions
                .filter((a) => a.danger)
                .map((action) => (
                  <DropdownMenuItem
                    key={action.label}
                    disabled={!activeRow || action.disabled?.(activeRow)}
                    className="gap-[9px] text-[12.5px] focus:bg-bad-bg focus:text-bad-fg"
                    onSelect={() => activeRow && action.onSelect(activeRow)}
                  >
                    {action.icon && <action.icon className="size-[14px]" strokeWidth={2} />}
                    {action.label}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className={toolButton}>
                <Download className="size-[13px] text-muted-foreground" strokeWidth={2} />
                Export
                <ChevronDown className="size-[11px] opacity-70" strokeWidth={2} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 rounded-[10px] p-1.5">
              <DropdownMenuLabel className="px-2 pt-[5px] pb-1.5 text-[10.5px] font-semibold tracking-[0.06em] text-muted-foreground">
                EXPORT
              </DropdownMenuLabel>
              <DropdownMenuItem className="gap-[9px] text-[12.5px] font-medium" onSelect={() => exportRows('current')}>
                <Eye className="size-[14px] opacity-70" strokeWidth={2} />
                <span className="flex-1">Export current view</span>
                <span className="tnum text-[11px] text-muted-foreground">{int(filtered.length)}</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-[9px] text-[12.5px] font-medium" onSelect={() => exportRows('all')}>
                <List className="size-[14px] opacity-70" strokeWidth={2} />
                <span className="flex-1">Export all</span>
                <span className="tnum text-[11px] text-muted-foreground">{int((rows ?? []).length)}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <FilterChips filters={filters} columns={dataset.filterColumns} onChange={changeFilters} />

        {groups && groupBy && (
          <div className="flex animate-sf-fade flex-wrap items-center gap-2 px-5 pb-2.5 text-xs text-muted-foreground">
            <span>
              Grouped by <span className="font-semibold text-foreground">{defaultColumn.get(groupBy)?.label ?? groupBy}</span>
            </span>
            <span className="tnum">
              · {int(groups.length)} {groups.length === 1 ? 'group' : 'groups'}
            </span>
            <button type="button" onClick={() => setCollapsed(new Set(groups.map((g) => g.key)))} className={groupBarButton}>
              <ChevronsDownUp className="size-[13px]" strokeWidth={2} />
              Collapse all
            </button>
            <button type="button" onClick={() => setCollapsed(new Set())} className={groupBarButton}>
              <ChevronsUpDown className="size-[13px]" strokeWidth={2} />
              Expand all
            </button>
            <button type="button" onClick={() => changeGroup(null)} className={groupBarButton}>
              <Ungroup className="size-[13px]" strokeWidth={2} />
              Ungroup
            </button>
          </div>
        )}

        {findOpen && (
          <FindBar
            query={findQuery}
            onQuery={changeFindQuery}
            index={matchIndex}
            count={matches.length}
            onStep={stepFind}
            onClose={closeFind}
            inputRef={findRef}
          />
        )}

        {selectedRows.length > 0 && (
          <div className="flex animate-sf-fade items-center gap-2 border border-[color-mix(in_oklab,var(--primary)_35%,transparent)] bg-[color-mix(in_oklab,var(--primary)_12%,var(--card))] px-5 py-[9px]">
            <span className="tnum text-[12.5px] font-semibold text-foreground">{int(selectedRows.length)} selected</span>
            <div className="h-[18px] w-px bg-[color-mix(in_oklab,var(--primary)_35%,transparent)]" />
            <button type="button" onClick={copySelected} title="Copy rows" className={bulkButton}>
              <Copy className="size-[13px] text-muted-foreground" strokeWidth={2} />
              Copy
            </button>
            <button type="button" onClick={exportSelected} title="Export selected rows as CSV" className={bulkButton}>
              <Download className="size-[13px] text-muted-foreground" strokeWidth={2} />
              Export
            </button>
            {bulkActions.some((a) => !a.when || a.when(selectedRows)) && (
              <div className="h-[18px] w-px bg-[color-mix(in_oklab,var(--primary)_35%,transparent)]" />
            )}
            {bulkActions
              .filter((a) => !a.when || a.when(selectedRows))
              .map((a) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => void a.run(selectedRows, { clearSelection: () => setSelected(new Set()) })}
                  className={cn(bulkButton, a.danger && 'text-bad-fg hover:bg-bad-bg')}
                >
                  {a.icon && <a.icon className="size-[13px]" strokeWidth={2} />}
                  {a.label}
                </button>
              ))}
            <div className="flex-1" />
            <button type="button" onClick={() => setSelected(new Set())} className={bulkButton}>
              <X className="size-[13px]" strokeWidth={2} />
              Clear
            </button>
          </div>
        )}
      </div>

      {/* ── Table + drawer ── */}
      <div className="flex min-h-0 flex-1 gap-[14px] px-5 pt-[14px] pb-4">
        <div
          role="grid"
          aria-label={dataset.nounPlural}
          aria-rowcount={slice.total}
          tabIndex={0}
          onKeyDown={onGridKeyDown}
          ref={gridRef}
          onScroll={measureScroll}
          className="relative min-w-0 flex-1 overflow-auto rounded-[10px] border border-border bg-card outline-none focus-visible:border-ring"
        >
          {/* header */}
          <div role="row" className="sticky top-0 z-[6] flex h-[34px] w-max min-w-full items-stretch border-b border-border bg-panel">
            <div
              className={cn(
                'sticky left-0 z-[7] flex flex-none items-center justify-center bg-panel',
                !hasFrozen && 'border-r border-border',
              )}
              style={{ width: SELECT_WIDTH }}
            >
              <button
                type="button"
                onClick={toggleAll}
                title="Select all"
                role="checkbox"
                aria-checked={allChecked ? true : someChecked ? 'mixed' : false}
                aria-label="Select all rows on this page"
                className="border-0 bg-transparent p-0"
              >
                <CheckBox state={allChecked ? 'on' : someChecked ? 'some' : 'off'} />
              </button>
            </div>
            {columns.map((c, colIndex) => {
              const sortIndex = sorts.findIndex((x) => x.key === c.key)
              const base = defaultColumn.get(c.key)
              const menuProps = {
                label: c.label,
                sortable: c.sortable,
                sortDir: sortIndex < 0 ? null : sorts[sortIndex].dir,
                pin: c.frozen || null,
                canHide: columns.length > 1 && c.hideable !== false,
                canGroup: c.groupable !== false,
                grouped: groupBy === c.key,
                canMoveLeft: colIndex > 0,
                canMoveRight: colIndex < columns.length - 1,
                onSort: (dir: 'asc' | 'desc') => sortBy(c.key, dir),
                onPin: (side: PinSide) => base && setPins((prev) => togglePin(prev, base, side)),
                onMove: (dir: -1 | 1) => setOrder(shiftColumn(layout.order, shownKeys, c.key, dir)),
                onHide: () => hideColumn(c.key),
                onGroup: () => changeGroup(groupBy === c.key ? null : c.key),
                onAutofit: () => autofit([c.key]),
                onAutofitAll: autofitAll,
                onReset: resetLayout,
              }
              const dropSide =
                dropKey === c.key && dragKey
                  ? layout.order.indexOf(dragKey) < layout.order.indexOf(c.key)
                    ? 'shadow-[inset_-2px_0_0_var(--primary)]'
                    : 'shadow-[inset_2px_0_0_var(--primary)]'
                  : ''
              return (
                <ContextMenu key={c.key}>
                  <ContextMenuTrigger asChild>
                    <div
                      role="columnheader"
                      data-col-key={c.key}
                      aria-sort={sortIndex < 0 ? 'none' : sorts[sortIndex].dir === 'asc' ? 'ascending' : 'descending'}
                      style={frozenStyle(c)}
                      onDragOver={(e) => {
                        if (!dragRef.current || dragRef.current === c.key) return
                        e.preventDefault()
                        e.dataTransfer.dropEffect = 'move'
                        if (dropKey !== c.key) setDropKey(c.key)
                      }}
                      onDrop={(e) => onHeaderDrop(e, c.key)}
                      className={cn(
                        'group/head relative flex h-full flex-none items-center gap-0.5 bg-panel pr-2.5 pl-3 transition-shadow duration-[160ms]',
                        c.frozen ? 'z-[7]' : 'z-[1]',
                        frozenClass(c, ''),
                        dropSide,
                      )}
                    >
                      <button
                        type="button"
                        draggable
                        aria-disabled={!c.sortable}
                        onClick={(e) => c.sortable && changeSort(c.key, e.shiftKey)}
                        onDragStart={(e) => onHeaderDragStart(e, c.key)}
                        onDragEnd={endHeaderDrag}
                        title={c.sortable ? 'Sort (Shift-click to add a column) · drag to reorder' : 'Drag to reorder'}
                        className={cn(
                          'flex h-full min-w-0 flex-1 items-center gap-1 border-0 bg-transparent p-0 select-none',
                          c.sortable ? 'cursor-pointer' : 'cursor-default',
                          c.align === 'right' ? 'justify-end' : 'justify-start',
                          dragKey === c.key && 'opacity-40',
                        )}
                      >
                        <span className="truncate text-[11.5px] font-semibold text-muted-foreground">{c.label}</span>
                        {sortIndex >= 0 && (
                          <span className="flex-none text-[10px] text-primary">
                            {sorts[sortIndex].dir === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                        {sortIndex >= 0 && sorts.length > 1 && (
                          <span
                            title="Sort priority"
                            className="inline-flex h-[13px] min-w-[13px] flex-none items-center justify-center rounded-full bg-primary px-[3px] text-[9px] leading-none font-bold text-primary-foreground"
                          >
                            {sortIndex + 1}
                          </span>
                        )}
                        {c.frozen && (
                          <Pin
                            aria-label="Pinned column"
                            className={cn('size-[11px] flex-none text-primary opacity-85', c.frozen === 'right' && '-scale-x-100')}
                            strokeWidth={2}
                          />
                        )}
                        {groupBy === c.key && (
                          <Ungroup aria-label="Grouped by this column" className="size-[11px] flex-none text-primary opacity-85" strokeWidth={2} />
                        )}
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            title="Column menu"
                            aria-label={`${c.label} column menu`}
                            className="hover-lift inline-flex size-5 flex-none items-center justify-center rounded-[5px] border-0 bg-transparent p-0 text-muted-foreground opacity-0 transition-opacity duration-[140ms] group-hover/head:opacity-100 hover:bg-tint-16 hover:text-foreground focus-visible:opacity-100 data-[state=open]:bg-tint-16 data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100"
                          >
                            <ChevronDown className="size-[12px]" strokeWidth={2.2} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-[212px] rounded-[10px] p-1.5">
                          <ColumnMenuItems kit={dropdownKit} {...menuProps} />
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <div
                        role="separator"
                        aria-orientation="vertical"
                        aria-label={`Resize ${c.label}`}
                        title="Drag to resize · double-click to autofit"
                        onPointerDown={(e) => startResize(e, c)}
                        onDoubleClick={(e) => {
                          e.stopPropagation()
                          autofit([c.key])
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="group/resize absolute top-0 right-0 z-[2] flex h-full w-[9px] cursor-col-resize touch-none items-center justify-end"
                      >
                        <span className="h-[55%] w-px bg-border transition-[width,background-color] duration-[140ms] group-hover/resize:w-[3px] group-hover/resize:bg-primary" />
                      </div>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-[212px] rounded-[10px] p-1.5">
                    <ColumnMenuItems kit={contextKit} {...menuProps} />
                  </ContextMenuContent>
                </ContextMenu>
              )
            })}
          </div>

          {/* body */}
          {isLoading &&
            Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="flex h-[37px] items-center border-b border-border px-4">
                <div
                  className="h-[10px] animate-sf-shimmer rounded-full bg-[linear-gradient(90deg,var(--muted)_25%,var(--border)_37%,var(--muted)_63%)] bg-[length:400%_100%]"
                  style={{ width: `${46 + ((i * 17) % 40)}%` }}
                />
              </div>
            ))}

          {!isLoading && !!error && (
            <div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
              <CircleAlert className="size-6 text-bad-fg" strokeWidth={1.8} />
              <div className="text-[13px] text-muted-foreground">
                Could not load {dataset.nounPlural}. Check your connection and try again.
              </div>
              <button type="button" onClick={refresh} className={toolButton}>
                <RefreshCw className="size-[13px]" strokeWidth={2} />
                Try again
              </button>
            </div>
          )}

          {!isLoading &&
            !error &&
            (sections
              ? sections.map((sec) => (
                  <Fragment key={sec.key}>
                    <div
                      role="row"
                      aria-expanded={!sec.collapsed}
                      className="flex w-max min-w-full border-b border-border bg-panel"
                    >
                      <button
                        type="button"
                        data-group={sec.key}
                        onClick={() => toggleGroupCollapsed(sec.key)}
                        title={sec.collapsed ? 'Expand group' : 'Collapse group'}
                        className="hover-lift sticky left-0 flex items-center gap-[9px] border-0 bg-transparent px-3.5 py-2 text-left"
                      >
                        <ChevronRight
                          className={cn(
                            'size-[14px] flex-none text-muted-foreground transition-transform duration-[160ms]',
                            !sec.collapsed && 'rotate-90',
                          )}
                          strokeWidth={2.2}
                        />
                        <span className="text-[12.5px] font-semibold text-foreground">
                          {defaultColumn.get(groupBy ?? '')?.label}: {sec.label}
                        </span>
                        <span className="tnum rounded-full border border-border bg-card px-2 py-px text-[11px] font-medium text-muted-foreground">
                          {int(sec.count)} {sec.count === 1 ? dataset.noun : dataset.nounPlural}
                        </span>
                      </button>
                    </div>
                    {sec.rows.map((row, i) => renderRow(row, sec.start + i))}
                  </Fragment>
                ))
              : slice.rows.map((row, i) => renderRow(row, slice.page * pageSize + i)))}

          {!isLoading && !error && filtered.length === 0 && (
            <div className="px-5 py-14 text-center text-[13px] text-muted-foreground">
              {(rows ?? []).length === 0
                ? (emptyText ?? `No ${dataset.nounPlural} yet.`)
                : `No ${dataset.nounPlural} match the current search and filters.`}
            </div>
          )}

          {/* totals — click a footer cell to pick that column's aggregate */}
          {totalsOn && !isLoading && !error && filtered.length > 0 && (
            <div className="sticky bottom-0 z-[5] flex w-max min-w-full items-stretch border-t border-border bg-panel">
              <div
                className={cn(
                  'sticky left-0 z-[6] flex flex-none items-center justify-center bg-panel text-[11px] font-bold text-muted-foreground',
                  !hasFrozen && 'border-r border-border',
                )}
                style={{ width: SELECT_WIDTH }}
                title="Totals for every row in the current view"
              >
                Σ
              </div>
              {columns.map((c) => {
                const kind = effectiveAgg(c)
                return (
                  <DropdownMenu key={c.key}>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        data-footer-key={c.key}
                        title={`Footer for ${c.label}: ${AGG_OPTIONS.find((o) => o.kind === kind)?.label} (click to change)`}
                        aria-label={`${c.label} footer: ${AGG_OPTIONS.find((o) => o.kind === kind)?.label}`}
                        style={frozenStyle(c)}
                        className={cn(
                          'flex flex-none cursor-pointer items-center border-0 bg-panel px-3 py-2 transition-colors duration-[140ms] hover:bg-tint-10 data-[state=open]:bg-tint-16',
                          c.align === 'right' ? 'justify-end' : 'justify-start',
                          c.frozen ? 'z-[6]' : 'z-[1]',
                          frozenClass(c, ''),
                        )}
                      >
                        <span className={cn('truncate text-xs font-semibold text-foreground', c.type === 'num' && 'tnum')}>
                          {aggText(c, kind)}
                        </span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" side="top" className="w-[170px] rounded-[10px] p-1.5">
                      <DropdownMenuLabel className="truncate px-2 pt-[5px] pb-1.5 text-[10.5px] font-semibold tracking-[0.06em] text-muted-foreground">
                        {c.label.toUpperCase()}
                      </DropdownMenuLabel>
                      <DropdownMenuRadioGroup value={kind} onValueChange={(v) => pickAgg(c, v as AggKind)}>
                        {AGG_OPTIONS.filter((o) => aggKindsFor(c.type).includes(o.kind)).map((o) => (
                          <DropdownMenuRadioItem key={o.kind} value={o.kind} className="text-[12.5px]">
                            {o.label}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )
              })}
            </div>
          )}
        </div>
        {drawer}
      </div>

      {/* ── Pagination (pinned) ── */}
      <div className="flex flex-none items-center gap-4 border-t border-border bg-panel px-5 py-[10px]">
        <span className="tnum text-[12.5px] text-muted-foreground" aria-live="polite">
          {rangeLabel}
        </span>
        <div className="flex-1" />
        <label className="inline-flex items-center gap-2 text-[12.5px] text-muted-foreground">
          Rows per page
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setPage(0)
            }}
            title="Rows shown per page"
            className="h-[30px] rounded-lg border border-input bg-transparent px-2 text-[12.5px] text-foreground outline-none focus:border-ring focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_20%,transparent)]"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="tnum inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
          Page
          <select
            value={slice.page + 1}
            onChange={(e) => setPage(Number(e.target.value) - 1)}
            title="Jump to page"
            className="tnum h-[26px] rounded-[7px] border border-input bg-card px-1.5 text-[12.5px] text-foreground"
          >
            {Array.from({ length: slice.pageCount }, (_, i) => (
              <option key={i} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
          of {slice.pageCount}
        </label>
        <div className="flex items-center gap-1">
          <button type="button" title="First page" aria-label="First page" disabled={slice.page === 0} onClick={() => setPage(0)} className={pageButton}>
            <ChevronsLeft className="size-[14px]" strokeWidth={2} />
          </button>
          <button type="button" title="Previous page (Alt + ←)" aria-label="Previous page" disabled={slice.page === 0} onClick={() => setPage(slice.page - 1)} className={pageButton}>
            <ChevronLeft className="size-[14px]" strokeWidth={2} />
          </button>
          <button type="button" title="Next page (Alt + →)" aria-label="Next page" disabled={slice.page >= slice.pageCount - 1} onClick={() => setPage(slice.page + 1)} className={pageButton}>
            <ChevronRight className="size-[14px]" strokeWidth={2} />
          </button>
          <button type="button" title="Last page" aria-label="Last page" disabled={slice.page >= slice.pageCount - 1} onClick={() => setPage(slice.pageCount - 1)} className={pageButton}>
            <ChevronsRight className="size-[14px]" strokeWidth={2} />
          </button>
        </div>
      </div>
    </section>
  )
}
