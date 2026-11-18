/**
 * THE LINE GRID — the lines table inside every document (purchase order lines,
 * receipt lines, BOM components, assembly order lines…).
 *
 * The grid owns selection, view-only sorting, column resizing (remembered per
 * browser), drag-to-reorder, ↑/↓ between the same input on neighbouring lines,
 * the right-click / ⋯ menu (duplicate, insert above/below, remove), the
 * "Add line" row and the line numbers. A document supplies its columns and
 * turns individual features off where they don't apply.
 *
 * Mutations on a locked document go through `guard`: the action is attempted
 * and explained (the guard shows why), never silently hidden.
 */
import { GripVertical, Plus } from 'lucide-react'
import {
  type DragEvent,
  Fragment,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { toast } from 'sonner'
import { useUi } from '@/app/stores/ui'
import { moveLines } from '@/lib/arrays'
import { cn } from '@/lib/utils'

export interface LineColumn<T> {
  key: string
  label: string
  align: 'left' | 'right'
  /** Default width in px (users can resize when `resize` is on). */
  width: number
  /** Value for view-only sorting. Omit and the column can't be sorted. */
  sortValue?: (line: T) => string | number
  cell: (line: T, index: number) => ReactNode
  /** Cell padding; defaults suit text (left) and figures/inputs (right). */
  cellClassName?: string
}

export interface LineGridFeatures {
  select: boolean
  sort: boolean
  resize: boolean
  reorder: boolean
  rowMenu: boolean
  lineNumbers: boolean
  addLine: boolean
}

export interface AddLineContext<T> {
  /** Where the new line goes (index in stored order). */
  at: number
  insert: (line: T) => void
  close: () => void
}

export interface LineSubRow {
  key: string
  cells: Partial<Record<string, ReactNode>>
}

export interface LineGridProps<T> {
  /** Persisted column widths are stored under this id. */
  gridId: string
  title: string
  lines: readonly T[]
  columns: LineColumn<T>[]
  /** Replace the lines. Omit for a read-only grid. */
  onChange?: (lines: T[]) => void
  /** Switch standard features off for this document. All on by default (when editable). */
  features?: Partial<LineGridFeatures>
  /** Return true to block a mutation (and explain why, e.g. with a toast). */
  guard?: () => boolean
  /** Buttons on the right of the title bar (beside the selection actions). */
  headerActions?: ReactNode
  /** A banner under the title bar (e.g. unpriced lines). */
  banner?: ReactNode
  /** Tint a row that has a problem. */
  rowHasIssue?: (line: T, index: number) => boolean
  /** The inline "add line" row contents (item search…). Needed for `addLine`. */
  renderAddLine?: (ctx: AddLineContext<T>) => ReactNode
  /** Singular/plural noun for the header count, e.g. `['component', 'components']`. */
  lineNoun?: [string, string]
  /** Label for the inline add-row trigger. Default: "Add line". */
  addLabel?: string
  /** Optional nested read-only child rows displayed under a line, aligned to `columns`. */
  subRows?: (line: T, index: number) => readonly LineSubRow[]
  emptyText?: string
  /** Minimum table width before it scrolls sideways. */
  minWidth?: number
}

interface Menu {
  x: number
  y: number
  ids: number[]
}

const ALL_ON: LineGridFeatures = {
  select: true,
  sort: true,
  resize: true,
  reorder: true,
  rowMenu: true,
  lineNumbers: true,
  addLine: true,
}
const ALL_OFF: LineGridFeatures = {
  select: false,
  sort: false,
  resize: false,
  reorder: false,
  rowMenu: false,
  lineNumbers: false,
  addLine: false,
}

const smallButton = 'hover-lift h-7 rounded-[7px] border border-border bg-card px-[11px] text-xs font-semibold hover:bg-tint-12'
const menuItem =
  'block w-full rounded-md border-0 bg-transparent px-[10px] py-2 text-left text-[12.5px] transition-colors duration-[140ms] hover:bg-tint-12 focus-visible:bg-tint-12 focus-visible:outline-none'

export function LineGrid<T>({
  gridId,
  title,
  lines,
  columns,
  onChange,
  features,
  guard = () => false,
  headerActions,
  banner,
  rowHasIssue,
  renderAddLine,
  lineNoun = ['line', 'lines'],
  addLabel = 'Add line',
  subRows,
  emptyText = 'No lines yet.',
  minWidth,
}: LineGridProps<T>) {
  const f: LineGridFeatures = { ...(onChange ? ALL_ON : ALL_OFF), ...(onChange ? features : {}) }
  if (!renderAddLine) f.addLine = false

  const storedWidths = useUi((s) => s.columnWidths[gridId])
  const setColumnWidths = useUi((s) => s.setColumnWidths)
  const widthOf = (c: LineColumn<T>) => storedWidths?.[c.key] ?? c.width

  const [selected, setSelected] = useState<number[]>([])
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null)
  const [addAt, setAddAt] = useState<number | null>(null)
  const [menu, setMenu] = useState<Menu | null>(null)
  const [dragIds, setDragIds] = useState<number[] | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const canReorder = f.reorder && !sort

  const change = (next: T[]) => onChange?.(next)

  // ── view order (sorting never changes the stored order) ─────────────────────
  const order = useMemo(() => {
    const indices = lines.map((_, i) => i)
    const column = sort ? columns.find((c) => c.key === sort.key) : undefined
    if (!sort || !column?.sortValue) return indices
    const value = column.sortValue
    const dir = sort.dir === 'desc' ? -1 : 1
    return indices.sort((a, b) => {
      const va = value(lines[a])
      const vb = value(lines[b])
      if (va < vb) return -1 * dir
      if (va > vb) return 1 * dir
      return a - b
    })
  }, [lines, sort, columns])

  const toggleSort = (key: string) =>
    setSort((cur) => (cur?.key !== key ? { key, dir: 'asc' } : cur.dir === 'asc' ? { key, dir: 'desc' } : null))

  const startResize = (column: LineColumn<T>, e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startWidth = widthOf(column)
    let latest: Record<string, number> = { ...storedWidths }
    const onMove = (ev: globalThis.MouseEvent) => {
      latest = { ...latest, [column.key]: Math.max(50, startWidth + (ev.clientX - startX)) }
      setColumnWidths(gridId, latest)
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ── mutations ───────────────────────────────────────────────────────────────
  const duplicate = (ids: number[]) => {
    if (guard() || !ids.length) return
    const set = new Set(ids)
    change(lines.flatMap((l, i) => (set.has(i) ? [l, structuredClone(l)] : [l])))
    setSelected([])
  }
  const remove = (ids: number[]) => {
    if (guard() || !ids.length) return
    const set = new Set(ids)
    change(lines.filter((_, i) => !set.has(i)))
    setSelected([])
  }
  const startAdd = (at: number) => {
    if (guard()) return
    setAddAt(at)
    setMenu(null)
  }
  const closeAdd = () => setAddAt(null)
  const insert = (line: T) => {
    if (guard()) return closeAdd()
    const next = [...lines]
    next.splice(addAt ?? lines.length, 0, line)
    change(next)
    closeAdd()
  }

  const openMenu = (index: number, x: number, y: number) => {
    if (!f.rowMenu) return
    const whole = selected.includes(index) && selected.length > 1
    if (!whole) setSelected([index])
    setMenu({ x, y, ids: whole ? selected : [index] })
  }
  useEffect(() => {
    if (menu) menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
  }, [menu])

  // Esc closes the menu first, then the add-line row.
  useEffect(() => {
    if (!menu && addAt == null) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      if (menu) setMenu(null)
      else closeAdd()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [menu, addAt])

  // ── drag to reorder ─────────────────────────────────────────────────────────
  const onDragStart = (index: number, e: DragEvent) => {
    if (guard()) return e.preventDefault()
    const ids = selected.includes(index) && selected.length > 1 ? selected : [index]
    window.setTimeout(() => setDragIds(ids), 0)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
    const row = (e.target as HTMLElement).closest('tr')
    if (row) e.dataTransfer.setDragImage(row, 20, 20)
  }
  const onDrop = (target: number, e: DragEvent) => {
    e.preventDefault()
    const ids = dragIds
    setDragIds(null)
    setDragOver(null)
    if (!ids?.length || guard()) return
    change(moveLines(lines, ids, target))
    setSelected([])
  }

  /** ↑ / ↓ in an input marked `data-col` moves to the same input on the neighbouring line. */
  const onBodyKeyDown = (e: KeyboardEvent<HTMLTableSectionElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    const input = e.target as HTMLElement
    const col = input.dataset?.col
    if (!col) return
    let sibling = e.key === 'ArrowUp' ? input.closest('tr')?.previousElementSibling : input.closest('tr')?.nextElementSibling
    while (sibling && !sibling.querySelector(`[data-col="${col}"]`)) {
      sibling = e.key === 'ArrowUp' ? sibling.previousElementSibling : sibling.nextElementSibling
    }
    const next = sibling?.querySelector<HTMLInputElement>(`[data-col="${col}"]`)
    if (next) {
      e.preventDefault()
      next.focus()
      next.select?.()
    }
  }

  const allChecked = lines.length > 0 && selected.length === lines.length
  const colSpan = columns.length + (f.reorder ? 1 : 0) + (f.select ? 1 : 0) + (f.lineNumbers ? 1 : 0) + (f.rowMenu ? 1 : 0)

  const rows = order.map((index) => {
    const line = lines[index]
    const isSelected = selected.includes(index)
    const issue = rowHasIssue?.(line, index) ?? false
    const children = subRows?.(line, index) ?? []
    return (
      <Fragment key={index}>
        <tr
          data-line-index={index}
          onContextMenu={
            f.rowMenu
              ? (e) => {
                  e.preventDefault()
                  openMenu(index, e.clientX, e.clientY)
                }
              : undefined
          }
          onDragOver={
            f.reorder
              ? (e) => {
                  e.preventDefault()
                  if (dragIds?.length && dragOver !== index) setDragOver(index)
                }
              : undefined
          }
          onDrop={f.reorder ? (e) => onDrop(index, e) : undefined}
          className={cn(
            'border-t transition-colors duration-[160ms]',
            dragOver === index ? 'border-t-2 border-primary' : 'border-border',
            isSelected
              ? 'bg-[color-mix(in_oklab,var(--primary)_8%,transparent)]'
              : issue
                ? 'bg-[color-mix(in_oklab,var(--bad-fg)_5%,transparent)]'
                : 'bg-transparent',
          )}
        >
          {f.reorder && (
            <td
              draggable={canReorder}
              onDragStart={(e) => onDragStart(index, e)}
              onDragEnd={() => {
                setDragIds(null)
                setDragOver(null)
              }}
              onClick={() => {
                if (canReorder) return
                setSort(null)
                toast('Sort cleared', { description: 'Lines are back in order — drag to reorder.' })
              }}
              title={canReorder ? 'Drag to reorder' : 'Sorted view — click to clear the sort and reorder'}
              className={cn('px-1 py-[9px] text-center text-muted-foreground', canReorder ? 'cursor-grab' : 'cursor-pointer opacity-40')}
            >
              <GripVertical className="mx-auto size-[14px]" strokeWidth={2} />
            </td>
          )}
          {f.select && (
            <td className="px-1 py-[9px] text-center">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => setSelected((cur) => (cur.includes(index) ? cur.filter((i) => i !== index) : [...cur, index]))}
                aria-label={`Select line ${index + 1}`}
                className="size-[14px] cursor-pointer accent-primary"
              />
            </td>
          )}
          {f.lineNumbers && (
            <td className="tnum px-1.5 pt-[13px] pb-[9px] text-right align-top text-xs text-muted-foreground">{index + 1}</td>
          )}
          {columns.map((c) => (
            <td key={c.key} className={c.cellClassName ?? (c.align === 'right' ? 'px-[10px] py-[9px]' : 'px-4 py-[9px]')}>
              {c.cell(line, index)}
            </td>
          ))}
          {f.rowMenu && (
            <td className="px-2 py-[9px] text-center">
              <button
                type="button"
                title="More actions"
                aria-label={`More actions for line ${index + 1}`}
                aria-haspopup="menu"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  openMenu(index, rect.right - 4, rect.bottom)
                }}
                className="inline-flex size-[26px] items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground transition-colors duration-[140ms] hover:bg-tint-12 hover:text-foreground"
              >
                ⋯
              </button>
            </td>
          )}
        </tr>
        {children.map((sub) => (
          <tr key={sub.key} className="border-t border-dashed border-border bg-[color-mix(in_oklab,var(--foreground)_3%,transparent)]">
            {f.reorder && <td />}
            {f.select && <td />}
            {f.lineNumbers && <td />}
            {columns.map((c) => (
              <td key={c.key} className={c.cellClassName ?? (c.align === 'right' ? 'px-[10px] py-[9px]' : 'px-4 py-[9px]')}>
                {sub.cells[c.key] ?? null}
              </td>
            ))}
            {f.rowMenu && <td />}
          </tr>
        ))}
      </Fragment>
    )
  })
  if (f.addLine && addAt != null && renderAddLine) {
    rows.splice(
      Math.min(addAt, rows.length),
      0,
      <tr key="add-line" className="border-t border-border bg-[color-mix(in_oklab,var(--primary)_6%,transparent)]">
        <td colSpan={colSpan} className="px-3 py-2">
          {renderAddLine({ at: addAt, insert, close: closeAdd })}
        </td>
      </tr>,
    )
  }

  return (
    <div className="relative flex-shrink-0 overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-[13px]">
        <div className="text-[13px] font-semibold">
          {title}{' '}
          <span className="font-medium text-muted-foreground">
            · {lines.length} {lines.length === 1 ? lineNoun[0] : lineNoun[1]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {f.select && selected.length > 0 && (
            <>
              <span className="text-xs text-muted-foreground">
                {selected.length} {selected.length === 1 ? 'line selected' : 'lines selected'}
              </span>
              {f.rowMenu && (
                <button type="button" onClick={() => duplicate(selected)} className={cn(smallButton, 'text-foreground')}>
                  Duplicate
                </button>
              )}
              <button type="button" onClick={() => remove(selected)} className={cn(smallButton, 'text-bad-fg hover:bg-bad-bg')}>
                Remove
              </button>
            </>
          )}
          {headerActions}
        </div>
      </div>

      {banner}

      {lines.length === 0 && !f.addLine ? (
        <div className="px-4 py-8 text-center text-[13px] text-muted-foreground">{emptyText}</div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full table-fixed border-collapse" style={minWidth ? { minWidth } : undefined}>
            <thead>
              <tr className="text-left text-[11px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                {f.reorder && <th className="w-[26px] px-1 py-[9px]" />}
                {f.select && (
                  <th className="w-[30px] px-1 py-[9px] text-center">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={() => setSelected(allChecked ? [] : lines.map((_, i) => i))}
                      aria-label="Select all lines"
                      className="size-[14px] cursor-pointer accent-primary"
                    />
                  </th>
                )}
                {f.lineNumbers && (
                  <th title="Line number" className="w-10 px-1 py-[9px] text-right font-semibold">
                    #
                  </th>
                )}
                {columns.map((c) => {
                  const sortable = f.sort && !!c.sortValue
                  return (
                    <th
                      key={c.key}
                      onClick={sortable ? () => toggleSort(c.key) : undefined}
                      aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                      style={{ width: widthOf(c) }}
                      className={cn(
                        'relative py-[9px] font-semibold select-none',
                        sortable && 'cursor-pointer',
                        c.align === 'right' ? 'px-[10px] text-right' : 'px-4 text-left',
                      )}
                    >
                      {c.label}
                      {sort?.key === c.key ? (sort.dir === 'desc' ? ' ↓' : ' ↑') : ''}
                      {f.resize && (
                        <span
                          onMouseDown={(e) => startResize(c, e)}
                          onClick={(e) => e.stopPropagation()}
                          aria-hidden="true"
                          className="absolute top-0 right-0 bottom-0 w-1.5 cursor-col-resize transition-colors duration-[140ms] hover:bg-[color-mix(in_oklab,var(--primary)_55%,transparent)]"
                        />
                      )}
                    </th>
                  )
                })}
                {f.rowMenu && <th className="w-[34px] px-2 py-[9px]" />}
              </tr>
            </thead>
            <tbody onKeyDown={onBodyKeyDown}>
              {rows}
              {f.addLine && addAt == null && (
                <tr
                  onClick={() => startAdd(lines.length)}
                  className="cursor-pointer border-t border-dashed border-border transition-colors duration-[140ms] hover:bg-tint-7"
                >
                  <td colSpan={colSpan} className="px-4 py-[10px] text-[12.5px] text-muted-foreground">
                    <button type="button" className="inline-flex items-center gap-1.5 border-0 bg-transparent p-0 text-inherit">
                      <Plus className="size-[14px]" strokeWidth={2} />
                      {addLabel}
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {menu && (
        <div
          className="fixed inset-0 z-[60]"
          onClick={() => setMenu(null)}
          onContextMenu={(e) => {
            e.preventDefault()
            setMenu(null)
          }}
        >
          <div
            ref={menuRef}
            role="menu"
            onClick={(e) => e.stopPropagation()}
            style={{ left: Math.min(menu.x, window.innerWidth - 200), top: Math.min(menu.y, window.innerHeight - 170) }}
            className="fixed min-w-[180px] animate-sf-pop overflow-hidden rounded-[10px] border border-border bg-card p-1 shadow-pop"
          >
            <button
              type="button"
              role="menuitem"
              className={cn(menuItem, 'text-foreground')}
              onClick={() => {
                duplicate(menu.ids)
                setMenu(null)
              }}
            >
              Duplicate {menu.ids.length > 1 ? menu.ids.length + ' lines' : 'line'}
            </button>
            {f.addLine && canReorder && menu.ids.length === 1 && (
              <>
                <button type="button" role="menuitem" className={cn(menuItem, 'text-foreground')} onClick={() => startAdd(Math.min(...menu.ids))}>
                  Insert line above
                </button>
                <button type="button" role="menuitem" className={cn(menuItem, 'text-foreground')} onClick={() => startAdd(Math.max(...menu.ids) + 1)}>
                  Insert line below
                </button>
              </>
            )}
            <div className="mx-0.5 my-1 h-px bg-border" />
            <button
              type="button"
              role="menuitem"
              className={cn(menuItem, 'text-bad-fg hover:bg-bad-bg focus-visible:bg-bad-bg')}
              onClick={() => {
                remove(menu.ids)
                setMenu(null)
              }}
            >
              Remove {menu.ids.length > 1 ? menu.ids.length + ' lines' : 'line'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

