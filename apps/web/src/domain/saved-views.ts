/**
 * Saved grid views — the pure rules (no React, no browser APIs).
 *
 * A saved view is a user's named snapshot of a list's state: filters, sorts,
 * which columns are shown, their order / width / pin, grouping, footer
 * aggregates and row density. The backend enforces the same rules
 * (unique name per page and user, at most one default per page and user).
 */

import { type Pin, isAggKind, normalizeOrder } from './grid-layout'

export interface ViewFilterData {
  key: string
  op: string
  value?: string | string[]
  value2?: string
}

export interface ViewSortData {
  key: string
  dir: 'asc' | 'desc'
}

export interface ViewColumnData {
  key: string
  width: number
  visible: boolean
  frozen: Pin | null
}

/** What a saved view holds (everything the grid can be put back into). */
export interface ViewStateData {
  filters: ViewFilterData[]
  sorts: ViewSortData[]
  columns: ViewColumnData[]
  density: 'default' | 'compact'
  groupBy: string | null
  /** Keys of the collapsed groups. */
  collapsed: string[]
  /** Footer aggregate chosen per column key (`sum`, `avg`…). Columns not listed use their default. */
  aggregates?: Record<string, string>
}

/** The grid's own state, in the shape it keeps it. */
export interface GridSnapshot {
  filters: ViewFilterData[]
  sorts: ViewSortData[]
  /** Keys of the columns that are switched off. */
  hidden: string[]
  compact: boolean
  /** Layout (all optional: a snapshot without them means "dataset defaults"). */
  /** Every column key in display order. */
  order?: string[]
  /** Width overrides by key. */
  widths?: Record<string, number>
  /** Pin overrides by key (`null` = unpinned although the default is pinned). */
  pins?: Record<string, Pin | null>
  groupBy?: string | null
  collapsed?: string[]
  /** Footer aggregate overrides by key. */
  aggregates?: Record<string, string>
}

/** What the grid needs from its dataset to turn a view into state and back. */
export interface GridDefaults {
  columns: { key: string; width: number; visible: boolean; frozen?: 'left' | 'right' | false }[]
  sort: ViewSortData
}

/** `name`, or `name 2`, `name 3` … when `taken` already has it. */
export function dedupeViewName(name: string, taken: readonly string[]): string {
  if (!taken.includes(name)) return name
  let n = 2
  while (taken.includes(`${name} ${n}`)) n++
  return `${name} ${n}`
}

/** The saved views of one page, oldest first (the order they were made in). */
export function viewsForPage<V extends { pageKey: string; createdAt: number }>(views: readonly V[], pageKey: string): V[] {
  return views.filter((v) => v.pageKey === pageKey).sort((a, b) => a.createdAt - b.createdAt)
}

/** Capture the grid's state as view content. */
export function viewDataFromSnapshot(snapshot: GridSnapshot, defaults: GridDefaults): ViewStateData {
  const hidden = new Set(snapshot.hidden)
  const byKey = new Map(defaults.columns.map((c) => [c.key, c]))
  const order = normalizeOrder(
    defaults.columns.map((c) => c.key),
    snapshot.order ?? [],
  )
  const pins = snapshot.pins ?? {}
  return {
    filters: snapshot.filters.map((f) => ({ ...f })),
    sorts: snapshot.sorts.map((s) => ({ ...s })),
    columns: order.map((key) => {
      const c = byKey.get(key)!
      return {
        key,
        width: snapshot.widths?.[key] ?? c.width,
        visible: !hidden.has(key),
        frozen: key in pins ? pins[key] : c.frozen || null,
      }
    }),
    density: snapshot.compact ? 'compact' : 'default',
    groupBy: snapshot.groupBy && byKey.has(snapshot.groupBy) ? snapshot.groupBy : null,
    collapsed: [...(snapshot.collapsed ?? [])],
    aggregates: { ...(snapshot.aggregates ?? {}) },
  }
}

/**
 * Put a saved view back onto the grid. Columns are matched by key, so a column
 * added or removed since the view was saved never breaks it: columns the view
 * does not know keep their default visibility.
 */
