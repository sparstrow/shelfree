import { describe, expect, it } from 'vitest'
import {
  TAX_CODE_DEFAULTS,
  blankTaxCode,
  chargeTaxCode,
  draftRates,
  newRateRow,
  nextRate,
  pctText,
  rateStatus,
  rateSummary,
  taxCodeDeactivateBlock,
  taxCodeDeleteBlock,
  taxCodeUsage,
  taxRateOn,
  toTaxCode,
  validateTaxCode,
  type TaxCodeContext,
  type TaxCodeDraft,
} from './tax-codes'
import { CHARGE_GST_RATES } from './charges'
import type { TaxCode } from '@/data/schemas'

const TODAY = '2026-11-25'
const fmt = (iso: string) => `on ${iso}`
const stamps = { createdAt: 'a', updatedAt: 'b' }
const code = (c: string): TaxCode => ({ ...(TAX_CODE_DEFAULTS.find((t) => t.code === c) as TaxCode), ...stamps })
const ctx = (over: Partial<TaxCodeContext> = {}): TaxCodeContext => ({
  mode: 'new',
  today: TODAY,
  usage: { charges: 0, activeCharges: 0 },
  fmt,
  ...over,
})
const draft = (over: Partial<TaxCodeDraft> = {}): TaxCodeDraft => ({
  ...blankTaxCode(TODAY),
  code: 'gst9',
  name: 'GST 9%',
  rates: [{ rate: '9', from: TODAY, locked: false }],
  ...over,
})

describe('seed', () => {
  it('has the five built-in codes and three retired / unused ones, same as the prototype', () => {
    expect(TAX_CODE_DEFAULTS.map((t) => t.code)).toEqual(['GST0', 'GST5', 'GST18', 'GST40', 'GOODS', 'GST3', 'GST12', 'GST28'])
    expect(TAX_CODE_DEFAULTS.filter((t) => t.system).map((t) => t.code)).toEqual(['GST0', 'GST5', 'GST18', 'GST40', 'GOODS'])
    expect(TAX_CODE_DEFAULTS.filter((t) => !t.active).map((t) => t.code)).toEqual(['GST3', 'GST12', 'GST28'])
  })

  it('every rate a charge can carry maps to a seeded code, so charge GST stays the same', () => {
    const codes = new Set(TAX_CODE_DEFAULTS.map((t) => t.code))
    for (const rate of CHARGE_GST_RATES) {
      const c = chargeTaxCode(rate)
      expect(codes.has(c), `${rate} → ${c}`).toBe(true)
      if (c !== 'GOODS') expect(taxRateOn(code(c), TODAY)?.rate).toBe(Number.parseFloat(rate))
    }
  })
})

describe('rates', () => {
  const t: TaxCode = { ...code('GST5'), rates: [{ rate: 18, from: '2027-01-01' }, { rate: 5, from: '2017-07-01' }, { rate: 12, from: '2020-04-01' }] }

  it('reads the row in force on a date, whatever the order', () => {
    expect(taxRateOn(t, '2017-06-30')).toBeNull()
    expect(taxRateOn(t, '2017-07-01')?.rate).toBe(5)
    expect(taxRateOn(t, TODAY)?.rate).toBe(12)
    expect(taxRateOn(t, '2027-01-01')?.rate).toBe(18)
    expect(taxRateOn(code('GOODS'), TODAY)).toBeNull()
  })

  it('finds the next scheduled change and the status of each row', () => {
    expect(nextRate(t, TODAY)).toEqual({ rate: 18, from: '2027-01-01' })
    expect(nextRate(code('GST5'), TODAY)).toBeNull()
    expect(rateStatus(t, { rate: 12, from: '2020-04-01' }, TODAY)).toBe('Current')
    expect(rateStatus(t, { rate: 5, from: '2017-07-01' }, TODAY)).toBe('Past')
    expect(rateStatus(t, { rate: 18, from: '2027-01-01' }, TODAY)).toBe('Scheduled')
  })

  it('summarises for the grid', () => {
    expect(rateSummary(code('GST18'), TODAY, fmt)).toBe('18%')
    expect(rateSummary(t, TODAY, fmt)).toBe('12% → 18% from on 2027-01-01')
    expect(rateSummary(code('GOODS'), TODAY, fmt)).toBe('Follows the goods')
    expect(rateSummary({ kind: 'rate', rates: [{ rate: 7.5, from: '2027-01-01' }] }, TODAY, fmt)).toBe('Starts on 2027-01-01')
    expect(pctText(7.5)).toBe('7.5%')
    expect(pctText(5)).toBe('5%')
  })
})

