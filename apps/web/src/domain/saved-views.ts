/**
 * Saved grid views — the pure rules (no React, no browser APIs).
 *
 * A saved view is a user's named snapshot of a list's state: filters, sorts,
 * which columns are shown, row density. The backend enforces the same rules
 * (unique name per page and user, at most one default per page and user).
 */

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
  frozen: 'left' | 'right' | null
}

/** What a saved view holds (everything the grid can be put back into). */
export interface ViewStateData {
  filters: ViewFilterData[]
  sorts: ViewSortData[]
  columns: ViewColumnData[]
  density: 'default' | 'compact'
  groupBy: string | null
  collapsed: string[]
}

/** The grid's own state, in the shape it keeps it. */
export interface GridSnapshot {
  filters: ViewFilterData[]
  sorts: ViewSortData[]
  /** Keys of the columns that are switched off. */
  hidden: string[]
  compact: boolean
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
  return {
    filters: snapshot.filters.map((f) => ({ ...f })),
    sorts: snapshot.sorts.map((s) => ({ ...s })),
    columns: defaults.columns.map((c) => ({ key: c.key, width: c.width, visible: !hidden.has(c.key), frozen: c.frozen || null })),
    density: snapshot.compact ? 'compact' : 'default',
    groupBy: null,
    collapsed: [],
  }
}

/**
 * Put a saved view back onto the grid. Columns are matched by key, so a column
 * added or removed since the view was saved never breaks it: columns the view
 * does not know keep their default visibility.
 */
export function snapshotFromView(view: ViewStateData, defaults: GridDefaults): GridSnapshot {
  const known = new Map(view.columns.map((c) => [c.key, c.visible]))
  const hidden = defaults.columns
    .filter((c) => (known.has(c.key) ? !known.get(c.key) : !c.visible))
    .map((c) => c.key)
  return {
    filters: view.filters.map((f) => ({ ...f })),
    sorts: view.sorts.length ? view.sorts.map((s) => ({ ...s })) : [{ ...defaults.sort }],
    hidden,
    compact: view.density === 'compact',
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
  return false
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
