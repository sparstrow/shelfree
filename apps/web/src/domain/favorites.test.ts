import { describe, expect, it } from 'vitest'
import {
  type FavoriteLike,
  capFavorites,
  dropFavorite,
  favoritesOfView,
  moveFavorite,
  nextFavoriteOrder,
  overflowLabel,
  sortFavorites,
} from './favorites'

const fav = (id: string, order: number, kind: 'page' | 'view' = 'page'): FavoriteLike => ({ id, kind, order })
const ids = (l: FavoriteLike[]) => l.map((f) => f.id)

describe('order', () => {
  it('sorts by order', () => expect(ids(sortFavorites([fav('b', 1), fav('a', 0)]))).toEqual(['a', 'b']))
  it('puts a new favourite last', () => {
    expect(nextFavoriteOrder([])).toBe(0)
    expect(nextFavoriteOrder([fav('a', 0), fav('b', 4)])).toBe(5)
  })
})

describe('dropFavorite', () => {
  const list = [fav('a', 0), fav('b', 1), fav('c', 2)]
  it('drags down onto a row', () => expect(ids(dropFavorite(list, 'a', 'c'))).toEqual(['b', 'c', 'a']))
  it('drags up onto a row', () => expect(ids(dropFavorite(list, 'c', 'a'))).toEqual(['c', 'a', 'b']))
  it('renumbers from zero', () => expect(dropFavorite(list, 'a', 'c').map((f) => f.order)).toEqual([0, 1, 2]))
  it('dropping on itself changes nothing', () => expect(ids(dropFavorite(list, 'b', 'b'))).toEqual(['a', 'b', 'c']))
  it('ignores unknown ids', () => expect(ids(dropFavorite(list, 'zz', 'a'))).toEqual(['a', 'b', 'c']))
})

describe('moveFavorite', () => {
  const list = [fav('a', 0), fav('b', 1), fav('c', 2)]
  it('moves up', () => expect(ids(moveFavorite(list, 'b', -1))).toEqual(['b', 'a', 'c']))
  it('moves down', () => expect(ids(moveFavorite(list, 'b', 1))).toEqual(['a', 'c', 'b']))
  it('stays put at the ends', () => {
    expect(ids(moveFavorite(list, 'a', -1))).toEqual(['a', 'b', 'c'])
    expect(ids(moveFavorite(list, 'c', 1))).toEqual(['a', 'b', 'c'])
  })
})

describe('capFavorites', () => {
  const list = Array.from({ length: 12 }, (_, i) => fav('f' + i, i))
  it('folds past the cap', () => {
    const { shown, overflow } = capFavorites(list, 10, false)
    expect(shown).toHaveLength(10)
    expect(overflow).toBe(true)
  })
  it('shows all on request', () => expect(capFavorites(list, 10, true).shown).toHaveLength(12))
  it('has no overflow within the cap', () => expect(capFavorites(list.slice(0, 10), 10, false).overflow).toBe(false))
  it('labels the toggle', () => {
    expect(overflowLabel(12, false)).toBe('Show all (12)')
    expect(overflowLabel(12, true)).toBe('Show fewer')
  })
})

describe('favoritesOfView', () => {
  it('finds the pointers to one view', () => {
    const list = [{ ...fav('a', 0, 'view'), viewId: 'v1' }, { ...fav('b', 1, 'view'), viewId: 'v2' }, fav('c', 2)]
    expect(ids(favoritesOfView(list, 'v1'))).toEqual(['a'])
  })
})
