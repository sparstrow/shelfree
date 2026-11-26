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
  CopyPlus,
  Download,
  ExternalLink,
  Eye,
  Funnel,
  Hash,
  List,
  Pencil,
  type LucideIcon,
  Pin,
  Plus,
  RefreshCw,
  RotateCcw,
  Rows3,
  Rows4,
  Search,
  SlidersVertical,
  SquareCheckBig,
  TextSearch,
  Trash2,
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
  type RefObject,
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
  ContextMenuLabel,
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
import { useMe } from '@/data/queries/session'
import type { SavedView } from '@/data/schemas'
import {
  type BulkOpDotToken,
  type BulkRowOpSpec,
  evaluateBulkDelete,
  evaluateBulkOp,
} from '@/domain/bulk-actions'
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
  enumValueCounts,
  initialOpenFilterSections,
  shouldDockFilterPanelInline,
} from '@/domain/grid-filters'
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
import { BulkEditDialog, type GridBulkEdit } from './BulkEditDialog'
import { CellEditor } from './CellEditor'
import { ColumnMenuItems } from './ColumnMenu'
import { contextKit, dropdownKit } from './column-menu-kits'
import { FilterChips } from './FilterChips'
import { FilterPanel } from './FilterPanel'
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

export type { GridBulkEdit }

export interface GridBulkAction<T> {
  label: string
  icon?: LucideIcon
  danger?: boolean
  /** Hidden from the bulk bar when this returns false for the selected rows. */
  when?: (rows: T[]) => boolean
  run: (rows: T[], ctx: { clearSelection: () => void }) => void | Promise<void>
}

export interface GridBulkOp<T> extends BulkRowOpSpec<T> {
  /** Execute the status or lock op on the eligible rows. */
  run: (eligible: T[], allSelected: T[], ctx: { clearSelection: () => void }) => void | Promise<void>
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
  /** One-column bulk edit dialog (bulk bar "Edit" and multi-row menu "Edit column…"). */
  bulkEdit?: GridBulkEdit<T>
  /** Duplicate the selected rows (return the new record ids to focus/select them). */
  onDuplicate?: (rows: T[]) => Promise<string[] | void> | void
  /** Bulk status transitions shown in the bulk bar (when 1+ apply) and multi-row menu. */
  statusOps?: readonly GridBulkOp<T>[]
  /** Bulk lock/reopen transitions shown in the bulk bar (when 1+ apply) and multi-row menu. */
  lockOps?: readonly GridBulkOp<T>[]
  /** Open each selected row's page in a new browser tab (multi-row context menu). */
  onOpenInTabs?: (rows: T[]) => void
  /** Bulk delete eligible selected rows (bulk bar and multi-row context menu). */
  onBulkDelete?: (eligible: T[], allSelected: T[], ctx: { clearSelection: () => void }) => void | Promise<void>
  /** Per-row bulk-delete eligibility (`true` when deletable, or a reason string). */
  canDelete?: (row: T) => true | string
  /** Side drawer rendered beside the table. */
  drawer?: ReactNode
  emptyText?: string
  /** Footer totals row (sum of numeric columns over the current view). Off by default. */
  showTotals?: boolean
  /** Filters applied when the grid first opens (deep links such as "lines for item X"). */
  initialFilters?: Omit<GridFilter, 'id'>[]
  /** Show the Filters side panel from the toolbar (default true). Pass false for the compact popover picker. */
  filterPanel?: boolean
  /** Host-pane mode (e.g. inside Settings): scopes grid shortcuts to this container and keeps `?group=` out of the host URL. */
  embedded?: boolean
  /** View-only mode: disables in-grid editing, row checkboxes, the bulk bar, and Ctrl+S view saving. */
  readOnly?: boolean
  /** Primary New button rendered in the toolbar (used by `ListPage embedded`). */
  toolbarCreate?: { label: string; run: () => void }
  /** Ref attached to the grid's outer `<section>` so a host (`ListPage embedded`) can scope shortcuts. */
  containerRef?: RefObject<HTMLElement | null>
}

function inEmbeddedScope(target: EventTarget | null, host: HTMLElement | null): boolean {
  if (!host) return false
  const active = document.activeElement
  if (active && active !== document.body && active !== document.documentElement) {
    return host.contains(active)
  }
  if (
    target instanceof Node &&
    target !== document &&
    target !== document.body &&
    target !== document.documentElement
  ) {
    return host.contains(target)
  }
  return true
}