describe('usage and blocks', () => {
  const charges = [
    { gst: '5%', active: true },
    { gst: '5%', active: false },
    { gst: 'Goods rate', active: true },
    { gst: '18%', active: true },
  ]

  it('maps charge text to codes', () => {
    expect(chargeTaxCode('Goods rate')).toBe('GOODS')
    expect(chargeTaxCode('5%')).toBe('GST5')
    expect(chargeTaxCode('2.5%')).toBe('GST2.5')
    expect(chargeTaxCode('nonsense')).toBe('')
  })

  it('counts charges, active ones separately', () => {
    expect(taxCodeUsage('GST5', charges)).toEqual({ charges: 2, activeCharges: 1 })
    expect(taxCodeUsage('GST40', charges)).toEqual({ charges: 0, activeCharges: 0 })
  })

  it('blocks delete for built-in codes and codes in use', () => {
    expect(taxCodeDeleteBlock({ system: true }, { charges: 0, activeCharges: 0 })).toMatch(/Built-in/)
    expect(taxCodeDeleteBlock({ system: false }, { charges: 2, activeCharges: 1 })).toBe('Used by 2 charges — move them to another code first.')
    expect(taxCodeDeleteBlock({ system: false }, { charges: 1, activeCharges: 1 })).toBe('Used by 1 charge — move it to another code first.')
    expect(taxCodeDeleteBlock({ system: false }, { charges: 0, activeCharges: 0 })).toBeNull()
  })

  it('blocks deactivating while an active charge uses it', () => {
    expect(taxCodeDeactivateBlock({ charges: 2, activeCharges: 0 })).toBeNull()
    expect(taxCodeDeactivateBlock({ charges: 2, activeCharges: 2 })).toBe('Used by 2 active charges — move them to another code first.')
  })
})

