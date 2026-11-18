import {
  Bookmark,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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
  Rows3,
  Rows4,
  Search,
  SlidersVertical,
  SquareCheckBig,
  X,
} from 'lucide-react'
import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { toast } from 'sonner'
import { StatusPill } from '@/components/StatusPill'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { int, money } from '@/lib/format'
import { isTypingTarget } from '@/lib/keyboard'
import { cn } from '@/lib/utils'
import { CellEditor } from './CellEditor'
import { FilterChips } from './FilterChips'
import {
  type Dataset,
  type GridColumn,
  type GridFilter,
  type SortSpec,
  applyPipeline,
  defaultFilter,
  paginate,
  sumColumn,
  toCsv,
  toggleSort,
} from './model'

const SELECT_WIDTH = 42

export interface GridAction<T> {
  label: string
  icon?: LucideIcon
  /** Shown in red with a separator above. */
  danger?: boolean
  disabled?: (row: T) => boolean
  onSelect: (row: T) => void
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

  const columns = useMemo(() => {
    const visible = dataset.columns.filter((c) => !hidden.has(c.key))
    return [
      ...visible.filter((c) => c.frozen === 'left'),
      ...visible.filter((c) => c.frozen !== 'left' && c.frozen !== 'right'),
      ...visible.filter((c) => c.frozen === 'right'),
    ]
  }, [dataset.columns, hidden])

  const filtered = useMemo(
    () => applyPipeline({ rows: rows ?? [], dataset, search, filters, sorts }),
    [rows, dataset, search, filters, sorts],
  )
  const slice = useMemo(() => paginate(filtered, page, pageSize), [filtered, page, pageSize])
  const pageIds = useMemo(() => slice.rows.map(dataset.idOf), [slice.rows, dataset])
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