export function snapshotFromView(view: ViewStateData, defaults: GridDefaults): GridSnapshot {
  const known = new Map(view.columns.map((c) => [c.key, c]))
  const hidden = defaults.columns.filter((c) => (known.has(c.key) ? !known.get(c.key)!.visible : !c.visible)).map((c) => c.key)
  const widths: Record<string, number> = {}
  const pins: Record<string, Pin | null> = {}
  for (const c of defaults.columns) {
    const saved = known.get(c.key)
    if (!saved) continue
    if (saved.width !== c.width) widths[c.key] = saved.width
    if (saved.frozen !== (c.frozen || null)) pins[c.key] = saved.frozen
  }
  const aggregates: Record<string, string> = {}
  for (const [key, kind] of Object.entries(view.aggregates ?? {})) {
    if (isAggKind(kind) && defaults.columns.some((c) => c.key === key)) aggregates[key] = kind
  }
  return {
    filters: view.filters.map((f) => ({ ...f })),
    sorts: view.sorts.length ? view.sorts.map((s) => ({ ...s })) : [{ ...defaults.sort }],
    hidden,
    compact: view.density === 'compact',
    order: normalizeOrder(
      defaults.columns.map((c) => c.key),
      view.columns.map((c) => c.key),
    ),
    widths,
    pins,
    groupBy: view.groupBy && defaults.columns.some((c) => c.key === view.groupBy) ? view.groupBy : null,
    collapsed: [...view.collapsed],
    aggregates,
  }
}

const normalFilter = (f: ViewFilterData) =>
  JSON.stringify([f.key, f.op, Array.isArray(f.value) ? f.value : (f.value ?? ''), f.value2 ?? ''])

/**
 * Has the grid moved away from `baseline`? Only the parts the baseline names are
 * compared (a built-in view that sets no sort does not care about the sort).
 */
export function isViewDirty(baseline: Partial<GridSnapshot>, current: GridSnapshot): boolean {
  if (baseline.filters) {
    const a = baseline.filters.map(normalFilter)
    const b = current.filters.map(normalFilter)
    if (a.length !== b.length || a.some((x, i) => x !== b[i])) return true
  }
  if (baseline.sorts) {
    const a = baseline.sorts.map((s) => `${s.key}:${s.dir}`)
    const b = current.sorts.map((s) => `${s.key}:${s.dir}`)
    if (a.length !== b.length || a.some((x, i) => x !== b[i])) return true
  }
  if (baseline.hidden) {
    const a = [...baseline.hidden].sort()
    const b = [...current.hidden].sort()
    if (a.length !== b.length || a.some((x, i) => x !== b[i])) return true
  }
  if (baseline.compact !== undefined && baseline.compact !== current.compact) return true
  if (baseline.order && !sameList(baseline.order, current.order ?? baseline.order)) return true
  if (baseline.widths && !sameRecord(baseline.widths, current.widths ?? {})) return true
  if (baseline.pins && !sameRecord(baseline.pins, current.pins ?? {})) return true
  if (baseline.groupBy !== undefined && baseline.groupBy !== (current.groupBy ?? null)) return true
  if (baseline.collapsed && !sameList([...baseline.collapsed].sort(), [...(current.collapsed ?? [])].sort())) return true
  if (baseline.aggregates && !sameRecord(baseline.aggregates, current.aggregates ?? {})) return true
  return false
}

const sameList = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x, i) => x === b[i])
const sameRecord = (a: Record<string, unknown>, b: Record<string, unknown>) => {
  const ka = Object.keys(a).sort()
  const kb = Object.keys(b).sort()
  return sameList(ka, kb) && ka.every((k) => a[k] === b[k])
}

/** Make `id` the page's default (or clear it): at most one default per page. */
export function withDefaultView<V extends { id: string; pageKey: string; isDefaultFor: boolean }>(
  views: readonly V[],
  id: string,
  on: boolean,
): V[] {
  const target = views.find((v) => v.id === id)
  if (!target) return [...views]
  return views.map((v) => (v.pageKey === target.pageKey ? { ...v, isDefaultFor: on && v.id === id } : v))
}
