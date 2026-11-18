/**
 * Data-grid layout maths — column order / pin / width, grouping, footer
 * aggregates and find-in-view. Pure functions (no React, no browser APIs): the
 * grid keeps the state, this file decides what it means. The backend does not
 * need these; a saved view stores their results (see `saved-views.ts`).
 */

export type Pin = 'left' | 'right'

/** What the grid keeps about its columns, as differences from the dataset's defaults. */
export interface ColumnLayout {
  /** Every column key, in display order (before pin grouping). */
  order: string[]
  /** Width overrides by key (only keys that differ from the default width). */
  widths: Record<string, number>
  /** Pin overrides by key: `null` = explicitly unpinned (only keys that differ from the default). */
  pins: Record<string, Pin | null>
}

interface ColumnLike {
  key: string
  width: number
  min: number
  frozen?: Pin | false
}

export const MAX_COLUMN_WIDTH = 560

/** The pin a column really has: the override, else the dataset default. */
export function effectivePin(column: ColumnLike, pins: Record<string, Pin | null>): Pin | null {
  return column.key in pins ? pins[column.key] : column.frozen || null
}

/** The key order for `keys`, following `order`; keys it does not know keep their default place at the end. */
export function normalizeOrder(keys: readonly string[], order: readonly string[]): string[] {
  const known = new Set(keys)
  const seen = new Set<string>()
  const out: string[] = []
  for (const key of order) {
    if (known.has(key) && !seen.has(key)) {
      seen.add(key)
      out.push(key)
    }
  }
  for (const key of keys) if (!seen.has(key)) out.push(key)
  return out
}

/**
 * The columns the grid shows: hidden ones removed, `order` applied, widths and
 * pins overridden, then grouped pinned-left / free / pinned-right.
 */
export function resolveColumns<C extends ColumnLike>(
  columns: readonly C[],
  layout: ColumnLayout,
  hidden: ReadonlySet<string>,
): C[] {
  const byKey = new Map(columns.map((c) => [c.key, c]))
  const ordered = normalizeOrder(
    columns.map((c) => c.key),
    layout.order,
  )
    .map((key) => byKey.get(key) as C)
    .filter((c) => !hidden.has(c.key))
    .map((c) => {
      const pin = effectivePin(c, layout.pins)
      return { ...c, width: layout.widths[c.key] ?? c.width, frozen: pin ?? false }
    })
  return [
    ...ordered.filter((c) => c.frozen === 'left'),
    ...ordered.filter((c) => !c.frozen),
    ...ordered.filter((c) => c.frozen === 'right'),
  ]
}

/**
 * Drop `from` next to `to`: left of it when moving a column leftwards, right of
 * it when moving rightwards (so the column lands where it was dropped).
 */
export function moveColumn(order: readonly string[], from: string, to: string): string[] {
  const fi = order.indexOf(from)
  const ti = order.indexOf(to)
  if (fi < 0 || ti < 0 || fi === ti) return [...order]
  const next = order.filter((k) => k !== from)
  next.splice(next.indexOf(to) + (fi < ti ? 1 : 0), 0, from)
  return next
}

/**
 * Move a column one place left / right among the columns shown (`shown` is the
 * display order). Returns the same order when it is already at that end.
 */
export function shiftColumn(order: readonly string[], shown: readonly string[], key: string, dir: -1 | 1): string[] {
  const neighbour = shown[shown.indexOf(key) + dir]
  return neighbour === undefined ? [...order] : moveColumn(order, key, neighbour)
}

/** Set (or clear, when it equals the default) one override in `overrides`. */
export function withOverride<V>(overrides: Record<string, V>, key: string, value: V, fallback: V): Record<string, V> {
  const { [key]: _old, ...rest } = overrides
  return value === fallback ? rest : { ...rest, [key]: value }
}

/** Pin to `side`, or unpin when the column is already pinned there. */
export function togglePin(
  pins: Record<string, Pin | null>,
  column: ColumnLike,
  side: Pin,
): Record<string, Pin | null> {
  const now = effectivePin(column, pins)
  return withOverride(pins, column.key, now === side ? null : side, column.frozen || null)
}

// ── autofit ──────────────────────────────────────────────────────────────────

/** Approximate glyph widths (px) for the grid's 12px cell text and 11.5px bold header text. */
const CHAR_PX = { text: 6.7, num: 6.9, pill: 6.5, mono: 7.3 } as const
const HEADER_CHAR_PX = 6.9
/** Cell padding (12 + 12) and border; the header also needs room for the sort arrow and menu button. */
const CELL_PAD = 26
const HEADER_EXTRA = 34
const PILL_EXTRA = 26

export interface FitInput {
  label: string
  /** The cell texts as shown (one per row). */
  texts: readonly string[]
  type: 'mono' | 'text' | 'pill' | 'num'
  min: number
}

/** The width that fits the header and the longest cell, within the column's minimum and the global maximum. */
export function fitWidth({ label, texts, type, min }: FitInput): number {
  let longest = 0
  for (const text of texts) if (text.length > longest) longest = text.length
  const body = longest * CHAR_PX[type] + CELL_PAD + (type === 'pill' ? PILL_EXTRA : 0)
  const head = label.length * HEADER_CHAR_PX + CELL_PAD + HEADER_EXTRA
  return Math.max(min, Math.min(MAX_COLUMN_WIDTH, Math.ceil(Math.max(body, head))))
}

// ── grouping ─────────────────────────────────────────────────────────────────

export type GridValue = string | number

export interface Group<T> {
  /** `String(raw)` — what `collapsed` stores. */
  key: string
  label: string
  rows: T[]
}

