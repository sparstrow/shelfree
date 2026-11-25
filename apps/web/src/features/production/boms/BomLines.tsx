/**
 * BOM component lines: the shared LineGrid plus sub-assembly expansion (indented
 * read-only child tree), component search picker, and Alt+↑/↓ line reordering.
 */
import { ChevronRight, Search, X } from 'lucide-react'
import { type KeyboardEvent, useMemo, useRef, useState } from 'react'
import {
  type AddLineContext,
  type LineColumn,
  LineGrid,
  type LineSubRow,
} from '@/components/document/LineGrid'
import { numberInputClass } from '@/components/document/parts'
import { useProductionSettings } from '@/data/queries/sales-production-settings'
import type { Bom, BomLine, Item } from '@/data/schemas'
import { bomMoveLine, bomSetLine, bomTree, newBomLine, renumberBomLines } from '@/domain/bom-document'
import { activeBomFor, bomReqQty, bomUnitCostOf } from '@/domain/production'
import { money } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface BomLinesProps {
  draft: Bom
  boms: readonly Bom[]
  items: readonly Item[]
  today: string
  expanded: Readonly<Record<string, boolean>>
  onToggleSub: (key: string) => void
  onLinesChange: (lines: BomLine[]) => void
}

export function BomLines({
  draft,
  boms,
  items,
  today,
  expanded,
  onToggleSub,
  onLinesChange,
}: BomLinesProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const lines = draft.lines

  const itemCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const line of lines) {
      counts.set(line.item, (counts.get(line.item) ?? 0) + 1)
    }
    return counts
  }, [lines])

  const setLine = (index: number, field: 'qtyPer' | 'scrapPct', raw: string) => {
    onLinesChange(bomSetLine(draft, index, field, raw).lines)
  }

  const lineHasIssue = (line: BomLine): boolean =>
    !(Number(line.qtyPer) > 0) ||
    (itemCounts.get(line.item) ?? 0) > 1 ||
    (!!draft.parentItem && line.item === draft.parentItem)

  const lineCosts = (line: Pick<BomLine, 'item' | 'qtyPer' | 'scrapPct'>, depth = 0) => {
    const unitCost = bomUnitCostOf(line.item, boms, items, today, depth)
    const lineCost = unitCost * (Number(line.qtyPer) || 0) * (1 + (Number(line.scrapPct) || 0) / 100)
    return { unitCost, lineCost }
  }

  const subRows = (line: BomLine): readonly LineSubRow[] => {
    const isSelf = !!draft.parentItem && line.item === draft.parentItem
    const sub = !isSelf ? activeBomFor(boms, line.item, today) : undefined
    const subKey = `${draft.no || ''}/${line.item}`
    if (!sub || !expanded[subKey]) return []

    const visited = new Set([draft.parentItem, line.item].filter(Boolean))
    const children = bomTree(
      sub,
      boms,
      today,
      expanded,
      bomReqQty(line, 1, draft.outputQty),
      1,
      [],
      visited,
    )

    return children.map((row, rowIdx) => {
      const { unitCost, lineCost } = lineCosts(row.line, row.depth)
      return {
        key: `${row.subKey}:${row.depth}:${rowIdx}`,
        cells: {
          component: (
            <ComponentCell
              item={row.line.item}
              desc={row.line.desc}
              depth={row.depth}
              hasSub={row.hasSub}
              open={row.open}
              onToggle={() => onToggleSub(row.subKey)}
            />
          ),
          uom: <span className="text-[12.5px] text-muted-foreground">{row.line.uom}</span>,
          qtyPer: (
            <div className="tnum text-right text-[12.5px] text-muted-foreground">
              {Math.round(row.required * 1000) / 1000}
            </div>
          ),
          scrapPct: null,
          unitCost: <div className="tnum text-right text-[12.5px] text-muted-foreground">{money(unitCost)}</div>,
          lineCost: <div className="tnum text-right text-[13px] font-medium">{money(lineCost)}</div>,
        },
      }
    })
  }

  const columns: LineColumn<BomLine>[] = [
    {
      key: 'component',
      label: 'Component',
      align: 'left',
      width: 340,
      sortValue: (l) => `${l.item} ${l.desc}`,
      cell: (line) => {
        const isSelf = !!draft.parentItem && line.item === draft.parentItem
        const hasSub = !isSelf && !!activeBomFor(boms, line.item, today)
        const subKey = `${draft.no || ''}/${line.item}`
        const isOpen = !!expanded[subKey]
        return (
          <ComponentCell
            item={line.item}
            desc={line.desc}
            depth={0}
            hasSub={hasSub}
            open={isOpen}
            onToggle={() => onToggleSub(subKey)}
          />
        )
      },
    },
    {
      key: 'uom',
      label: 'UoM',
      align: 'left',
      width: 72,
      sortValue: (l) => l.uom,
      cellClassName: 'px-[10px] py-[9px] text-[12.5px] text-muted-foreground',
      cell: (line) => line.uom,
    },
    {
      key: 'qtyPer',
      label: 'Qty per',
      align: 'right',
      width: 112,
      sortValue: (l) => Number(l.qtyPer) || 0,
      cell: (line, index) => {
        const invalid = !(Number(line.qtyPer) > 0)
        return (
          <input
            type="number"
            min={0}
            step="0.001"
            data-col="qtyPer"
            data-bom-first-qty={index === 0 ? '1' : undefined}
            value={line.qtyPer}
            onChange={(e) => setLine(index, 'qtyPer', e.target.value)}
            aria-label={`Qty per, line ${index + 1}`}
            aria-invalid={invalid}
            className={cn(numberInputClass, invalid && 'border-bad-fg')}
          />
        )
      },
    },
    {
      key: 'scrapPct',
      label: 'Scrap %',
      align: 'right',
      width: 100,
      sortValue: (l) => Number(l.scrapPct) || 0,
      cell: (line, index) => (
        <input
          type="number"
          min={0}
          step="0.5"
          data-col="scrapPct"
          value={line.scrapPct}
          onChange={(e) => setLine(index, 'scrapPct', e.target.value)}
          aria-label={`Scrap %, line ${index + 1}`}
          className={numberInputClass}
        />
      ),
    },
    {
      key: 'unitCost',
      label: 'Unit cost',
      align: 'right',
      width: 118,
      sortValue: (l) => lineCosts(l).unitCost,
      cellClassName: 'tnum px-[10px] py-[9px] text-right text-[12.5px] text-muted-foreground',
      cell: (line) => money(lineCosts(line).unitCost),
    },
    {
      key: 'lineCost',
      label: 'Line cost',
      align: 'right',
      width: 126,
      sortValue: (l) => lineCosts(l).lineCost,
      cellClassName: 'tnum px-4 py-[9px] text-right text-[13px] font-medium',
      cell: (line) => money(lineCosts(line).lineCost),
    },
  ]

  // Alt+↑ / Alt+↓ reorders the focused component line and preserves focus on its moved input.
  const onKeyDownCapture = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!e.altKey || e.ctrlKey || e.metaKey) return
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    const target = e.target as HTMLElement | null
    const row = target?.closest('tr[data-line-index]')
    if (!row) return
    const index = Number(row.getAttribute('data-line-index'))
    if (!Number.isInteger(index)) return
    const dir = e.key === 'ArrowUp' ? -1 : 1
    const nextIndex = index + dir
    if (nextIndex < 0 || nextIndex >= lines.length) return
    e.preventDefault()
    e.stopPropagation()
    const col = target?.getAttribute('data-col')
    onLinesChange(bomMoveLine(draft, index, dir).lines)
    if (col) {
      window.requestAnimationFrame(() => {
        const moved = wrapperRef.current?.querySelector<HTMLInputElement>(
          `tr[data-line-index="${nextIndex}"] [data-col="${col}"]`,
        )
        moved?.focus()
        moved?.select?.()
      })
    }
  }

  return (
    <div ref={wrapperRef} onKeyDownCapture={onKeyDownCapture}>
      <LineGrid
        gridId="bom-lines"
        title="Components"
        lineNoun={['component', 'components']}
        addLabel="Add component"
        lines={lines}
        columns={columns}
        minWidth={760}
        onChange={(next) => onLinesChange(renumberBomLines(next))}
        rowHasIssue={lineHasIssue}
        subRows={subRows}
        renderAddLine={(ctx) => (
          <AddComponent ctx={ctx} draft={draft} items={items} />
        )}
      />
    </div>
  )
}

