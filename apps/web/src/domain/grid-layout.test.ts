import { describe, expect, it } from 'vitest'
import {
  type ColumnLayout,
  aggKindsFor,
  aggregate,
  findMatches,
  fitWidth,
  groupRows,
  groupSections,
  moveColumn,
  normalizeOrder,
  resolveColumns,
  shiftColumn,
  stepMatch,
  togglePin,
  visibleGroupRows,
  withOverride,
} from './grid-layout'

const cols = [
  { key: 'no', width: 100, min: 80, frozen: 'left' as const },
  { key: 'name', width: 200, min: 80 },
  { key: 'qty', width: 90, min: 60 },
  { key: 'status', width: 110, min: 80 },
]
const base: ColumnLayout = { order: [], widths: {}, pins: {} }

describe('column order and pins', () => {
  it('keeps the dataset order, with the default pin first', () => {
    expect(resolveColumns(cols, base, new Set()).map((c) => c.key)).toEqual(['no', 'name', 'qty', 'status'])
  })

  it('drops hidden columns and applies width overrides', () => {
    const shown = resolveColumns(cols, { ...base, widths: { name: 333 } }, new Set(['qty']))
    expect(shown.map((c) => c.key)).toEqual(['no', 'name', 'status'])
    expect(shown[1].width).toBe(333)
  })

  it('groups pinned-left, free, pinned-right and honours explicit unpin', () => {
    const shown = resolveColumns(cols, { ...base, pins: { status: 'left', no: null, qty: 'right' } }, new Set())
    expect(shown.map((c) => [c.key, c.frozen])).toEqual([
      ['status', 'left'],
      ['no', false],
      ['name', false],
      ['qty', 'right'],
    ])
  })

  it('appends columns the saved order does not know and ignores stale keys', () => {
    expect(normalizeOrder(['a', 'b', 'c'], ['c', 'zzz', 'a'])).toEqual(['c', 'a', 'b'])
  })

  it('moves a column to where it is dropped, in both directions', () => {
    const order = ['a', 'b', 'c', 'd']
    expect(moveColumn(order, 'a', 'c')).toEqual(['b', 'c', 'a', 'd'])
    expect(moveColumn(order, 'd', 'b')).toEqual(['a', 'd', 'b', 'c'])
    expect(moveColumn(order, 'b', 'b')).toEqual(order)
  })

  it('shifts one place among the shown columns and stops at the ends', () => {
    const order = ['a', 'b', 'c', 'd']
    expect(shiftColumn(order, ['a', 'c', 'd'], 'c', -1)).toEqual(['c', 'a', 'b', 'd'])
    expect(shiftColumn(order, order, 'd', 1)).toEqual(order)
    expect(shiftColumn(order, order, 'a', -1)).toEqual(order)
  })

  it('toggles a pin and drops the override when it equals the default', () => {
    let pins = togglePin({}, cols[1], 'right')
    expect(pins).toEqual({ name: 'right' })
    pins = togglePin(pins, cols[1], 'right')
    expect(pins).toEqual({})
    expect(togglePin({}, cols[0], 'left')).toEqual({ no: null })
    expect(withOverride({ a: 1 }, 'a', 2, 2)).toEqual({})
  })
})

describe('fitWidth', () => {
  it('fits the longest text, never below the minimum or above the maximum', () => {
    const narrow = fitWidth({ label: 'Qty', texts: ['1', '22'], type: 'num', min: 60 })
    const wide = fitWidth({ label: 'Qty', texts: ['1', 'a much longer cell text here'], type: 'text', min: 60 })
    expect(narrow).toBeGreaterThanOrEqual(60)
    expect(wide).toBeGreaterThan(narrow)
    expect(fitWidth({ label: 'x', texts: ['y'.repeat(500)], type: 'text', min: 60 })).toBe(560)
    expect(fitWidth({ label: 'x', texts: [], type: 'text', min: 150 })).toBe(150)
  })

  it('lets a long header set the width', () => {
    const w = fitWidth({ label: 'Outstanding quantity', texts: ['1'], type: 'num', min: 60 })
    expect(w).toBeGreaterThan(160)
  })
})

