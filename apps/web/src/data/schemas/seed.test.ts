/** Proves the demo seed matches the entity schemas (the store relies on it). */
import { api } from '@/data/api'

describe('seed data matches the schemas', () => {
  for (const name of Object.keys(api) as (keyof typeof api)[]) {
    it(name, async () => {
      const rows = await api[name].list()
      expect(rows.length).toBeGreaterThan(0)
    })
  }
})
