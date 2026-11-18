import { describe, expect, it } from 'vitest'
import {
  PROFILE_STATES,
  gstinStateName,
  isValidEmail,
  isValidPostal,
  panFromGstin,
  panWarning,
  requiredError,
  stateWarning,
} from './business-profile'

describe('business profile rules', () => {
  it('checks email, postal code and required text', () => {
    expect(isValidEmail('ops@kanalora.example')).toBe(true)
    expect(isValidEmail('ops@kanalora')).toBe(false)
    expect(isValidPostal('606601')).toBe(true)
    expect(isValidPostal('60660')).toBe(false)
    expect(isValidPostal('006601')).toBe(false)
    expect(requiredError('  ', 'a name')).toBe('Enter a name.')
    expect(requiredError('Kanalora', 'a name')).toBeNull()
  })

  it('reads PAN and state out of a GSTIN', () => {
    expect(panFromGstin('33ABCDE1234F1Z7')).toBe('ABCDE1234F')
    expect(gstinStateName('33ABCDE1234F1Z7')).toBe('Tamil Nadu')
    expect(gstinStateName('99ABCDE1234F1Z7')).toBeNull()
  })

  it('warns, never blocks, on a doubtful PAN or state', () => {
    expect(panWarning('ABCDE1234F', '33ABCDE1234F1Z7')).toBeNull()
    expect(panWarning('', '33ABCDE1234F1Z7')).toBeNull()
    expect(panWarning('abc', '33ABCDE1234F1Z7')).toMatch(/5 letters/)
    expect(panWarning('ZZZZZ9999Z', '33ABCDE1234F1Z7')).toMatch(/differs/)
    expect(stateWarning('Tamil Nadu', '33ABCDE1234F1Z7')).toBeNull()
    expect(stateWarning('Kerala', '33ABCDE1234F1Z7')).toBe('Your GSTIN is registered in Tamil Nadu.')
  })

  it('offers current states only', () => {
    expect(PROFILE_STATES).toContain('Tamil Nadu')
    expect(PROFILE_STATES).not.toContain('Daman and Diu')
    expect(PROFILE_STATES).not.toContain('Foreign country')
  })
})
