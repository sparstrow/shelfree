import { describe, expect, it } from 'vitest'
import {
  REGIONAL_DEFAULTS,
  fiscalStartMonth,
  fiscalYearLabel,
  formatDateAs,
  formatMoneyAs,
  formatNumberAs,
  normalizeRegional,
} from './regional'

describe('fiscalYearLabel', () => {
  it('April start: before April belongs to the year that began the previous April', () => {
    expect(fiscalYearLabel(new Date(2026, 10, 25), 'April')).toBe('2026-27')
    expect(fiscalYearLabel(new Date(2027, 1, 12), 'April')).toBe('2026-27')
    expect(fiscalYearLabel(new Date(2027, 3, 1), 'April')).toBe('2027-28')
  })
  it('January start is the calendar year', () => {
    expect(fiscalYearLabel(new Date(2026, 10, 25), 'January')).toBe('2026')
  })
  it('rolls the two-digit end year over a century', () => {
    expect(fiscalYearLabel(new Date(2099, 5, 1), 'April')).toBe('2099-00')
  })
  it('falls back to April for an unknown month', () => {
    expect(fiscalStartMonth('Smarch')).toBe(3)
  })
})

describe('formatNumberAs', () => {
  it('groups lakhs for the Indian format', () => {
    expect(formatNumberAs(1234567.891, '12,34,567.89')).toBe('12,34,567.89')
    expect(formatNumberAs(999, '12,34,567.89')).toBe('999.00')
    expect(formatNumberAs(100000, '12,34,567.89', 0)).toBe('1,00,000')
  })
  it('supports the other separators', () => {
    expect(formatNumberAs(1234567.89, '1,234,567.89')).toBe('1,234,567.89')
    expect(formatNumberAs(1234567.89, '1.234.567,89')).toBe('1.234.567,89')
    expect(formatNumberAs(1234567.89, '1 234 567.89')).toBe('1 234 567.89')
  })
  it('keeps the sign', () => {
    expect(formatNumberAs(-1500, '12,34,567.89')).toBe('-1,500.00')
  })
})

describe('formatMoneyAs / formatDateAs', () => {
  it('puts the currency symbol first', () => {
    expect(formatMoneyAs(123456, 'INR', '12,34,567.89')).toBe('₹1,23,456.00')
    expect(formatMoneyAs(-5, 'USD', '1,234,567.89')).toBe('-$5.00')
  })
  it('formats dates in each pattern', () => {
    expect(formatDateAs('2026-07-05', 'DD/MM/YYYY')).toBe('05/07/2026')
    expect(formatDateAs('2026-07-05', 'MM/DD/YYYY')).toBe('07/05/2026')
    expect(formatDateAs('2026-07-05', 'YYYY-MM-DD')).toBe('2026-07-05')
    expect(formatDateAs('2026-07-05', 'DD-MMM-YYYY')).toBe('05-Jul-2026')
    expect(formatDateAs('nope', 'DD/MM/YYYY')).toBe('')
  })
})

describe('normalizeRegional', () => {
  it('keeps valid values and resets unknown ones', () => {
    expect(normalizeRegional({ currency: 'USD', dateFmt: 'bogus' })).toEqual({ ...REGIONAL_DEFAULTS, currency: 'USD' })
  })
})
