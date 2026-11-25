import { describe, expect, it } from 'vitest'
import type { Item } from '@/data/schemas'
import { categoryParentNames } from './item-categories'
import {
  DEFAULT_SALES_PRICING_SETTINGS,
  applyPricingSettingsChange,
  buildListPriceRows,
  pricingBlockUnusedNote,
} from './sales-prices'

const base = DEFAULT_SALES_PRICING_SETTINGS

describe('applyPricingSettingsChange', () => {
  it('stamps the cut-off with today when switching to new customers only', () => {
    const next = applyPricingSettingsChange({ ...base, mode: 'all' }, { ...base, mode: 'newOnly' }, '2026-11-25')
    expect(next.newCutoff).toBe('2026-11-25')
  })
  it('keeps the existing cut-off while the mode stays new customers only', () => {
    const prev = { ...base, mode: 'newOnly' as const, newCutoff: '2026-10-01' }
    expect(applyPricingSettingsChange(prev, { ...prev, fallbackToList: true }, '2026-11-25').newCutoff).toBe('2026-10-01')
  })
  it('does not touch the cut-off for other modes', () => {
    const prev = { ...base, mode: 'off' as const, newCutoff: '2026-10-01' }
    expect(applyPricingSettingsChange(prev, { ...prev, mode: 'selected' }, '2026-11-25').newCutoff).toBe('2026-10-01')
  })
})

describe('pricingBlockUnusedNote', () => {
  it('explains the block switch is unused while the fallback is on', () => {
    expect(pricingBlockUnusedNote({ fallbackToList: true })).toMatch(/fallback/)
    expect(pricingBlockUnusedNote({ fallbackToList: false })).toBeNull()
  })
})

describe('buildListPriceRows category grouping', () => {
  const item = { no: 'ITM1', desc: 'x', category: 'Glaze Lab', price: 10, cost: 5, uom: 'EA' } as Item
  it('uses the built-in tree when no parents are given (a custom leaf is its own root)', () => {
    expect(buildListPriceRows([item], [])[0].category).toBe('Glaze Lab')
  })
  it('groups under the parent from the Item categories list', () => {
    const parents = categoryParentNames([
      { id: 'a', name: 'Finished Goods', parent: '' },
      { id: 'b', name: 'Glaze Lab', parent: 'a' },
    ] as never)
    expect(buildListPriceRows([item], [], [], parents)[0].category).toBe('Finished Goods')
  })
})
