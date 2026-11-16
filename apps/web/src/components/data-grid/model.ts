/**
 * Data-grid model: what a dataset is, and the pure row pipeline
 * (search → filter → sort → page → aggregate). No React in this file.
 *
 * Mirrors the prototype's generic grid so every list page behaves the same:
 * a dataset declares its columns plus how to read a raw (sortable/filterable)
 * value and a display text for each cell.
 */

export type ColumnType = 'mono' | 'text' | 'pill' | 'num'
export type AggFmt = 'int' | 'money'

export interface GridColumn {
  key: string
  label: string
  /** Default width / minimum width, px. */
  width: number
  min: number
  frozen?: 'left' | 'right' | false
  /** Shown by default. */
  visible: boolean
  align: 'left' | 'right'
  type: ColumnType
  sortable: boolean
  /** Footer aggregate. */
  agg?: 'sum' | null
  aggFmt?: AggFmt | null
  /** Render the value in the muted colour (secondary figures). */
  muted?: boolean
}

export type FilterKind = 'text' | 'enum' | 'num'

export interface FilterColumn {
  key: string
  label: string
  type: FilterKind
  options?: string[]
}

export type FilterOp =
  | 'isAny'
  | 'isNot'
  | 'isEmpty'
  | 'contains'
  | 'equals'
  | 'startsWith'
  | '='
  | '≠'
  | '>'
  | '<'
  | 'between'

export interface GridFilter {
  id: string
  key: string
  op: FilterOp
  value?: string | string[]
  value2?: string
}

export interface GridView {
  id: string
  name: string
  /** Built-in views cannot be renamed or deleted. */
  system?: boolean
  filters: Omit<GridFilter, 'id'>[]
}

export interface SortSpec {
  key: string
  dir: 'asc' | 'desc'
}

export type RawValue = string | number

export interface Dataset<T> {
  id: string
  /** Lower-case nouns for counts and empty states: "purchase order(s)". */
  noun: string
  nounPlural: string
  idOf: (row: T) => string
  columns: GridColumn[]
  /** Value used for sorting, filtering and aggregation. */
  raw: (row: T, key: string) => RawValue
  /** Text shown in the cell and written to exports. */
  text: (row: T, key: string) => string
  /** Lower-cased haystack for the quick search. */
  searchBlob: (row: T) => string
  views: GridView[]
  filterColumns: FilterColumn[]
  defaultSort?: SortSpec
}

export const OPS_BY_KIND: Record<FilterKind, { op: FilterOp; label: string }[]> = {
  enum: [
    { op: 'isAny', label: 'is any of' },
    { op: 'isNot', label: 'is not' },
    { op: 'isEmpty', label: 'is empty' },
  ],
  text: [
    { op: 'contains', label: 'contains' },
    { op: 'equals', label: 'equals' },
    { op: 'startsWith', label: 'starts with' },
    { op: 'isEmpty', label: 'is empty' },
  ],
  num: [
    { op: '=', label: '=' },
    { op: '≠', label: '≠' },
    { op: '>', label: '>' },
    { op: '<', label: '<' },
    { op: 'between', label: 'between' },
  ],
}

export function opLabel(kind: FilterKind, op: FilterOp): string {
  return OPS_BY_KIND[kind].find((o) => o.op === op)?.label ?? op
}

export function defaultFilter(column: FilterColumn, id: string): GridFilter {
  if (column.type === 'enum') return { id, key: column.key, op: 'isAny', value: [] }
  if (column.type === 'num') return { id, key: column.key, op: '>', value: '' }
  return { id, key: column.key, op: 'contains', value: '' }
}

/** A filter with no value yet matches everything (it is still being edited). */
export function filterIsBlank(filter: Omit<GridFilter, 'id'>): boolean {
  if (filter.op === 'isEmpty') return false
  if (Array.isArray(filter.value)) return filter.value.length === 0
  return filter.value === undefined || String(filter.value).trim() === ''
}

