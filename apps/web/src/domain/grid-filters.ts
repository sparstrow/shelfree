import {
  type FilterColumn,
  type FilterOp,
  type GridFilter,
  filterIsBlank,
} from '@/components/data-grid/model'

export const FILTER_PANEL_WIDTH = 320
export const FILTER_PANEL_GAP = 14
export const PREVIEW_DRAWER_MAX_WIDTH = 360
export const MIN_GRID_WIDTH_BESIDE_PANEL = 400

/** Subtitle shown under "Filters" in the panel header. */
export function filterPanelSubtitle(count: number): string {
  if (count <= 0) return 'Narrow down the list'
  return count === 1 ? '1 filter active' : `${count} filters active`
}

/** Sections that have an active filter start expanded when the Filter panel opens. */
export function initialOpenFilterSections(filters: readonly Pick<GridFilter, 'key'>[]): Set<string> {
  return new Set(filters.map((f) => f.key))
}

/** Case-insensitive match for the sticky "Search filters" input inside the panel. */
export function matchesFilterColumnSearch(column: Pick<FilterColumn, 'label'>, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return column.label.toLowerCase().includes(q)
}

/**
 * Single-pass counts of each enum option across the supplied rows, keyed by column key then option string.
 * Designed for memoization over the dataset's rows so opening or typing in the panel stays instant.
 */
export function enumValueCounts<T>(
  rows: readonly T[],
  columns: readonly FilterColumn[],
  raw: (row: T, key: string) => unknown,
): Record<string, Record<string, number>> {
  const enumCols = columns.filter((c) => c.type === 'enum')
  const result: Record<string, Record<string, number>> = {}
  for (const col of enumCols) {
    const bucket: Record<string, number> = {}
    for (const opt of col.options ?? []) bucket[opt] = 0
    result[col.key] = bucket
  }
  if (enumCols.length === 0) return result

  for (const row of rows) {
    for (const col of enumCols) {
      const value = raw(row, col.key)
      const key = value == null ? '' : String(value)
      if (!key) continue
      const bucket = result[col.key]
      bucket[key] = (bucket[key] ?? 0) + 1
    }
  }
  return result
}

/** Ordered option values to render inside an enum filter section. */
export function enumOptionsForColumn(column: FilterColumn, counts?: Record<string, number>): string[] {
  if (column.options && column.options.length > 0) return [...column.options]
  return Object.keys(counts ?? {})
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

/** Active badge count for one filterable column in the side panel (enum selected count, or 1). */
export function activeFilterCountForColumn(filters: readonly GridFilter[], key: string): number {
  let total = 0
  for (const f of filters) {
    if (f.key !== key || filterIsBlank(f)) continue
    total += Array.isArray(f.value) ? f.value.length : 1
  }
  return total
}

/** Replace, insert, or remove (when blank) the single filter entry owned by a column section. */
export function upsertColumnFilter(
  filters: readonly GridFilter[],
  next: Omit<GridFilter, 'id'>,
  nextId: () => string,
): GridFilter[] {
  if (filterIsBlank(next)) return clearColumnFilter(filters, next.key)
  let updated = false
  const out: GridFilter[] = []
  for (const f of filters) {
    if (f.key !== next.key) {
      out.push(f)
    } else if (!updated) {
      out.push({ ...next, id: f.id })
      updated = true
    }
  }
  if (!updated) out.push({ ...next, id: nextId() })
  return out
}

/** Toggle one enum option in a column's filter, keeping or clearing the filter as needed. */
export function toggleEnumFilterValue(
  filters: readonly GridFilter[],
  column: FilterColumn,
  option: string,
  op: Extract<FilterOp, 'isAny' | 'isNot'> | undefined,
  nextId: () => string,
): GridFilter[] {
  const existing = filters.find((f) => f.key === column.key)
  const current = existing && Array.isArray(existing.value) ? existing.value : []
  const nextValues = current.includes(option) ? current.filter((v) => v !== option) : [...current, option]
  const resolvedOp: Extract<FilterOp, 'isAny' | 'isNot'> =
    op ?? (existing?.op === 'isAny' || existing?.op === 'isNot' ? existing.op : 'isAny')
  return upsertColumnFilter(filters, { key: column.key, op: resolvedOp, value: nextValues }, nextId)
}

/** Remove all filters belonging to a single column. */
export function clearColumnFilter(filters: readonly GridFilter[], key: string): GridFilter[] {
  return filters.filter((f) => f.key !== key)
}

/** True when a 320 px inline panel can sit beside the grid (and preview drawer, if open) without cramping. */
export function shouldDockFilterPanelInline(containerWidth: number, hasPreviewDrawer: boolean): boolean {
  const drawerCost = hasPreviewDrawer ? PREVIEW_DRAWER_MAX_WIDTH + FILTER_PANEL_GAP : 0
  return containerWidth >= FILTER_PANEL_WIDTH + FILTER_PANEL_GAP + MIN_GRID_WIDTH_BESIDE_PANEL + drawerCost
}
