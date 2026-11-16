import { CircleAlert, GripVertical, Lock, Plus, Search, TriangleAlert, X } from 'lucide-react'
import { type DragEvent, type KeyboardEvent, type MouseEvent, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useUi } from '@/app/stores/ui'
import type { Item, PurchaseOrder, PurchaseOrderLine } from '@/data/schemas'
import { poEditable, poLineTotal } from '@/domain/purchase-order'
import {
  type PricingContext,
  lineIssue,
  lockedActionMessage,
  moveLines,
  newOrderLine,
  priceLine,
} from '@/domain/purchase-order-editing'
import { resolvePrice, vendorPricedItems } from '@/domain/purchase-prices'
import { int, money } from '@/lib/format'
import { cn } from '@/lib/utils'

type ColKey = 'item' | 'desc' | 'uom' | 'qty' | 'unitCost' | 'total'

const COLUMNS: { key: ColKey; label: string; align: 'left' | 'right' }[] = [
  { key: 'item', label: 'Item', align: 'left' },
  { key: 'desc', label: 'Description', align: 'left' },
  { key: 'uom', label: 'UoM', align: 'left' },
  { key: 'qty', label: 'Qty', align: 'right' },
  { key: 'unitCost', label: 'Unit cost', align: 'right' },
  { key: 'total', label: 'Line total', align: 'right' },
]
const DEFAULT_WIDTHS: Record<ColKey, number> = { item: 150, desc: 300, uom: 70, qty: 110, unitCost: 140, total: 140 }
const GRID_ID = 'purchase-order-lines'

const smallButton =
  'hover-lift h-7 rounded-[7px] border border-border bg-card px-[11px] text-xs font-semibold hover:bg-tint-12'
const numberInput =
  'h-8 w-full rounded-[7px] border bg-transparent px-2 text-right text-[13px] text-foreground outline-none tnum focus:border-ring'

export interface PurchaseOrderLinesProps {
  draft: PurchaseOrder
  vendorName: string
  items: readonly Item[]
  pricing: PricingContext
  today: string
  /** Replace the draft's lines (also clears the page error). */
  onLinesChange: (lines: PurchaseOrderLine[]) => void
  onOpenPrices: () => void
}

interface Menu {
  x: number
  y: number
  ids: number[]
}

/**
 * The line-items grid of the purchase order document: select, sort (view only),
 * resize, drag to reorder, keyboard ↑/↓ between cells, right-click menu, and an
 * inline item search to add lines. Every mutating action on a locked order is
 * attempted and explained with a toast, never silently hidden.
 */
