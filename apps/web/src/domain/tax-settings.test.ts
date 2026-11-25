import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, settingsSchema } from '@/data/api/settings'
import {
  TAX_SETTINGS_DEFAULTS,
  branchPctError,
  normalizeTaxSettings,
  roundOffError,
  roundOffOptions,
} from './tax-settings'

const accounts = [
  { no: '6190', name: 'Round off', type: 'Expense', active: true },
  { no: '4900', name: 'Other income', type: 'Income', active: true },
  { no: '1300', name: 'Inventory', type: 'Asset', active: true },
  { no: '6200', name: 'Retired expense', type: 'Expense', active: false },
]

describe('tax settings defaults', () => {
  it('match the prototype and the stored workspace document', () => {
    expect(TAX_SETTINGS_DEFAULTS).toEqual({
      taxCalc: 'line',
      roundTotal: true,
      roundOffAcct: '6190',
      lineOverride: true,
      mismatchWarn: true,
      paperTransfer: 'warn',
      compInterState: 'warn',
      itcBooking: 'onBill',
      branchValue: 'landed',
      branchPct: 90,
    })
    expect(DEFAULT_SETTINGS.tax).toEqual(TAX_SETTINGS_DEFAULTS)
  })

  it('an older stored document (three tax keys) still parses once merged with the defaults', () => {
    const stored = { taxCalc: 'rate', roundTotal: false, compInterState: 'block' }
    const parsed = settingsSchema.parse({ ...DEFAULT_SETTINGS, tax: { ...DEFAULT_SETTINGS.tax, ...stored } })
    expect(parsed.tax).toMatchObject({ taxCalc: 'rate', roundTotal: false, compInterState: 'block', branchPct: 90 })
  })

  it('refuses a share outside 1–100', () => {
    expect(settingsSchema.safeParse({ ...DEFAULT_SETTINGS, tax: { ...DEFAULT_SETTINGS.tax, branchPct: 0 } }).success).toBe(false)
    expect(settingsSchema.safeParse({ ...DEFAULT_SETTINGS, tax: { ...DEFAULT_SETTINGS.tax, branchPct: 101 } }).success).toBe(false)
  })
})

describe('round-off account', () => {
  it('offers active income and expense accounts only', () => {
    expect(roundOffOptions(accounts, '6190').map((o) => o.value)).toEqual(['4900', '6190'])
  })

  it('keeps a saved account that is no longer offered visible', () => {
    const options = roundOffOptions(accounts, '6200')
    expect(options[0]).toEqual({ value: '6200', label: '6200 · Retired expense (not available)' })
    expect(roundOffOptions(accounts, '9999')[0].label).toBe('9999 (missing)')
  })

  it('is only checked while rounding is on', () => {
    expect(roundOffError('9999', accounts, false)).toBeNull()
    expect(roundOffError('', accounts, true)).toMatch(/Pick an account/)
    expect(roundOffError('9999', accounts, true)).toMatch(/Pick an account/)
    expect(roundOffError('1300', accounts, true)).toMatch(/income or expense/)
    expect(roundOffError('6200', accounts, true)).toMatch(/income or expense/)
    expect(roundOffError('6190', accounts, true)).toBeNull()
  })
})

describe('branch share', () => {
  it('is checked only for a share of selling price', () => {
    expect(branchPctError(0, 'landed')).toBeNull()
    expect(branchPctError(0, 'pctSell')).toMatch(/1 to 100/)
    expect(branchPctError(100.5, 'pctSell')).toMatch(/1 to 100/)
    expect(branchPctError(90.123, 'pctSell')).toMatch(/two decimals/)
    expect(branchPctError(87.5, 'pctSell')).toBeNull()
    expect(branchPctError(1, 'pctSell')).toBeNull()
  })

  it('normalises on save', () => {
    const base = { ...TAX_SETTINGS_DEFAULTS, roundOffAcct: ' 6190 ' }
    expect(normalizeTaxSettings(base).roundOffAcct).toBe('6190')
    expect(normalizeTaxSettings({ ...base, branchValue: 'landed', branchPct: 0 }).branchPct).toBe(1)
    expect(normalizeTaxSettings({ ...base, branchValue: 'pctSell', branchPct: 80 }).branchPct).toBe(80)
  })
})
