import { describe, expect, it } from 'vitest'
import { MODULES, visibleModules } from './nav'

describe('visibleModules', () => {
  it('returns every module and page when everything is on', () => {
    const all = visibleModules(
      () => true,
      () => true,
    )
    expect(all.map((m) => m.id)).toEqual(MODULES.map((m) => m.id))
    expect(all.find((m) => m.id === 'production')?.pages.map((p) => p.label)).toContain('Production Orders')
  })

  it('drops a module that is off', () => {
    const mods = visibleModules(
      (id) => id !== 'sales',
      () => true,
    )
    expect(mods.some((m) => m.id === 'sales')).toBe(false)
    expect(mods.some((m) => m.id === 'purchasing')).toBe(true)
  })

  it('hides Production Orders while the production capability is off, and nothing else', () => {
    const mods = visibleModules(
      () => true,
      (key) => key !== 'production',
    )
    const production = mods.find((m) => m.id === 'production')
    expect(production?.pages.map((p) => p.label)).toEqual(['Bills of Materials', 'Assembly Orders'])
    expect(mods.find((m) => m.id === 'purchasing')?.pages).toHaveLength(8)
  })
})
