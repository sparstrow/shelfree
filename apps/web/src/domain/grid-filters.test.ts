import { describe, expect, it } from 'vitest'
import {
  type FilterColumn,
  type GridFilter,
  filterIsBlank,
  matchFilter,
} from '@/components/data-grid/model'
import {
  activeFilterCountForColumn,
  clearColumnFilter,
  enumOptionsForColumn,
  enumValueCounts,
  filterPanelSubtitle,
  initialOpenFilterSections,
  matchesFilterColumnSearch,
  shouldDockFilterPanelInline,
  toggleEnumFilterValue,
  upsertColumnFilter,
} from './grid-filters'

const makeId = () => {
  let n = 0
  return () => `f-${++n}`
}

const COLS: FilterColumn[] = [
  { key: 'status', label: 'Status', type: 'enum', options: ['Draft', 'Issued', 'Received', 'Cancelled'] },
  { key: 'vendorName', label: 'Vendor', type: 'text' },
  { key: 'total', label: 'Total', type: 'num' },
  { key: 'orderDate', label: 'Order date', type: 'date' },
]

interface SampleRow {
  status: string
  vendorName: string
  total: number
  orderDate: string
}

const ROWS: SampleRow[] = [
  { status: 'Draft', vendorName: 'Kailash Ceramics', total: 1200, orderDate: '2026-11-01' },
  { status: 'Issued', vendorName: 'Arunachala Clay', total: 4500, orderDate: '2026-11-10' },
  { status: 'Issued', vendorName: 'Sri Brass', total: 8000, orderDate: '2026-11-18' },
  { status: 'Cancelled', vendorName: 'Kailash Ceramics', total: 500, orderDate: '2026-10-20' },
]

