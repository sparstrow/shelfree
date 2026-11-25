import { afterEach, describe, expect, it } from 'vitest'
import { settingsApi } from '@/data/api/settings'
import { REGIONAL_DEFAULTS } from '@/domain/regional'

afterEach(() => localStorage.clear())

describe('Regional & format block', () => {
  it('defaults to Kanalora’s regional settings and saves without touching the other blocks', async () => {
    expect((await settingsApi.get()).regional).toEqual(REGIONAL_DEFAULTS)
    await settingsApi.updateTax({ ...(await settingsApi.get()).tax, roundTotal: true })
    await settingsApi.updateRegional({ ...REGIONAL_DEFAULTS, currency: 'USD', numFmt: '1,234,567.89' })
    const got = await settingsApi.get()
    expect(got.regional).toMatchObject({ currency: 'USD', numFmt: '1,234,567.89', fiscalStart: 'April' })
    expect(got.tax.roundTotal).toBe(true)
  })
  it('falls back to the defaults for values it does not know', async () => {
    await settingsApi.updateRegional({ ...REGIONAL_DEFAULTS, dateFmt: 'nonsense' })
    expect((await settingsApi.get()).regional.dateFmt).toBe(REGIONAL_DEFAULTS.dateFmt)
  })
})

describe('Terminology block', () => {
  it('stores overrides, merges onto what is already stored and clears with null', async () => {
    await settingsApi.patchTerms({ 'object.location.singular': 'Store' })
    await settingsApi.patchTerms({ 'object.location.plural': 'Stores', 'module.sales': 'Selling' })
    expect((await settingsApi.get()).terms).toEqual({
      'object.location.singular': 'Store',
      'object.location.plural': 'Stores',
      'module.sales': 'Selling',
    })
    await settingsApi.patchTerms({ 'module.sales': null })
    expect(Object.keys((await settingsApi.get()).terms).sort()).toEqual(['object.location.plural', 'object.location.singular'])
    await settingsApi.resetTerms()
    expect((await settingsApi.get()).terms).toEqual({})
  })
  it('ignores keys the app does not know when reading storage', async () => {
    localStorage.setItem('shelfree.v2.settings', JSON.stringify({ terms: { 'made.up': 'x', 'module.people': 'Staff', 'module.home': '   ' } }))
    expect((await settingsApi.get()).terms).toEqual({ 'module.people': 'Staff' })
  })
})