export function matchFilter(raw: RawValue, filter: Omit<GridFilter, 'id'>): boolean {
  const { op, value, value2 } = filter
  if (op === 'isEmpty') return raw === '' || raw == null
  if (filterIsBlank(filter)) return true
  if (op === 'isAny') return Array.isArray(value) && value.includes(String(raw))
  if (op === 'isNot') return Array.isArray(value) ? !value.includes(String(raw)) : raw !== value
  const num = Number(raw)
  const v1 = Number(value)
  const v2 = Number(value2)
  if (op === '=') return num === v1
  if (op === '≠') return num !== v1
  if (op === '>') return num > v1
  if (op === '<') return num < v1
  if (op === 'between') {
    if (value2 === undefined || String(value2).trim() === '') return num >= v1
    return num >= Math.min(v1, v2) && num <= Math.max(v1, v2)
  }
  const sr = String(raw).toLowerCase()
  const sv = String(value ?? '').toLowerCase()
  if (op === 'contains') return sr.includes(sv)
  if (op === 'equals') return sr === sv
  if (op === 'startsWith') return sr.startsWith(sv)
  return true
}

export interface PipelineInput<T> {
  rows: readonly T[]
  dataset: Dataset<T>
  search: string
  filters: readonly Omit<GridFilter, 'id'>[]
  sorts: readonly SortSpec[]
}

/** Search + filter + sort. Returns a new array; never mutates `rows`. */
export function applyPipeline<T>({ rows, dataset, search, filters, sorts }: PipelineInput<T>): T[] {
  const q = search.trim().toLowerCase()
  const kept = rows.filter((row) => {
    if (q && !dataset.searchBlob(row).includes(q)) return false
    for (const f of filters) if (!matchFilter(dataset.raw(row, f.key), f)) return false
    return true
  })
  const order = sorts.length ? sorts : [dataset.defaultSort ?? { key: 'no', dir: 'asc' as const }]
  return kept.sort((a, b) => {
    for (const s of order) {
      const dir = s.dir === 'asc' ? 1 : -1
      const va = dataset.raw(a, s.key)
      const vb = dataset.raw(b, s.key)
      const cmp =
        typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va).localeCompare(String(vb))
      if (cmp !== 0) return cmp * dir
    }
    return 0
  })
}

/**
 * Header-click sorting. A plain click cycles one column asc → desc → default;
 * shift-click adds/cycles the column inside a multi-column sort.
 */
export function toggleSort(sorts: readonly SortSpec[], key: string, additive: boolean): SortSpec[] {
  const index = sorts.findIndex((s) => s.key === key)
  if (additive) {
    if (index === -1) return [...sorts, { key, dir: 'asc' }]
    if (sorts[index].dir === 'asc') return sorts.map((s, i) => (i === index ? { key, dir: 'desc' } : s))
    return sorts.filter((_, i) => i !== index)
  }
  if (sorts.length === 1 && index === 0) return sorts[0].dir === 'asc' ? [{ key, dir: 'desc' }] : []
  return [{ key, dir: 'asc' }]
}

export interface PageSlice<T> {
  rows: T[]
  page: number
  pageCount: number
  total: number
}

export function paginate<T>(rows: readonly T[], page: number, pageSize: number): PageSlice<T> {
  const total = rows.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const safe = Math.min(Math.max(0, page), pageCount - 1)
  return { rows: rows.slice(safe * pageSize, safe * pageSize + pageSize), page: safe, pageCount, total }
}

export function sumColumn<T>(rows: readonly T[], dataset: Dataset<T>, key: string): number {
  return rows.reduce((sum, row) => sum + (Number(dataset.raw(row, key)) || 0), 0)
}

/** RFC 4180 CSV of the given columns (display text, as shown in the grid). */
export function toCsv<T>(rows: readonly T[], dataset: Dataset<T>, columns: readonly GridColumn[]): string {
  const esc = (value: string) => (/[",\r\n]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value)
  const head = columns.map((c) => esc(c.label)).join(',')
  const body = rows.map((row) => columns.map((c) => esc(dataset.text(row, c.key))).join(','))
  return [head, ...body].join('\r\n')
}