const DOT_CLASS: Record<BulkOpDotToken, string> = {
  info: 'bg-info-fg',
  bad: 'bg-bad-fg',
  ok: 'bg-ok-fg',
  warn: 'bg-warn-fg',
  muted: 'bg-muted-foreground',
  primary: 'bg-primary',
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
  bulkEdit,
  onDuplicate,
  statusOps = [],
  lockOps = [],
  onOpenInTabs,
  onBulkDelete,
  canDelete,
  drawer,
  emptyText,
  showTotals = false,
  initialFilters,
  filterPanel,
  embedded = false,
  readOnly = false,
  toolbarCreate,
  containerRef,
}: DataGridProps<T>) {
  const innerSectionRef = useRef<HTMLElement | null>(null)
  const setSectionRef = useCallback(
    (el: HTMLElement | null) => {
      innerSectionRef.current = el
      if (containerRef) containerRef.current = el
    },
    [containerRef],
  )
  const filterPanelEnabled = (filterPanel ?? dataset.filterPanel) !== false
  const [viewId, setViewId] = useState(dataset.views[0]?.id ?? 'all')
  const [filters, setFilters] = useState<GridFilter[]>(() =>
    (initialFilters ?? []).map((f) => ({ ...f, id: nextFilterId() })),
  )
  const [search, setSearch] = useState('')
  const [sorts, setSorts] = useState<SortSpec[]>(() => [dataset.defaultSort ?? { key: 'no', dir: 'asc' }])
  const [hidden, setHidden] = useState<Set<string>>(
    () => new Set(dataset.columns.filter((c) => !c.visible).map((c) => c.key)),
  )
  // Row density starts from the user's Settings ▸ Appearance default (compact unless they chose comfortable).
  const defaultDensity = useMe().data?.defDensity
  const [compact, setCompact] = useState(defaultDensity !== 'comfortable')
  // The user's record can arrive after the grid first draws: apply their choice once, when it does.
  const densityApplied = useRef(defaultDensity !== undefined)
  useEffect(() => {
    if (defaultDensity === undefined || densityApplied.current) return
    densityApplied.current = true
    setCompact(defaultDensity !== 'comfortable')
  }, [defaultDensity])
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [bulkEditOpen, setBulkEditOpen] = useState(false)
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
  const defaultGroup = useMemo(
    () => (dataset.defaultGroupBy && groupableKeys.has(dataset.defaultGroupBy) ? dataset.defaultGroupBy : null),
    [dataset.defaultGroupBy, groupableKeys],
  )
  // A link that names a grouping opens the grid grouped (kept over a default saved view's).
  const [urlGroup, setUrlGroup] = useState<string | null>(() => {
    if (embedded) return null
    const key = new URLSearchParams(window.location.search).get(GROUP_PARAM)
    return key && groupableKeys.has(key) ? key : null
  })
  const [groupBy, setGroupBy] = useState<string | null>(() => urlGroup ?? defaultGroup)
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const [aggs, setAggs] = useState<Record<string, string>>(() => prefs.aggregates[dataset.id] ?? {})
  const [totalsOn, setTotalsOn] = useState(() => prefs.totals[dataset.id] ?? showTotals)
  const [dragKey, setDragKey] = useState<string | null>(null)
  const [dropKey, setDropKey] = useState<string | null>(null)
  const [findOpen, setFindOpen] = useState(false)
  const [findQuery, setFindQuery] = useState('')
  const [findIndex, setFindIndex] = useState(0)
  const findRef = useRef<HTMLInputElement>(null)
  const [viewsOpen, setViewsOpen] = useState(false)
  const [colsOpen, setColsOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterColQuery, setFilterColQuery] = useState('')
  const [openFilterSections, setOpenFilterSections] = useState<Set<string>>(() => new Set())
  const filterBtnRef = useRef<HTMLButtonElement>(null)
  const gridRowRef = useRef<HTMLDivElement>(null)
  const [inlineFilterPanel, setInlineFilterPanel] = useState(true)

  const enumCounts = useMemo(
    () => enumValueCounts(rows ?? [], dataset.filterColumns, dataset.raw),
    [rows, dataset],
  )

  const hasDrawer = Boolean(drawer)
  useEffect(() => {
    const el = gridRowRef.current
    if (!el) return
    const measure = () => {
      setInlineFilterPanel(shouldDockFilterPanelInline(el.clientWidth, hasDrawer))
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasDrawer])

  const focusFilterButton = () => {
    filterBtnRef.current?.focus({ preventScroll: true })
    requestAnimationFrame(() => filterBtnRef.current?.focus({ preventScroll: true }))
  }
  const closeFilterPanel = (restoreFocus = false) => {
    setFilterOpen(false)
    if (restoreFocus) focusFilterButton()
  }

  const toggleFilterPanel = () => {
    setFilterOpen((wasOpen) => {
      const next = !wasOpen
      if (next) {
        setViewsOpen(false)
        setColsOpen(false)
        setOpenFilterSections(initialOpenFilterSections(filters))
      }
      return next
    })
  }

  const toggleFilterSection = (key: string) => {
    setOpenFilterSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  useEffect(() => {
    if (!filterPanelEnabled || !filterOpen) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      // The preview drawer and find close first (prototype `handleEsc` order).
      if (e.key !== 'Escape' || e.defaultPrevented || findOpen || activeId) return
      if (e.target === searchRef.current) return
      const layerSelector =
        '[role="alertdialog"], [data-slot="sheet-content"], [data-slot="popover-content"], [data-slot="dropdown-menu-content"], [data-slot="select-content"], [data-slot="context-menu-content"]'
      if ((e.target instanceof Element && e.target.closest(layerSelector)) || document.querySelector(layerSelector)) {
        return
      }
      e.preventDefault()
      setFilterOpen(false)
      filterBtnRef.current?.focus({ preventScroll: true })
      requestAnimationFrame(() => filterBtnRef.current?.focus({ preventScroll: true }))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [filterPanelEnabled, filterOpen, findOpen, activeId])

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
    if (embedded) return
    const url = new URL(window.location.href)
    const desired = groupBy === defaultGroup ? null : groupBy
    if (url.searchParams.get(GROUP_PARAM) === desired) return
    if (desired) url.searchParams.set(GROUP_PARAM, desired)
    else url.searchParams.delete(GROUP_PARAM)
    router.history.replace(url.pathname + url.search + url.hash)
  }, [embedded, groupBy, defaultGroup, router])

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
    if (readOnly && key === 's') return
    if (key === 'd' && !favoriteActions.enabled) return // Favorites switched off for the workspace
    if (embedded && !inEmbeddedScope(e.target, innerSectionRef.current)) return
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
  const editableColumns = readOnly ? [] : columns.filter((c) => c.edit)
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

  const clearSelection = useCallback(() => setSelected(new Set()), [])

  const exportSelected = () => {
    if (selectedRows.length === 0) return
    download(`${dataset.id}-selected.csv`, toCsv(selectedRows, dataset, columns))
    toast(
      `Exported ${int(selectedRows.length)} ${selectedRows.length === 1 ? dataset.noun : dataset.nounPlural}`,
      { description: 'CSV · visible columns' },
    )
  }

  const copySelected = async () => {
    const target = selectedRows.length > 0 ? selectedRows : activeRow ? [activeRow] : []
    if (target.length === 0) return
    const header = columns.map((c) => c.label).join('\t')
    const body = target.map((r) => columns.map((c) => dataset.text(r, c.key)).join('\t')).join('\n')
    try {
      await navigator.clipboard.writeText(`${header}\n${body}`)
      toast('Copied', { description: `${int(target.length)} ${target.length === 1 ? 'row' : 'rows'} copied as table` })
    } catch {
      toast('Could not copy', { description: 'The browser blocked clipboard access.' })
    }
  }

  const copySelectedNumbers = async () => {
    const nos = selectedRows.map(dataset.idOf)
    if (nos.length === 0) return
    const joined = nos.join(', ')
    try {
      await navigator.clipboard.writeText(joined)
      toast('Copied', { description: `${int(nos.length)} numbers · ${joined}` })
    } catch {
      toast('Could not copy', { description: 'The browser blocked clipboard access.' })
    }
  }

  const runDuplicate = async (target: T[]) => {
    if (!onDuplicate || target.length === 0) return
    const made = await onDuplicate(target)
    if (Array.isArray(made)) {
      if (made.length > 1) {
        setSelected(new Set(made))
      } else if (made.length === 1) {
        setSelected(new Set())
        onActiveChange(made[0])
      }
    }
  }

  const evaluatedLockOps = useMemo(
    () => lockOps.map((op) => ({ op, ev: evaluateBulkOp(op, selectedRows) })),
    [lockOps, selectedRows],
  )
  const evaluatedStatusOps = useMemo(
    () => statusOps.map((op) => ({ op, ev: evaluateBulkOp(op, selectedRows) })),
    [statusOps, selectedRows],
  )
  const deleteEval = useMemo(
    () => evaluateBulkDelete(selectedRows, canDelete),
    [selectedRows, canDelete],
  )
  const canBulkEdit = !!bulkEdit && bulkEdit.fields.length > 0
  const selectionLabel = `${int(selectedRows.length)} ${selectedRows.length === 1 ? dataset.noun : dataset.nounPlural} selected`

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

  const selectRange = (toId: string, additive = false) => {
    const ids = shown.map(dataset.idOf)
    const from = ids.indexOf(anchorRef.current ?? toId)
    const to = ids.indexOf(toId)
    if (from < 0 || to < 0) return
    const [a, b] = from < to ? [from, to] : [to, from]
    const range = ids.slice(a, b + 1)
    setSelected((prev) => (additive ? new Set([...prev, ...range]) : new Set(range)))
  }

  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (allChecked) for (const id of pageIds) next.delete(id)
      else for (const id of pageIds) next.add(id)
      return next
    })

  const onRowClick = (e: MouseEvent, id: string) => {
    if (readOnly) {
      onActiveChange(activeId === id ? null : id)
      return
    }
    if (e.shiftKey) return selectRange(id, e.metaKey || e.ctrlKey)
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
    (delta: number): string | null => {
      if (pageIds.length === 0) return null
      const index = activeId ? pageIds.indexOf(activeId) : -1
      const next = pageIds[Math.min(pageIds.length - 1, Math.max(0, index + delta))] ?? pageIds[0]
      onActiveChange(next)
      rowRefs.current.get(next)?.scrollIntoView({ block: 'nearest' })
      return next
    },
    [activeId, pageIds, onActiveChange],
  )

  const onGridKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Menus and dialogs are portalled but still bubble through React's tree; their keys
    // (Esc closing a row menu, arrows inside it) are not the grid's.
    if (!(e.target instanceof Node) || !e.currentTarget.contains(e.target)) return
    if (isTypingTarget(e.target)) return
    if ((e.metaKey || e.ctrlKey) && !e.altKey) {
      const lower = e.key.toLowerCase()
      if (!readOnly && lower === 'a') {
        e.preventDefault()
        setSelected(new Set(shown.map(dataset.idOf)))
        return
      }
      if (lower === 'c' && !window.getSelection()?.toString() && (selectedRows.length > 0 || activeRow)) {
        e.preventDefault()
        void copySelected()
        return
      }
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!readOnly && e.shiftKey && !anchorRef.current && activeId) anchorRef.current = activeId
      const next = moveActive(e.key === 'ArrowDown' ? 1 : -1)
      if (next && !readOnly) {
        if (e.shiftKey) selectRange(next, true)
        else anchorRef.current = next
      }
    } else if (e.key === 'Enter' && activeRow) {
      e.preventDefault()
      onOpen(activeRow)
    } else if (!readOnly && e.key === ' ' && activeId) {
      e.preventDefault()
      anchorRef.current = activeId
      toggleRow(activeId)
    } else if (e.key === 'Escape') {
      // Same order as the prototype's Esc: the preview drawer, find, the filter panel, then the selection.
      if (activeId) onActiveChange(null)
      else if (findOpen) closeFind()
      else if (filterPanelEnabled && filterOpen) {
        e.preventDefault()
        closeFilterPanel(true)
      } else if (selected.size) setSelected(new Set())
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
      if (embedded && !inEmbeddedScope(e.target, innerSectionRef.current)) return
      if (isTypingTarget(e.target) && e.target !== findRef.current) return
      if (document.querySelector('[role="alertdialog"]')) return
      e.preventDefault()
      if (findOpen) findRef.current?.select()
      else openFind()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [embedded, findOpen])

  // Page-level shortcuts: "/" focuses the quick search, Alt+←/→ pages.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.defaultPrevented || isTypingTarget(e.target) || e.metaKey || e.ctrlKey) return
      if (embedded && !inEmbeddedScope(e.target, innerSectionRef.current)) return
      if (e.key === '/' && !e.altKey) {
        // When embedded inside central Settings, yield `/` to the frame's Find input unless focus is inside this list.
        if (
          embedded &&
          document.querySelector('[aria-label="Find a setting"]') &&
          !(document.activeElement && innerSectionRef.current?.contains(document.activeElement))
        ) {
          return
        }
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
  }, [embedded, slice.pageCount])

  // ── layout helpers ─────────────────────────────────────────────────────────
  const selectWidth = readOnly ? 0 : SELECT_WIDTH
  const leftOffsets = useMemo(() => {
    const map = new Map<string, number>()
    let left = selectWidth
    for (const c of columns) {
      if (c.frozen === 'left') {
        map.set(c.key, left)
        left += c.width
      }
    }
    return map
  }, [columns, selectWidth])
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
        {!readOnly && (
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
                if (e.shiftKey) return selectRange(id, true)
                anchorRef.current = id
                toggleRow(id)
              }}
              onDoubleClick={(e) => e.stopPropagation()}
              className="border-0 bg-transparent p-0"
            >
              <CheckBox state={checked ? 'on' : 'off'} />
            </button>
          </div>
        )}
        {columns.map((c, colIndex) => {
          const text = dataset.text(row, c.key)
          const negative = c.type === 'num' && Number(dataset.raw(row, c.key)) < 0
          const flag = colIndex === 0 ? (dataset.rowFlag?.(row) ?? null) : null
          const canEditCell = !readOnly && !!c.edit
          const editing = canEditCell && cell?.id === id && cell.key === c.key
          const hit = !!findQ && textMatches(text, findQ)
          return (
            <div
              key={c.key}
              role="gridcell"
              data-col-key={c.key}
              data-editable={canEditCell ? '' : undefined}
              ref={
                canEditCell
                  ? (el) => {
                      if (el) cellRefs.current.set(`${id}|${c.key}`, el)
                      else cellRefs.current.delete(`${id}|${c.key}`)
                    }
                  : undefined
              }
              tabIndex={canEditCell && !editing ? 0 : undefined}
              title={canEditCell && !editing ? 'Click or press Enter to edit' : undefined}
              // A plain click edits the cell and leaves the row selection alone (the layout must not
              // jump under the pointer); Shift / Ctrl / Cmd-click still select as usual.
              onClick={
                canEditCell
                  ? (e) => {
                      if (e.shiftKey || e.ctrlKey || e.metaKey) return
                      e.stopPropagation()
                      if (!editing) setCell({ id, key: c.key })
                    }
                  : undefined
              }
              onDoubleClick={canEditCell ? (e) => e.stopPropagation() : undefined}
              onKeyDown={
                canEditCell && !editing
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
                canEditCell && 'cursor-text outline-none hover:bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)] focus-visible:shadow-[inset_0_0_0_1.5px_var(--ring)]',
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
              {canEditCell && !editing && (
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
    const isMulti = !readOnly && selectedRows.length >= 2 && checked
    if (menu.length === 0 && !isMulti) return <div key={id}>{rowEl}</div>
    return (
      <ContextMenu
        key={id}
        onOpenChange={(open) => {
          if (!open) return
          if (!isMulti) {
            onActiveChange(id)
            if (selected.size > 0 && !checked) setSelected(new Set())
          }
        }}
      >
        <ContextMenuTrigger asChild>{rowEl}</ContextMenuTrigger>
        <ContextMenuContent className={cn('rounded-[10px] p-1.5', isMulti ? 'w-[236px]' : 'w-[212px]')}>
          {isMulti ? (
            <>
              <ContextMenuLabel className="mb-1 truncate border-b border-border px-2 pt-1 pb-[7px] text-[11px] font-semibold text-muted-foreground">
                {selectionLabel}
              </ContextMenuLabel>
              {onOpenInTabs && (
                <ContextMenuItem className="gap-[9px] text-[12.5px]" onSelect={() => onOpenInTabs(selectedRows)}>
                  <ExternalLink className="size-[14px]" strokeWidth={2} />
                  <span className="flex-1">Open in new tabs</span>{' '}
                  <span className="tnum font-mono text-[10.5px] text-muted-foreground">{int(selectedRows.length)}</span>
                </ContextMenuItem>
              )}
              <ContextMenuItem className="gap-[9px] text-[12.5px]" onSelect={() => void copySelected()}>
                <Copy className="size-[14px]" strokeWidth={2} />
                <span className="flex-1">Copy rows</span>{' '}
                <span className="tnum font-mono text-[10.5px] text-muted-foreground">{int(selectedRows.length)}</span>
              </ContextMenuItem>
              <ContextMenuItem className="gap-[9px] text-[12.5px]" onSelect={() => void copySelectedNumbers()}>
                <Hash className="size-[14px]" strokeWidth={2} />
                <span className="flex-1">Copy numbers</span>{' '}
                <span className="tnum font-mono text-[10.5px] text-muted-foreground">{int(selectedRows.length)}</span>
              </ContextMenuItem>
              {onDuplicate && (
                <ContextMenuItem className="gap-[9px] text-[12.5px]" onSelect={() => void runDuplicate(selectedRows)}>
                  <CopyPlus className="size-[14px]" strokeWidth={2} />
                  <span className="flex-1">Duplicate</span>{' '}
                  <span className="tnum font-mono text-[10.5px] text-muted-foreground">{int(selectedRows.length)}</span>
                </ContextMenuItem>
              )}
              {canBulkEdit && (
                <ContextMenuItem className="gap-[9px] text-[12.5px]" onSelect={() => setBulkEditOpen(true)}>
                  <Pencil className="size-[14px]" strokeWidth={2} />
                  <span className="flex-1">Edit column…</span>{' '}
                  <span className="tnum font-mono text-[10.5px] text-muted-foreground">{int(selectedRows.length)}</span>
                </ContextMenuItem>
              )}
              {evaluatedStatusOps.length > 0 && (
                <>
                  <ContextMenuSeparator />
                  <ContextMenuLabel className="px-2 pt-1 pb-0.5 text-[10.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                    Change status
                  </ContextMenuLabel>
                  {evaluatedStatusOps.map(({ op, ev }) => (
                    <ContextMenuItem
                      key={op.key}
                      disabled={!ev.enabled}
                      title={ev.title}
                      className="gap-[9px] text-[12.5px]"
                      onSelect={() => ev.enabled && void op.run(ev.eligible, selectedRows, { clearSelection })}
                    >
                      <span className="inline-flex size-[14px] items-center justify-center">
                        <span className={cn('size-[7px] rounded-full', ev.enabled ? DOT_CLASS[op.dot] : 'bg-muted-foreground')} />
                      </span>
                      <span className="flex-1">{op.label}</span>{' '}
                      <span className="tnum font-mono text-[10.5px] text-muted-foreground">{ev.hint}</span>
                    </ContextMenuItem>
                  ))}
                </>
              )}
              {evaluatedLockOps.length > 0 && (
                <>
                  <ContextMenuSeparator />
                  <ContextMenuLabel className="px-2 pt-1 pb-0.5 text-[10.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                    Lock
                  </ContextMenuLabel>
                  {evaluatedLockOps.map(({ op, ev }) => (
                    <ContextMenuItem
                      key={op.key}
                      disabled={!ev.enabled}
                      title={ev.title}
                      className="gap-[9px] text-[12.5px]"
                      onSelect={() => ev.enabled && void op.run(ev.eligible, selectedRows, { clearSelection })}
                    >
                      <span className="inline-flex size-[14px] items-center justify-center">
                        <span className={cn('size-[7px] rounded-full', ev.enabled ? DOT_CLASS[op.dot] : 'bg-muted-foreground')} />
                      </span>
                      <span className="flex-1">{op.label}</span>{' '}
                      <span className="tnum font-mono text-[10.5px] text-muted-foreground">{ev.hint}</span>
                    </ContextMenuItem>
                  ))}
                </>
              )}
              <ContextMenuSeparator />
              <ContextMenuItem className="gap-[9px] text-[12.5px]" onSelect={exportSelected}>
                <Download className="size-[14px]" strokeWidth={2} />
                <span className="flex-1">Export selected</span>{' '}
                <span className="tnum font-mono text-[10.5px] text-muted-foreground">CSV</span>
              </ContextMenuItem>
              {onBulkDelete && (
                <>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    title={deleteEval.title || undefined}
                    className="gap-[9px] text-[12.5px] focus:bg-bad-bg focus:text-bad-fg"
                    onSelect={() => void onBulkDelete(deleteEval.eligible, selectedRows, { clearSelection })}
                  >
                    <Trash2 className="size-[14px]" strokeWidth={2} />
                    <span className="flex-1">Delete</span>{' '}
                    <span className="tnum font-mono text-[10.5px] text-muted-foreground">{deleteEval.hint}</span>
                  </ContextMenuItem>
                </>
              )}
            </>
          ) : (
            <>
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
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
    )
  }

  return (
    <section
      ref={setSectionRef}
      data-screen-label={dataset.nounPlural}
      className="flex min-h-0 min-w-0 flex-1 animate-sf-fade flex-col"
    >
      {/* ── Toolbar ── */}
      <div className="relative z-20 flex-none border-b border-border bg-panel">
        <div className="flex flex-wrap items-center gap-2 px-5 py-[11px]">
          <ViewsMenu
            open={viewsOpen}
            onOpenChange={(next) => {
              setViewsOpen(next)
              if (next) setFilterOpen(false)
            }}
            builtIn={dataset.views}
            saved={saved}
            activeId={viewId}
            label={activeSaved?.name ?? activeBuiltIn?.name ?? 'Views'}
            dirty={dirty}
            saveSignal={saveSignal}
            isFavorite={(view) => !!favoriteActions.viewFavorite(view.id)}
            pinsEnabled={favoriteActions.enabled}
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

          {filterPanelEnabled ? (
            <button
              ref={filterBtnRef}
              type="button"
              aria-expanded={filterOpen}
              onClick={toggleFilterPanel}
              className={cn(
                toolButton,
                filterOpen &&
                  'border-[color-mix(in_oklab,var(--primary)_50%,transparent)] bg-[color-mix(in_oklab,var(--primary)_14%,var(--card))] text-primary hover:bg-[color-mix(in_oklab,var(--primary)_18%,var(--card))]',
              )}
            >
              <Funnel
                className={cn('size-[13px]', filterOpen ? 'text-primary' : 'text-muted-foreground')}
                strokeWidth={2}
              />
              Add filter
              {filters.length > 0 && (
                <span className="tnum inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-primary px-[5px] text-[10.5px] font-bold text-primary-foreground">
                  {filters.length}
                </span>
              )}
            </button>
          ) : (
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className={toolButton}>
                  <Funnel className="size-[13px] text-muted-foreground" strokeWidth={2} />
                  Add filter
                  {filters.length > 0 && (
                    <span className="tnum inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-primary px-[5px] text-[10.5px] font-bold text-primary-foreground">
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
          )}

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
            <Popover
              open={colsOpen}
              onOpenChange={(next) => {
                setColsOpen(next)
                if (next) setFilterOpen(false)
              }}
            >
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
              {!readOnly && (
                <DropdownMenuItem
                  className="gap-[9px] text-[12.5px]"
                  onSelect={() => setSelected(new Set(filtered.map(dataset.idOf)))}
                >
                  <SquareCheckBig className="size-[14px]" strokeWidth={2} />
                  Select all rows
                </DropdownMenuItem>
              )}
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

          {toolbarCreate && !readOnly && (
            <button
              type="button"
              onClick={toolbarCreate.run}
              title={toolbarCreate.label}
              className="hover-lift inline-flex h-8 flex-none items-center gap-1.5 rounded-lg border-0 bg-primary px-3 text-[13px] font-semibold whitespace-nowrap text-new-btn-fg shadow-base hover:bg-primary-hover"
            >
              <Plus className="size-[14px]" strokeWidth={2.4} />
              {toolbarCreate.label}
            </button>
          )}
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

        {!readOnly && selectedRows.length > 0 && (
          <div
            role="region"
            aria-label="Bulk actions"
            className="flex animate-sf-fade flex-wrap items-center gap-2 border border-[color-mix(in_oklab,var(--primary)_35%,transparent)] bg-[color-mix(in_oklab,var(--primary)_12%,var(--card))] px-5 py-[9px]"
          >
            <span className="tnum text-[12.5px] font-semibold text-foreground">{selectionLabel}</span>
            <div className="h-[18px] w-px bg-[color-mix(in_oklab,var(--primary)_35%,transparent)]" />
            {canBulkEdit && (
              <button type="button" onClick={() => setBulkEditOpen(true)} className={bulkButton}>
                <Pencil className="size-[13px] text-muted-foreground" strokeWidth={2} />
                Edit
              </button>
            )}
            <button type="button" onClick={() => void copySelected()} title="Copy rows (Ctrl/Cmd + C)" className={bulkButton}>
              <Copy className="size-[13px] text-muted-foreground" strokeWidth={2} />
              Copy
            </button>
            {onDuplicate && (
              <button type="button" onClick={() => void runDuplicate(selectedRows)} className={bulkButton}>
                <CopyPlus className="size-[13px] text-muted-foreground" strokeWidth={2} />
                Duplicate
              </button>
            )}
            {evaluatedLockOps
              .filter(({ ev }) => ev.count > 0)
              .map(({ op, ev }) => (
                <button
                  key={op.key}
                  type="button"
                  title={ev.title}
                  onClick={() => void op.run(ev.eligible, selectedRows, { clearSelection })}
                  className={bulkButton}
                >
                  <span className={cn('size-[7px] rounded-full', DOT_CLASS[op.dot])} />
                  {op.label}{' '}
                  <span className="tnum font-mono text-[11px] text-muted-foreground">{int(ev.count)}</span>
                </button>
              ))}
            {evaluatedStatusOps
              .filter(({ ev }) => ev.count > 0)
              .map(({ op, ev }) => (
                <button
                  key={op.key}
                  type="button"
                  title={ev.title}
                  onClick={() => void op.run(ev.eligible, selectedRows, { clearSelection })}
                  className={bulkButton}
                >
                  <span className={cn('size-[7px] rounded-full', DOT_CLASS[op.dot])} />
                  {op.label}{' '}
                  <span className="tnum font-mono text-[11px] text-muted-foreground">{int(ev.count)}</span>
                </button>
              ))}
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
                  onClick={() => void a.run(selectedRows, { clearSelection })}
                  className={cn(bulkButton, a.danger && 'text-bad-fg hover:bg-bad-bg')}
                >
                  {a.icon && <a.icon className="size-[13px]" strokeWidth={2} />}
                  {a.label}
                </button>
              ))}
            {onBulkDelete && (
              <button
                type="button"
                title={deleteEval.title || undefined}
                onClick={() => void onBulkDelete(deleteEval.eligible, selectedRows, { clearSelection })}
                className={cn(bulkButton, 'hover:bg-bad-bg hover:text-bad-fg')}
              >
                <Trash2 className="size-[13px] text-bad-fg" strokeWidth={2} />
                Delete
                {deleteEval.count < deleteEval.total && (
                  <>
                    {' '}
                    <span className="tnum font-mono text-[11px] text-muted-foreground">{deleteEval.hint}</span>
                  </>
                )}
              </button>
            )}
            <div className="flex-1" />
            <button type="button" onClick={clearSelection} className={bulkButton}>
              <X className="size-[13px]" strokeWidth={2} />
              Clear
            </button>
          </div>
        )}
      </div>

      {/* ── Table + drawer ── */}
      <div ref={gridRowRef} className="flex min-h-0 flex-1 gap-[14px] px-5 pt-[14px] pb-4">
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
            {!readOnly && (
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
            )}
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
              {!readOnly && (
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
              )}
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
        {filterPanelEnabled && filterOpen && (
          <FilterPanel
            columns={dataset.filterColumns}
            filters={filters}
            openSections={openFilterSections}
            enumCounts={enumCounts}
            columnQuery={filterColQuery}
            inline={inlineFilterPanel}
            onColumnQueryChange={setFilterColQuery}
            onToggleSection={toggleFilterSection}
            onChangeFilters={changeFilters}
            onClose={() => setFilterOpen(false)}
            onReturnFocus={focusFilterButton}
            nextId={nextFilterId}
          />
        )}
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

      {bulkEdit && (
        <BulkEditDialog
          open={bulkEditOpen}
          onClose={() => setBulkEditOpen(false)}
          noun={dataset.noun}
          nounPlural={dataset.nounPlural}
          rows={selectedRows}
          config={bulkEdit}
          clearSelection={clearSelection}
        />
      )}
    </section>
  )
}