describe('grid-filters domain helpers', () => {
  it('formats the header subtitle', () => {
    expect(filterPanelSubtitle(0)).toBe('Narrow down the list')
    expect(filterPanelSubtitle(1)).toBe('1 filter active')
    expect(filterPanelSubtitle(3)).toBe('3 filters active')
  })

  it('starts sections open only for columns with active filters', () => {
    const open = initialOpenFilterSections([
      { key: 'status' },
      { key: 'total' },
      { key: 'status' },
    ])
    expect([...open]).toEqual(['status', 'total'])
    expect(initialOpenFilterSections([]).size).toBe(0)
  })

  it('matches column labels case-insensitively with trimmed queries', () => {
    const col = COLS[1]
    expect(matchesFilterColumnSearch(col, '')).toBe(true)
    expect(matchesFilterColumnSearch(col, '  ven  ')).toBe(true)
    expect(matchesFilterColumnSearch(col, 'VENDOR')).toBe(true)
    expect(matchesFilterColumnSearch(col, 'status')).toBe(false)
  })

  it('counts enum values across current rows in one pass, keeping zero counts for unused options', () => {
    const counts = enumValueCounts(ROWS, COLS, (row, key) => row[key as keyof SampleRow])
    expect(counts).toEqual({
      status: {
        Draft: 1,
        Issued: 2,
        Received: 0,
        Cancelled: 1,
      },
    })
  })

  it('derives enum options from explicit options or discovered counts', () => {
    expect(enumOptionsForColumn(COLS[0], { Draft: 1 })).toEqual(['Draft', 'Issued', 'Received', 'Cancelled'])
    expect(enumOptionsForColumn({ key: 'cat', label: 'Category', type: 'enum' }, { Clay: 2, Brass: 1 })).toEqual([
      'Brass',
      'Clay',
    ])
  })

  it('toggles enum filter values cleanly and removes the filter when unchecked down to zero', () => {
    const nextId = makeId()
    let filters: GridFilter[] = []
    filters = toggleEnumFilterValue(filters, COLS[0], 'Draft', undefined, nextId)
    expect(filters).toEqual([{ id: 'f-1', key: 'status', op: 'isAny', value: ['Draft'] }])

    filters = toggleEnumFilterValue(filters, COLS[0], 'Issued', 'isNot', nextId)
    expect(filters).toEqual([{ id: 'f-1', key: 'status', op: 'isNot', value: ['Draft', 'Issued'] }])

    expect(activeFilterCountForColumn(filters, 'status')).toBe(2)

    filters = toggleEnumFilterValue(filters, COLS[0], 'Draft', undefined, nextId)
    filters = toggleEnumFilterValue(filters, COLS[0], 'Issued', undefined, nextId)
    expect(filters).toEqual([])
    expect(activeFilterCountForColumn(filters, 'status')).toBe(0)
  })

  it('upserts and clears column filters while preserving existing ids', () => {
    const nextId = makeId()
    let filters: GridFilter[] = []
    filters = upsertColumnFilter(filters, { key: 'vendorName', op: 'contains', value: 'Kailash' }, nextId)
    filters = upsertColumnFilter(filters, { key: 'total', op: 'between', value: '1000', value2: '5000' }, nextId)
    expect(filters.map((f) => f.id)).toEqual(['f-1', 'f-2'])

    filters = upsertColumnFilter(filters, { key: 'vendorName', op: 'startsWith', value: 'Kail' }, nextId)
    expect(filters[0]).toEqual({ id: 'f-1', key: 'vendorName', op: 'startsWith', value: 'Kail' })

    // Blanking out a filter removes it instead of storing a dead chip.
    filters = upsertColumnFilter(filters, { key: 'vendorName', op: 'contains', value: '   ' }, nextId)
    expect(filters).toHaveLength(1)

    expect(clearColumnFilter(filters, 'total')).toEqual([])
  })

  it('counts non-blank single filters as 1 and ignores blank filters', () => {
    const filters: GridFilter[] = [
      { id: '1', key: 'total', op: '>', value: '' },
      { id: '2', key: 'vendorName', op: 'isEmpty', value: '' },
    ]
    expect(activeFilterCountForColumn(filters, 'total')).toBe(0)
    expect(activeFilterCountForColumn(filters, 'vendorName')).toBe(1)
  })

  it('decides inline docking vs Sheet based on available container width and preview drawer state', () => {
    expect(shouldDockFilterPanelInline(1150, false)).toBe(true)
    expect(shouldDockFilterPanelInline(1150, true)).toBe(true)
    expect(shouldDockFilterPanelInline(900, true)).toBe(false)
    expect(shouldDockFilterPanelInline(900, false)).toBe(true)
    expect(shouldDockFilterPanelInline(640, false)).toBe(false)
  })
})

describe('model range & date filter matching', () => {
  it('supports upper-only and closed between bounds for numbers', () => {
    const upperOnly: Omit<GridFilter, 'id'> = { key: 'total', op: 'between', value: '', value2: '1500' }
    expect(filterIsBlank(upperOnly)).toBe(false)
    expect(matchFilter(1200, upperOnly)).toBe(true)
    expect(matchFilter(2000, upperOnly)).toBe(false)

    const closed: Omit<GridFilter, 'id'> = { key: 'total', op: 'between', value: '1000', value2: '5000' }
    expect(matchFilter(4500, closed)).toBe(true)
    expect(matchFilter(8000, closed)).toBe(false)
  })

  it('supports single date comparisons and inclusive date ranges', () => {
    expect(matchFilter('2026-11-10', { key: 'orderDate', op: '=', value: '2026-11-10' })).toBe(true)
    expect(matchFilter('2026-11-10', { key: 'orderDate', op: '>', value: '2026-11-01' })).toBe(true)
    expect(matchFilter('2026-11-10', { key: 'orderDate', op: '<', value: '2026-11-05' })).toBe(false)
    expect(
      matchFilter('2026-11-10', { key: 'orderDate', op: 'between', value: '2026-11-01', value2: '2026-11-18' }),
    ).toBe(true)
    expect(
      matchFilter('2026-11-20', { key: 'orderDate', op: 'between', value: '', value2: '2026-11-18' }),
    ).toBe(false)
  })
})
