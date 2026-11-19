import { describe, expect, it } from 'vitest'
import {
  type GridDefaults,
  dedupeViewName,
  isViewDirty,
  snapshotFromView,
  viewDataFromSnapshot,
  viewsForPage,
  withDefaultView,
} from './saved-views'

const defaults: GridDefaults = {
  columns: [
    { key: 'no', width: 120, visible: true, frozen: 'left' },
    { key: 'vendor', width: 200, visible: true },
    { key: 'phone', width: 140, visible: false },
  ],
  sort: { key: 'no', dir: 'asc' },
}

describe('dedupeViewName', () => {
  it('keeps a free name', () => expect(dedupeViewName('Open', ['Late'])).toBe('Open'))
  it('numbers a taken name from 2', () => expect(dedupeViewName('Open', ['Open'])).toBe('Open 2'))
  it('skips numbers already taken', () => expect(dedupeViewName('Open', ['Open', 'Open 2'])).toBe('Open 3'))
})

describe('viewsForPage', () => {
  it('keeps one page, oldest first', () => {
    const list = [
      { id: 'b', pageKey: 'p', createdAt: 2 },
      { id: 'x', pageKey: 'q', createdAt: 1 },
      { id: 'a', pageKey: 'p', createdAt: 1 },
    ]
    expect(viewsForPage(list, 'p').map((v) => v.id)).toEqual(['a', 'b'])
  })
})

describe('view <-> grid state', () => {
  it('round-trips filters, sorts, columns and density', () => {
    const snap = {
      filters: [{ key: 'vendor', op: 'contains', value: 'Kai' }],
      sorts: [{ key: 'vendor', dir: 'desc' as const }],
      hidden: ['vendor'],
      compact: false,
    }
    const data = viewDataFromSnapshot(snap, defaults)
    expect(data.density).toBe('default')
    expect(data.columns.find((c) => c.key === 'phone')?.visible).toBe(true)
    expect(data.columns.find((c) => c.key === 'no')?.frozen).toBe('left')
    const back = snapshotFromView(data, defaults)
    expect(back.filters).toEqual(snap.filters)
    expect(back.sorts).toEqual(snap.sorts)
    expect(back.hidden).toEqual(['vendor'])
    expect(back.compact).toBe(false)
  })

  it('leaves a column the view does not know at its default, and falls back to the default sort', () => {
    const data = {
      filters: [],
      sorts: [],
      columns: [{ key: 'no', width: 120, visible: true, frozen: null }],
      density: 'compact' as const,
      groupBy: null,
      collapsed: [],
    }
    const snap = snapshotFromView(data, defaults)
    expect(snap.hidden).toEqual(['phone'])
    expect(snap.sorts).toEqual([{ key: 'no', dir: 'asc' }])
    expect(snap.compact).toBe(true)
  })
})

describe('isViewDirty', () => {
  const current = {
    filters: [{ key: 'a', op: 'contains', value: 'x' }],
    sorts: [{ key: 'no', dir: 'asc' as const }],
    hidden: ['b', 'c'],
    compact: true,
  }
  it('is clean when everything matches (hidden in any order)', () => {
    expect(isViewDirty({ ...current, hidden: ['c', 'b'] }, current)).toBe(false)
  })
  it('notices a changed filter value', () => {
    expect(isViewDirty({ ...current, filters: [{ key: 'a', op: 'contains', value: 'y' }] }, current)).toBe(true)
  })
  it('treats a missing value as empty', () => {
    const blank = { ...current, filters: [{ key: 'a', op: 'contains' }] }
    expect(isViewDirty(blank, { ...current, filters: [{ key: 'a', op: 'contains', value: '' }] })).toBe(false)
  })
  it('notices sort, columns and density', () => {
    expect(isViewDirty({ sorts: [{ key: 'no', dir: 'desc' }] }, current)).toBe(true)
    expect(isViewDirty({ hidden: ['b'] }, current)).toBe(true)
    expect(isViewDirty({ compact: false }, current)).toBe(true)
  })
  it('only compares what the baseline names', () => {
    expect(isViewDirty({ filters: current.filters }, { ...current, compact: false, hidden: [] })).toBe(false)
  })
})

describe('withDefaultView', () => {
  const views = [
    { id: 'a', pageKey: 'p', isDefaultFor: true },
    { id: 'b', pageKey: 'p', isDefaultFor: false },
    { id: 'c', pageKey: 'q', isDefaultFor: true },
  ]
  it('moves the default within the page only', () => {
    const next = withDefaultView(views, 'b', true)
    expect(next.map((v) => v.isDefaultFor)).toEqual([false, true, true])
  })
  it('clears it', () => {
    expect(withDefaultView(views, 'a', false).map((v) => v.isDefaultFor)).toEqual([false, false, true])
  })
  it('ignores an unknown id', () => expect(withDefaultView(views, 'zz', true)).toEqual(views))
})