const compareValues = (a: GridValue, b: GridValue) =>
  typeof a === 'number' && typeof b === 'number'
    ? a - b
    : String(a).localeCompare(String(b), undefined, { numeric: true })

/** Rows grouped by a column's raw value, groups ordered by that value (empty last), rows keeping their order. */
export function groupRows<T>(
  rows: readonly T[],
  rawOf: (row: T) => GridValue,
  textOf: (row: T) => string,
): Group<T>[] {
  const groups = new Map<string, { raw: GridValue; group: Group<T> }>()
  for (const row of rows) {
    const raw = rawOf(row)
    const key = String(raw)
    let entry = groups.get(key)
    if (!entry) {
      entry = { raw, group: { key, label: key === '' ? '—' : textOf(row) || key, rows: [] } }
      groups.set(key, entry)
    }
    entry.group.rows.push(row)
  }
  return [...groups.values()]
    .sort((a, b) => {
      if (a.group.key === '' || b.group.key === '') return a.group.key === b.group.key ? 0 : a.group.key === '' ? 1 : -1
      return compareValues(a.raw, b.raw)
    })
    .map((e) => e.group)
}

/** The rows that are not hidden inside a collapsed group, in display order. */
export function visibleGroupRows<T>(groups: readonly Group<T>[], collapsed: ReadonlySet<string>): T[] {
  return groups.flatMap((g) => (collapsed.has(g.key) ? [] : g.rows))
}

export interface GroupSection<T> {
  key: string
  label: string
  /** Rows in the whole group (not just on this page). */
  count: number
  collapsed: boolean
  /** The group's rows on this page. */
  rows: T[]
  /** Position of the first of those rows in the visible list (for row numbering). */
  start: number
}

/**
 * The group headers and rows shown on one page, where pages are cut from the
 * visible rows (`offset`, `limit`). A group that straddles a page break gets a
 * header on both pages; a collapsed group has a header on the one page its
 * place falls on, and none of its rows count towards paging.
 */
export function groupSections<T>(
  groups: readonly Group<T>[],
  collapsed: ReadonlySet<string>,
  offset: number,
  limit: number,
): GroupSection<T>[] {
  const total = groups.reduce((n, g) => n + (collapsed.has(g.key) ? 0 : g.rows.length), 0)
  const lastPage = offset + limit >= total
  const out: GroupSection<T>[] = []
  let pos = 0
  for (const g of groups) {
    if (collapsed.has(g.key)) {
      if (pos >= offset && (pos < offset + limit || lastPage)) {
        out.push({ key: g.key, label: g.label, count: g.rows.length, collapsed: true, rows: [], start: pos })
      }
      continue
    }
    const from = Math.max(offset, pos)
    const to = Math.min(offset + limit, pos + g.rows.length)
    if (to > from) {
      out.push({
        key: g.key,
        label: g.label,
        count: g.rows.length,
        collapsed: false,
        rows: g.rows.slice(from - pos, to - pos),
        start: from,
      })
    }
    pos += g.rows.length
  }
  return out
}

// ── footer aggregates ────────────────────────────────────────────────────────

export type AggKind = 'none' | 'count' | 'sum' | 'avg' | 'min' | 'max'

export const AGG_OPTIONS: readonly { kind: AggKind; label: string }[] = [
  { kind: 'none', label: 'None' },
  { kind: 'count', label: 'Count' },
  { kind: 'sum', label: 'Sum' },
  { kind: 'avg', label: 'Average' },
  { kind: 'min', label: 'Min' },
  { kind: 'max', label: 'Max' },
]

export const isAggKind = (value: unknown): value is AggKind => AGG_OPTIONS.some((o) => o.kind === value)

/** Numeric columns offer every aggregate; the rest only None and Count. */
export function aggKindsFor(type: string): AggKind[] {
  return AGG_OPTIONS.map((o) => o.kind).filter((k) => type === 'num' || k === 'none' || k === 'count')
}

/** The aggregate of a column's raw values; `null` when there is nothing to show. */
export function aggregate(values: readonly GridValue[], kind: AggKind): number | null {
  if (kind === 'none') return null
  if (kind === 'count') return values.filter((v) => v !== '' && v != null).length
  let sum = 0
  let min = Infinity
  let max = -Infinity
  let n = 0
  for (const v of values) {
    if (v === '' || v == null) continue
    const x = Number(v)
    if (Number.isNaN(x)) continue
    sum += x
    if (x < min) min = x
    if (x > max) max = x
    n++
  }
  if (n === 0) return kind === 'sum' ? 0 : null
  if (kind === 'sum') return sum
  if (kind === 'avg') return sum / n
  return kind === 'min' ? min : max
}

// ── find in view ─────────────────────────────────────────────────────────────

/** Does a cell's text contain the (already trimmed, lower-cased) search? */
export const textMatches = (text: string, query: string): boolean => query !== '' && text.toLowerCase().includes(query)

/** Positions (in `rows`) of the rows with at least one matching cell. */
export function findMatches<T>(rows: readonly T[], cellTexts: (row: T) => string[], rawQuery: string): number[] {
  const query = rawQuery.trim().toLowerCase()
  if (!query) return []
  const out: number[] = []
  rows.forEach((row, i) => {
    if (cellTexts(row).some((t) => textMatches(t, query))) out.push(i)
  })
  return out
}

/** The next / previous match index, wrapping round; 0 when there are none. */
export function stepMatch(index: number, count: number, dir: -1 | 1): number {
  return count === 0 ? 0 : (index + dir + count) % count
}