describe('validateTaxCode', () => {
  it('accepts a good new code', () => {
    expect(validateTaxCode(draft(), [], ctx())).toEqual({})
  })

  it('checks the code format and uniqueness on create only', () => {
    expect(validateTaxCode(draft({ code: 'x' }), [], ctx()).code).toMatch(/2–12/)
    expect(validateTaxCode(draft({ code: 'has space' }), [], ctx()).code).toMatch(/2–12/)
    expect(validateTaxCode(draft({ code: 'GST5' }), [{ code: 'GST5', name: 'GST 5%' }], ctx()).code).toMatch(/already uses/)
    expect(validateTaxCode(draft({ code: '' }), [], ctx({ mode: 'edit' })).code).toBeUndefined()
  })

  it('needs a unique name', () => {
    expect(validateTaxCode(draft({ name: '  ' }), [], ctx()).name).toBe('Enter a name.')
    expect(validateTaxCode(draft({ name: 'gst 5%' }), [{ code: 'GST5', name: 'GST 5%' }], ctx()).name).toMatch(/already has/)
  })

  it('needs at least one rate, 0–100 with two decimals', () => {
    expect(validateTaxCode(draft({ rates: [] }), [], ctx()).rates).toBe('Add at least one rate.')
    for (const bad of ['', 'x', '101', '1.234', '-1']) {
      const e = validateTaxCode(draft({ rates: [{ rate: bad, from: TODAY, locked: false }] }), [], ctx())
      expect(e['rates.0.rate'], bad).toMatch(/0–100/)
      expect(e.rates).toBe('Fix the highlighted rates.')
    }
    for (const ok of ['0', '5', '12.5', '100', '7.25']) {
      expect(validateTaxCode(draft({ rates: [{ rate: ok, from: TODAY, locked: false }] }), [], ctx())).toEqual({})
    }
  })

  it('needs a date, one rate per date', () => {
    const rows = [
      { rate: '5', from: '2026-01-01', locked: false },
      { rate: '6', from: '2026-01-01', locked: false },
      { rate: '7', from: '', locked: false },
    ]
    const e = validateTaxCode(draft({ rates: rows }), [], ctx())
    expect(e['rates.0.from']).toBeUndefined()
    expect(e['rates.1.from']).toBe('Another rate starts on this date.')
    expect(e['rates.2.from']).toBe('Pick the date it starts.')
  })

  it('a new code may enter history; an existing one may not start a rate in the past', () => {
    const past = draft({ rates: [{ rate: '5', from: '2020-01-01', locked: false }] })
    expect(validateTaxCode(past, [], ctx({ mode: 'new' }))).toEqual({})
    expect(validateTaxCode(past, [], ctx({ mode: 'edit' }))['rates.0.from']).toMatch(/past/)
  })

  it('on edit, locked rows are skipped and new rows start after the last locked row', () => {
    const rows = [
      { rate: 5, from: '2017-07-01', locked: true },
      { rate: '18', from: TODAY, locked: false },
    ]
    expect(validateTaxCode(draft({ rates: rows }), [], ctx({ mode: 'edit' }))).toEqual({})
    const clash = [
      { rate: 5, from: TODAY, locked: true },
      { rate: '18', from: TODAY, locked: false },
    ]
    expect(validateTaxCode(draft({ rates: clash }), [], ctx({ mode: 'edit' }))['rates.1.from']).toBe('Another rate starts on this date.')
    const before = [
      { rate: 5, from: '2026-12-01', locked: true },
      { rate: '18', from: '2026-11-30', locked: false },
    ]
    expect(validateTaxCode(draft({ rates: before }), [], ctx({ mode: 'edit' }))['rates.1.from']).toBe('Must start after on 2026-12-01.')
  })

  it('a goods code has no rate rules', () => {
    expect(validateTaxCode(draft({ kind: 'goods', rates: [] }), [], ctx())).toEqual({})
  })

  it('refuses to deactivate a code an active charge uses', () => {
    const usage = { charges: 1, activeCharges: 1 }
    const e = validateTaxCode(draft({ active: false }), [], ctx({ mode: 'edit', original: { active: true }, usage }))
    expect(e.active).toMatch(/Used by 1 active charge/)
    expect(validateTaxCode(draft({ active: false }), [], ctx({ mode: 'edit', original: { active: false }, usage })).active).toBeUndefined()
    expect(validateTaxCode(draft({ active: true }), [], ctx({ mode: 'edit', original: { active: true }, usage })).active).toBeUndefined()
  })
})

describe('drafts and records', () => {
  it('locks rows that started before today, only when editing', () => {
    const t = { rates: [{ rate: 5, from: '2017-07-01' }, { rate: 18, from: TODAY }, { rate: 12, from: '2027-01-01' }] }
    expect(draftRates(t, TODAY, 'edit').map((r) => r.locked)).toEqual([true, false, false])
    expect(draftRates(t, TODAY, 'new').map((r) => r.locked)).toEqual([false, false, false])
  })

  it('a new rate row starts today, or after the last locked row', () => {
    expect(newRateRow([{ rate: 5, from: '2017-07-01', locked: true }], TODAY)).toEqual({ rate: '', from: TODAY, locked: false })
    expect(newRateRow([{ rate: 5, from: '2026-11-25', locked: true }], TODAY).from).toBe('2026-11-26')
    expect(newRateRow([{ rate: 5, from: '2026-12-31', locked: true }], TODAY).from).toBe('2027-01-01')
  })

  it('builds the stored record: upper-case code, numeric sorted rates, no rates for goods', () => {
    const rec = toTaxCode(
      draft({
        code: ' gst9 ',
        name: ' GST  9% ',
        rates: [
          { rate: '12', from: '2027-01-01', locked: false },
          { rate: '9', from: TODAY, locked: false },
        ],
      }),
      stamps,
    )
    expect(rec).toEqual({
      code: 'GST9',
      name: 'GST 9%',
      kind: 'rate',
      appliesTo: 'Both',
      rates: [
        { rate: 9, from: TODAY },
        { rate: 12, from: '2027-01-01' },
      ],
      desc: '',
      active: true,
      system: false,
      ...stamps,
    })
    expect(toTaxCode(draft({ kind: 'goods' }), stamps).rates).toEqual([])
  })
})
