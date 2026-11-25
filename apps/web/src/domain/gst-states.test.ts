import { describe, expect, it } from 'vitest'
import { GST_STATES, gstStateByCode, gstStateByName, vendorTaxState } from './gst'
import { checkGstin, gstinCheckChar, gstinSplit, partiesText, partyCounts, sortStates, stateSplitText, stateTypeLabel } from './gst-states'

describe('GST states table (lookups unchanged)', () => {
  it('has the 38 codes plus 96 and 97', () => {
    expect(GST_STATES).toHaveLength(40)
    expect(GST_STATES.filter((s) => s.legacy).map((s) => s.code)).toEqual(['25', '28'])
  })

  it('resolves codes and names as before', () => {
    expect(gstStateByCode('33')?.name).toBe('Tamil Nadu')
    expect(gstStateByCode(4)?.name).toBe('Chandigarh')
    expect(gstStateByCode('99')).toBeNull()
    expect(gstStateByName('tamil nadu')?.code).toBe('33')
    expect(gstStateByName('TS')?.code).toBe('36')
    expect(gstStateByName('Andhra Pradesh')?.code).toBe('37')
    expect(gstStateByName('Daman and Diu')).toBeNull()
    expect(vendorTaxState({ gstin: '33AAFCK5100M1Z0', state: 'Karnataka' })?.name).toBe('Tamil Nadu')
    expect(vendorTaxState({ gstin: '', state: 'Karnataka' })?.code).toBe('29')
  })

  it('classifies same-state tax by type', () => {
    expect(stateSplitText(gstStateByCode('33'))).toBe('CGST + SGST')
    expect(stateSplitText(gstStateByCode('07'))).toBe('CGST + SGST')
    expect(stateSplitText(gstStateByCode('04'))).toBe('CGST + UTGST')
    expect(stateSplitText(gstStateByCode('97'))).toBe('CGST + UTGST')
    expect(stateSplitText(gstStateByCode('96'))).toBe('IGST only')
    expect(stateSplitText(null)).toBe('—')
    expect(stateTypeLabel(gstStateByCode('34')!)).toBe('UT with legislature')
  })

  it('sorts retired codes last', () => {
    const codes = sortStates(GST_STATES).map((s) => s.code)
    expect(codes.slice(-2)).toEqual(['25', '28'])
    expect(codes[0]).toBe('01')
  })
})

describe('party counts', () => {
  it('counts by resolved state and ignores unknown names', () => {
    const counts = partyCounts([{ state: 'Tamil Nadu' }, { state: 'TN' }, { state: 'Nowhere' }], [{ state: 'Tamil Nadu' }, { state: 'Kerala' }])
    expect(counts.get('33')).toEqual({ vendors: 2, customers: 1 })
    expect(counts.get('32')).toEqual({ vendors: 0, customers: 1 })
    expect(partiesText(counts.get('33'))).toBe('2 vendors and 1 customer')
    expect(partiesText(undefined)).toBe('')
  })
})

describe('GSTIN check', () => {
  const stem = '33AABCS1001K1Z'
  const valid = stem + gstinCheckChar(`${stem}0`)

  it('works out the check character', () => {
    expect(gstinCheckChar('33ABCDE1234F1Z0')).toBe('7')
  })

  it('empty, partial and bad state codes', () => {
    expect(checkGstin('  ').status).toBe('empty')
    expect(checkGstin('3').status).toBe('empty')
    expect(checkGstin('X').status).toBe('invalid')
    expect(checkGstin('99AAA').status).toBe('invalid')
    expect(checkGstin('96AABCS1001K1Z5').status).toBe('invalid')
    const partial = checkGstin('33aab')
    expect(partial.status).toBe('partial')
    if (partial.status === 'partial') expect(partial.message).toBe('Keep typing — 5 of 15 characters.')
  })

  it('invalid pattern', () => {
    expect(checkGstin('33AABCS1001K1X5').status).toBe('invalid')
  })

  it('valid, with and without a typo in the check character', () => {
    expect(checkGstin(valid.toLowerCase())).toMatchObject({ status: 'valid', pan: 'AABCS1001K', warning: '', typo: false })
    const bad = valid.slice(0, 14) + (valid[14] === '0' ? '1' : '0')
    expect(checkGstin(bad)).toMatchObject({ status: 'valid', typo: true })
  })

  it('a retired state code reads as a warning, not a typo', () => {
    const r = checkGstin('28AABCS1001K1Z5')
    expect(r).toMatchObject({ status: 'valid', typo: false })
    if (r.status === 'valid') expect(r.warning).toContain('Retired')
  })

  it('splits against our state', () => {
    const tn = gstStateByCode('33')!
    const ka = gstStateByCode('29')!
    expect(gstinSplit(tn, tn)).toEqual({ same: true, text: 'Same state as you → CGST + SGST' })
    expect(gstinSplit(tn, ka)).toEqual({ same: false, text: 'TN → KA · IGST' })
    expect(gstinSplit(null, ka).same).toBe(false)
  })
})
