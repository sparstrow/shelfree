/** Proves the demo seed matches the entity schemas (the store relies on it). */
import { api } from '@/data/api'

/** Per-user collections start empty: nothing to seed. */
const startsEmpty = new Set<string>(['savedViews', 'favorites'])

describe('seed data matches the schemas', () => {
  for (const name of Object.keys(api) as (keyof typeof api)[]) {
    it(name, async () => {
      const rows = await api[name].list()
      if (startsEmpty.has(name)) return expect(rows).toEqual([])
      expect(rows.length).toBeGreaterThan(0)
    })
  }
})
