import { api } from '@/data/api'
import { migrateLegacyFavorites } from './favorites'

const UI_KEY = 'shelfree.v2.ui'

describe('moving the first build’s page favourites into the favorites collection', () => {
  it('copies them in order, drops them from the UI preferences, and does nothing the second time', async () => {
    localStorage.setItem(
      UI_KEY,
      JSON.stringify({
        state: {
          theme: 'light',
          favorites: [
            { moduleId: 'purchasing', slug: 'vendors' },
            { moduleId: 'warehouse', slug: 'items' },
            { nonsense: true },
          ],
        },
        version: 1,
      }),
    )
    migrateLegacyFavorites()

    const moved = (await api.favorites.list()).sort((a, b) => a.order - b.order)
    expect(moved.map((f) => [f.kind, f.module, f.page, f.order])).toEqual([
      ['page', 'purchasing', 'vendors', 0],
      ['page', 'warehouse', 'items', 1],
    ])
    const left = JSON.parse(localStorage.getItem(UI_KEY) ?? '{}')
    expect(left.state.favorites).toBeUndefined()
    expect(left.state.theme).toBe('light')

    migrateLegacyFavorites()
    expect(await api.favorites.list()).toHaveLength(2)
  })

  it('leaves everything alone when there is nothing to move', () => {
    localStorage.setItem(UI_KEY, JSON.stringify({ state: { theme: 'dark' }, version: 1 }))
    migrateLegacyFavorites()
    expect(JSON.parse(localStorage.getItem(UI_KEY) ?? '{}')).toEqual({ state: { theme: 'dark' }, version: 1 })
  })
})