  const applyView = (id: string) => {
    const view = dataset.views.find((v) => v.id === id)
    if (!view) return
    setViewId(id)
    changeFilters(view.filters.map((f) => ({ ...f, id: nextFilterId() })))
    if (view.sorts) setSorts(view.sorts)
  }

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
    const list = filtered.filter((r) => selected.has(dataset.idOf(r)))
    download(`${dataset.id}-selected.csv`, toCsv(list, dataset, columns))
  }

  const copySelected = async () => {
    const list = filtered.filter((r) => selected.has(dataset.idOf(r)))
    const text = list.map((r) => columns.map((c) => dataset.text(r, c.key)).join('\t')).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      toast('Copied', { description: `${int(list.length)} ${list.length === 1 ? 'row' : 'rows'} copied to the clipboard.` })
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
    const ids = filtered.map(dataset.idOf)
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
      if (activeId) onActiveChange(null)
      else if (selected.size) setSelected(new Set())
    }
  }

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
  const lastFrozen = [...columns].reverse().find((c) => c.frozen === 'left')?.key
  const hasFrozen = !!lastFrozen

  const frozenStyle = (c: GridColumn) =>
    c.frozen === 'left' ? { left: leftOffsets.get(c.key), width: c.width } : { width: c.width }
  const frozenClass = (c: GridColumn, base: string) =>
    cn(
      c.frozen === 'left' && 'sticky',
      c.frozen === 'left' && base,
      c.key === lastFrozen && 'border-r border-border',
      c.key === lastFrozen && scrolledX && 'shadow-[7px_0_8px_-7px_rgba(0,0,0,.4)]',
    )

  const rangeLabel =
    slice.total === 0
      ? `No ${dataset.nounPlural}`
      : `Showing ${int(slice.page * pageSize + 1)}–${int(slice.page * pageSize + slice.rows.length)} of ${int(slice.total)} ${slice.total === 1 ? dataset.noun : dataset.nounPlural}`
  const activeView = dataset.views.find((v) => v.id === viewId)
  const rowActions = (row: T) => actions.filter((a) => !a.disabled?.(row))

  return (
    <section
      data-screen-label={dataset.nounPlural}
      className="flex min-h-0 min-w-0 flex-1 animate-sf-fade flex-col"
    >
      {/* ── Toolbar ── */}
      <div className="relative z-20 flex-none border-b border-border bg-panel">
        <div className="flex flex-wrap items-center gap-2 px-5 py-[11px]">
          {dataset.views.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={toolButton} title="Saved views">
                  <Bookmark className="size-[13px] text-muted-foreground" strokeWidth={2} />
                  {activeView?.name ?? 'Views'}
                  <ChevronDown className="size-[11px] opacity-70" strokeWidth={2} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[212px] rounded-[10px] p-1.5">
                <DropdownMenuLabel className="px-2 pt-[5px] pb-1.5 text-[10.5px] font-semibold tracking-[0.06em] text-muted-foreground">
                  VIEWS
                </DropdownMenuLabel>
                {dataset.views.map((view) => (
                  <DropdownMenuItem key={view.id} className="gap-[9px] text-[12.5px]" onSelect={() => applyView(view.id)}>
                    <span className="flex-1">{view.name}</span>
                    {view.id === viewId && <Check className="size-[13px] text-primary" strokeWidth={2.6} />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

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
                {dataset.columns.map((column) => {
                  const on = !hidden.has(column.key)
                  return (
                    <button
                      key={column.key}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() =>
                        setHidden((prev) => {
                          const next = new Set(prev)
                          if (on) next.add(column.key)
                          else next.delete(column.key)
                          return next
                        })
                      }
                      className="flex w-full items-center gap-[9px] rounded-[7px] border-0 bg-transparent px-[9px] py-[6px] text-left text-[12.5px] text-foreground transition-colors duration-[140ms] hover:bg-tint-10"
                    >
                      <CheckBox state={on ? 'on' : 'off'} />
                      <span className="flex-1">{column.label}</span>
                    </button>
                  )
                })}
              </PopoverContent>
            </Popover>
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

        {selected.size > 0 && (
          <div className="flex animate-sf-fade items-center gap-2 border border-[color-mix(in_oklab,var(--primary)_35%,transparent)] bg-[color-mix(in_oklab,var(--primary)_12%,var(--card))] px-5 py-[9px]">
            <span className="tnum text-[12.5px] font-semibold text-foreground">{int(selected.size)} selected</span>
            <div className="h-[18px] w-px bg-[color-mix(in_oklab,var(--primary)_35%,transparent)]" />
            <button type="button" onClick={copySelected} title="Copy rows" className={bulkButton}>
              <Copy className="size-[13px] text-muted-foreground" strokeWidth={2} />
              Copy
            </button>
            <button type="button" onClick={exportSelected} title="Export selected rows as CSV" className={bulkButton}>
              <Download className="size-[13px] text-muted-foreground" strokeWidth={2} />
              Export
            </button>
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
          onScroll={(e) => setScrolledX(e.currentTarget.scrollLeft > 0)}
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
            {columns.map((c) => {
              const sortIndex = sorts.findIndex((s) => s.key === c.key)
              return (
                <div
                  key={c.key}
                  role="columnheader"
                  aria-sort={sortIndex < 0 ? 'none' : sorts[sortIndex].dir === 'asc' ? 'ascending' : 'descending'}
                  style={frozenStyle(c)}
                  className={cn(
                    'flex h-full flex-none items-center gap-0.5 bg-panel pr-1.5 pl-3 transition-shadow duration-[160ms]',
                    c.frozen === 'left' ? 'z-[7]' : 'z-[1]',
                    frozenClass(c, ''),
                  )}
                >
                  <button
                    type="button"
                    disabled={!c.sortable}
                    onClick={(e) => changeSort(c.key, e.shiftKey)}
                    title={c.sortable ? 'Sort (Shift-click to add a column)' : undefined}
                    className={cn(
                      'flex h-full min-w-0 flex-1 items-center gap-1 border-0 bg-transparent p-0 select-none disabled:cursor-default',
                      c.align === 'right' ? 'justify-end' : 'justify-start',
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
                  </button>
                </div>
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
            slice.rows.map((row, rowIndex) => {
              const id = dataset.idOf(row)
              const isActive = id === activeId
              const checked = selected.has(id)
              const menu = rowActions(row)
              const rowEl = (
                <div
                  role="row"
                  aria-rowindex={slice.page * pageSize + rowIndex + 2}
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
                    isActive ? 'bg-row-sel' : 'bg-card hover:bg-row-hover',
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
                          c.frozen === 'left' ? 'z-[2] bg-inherit' : 'z-[1]',
                          negative && 'bg-bad-bg',
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
            })}

          {!isLoading && !error && slice.total === 0 && (
            <div className="px-5 py-14 text-center text-[13px] text-muted-foreground">
              {(rows ?? []).length === 0
                ? (emptyText ?? `No ${dataset.nounPlural} yet.`)
                : `No ${dataset.nounPlural} match the current search and filters.`}
            </div>
          )}

          {/* totals */}
          {showTotals && !isLoading && !error && slice.total > 0 && (
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
              {columns.map((c) => (
                <div
                  key={c.key}
                  style={frozenStyle(c)}
                  className={cn(
                    'flex flex-none items-center px-3 py-2',
                    c.align === 'right' ? 'justify-end' : 'justify-start',
                    c.frozen === 'left' ? 'z-[6] bg-panel' : 'z-[1]',
                    frozenClass(c, ''),
                  )}
                >
                  <span className={cn('truncate text-xs font-semibold text-foreground', c.type === 'num' && 'tnum')}>
                    {c.agg === 'sum'
                      ? c.aggFmt === 'money'
                        ? money(sumColumn(filtered, dataset, c.key))
                        : int(sumColumn(filtered, dataset, c.key))
                      : ''}
                  </span>
                </div>
              ))}
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
