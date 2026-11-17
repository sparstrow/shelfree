import { maskEmail, maskPhone } from './privacy'

describe('maskPhone', () => {
  it('masks all but the last 4 digits', () => {
    expect(maskPhone('+91 94421 10287')).toBe('•••• 0287')
    expect(maskPhone('+91 44 2625 8810')).toBe('•••• 8810')
    expect(maskPhone('123')).toBe('•••• 123')
  })

  it('returns empty string when there are no digits', () => {
    expect(maskPhone('')).toBe('')
    expect(maskPhone('no digits')).toBe('')
    expect(maskPhone(null)).toBe('')
    expect(maskPhone(undefined)).toBe('')
  })
})

describe('maskEmail', () => {
  it('masks the local part while keeping the domain', () => {
    expect(maskEmail('orders@kailashceramics.example')).toBe('o••••@kailashceramics.example')
    expect(maskEmail('  Selvi@Kailash.in  ')).toBe('S••••@Kailash.in')
    expect(maskEmail('a@example.com')).toBe('••••@example.com')
  })

  it('returns empty string for empty or malformed emails', () => {
    expect(maskEmail('')).toBe('')
    expect(maskEmail('   ')).toBe('')
    expect(maskEmail('not-an-email')).toBe('')
    expect(maskEmail('@example.com')).toBe('')
    expect(maskEmail('user@')).toBe('')
    expect(maskEmail(null)).toBe('')
    expect(maskEmail(undefined)).toBe('')
  })
})