describe('grouping', () => {
  const rows = [
    { id: 1, s: 'Open', n: 10 },
    { id: 2, s: 'Closed', n: 2 },
    { id: 3, s: 'Open', n: 1 },
    { id: 4, s: '', n: 5 },
    { id: 5, s: 'Closed', n: 3 },
    { id: 6, s: 'Open', n: 7 },
  ]
  const groups = groupRows(rows, (r) => r.s, (r) => r.s)

  it('orders groups by value with the empty group last and keeps row order', () => {
    expect(groups.map((g) => g.key)).toEqual(['Closed', 'Open', ''])
    expect(groups[1].rows.map((r) => r.id)).toEqual([1, 3, 6])
    expect(groups[2].label).toBe('—')
  })

  it('orders numeric groups numerically', () => {
    const g = groupRows(rows, (r) => r.n, (r) => String(r.n))
    expect(g.map((x) => x.key)).toEqual(['1', '2', '3', '5', '7', '10'])
  })

  it('drops the rows of collapsed groups from the visible list', () => {
    expect(visibleGroupRows(groups, new Set(['Open'])).map((r) => r.id)).toEqual([2, 5, 4])
  })

  it('cuts pages through groups and repeats a header across a page break', () => {
    const page1 = groupSections(groups, new Set(), 0, 3)
    expect(page1.map((s) => [s.key, s.rows.length, s.count])).toEqual([
      ['Closed', 2, 2],
      ['Open', 1, 3],
    ])
    const page2 = groupSections(groups, new Set(), 3, 3)
    expect(page2.map((s) => [s.key, s.rows.length])).toEqual([
      ['Open', 2],
      ['', 1],
    ])
    expect(page2[0].start).toBe(3)
  })

  it('shows a collapsed group header once, in its place, with no rows', () => {
    const collapsed = new Set(['Open'])
    const all = groupSections(groups, collapsed, 0, 20)
    expect(all.map((s) => [s.key, s.collapsed, s.rows.length, s.count])).toEqual([
      ['Closed', false, 2, 2],
      ['Open', true, 0, 3],
      ['', false, 1, 1],
    ])
    // Two visible rows per page: the collapsed header sits at position 2, so it opens page 2.
    expect(groupSections(groups, collapsed, 0, 2).map((s) => s.key)).toEqual(['Closed'])
    expect(groupSections(groups, collapsed, 2, 2).map((s) => s.key)).toEqual(['Open', ''])
  })

  it('puts a trailing collapsed group on the last page', () => {
    const g = groupRows(rows, (r) => r.s, (r) => r.s)
    const sections = groupSections(g, new Set(['']), 0, 20)
    expect(sections.at(-1)).toMatchObject({ key: '', collapsed: true })
  })
})

describe('aggregate', () => {
  const values = [4, '6', '', 'x', 10]
  it('computes each kind over the numeric values', () => {
    expect(aggregate(values, 'sum')).toBe(20)
    expect(aggregate(values, 'avg')).toBeCloseTo(20 / 3)
    expect(aggregate(values, 'min')).toBe(4)
    expect(aggregate(values, 'max')).toBe(10)
    expect(aggregate(values, 'none')).toBeNull()
  })
  it('counts the non-empty values', () => expect(aggregate(values, 'count')).toBe(4))
  it('shows nothing for min / max / avg of no numbers, and 0 for a sum', () => {
    expect(aggregate([], 'max')).toBeNull()
    expect(aggregate(['a'], 'avg')).toBeNull()
    expect(aggregate([], 'sum')).toBe(0)
  })
  it('offers only None and Count for non-numeric columns', () => {
    expect(aggKindsFor('text')).toEqual(['none', 'count'])
    expect(aggKindsFor('num')).toHaveLength(6)
  })
})

describe('find in view', () => {
  const rows = [['PO1', 'Kai Ceramics'], ['PO2', 'Arunachala Packs'], ['PO3', 'kai tools']]
  it('returns positions of rows with a matching cell, ignoring case and outer spaces', () => {
    expect(findMatches(rows, (r) => r, '  KAI ')).toEqual([0, 2])
    expect(findMatches(rows, (r) => r, 'po2')).toEqual([1])
  })
  it('matches nothing for an empty search', () => expect(findMatches(rows, (r) => r, '  ')).toEqual([]))
  it('steps round the ends', () => {
    expect(stepMatch(2, 3, 1)).toBe(0)
    expect(stepMatch(0, 3, -1)).toBe(2)
    expect(stepMatch(0, 0, 1)).toBe(0)
  })
})
