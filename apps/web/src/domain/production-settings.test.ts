import { describe, expect, it } from 'vitest'
import { DEFAULT_PRODUCTION_SETTINGS, defaultScrapError, productionLocationError } from './assembly-order'

describe('defaultScrapError', () => {
  it('accepts 0 to 100', () => {
    for (const v of [0, 0.5, 5, 100]) expect(defaultScrapError(v)).toBeNull()
  })
  it('rejects negative, over 100 and non-numbers', () => {
    for (const v of [-1, 100.5, Number.NaN, Number.POSITIVE_INFINITY]) expect(defaultScrapError(v)).toMatch(/0 to 100/)
  })
})

describe('productionLocationError', () => {
  it('requires a site', () => {
    expect(productionLocationError('', 'the output site')).toBe('Choose the output site.')
    expect(productionLocationError('  ', 'x')).not.toBeNull()
    expect(productionLocationError('WH-TVM', 'x')).toBeNull()
  })
})

describe('DEFAULT_PRODUCTION_SETTINGS', () => {
  it('keeps the permissive, auto-backflush defaults', () => {
    expect(DEFAULT_PRODUCTION_SETTINGS).toMatchObject({
      manualConsumption: false,
      allowShortRelease: true,
      allowOverConsume: true,
      defaultScrap: 0,
    })
  })
})
