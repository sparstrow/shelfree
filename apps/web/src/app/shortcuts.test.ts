import { describe, expect, it } from 'vitest'
import { SHORTCUT_GROUPS, filterShortcuts } from './shortcuts'

const lines = (query: string) => filterShortcuts(SHORTCUT_GROUPS, query).flatMap((g) => g.items.map((s) => `${g.id}:${s.combo}`))

describe('shortcut catalogue', () => {
  it('has unique group ids and no empty groups', () => {
    const ids = SHORTCUT_GROUPS.map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(SHORTCUT_GROUPS.every((g) => g.items.length > 0 && g.items.every((s) => s.combo && s.desc))).toBe(true)
  })

  it('reads page shortcuts from the page’s own metadata', () => {
    expect(lines('')).toContain('purchase-orders:R')
    expect(lines('')).toContain('purchase-prices:Shift + P')
    expect(lines('')).toContain('purchase-prices:T')
  })

  it('lists the list-page, record-page and data-grid keys', () => {
    expect(lines('')).toContain('charges:N')
    expect(lines('')).toContain('record-page:[ / ]')
    expect(lines('')).toContain('data-grid:Alt + ← / Alt + →')
  })

  it('filters by every word, across title, combo and description', () => {
    expect(lines('')).not.toEqual([])
    expect(filterShortcuts(SHORTCUT_GROUPS, '').length).toBe(SHORTCUT_GROUPS.length)
    expect(lines('goods-in receipt')).toContain('purchase-orders:R')
    expect(lines('units of measure delete')).toContain('settings-uom:Delete')
    expect(lines('zzzz nothing')).toEqual([])
  })
})
