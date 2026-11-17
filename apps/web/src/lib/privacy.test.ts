import { maskPhone } from './privacy'

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