function ComponentCell({
  item,
  desc,
  depth,
  hasSub,
  open,
  onToggle,
}: {
  item: string
  desc: string
  depth: number
  hasSub: boolean
  open: boolean
  onToggle: () => void
}) {
  return (
    <div
      className="flex min-w-0 items-center gap-2"
      style={depth > 0 ? { paddingLeft: depth * 22 } : undefined}
    >
      {hasSub && (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={`${open ? 'Hide' : 'Show'} sub-assembly for ${item}`}
          title={open ? 'Hide sub-assembly' : 'Show sub-assembly'}
          className="hover-lift inline-flex size-5 flex-none items-center justify-center rounded-[5px] border border-border bg-card text-muted-foreground hover:bg-primary-tint hover:text-primary"
        >
          <ChevronRight
            className={cn('size-[11px] transition-transform duration-[140ms]', open && 'rotate-90')}
            strokeWidth={2.5}
          />
        </button>
      )}
      <div className="min-w-0">
        <div className="font-mono text-xs font-medium">{item}</div>
        <div className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{desc}</div>
      </div>
    </div>
  )
}

function AddComponent({
  ctx,
  draft,
  items,
}: {
  ctx: AddLineContext<BomLine>
  draft: Bom
  items: readonly Item[]
}) {
  const [query, setQuery] = useState('')
  const { defaultScrap } = useProductionSettings()
  const taken = useMemo(() => new Set(draft.lines.map((l) => l.item)), [draft.lines])
  const q = query.trim().toLowerCase()
  const matches = useMemo(
    () =>
      items
        .filter(
          (it) =>
            it.no !== draft.parentItem &&
            !taken.has(it.no) &&
            (!q || `${it.no} ${it.desc}`.toLowerCase().includes(q)),
        )
        .slice(0, 60),
    [items, draft.parentItem, taken, q],
  )

  const pick = (item: Item) => ctx.insert(newBomLine(item, (draft.lines.length + 1) * 10, defaultScrap))

  return (
    <>
      <div className="flex items-center gap-2">
        <Search className="size-[14px] flex-none text-muted-foreground" strokeWidth={2} />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && matches[0]) {
              e.preventDefault()
              pick(matches[0])
            }
          }}
          placeholder="Search items by code or description… (Enter adds the first, Esc cancels)"
          aria-label="Search items to add"
          className="h-8 flex-1 rounded-[7px] border border-ring bg-background px-[10px] text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button
          type="button"
          onClick={ctx.close}
          title="Cancel (Esc)"
          aria-label="Cancel adding a line"
          className="inline-flex size-7 flex-none items-center justify-center rounded-[7px] border-0 bg-transparent text-muted-foreground transition-colors duration-[140ms] hover:bg-tint-12 hover:text-foreground"
        >
          <X className="size-[14px]" strokeWidth={2} />
        </button>
      </div>
      {matches.length === 0 ? (
        <div className="px-1 pt-[10px] pb-0.5 text-xs text-muted-foreground">No matching items.</div>
      ) : (
        <div className="mt-1 max-h-[260px] overflow-auto">
          {matches.map((it) => (
            <button
              key={it.no}
              type="button"
              onClick={() => pick(it)}
              className="flex w-full items-center gap-3 rounded-[7px] border-0 bg-transparent px-[10px] py-[7px] text-left text-foreground transition-colors duration-[140ms] hover:bg-tint-10"
            >
              <span className="w-[120px] flex-none font-mono text-xs font-medium">{it.no}</span>
              <span className="min-w-0 flex-1 truncate text-[12.5px]">{it.desc}</span>
              <span className="flex-none text-[11.5px] text-muted-foreground">{it.uom || 'NOS'}</span>
              <span className="tnum flex-none text-xs font-medium">{money(it.cost || 0)}</span>
            </button>
          ))}
        </div>
      )}
    </>
  )
}