export function PurchaseOrderLines({
  draft,
  vendorName,
  items,
  pricing,
  today,
  onLinesChange,
  onOpenPrices,
}: PurchaseOrderLinesProps) {
  const storedWidths = useUi((s) => s.columnWidths[GRID_ID])
  const setColumnWidths = useUi((s) => s.setColumnWidths)
  const widths = { ...DEFAULT_WIDTHS, ...storedWidths } as Record<ColKey, number>

  const [selected, setSelected] = useState<number[]>([])
  const [sort, setSort] = useState<{ key: ColKey; dir: 'asc' | 'desc' } | null>(null)
  const [insertAt, setInsertAt] = useState<number | null>(null)
  const [insertQuery, setInsertQuery] = useState('')
  const [menu, setMenu] = useState<Menu | null>(null)
  const [dragIds, setDragIds] = useState<number[] | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const lines = draft.lines
  const isDraft = draft.status === 'Draft'
  const lockCost = pricing.settings.purchasing.lockCostToPriceList
  const canReorder = !sort

  /** Mutating actions on a locked order explain themselves instead of doing nothing. */
  const guardLocked = (): boolean => {
    if (poEditable(draft)) return false
    toast('Locked', { description: lockedActionMessage(draft) })
    return true
  }

  // ── view order (sorting never changes the stored order) ─────────────────────
  const order = useMemo(() => {
    const indices = lines.map((_, i) => i)
    if (!sort) return indices
    const dir = sort.dir === 'desc' ? -1 : 1
    const value = (l: PurchaseOrderLine) =>
      sort.key === 'total'
        ? poLineTotal(l)
        : sort.key === 'qty' || sort.key === 'unitCost'
          ? Number(l[sort.key]) || 0
          : l[sort.key] || ''
    return indices.sort((a, b) => {
      const va = value(lines[a])
      const vb = value(lines[b])
      if (va < vb) return -1 * dir
      if (va > vb) return 1 * dir
      return a - b
    })
  }, [lines, sort])

  const toggleSort = (key: ColKey) =>
    setSort((cur) => (cur?.key !== key ? { key, dir: 'asc' } : cur.dir === 'asc' ? { key, dir: 'desc' } : null))

  const startResize = (key: ColKey, e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startWidth = widths[key]
    let latest = widths
    const onMove = (ev: globalThis.MouseEvent) => {
      latest = { ...latest, [key]: Math.max(50, startWidth + (ev.clientX - startX)) }
      setColumnWidths(GRID_ID, latest)
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ── line mutations ──────────────────────────────────────────────────────────
  const setLine = (index: number, field: 'qty' | 'unitCost', raw: string | number) => {
    if (guardLocked()) return
    const value = Math.max(0, Number.parseFloat(String(raw)) || 0)
    if (field === 'unitCost' && lockCost) return
    onLinesChange(
      lines.map((l, i) =>
        i !== index ? l : field === 'qty' ? priceLine({ ...l, qty: value }, draft, pricing) : { ...l, unitCost: value },
      ),
    )
  }

  const duplicate = (ids: number[]) => {
    if (guardLocked() || !ids.length) return
    const set = new Set(ids)
    onLinesChange(lines.flatMap((l, i) => (set.has(i) ? [l, { ...l }] : [l])))
    setSelected([])
  }

  const remove = (ids: number[]) => {
    if (guardLocked() || !ids.length) return
    const set = new Set(ids)
    onLinesChange(lines.filter((_, i) => !set.has(i)))
    setSelected([])
  }

  const startInsert = (at: number) => {
    if (guardLocked()) return
    setInsertAt(at)
    setInsertQuery('')
    setMenu(null)
  }
  const cancelInsert = () => {
    setInsertAt(null)
    setInsertQuery('')
  }
  const confirmInsert = (itemNo: string) => {
    if (guardLocked()) return cancelInsert()
    const item = items.find((i) => i.no === itemNo)
    if (!item) return
    const next = [...lines]
    next.splice(insertAt ?? lines.length, 0, newOrderLine(item, draft, pricing))
    onLinesChange(next)
    cancelInsert()
  }

  // ── inline item search (only items the vendor has an active price for) ──────
  const priced = useMemo(
    () => (draft.vendor ? vendorPricedItems(pricing.prices, draft.vendor, draft.orderDate || today) : new Set<string>()),
    [pricing.prices, draft.vendor, draft.orderDate, today],
  )
  const taken = new Set(lines.map((l) => l.item))
  const q = insertQuery.trim().toLowerCase()
  const insertItems =
    insertAt == null
      ? []
      : items
          .filter((it) => priced.has(it.no) && !taken.has(it.no) && (!q || (it.no + ' ' + it.desc).toLowerCase().includes(q)))
          .slice(0, 6)
  const insertMode = !draft.vendor ? 'noVendor' : !priced.size ? 'noPrices' : insertItems.length ? 'list' : 'noMatch'
  const cleanVendor = vendorName.replace(/\.$/, '')

  // ── context menu ────────────────────────────────────────────────────────────
  const openMenu = (index: number, x: number, y: number) => {
    const whole = selected.includes(index) && selected.length > 1
    if (!whole) setSelected([index])
    setMenu({ x, y, ids: whole ? selected : [index] })
  }
  useEffect(() => {
    if (menu) menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
  }, [menu])

  // Esc closes the menu first, then the item search.
  useEffect(() => {
    if (!menu && insertAt == null) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      if (menu) setMenu(null)
      else cancelInsert()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [menu, insertAt])

  // ── drag to reorder ─────────────────────────────────────────────────────────
  const onDragStart = (index: number, e: DragEvent) => {
    if (guardLocked()) return e.preventDefault()
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
    if (!ids?.length || guardLocked()) return
    onLinesChange(moveLines(lines, ids, target))
    setSelected([])
  }

  /** ↑ / ↓ in a qty or cost cell moves to the same cell on the neighbouring line. */
  const navVertical = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    const row = e.currentTarget.closest('tr')
    const col = e.currentTarget.dataset.col
    let sibling = e.key === 'ArrowUp' ? row?.previousElementSibling : row?.nextElementSibling
    while (sibling && !sibling.querySelector(`[data-col="${col}"]`)) {
      sibling = e.key === 'ArrowUp' ? sibling.previousElementSibling : sibling.nextElementSibling
    }
    const next = sibling?.querySelector<HTMLInputElement>(`[data-col="${col}"]`)
    if (next) {
      e.preventDefault()
      next.focus()
      next.select()
    }
  }

  const unpricedCount = isDraft ? lines.filter((l) => lineIssue(l, draft, pricing)?.kind === 'noPrice').length : 0
  const removeUnpriced = () => {
    if (guardLocked()) return
    const before = lines
    const kept = lines.filter((l) => lineIssue(l, draft, pricing)?.kind !== 'noPrice')
    const dropped = before.length - kept.length
    if (!dropped) return
    onLinesChange(kept)
    setSelected([])
    toast(dropped + (dropped === 1 ? ' unpriced line removed' : ' unpriced lines removed'), {
      description: draft.no,
      action: { label: 'Undo', onClick: () => onLinesChange(before) },
    })
  }

  const allChecked = lines.length > 0 && selected.length === lines.length
  const insertRow = insertAt != null && (
    <tr key="insert" className="border-t border-border bg-[color-mix(in_oklab,var(--primary)_6%,transparent)]">
      <td colSpan={10} className="px-3 py-2">
        <div className="flex items-center gap-2">
          <Search className="size-[14px] flex-none text-muted-foreground" strokeWidth={2} />
          <input
            autoFocus
            value={insertQuery}
            onChange={(e) => setInsertQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && insertItems.length) {
                e.preventDefault()
                confirmInsert(insertItems[0].no)
              }
            }}
            placeholder={
              insertMode === 'noVendor'
                ? 'Choose a vendor first'
                : `Search ${vendorName}’s priced items… (Enter adds the first, Esc cancels)`
            }
            aria-label="Search items to add"
            className="h-8 flex-1 rounded-[7px] border border-ring bg-background px-[10px] text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={cancelInsert}
            title="Cancel (Esc)"
            aria-label="Cancel adding a line"
            className="inline-flex size-7 flex-none items-center justify-center rounded-[7px] border-0 bg-transparent text-muted-foreground transition-colors duration-[140ms] hover:bg-tint-12 hover:text-foreground"
          >
            <X className="size-[14px]" strokeWidth={2} />
          </button>
        </div>
        {insertMode === 'noMatch' && (
          <div className="px-1 pt-[10px] pb-0.5 text-xs text-muted-foreground">No matching priced items.</div>
        )}
        {insertMode === 'noVendor' && (
          <div className="px-1 pt-[10px] pb-0.5 text-xs text-muted-foreground">
            Lines are priced from the vendor’s price list — pick the vendor above first.
          </div>
        )}
        {insertMode === 'noPrices' && (
          <div className="flex flex-wrap items-center gap-[10px] px-1 pt-[10px] pb-0.5 text-xs text-muted-foreground">
            <span>No prices for {cleanVendor}. Add them in Purchase Prices.</span>
            <button type="button" onClick={onOpenPrices} className={cn(smallButton, 'h-[26px] px-[10px] text-foreground')}>
              Open Purchase Prices
            </button>
          </div>
        )}
        {insertItems.map((it) => {
          const r = resolvePrice(pricing.prices, draft.vendor, it.no, 1e12, draft.orderDate || today)
          const first = r.tiers[0]
          const min = Number(first?.minQty) || 1
          const tierText =
            (min > 1 ? 'min ' + int(min) : '') + (r.tiers.length > 1 ? (min > 1 ? ' · ' : '') + r.tiers.length + ' tiers' : '')
          return (
            <button
              key={it.no}
              type="button"
              onClick={() => confirmInsert(it.no)}
              className="mt-1 flex w-full items-center gap-3 rounded-[7px] border-0 bg-transparent px-[10px] py-[7px] text-left text-foreground transition-colors duration-[140ms] hover:bg-tint-10"
            >
              <span className="w-[110px] flex-none font-mono text-xs font-medium">{it.no}</span>
              <span className="min-w-0 flex-1 truncate text-[12.5px]">{it.desc}</span>
              <span className="flex-none text-[11.5px] text-muted-foreground">{it.uom || 'NOS'}</span>
              <span className="tnum flex-none text-[11.5px] text-muted-foreground">{tierText}</span>
              <span className="tnum flex-none text-xs font-medium">{money(Number(first?.price) || 0)}</span>
            </button>
          )
        })}
      </td>
    </tr>
  )

  const bodyRows = order.map((index) => {
    const line = lines[index]
    const issue = isDraft ? lineIssue(line, draft, pricing) : null
    const resolved = isDraft && draft.vendor ? resolvePrice(pricing.prices, draft.vendor, line.item, line.qty, draft.orderDate) : null
    const costHint =
      resolved?.status === 'ok' && lockCost
        ? ((Number(resolved.row.minQty) || 1) > 1 ? 'Tier from ' + int(Number(resolved.row.minQty)) : 'Base price') +
          (resolved.next ? ' · ' + money(Number(resolved.next.price) || 0) + ' each from ' + int(Number(resolved.next.minQty) || 1) : '')
        : ''
    const current =
      !isDraft && draft.status !== 'Cancelled' && draft.vendor
        ? resolvePrice(pricing.prices, draft.vendor, line.item, line.qty, today)
        : null
    const drift = current?.status === 'ok' && Math.abs(current.price - (Number(line.unitCost) || 0)) > 0.005
    const isSelected = selected.includes(index)
    const costEditable = isDraft && !lockCost

    return (
      <tr
        key={index}
        onContextMenu={(e) => {
          e.preventDefault()
          openMenu(index, e.clientX, e.clientY)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          if (dragIds?.length && dragOver !== index) setDragOver(index)
        }}
        onDrop={(e) => onDrop(index, e)}
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
          className={cn(
            'px-1 py-[9px] text-center text-muted-foreground',
            canReorder ? 'cursor-grab' : 'cursor-pointer opacity-40',
          )}
        >
          <GripVertical className="mx-auto size-[14px]" strokeWidth={2} />
        </td>
        <td className="px-1 py-[9px] text-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => setSelected((cur) => (cur.includes(index) ? cur.filter((i) => i !== index) : [...cur, index]))}
            aria-label={`Select line ${index + 1}`}
            className="size-[14px] cursor-pointer accent-primary"
          />
        </td>
        <td className="tnum px-1.5 pt-[13px] pb-[9px] text-right align-top text-xs text-muted-foreground">{index + 1}</td>
        <td className="px-4 py-[9px]">
          <div className="font-mono text-xs font-medium">{line.item}</div>
        </td>
        <td className="px-4 py-[9px]">
          <div className="mt-px text-[12.5px] leading-[1.4] text-pretty text-muted-foreground">{line.desc}</div>
          {costHint && <div className="tnum mt-1 text-[11.5px] text-muted-foreground">{costHint}</div>}
          {drift && current?.status === 'ok' && (
            <span
              title="Cost ≠ current price. This order keeps its saved cost."
              className="tnum mt-[5px] inline-flex h-5 items-center gap-1 rounded-full bg-warn-bg px-2 text-[11px] font-semibold whitespace-nowrap text-warn-fg"
            >
              <TriangleAlert className="size-[11px]" strokeWidth={2.2} />
              Cost ≠ current price · now {money(current.price)}
            </span>
          )}
          {issue && (
            <div role="alert" className="mt-[5px] flex animate-sf-slide flex-wrap items-center gap-1.5 text-xs font-medium text-bad-fg">
              <CircleAlert className="size-[13px] flex-none" strokeWidth={2} />
              <span>{issue.text}</span>
              {issue.kind === 'belowMoq' && (
                <button
                  type="button"
                  onClick={() => setLine(index, 'qty', issue.min)}
                  className="h-[22px] rounded-md border border-current bg-transparent px-2 text-[11.5px] font-semibold text-inherit transition-colors duration-[140ms] hover:bg-bad-bg"
                >
                  Set to {int(issue.min)}
                </button>
              )}
            </div>
          )}
        </td>
        <td className="px-[10px] py-[9px] text-[12.5px] text-muted-foreground">{line.uom}</td>
        <td className="px-[10px] py-[9px]">
          <input
            type="number"
            min={0}
            data-col="qty"
            value={line.qty}
            onChange={(e) => setLine(index, 'qty', e.target.value)}
            onKeyDown={navVertical}
            aria-label={`Quantity, line ${index + 1}`}
            aria-invalid={issue?.kind === 'belowMoq'}
            className={cn(numberInput, issue?.kind === 'belowMoq' ? 'border-bad-fg' : 'border-input')}
          />
        </td>
        <td className="px-[10px] py-[9px]">
          {costEditable ? (
            <input
              type="number"
              min={0}
              step={0.01}
              data-col="unitCost"
              value={line.unitCost}
              onChange={(e) => setLine(index, 'unitCost', e.target.value)}
              onKeyDown={navVertical}
              aria-label={`Unit cost, line ${index + 1}`}
              className={cn(numberInput, 'border-input')}
            />
          ) : (
            <div
              title={
                isDraft
                  ? `Set by ${vendorName || 'the vendor'}’s price list — change the price in Purchase Prices`
                  : undefined
              }
              className="tnum flex h-8 min-w-0 items-center justify-end gap-[5px] overflow-hidden border border-transparent px-[9px] text-[13px]"
            >
              {isDraft && lockCost && <Lock className="size-[11px] flex-none text-muted-foreground" strokeWidth={2} />}
              <span className="min-w-0 truncate">{money(Number(line.unitCost) || 0)}</span>
            </div>
          )}
        </td>
        <td className="tnum px-4 py-[9px] text-right text-[13px] font-medium">{money(poLineTotal(line))}</td>
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
      </tr>
    )
  })
  if (insertRow) bodyRows.splice(insertAt ?? bodyRows.length, 0, insertRow)

  const menuItem =
    'block w-full rounded-md border-0 bg-transparent px-[10px] py-2 text-left text-[12.5px] transition-colors duration-[140ms] hover:bg-tint-12 focus-visible:bg-tint-12 focus-visible:outline-none'

  return (
    <div className="relative flex-shrink-0 overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-[13px]">
        <div className="text-[13px] font-semibold">
          Line items{' '}
          <span className="font-medium text-muted-foreground">
            · {lines.length} {lines.length === 1 ? 'line' : 'lines'}
          </span>
        </div>
        {selected.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {selected.length} {selected.length === 1 ? 'line selected' : 'lines selected'}
            </span>
            <button type="button" onClick={() => duplicate(selected)} className={cn(smallButton, 'text-foreground')}>
              Duplicate
            </button>
            <button type="button" onClick={() => remove(selected)} className={cn(smallButton, 'text-bad-fg hover:bg-bad-bg')}>
              Remove
            </button>
          </div>
        )}
      </div>

      {unpricedCount > 0 && (
        <div
          role="status"
          className="flex animate-sf-slide flex-wrap items-center gap-[10px] border-b border-border bg-bad-bg px-4 py-[9px] text-[12.5px] font-medium text-bad-fg"
        >
          <CircleAlert className="size-[14px] flex-none" strokeWidth={2} />
          <span className="min-w-[180px] flex-1">
            {unpricedCount} {unpricedCount === 1 ? 'line has' : 'lines have'} no active price from {cleanVendor}.
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onOpenPrices}
              className="h-[26px] rounded-[7px] border border-current bg-transparent px-[10px] text-xs font-semibold text-inherit transition-transform duration-[140ms] hover:-translate-y-px"
            >
              Open Purchase Prices
            </button>
            <button
              type="button"
              onClick={removeUnpriced}
              className="h-[26px] rounded-[7px] border-0 bg-bad-fg px-[10px] text-xs font-semibold text-background transition-transform duration-[140ms] hover:-translate-y-px"
            >
              Remove unpriced lines
            </button>
          </div>
        </div>
      )}

      <div className="overflow-auto">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="text-left text-[11px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
              <th className="w-[26px] px-1 py-[9px]" />
              <th className="w-[30px] px-1 py-[9px] text-center">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={() => setSelected(allChecked ? [] : lines.map((_, i) => i))}
                  aria-label="Select all lines"
                  className="size-[14px] cursor-pointer accent-primary"
                />
              </th>
              <th title="Line number" className="w-10 px-1 py-[9px] text-right font-semibold">
                #
              </th>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c.key)}
                  aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  style={{ width: widths[c.key] }}
                  className={cn(
                    'relative cursor-pointer py-[9px] font-semibold select-none',
                    c.align === 'right' ? 'px-[10px] text-right' : 'px-4 text-left',
                  )}
                >
                  {c.label}
                  {sort?.key === c.key ? (sort.dir === 'desc' ? ' ↓' : ' ↑') : ''}
                  <span
                    onMouseDown={(e) => startResize(c.key, e)}
                    onClick={(e) => e.stopPropagation()}
                    aria-hidden="true"
                    className="absolute top-0 right-0 bottom-0 w-1.5 cursor-col-resize transition-colors duration-[140ms] hover:bg-[color-mix(in_oklab,var(--primary)_55%,transparent)]"
                  />
                </th>
              ))}
              <th className="w-[34px] px-2 py-[9px]" />
            </tr>
          </thead>
          <tbody>
            {bodyRows}
            {insertAt == null && (
              <tr
                onClick={() => startInsert(lines.length)}
                className="cursor-pointer border-t border-dashed border-border transition-colors duration-[140ms] hover:bg-tint-7"
              >
                <td colSpan={10} className="px-4 py-[10px] text-[12.5px] text-muted-foreground">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 border-0 bg-transparent p-0 text-inherit"
                  >
                    <Plus className="size-[14px]" strokeWidth={2} />
                    Add line
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {menu && (
        <div className="fixed inset-0 z-[60]" onClick={() => setMenu(null)} onContextMenu={(e) => { e.preventDefault(); setMenu(null) }}>
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
            {canReorder && menu.ids.length === 1 && (
              <>
                <button type="button" role="menuitem" className={cn(menuItem, 'text-foreground')} onClick={() => startInsert(Math.min(...menu.ids))}>
                  Insert line above
                </button>
                <button type="button" role="menuitem" className={cn(menuItem, 'text-foreground')} onClick={() => startInsert(Math.max(...menu.ids) + 1)}>
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
