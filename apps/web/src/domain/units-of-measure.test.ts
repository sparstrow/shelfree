import { describe, expect, it } from 'vitest'
import {
  DEFAULT_UNITS,
  type Uom,
  allUnits,
  blankDraft,
  codeLocked,
  conversionText,
  countByUnit,
  deleteBlockReason,
  draftFromUnit,
  factorFromConv,
  filterUnits,
  formatFactor,
  sizeInBase,
  suggestUqc,
  unitFromDraft,
  uqcLabel,
  validateDraft,
} from './units-of-measure'

const pnl: Uom = { code: 'PNL', name: 'Panel', cat: 'count', uqc: 'NOS', conv: '1 PNL = 1 NOS', sym: '', custom: true }
const rft: Uom = { code: 'RFT', name: 'Running Feet', cat: 'length', uqc: 'OTH', conv: '1 RFT = 0.305 M', sym: 'rft', custom: true }
const all = allUnits([pnl, rft])

describe('units of measure', () => {
  it('every default unit has a UQC code and a conversion text', () => {
    expect(DEFAULT_UNITS.length).toBe(34)
    expect(new Set(DEFAULT_UNITS.map((u) => u.code)).size).toBe(34)
    expect(DEFAULT_UNITS.every((u) => !u.custom && u.uqc && u.conv)).toBe(true)
  })

  it('formats conversions and labels', () => {
    expect(conversionText('BX12', 12, 'count')).toBe('1 BX12 = 12 NOS')
    expect(conversionText('PNL', null, 'count')).toBe('—')
    expect(conversionText('PNL', 0, 'count')).toBe('—')
    expect(formatFactor(0.30479)).toBe('0.305')
    expect(formatFactor(1234.5)).toBe('1,234.5')
    expect(uqcLabel('KGS')).toBe('KGS · Kilograms')
    expect(uqcLabel('ZZZ')).toBe('ZZZ · —')
    expect(suggestUqc('weight')).toBe('KGS')
    expect(suggestUqc('nope')).toBe('OTH')
  })

  it('reads the factor back out of a stored conversion', () => {
    expect(factorFromConv('1 RFT = 0.305 M')).toBe('0.305')
    expect(factorFromConv('1 CCM = 1,000,000 X')).toBe('1000000')
    expect(factorFromConv('Item-defined')).toBe('')
    expect(factorFromConv('—')).toBe('')
  })

  it('works out the size in base units, following chains', () => {
    expect(sizeInBase('NOS', all)).toBe(1)
    expect(sizeInBase('DOZ', all)).toBe(12)
    expect(sizeInBase('G', all)).toBeCloseTo(0.001)
    expect(sizeInBase('MG', all)).toBeCloseTo(0.000001)
    expect(sizeInBase('RFT', all)).toBeCloseTo(0.305)
    expect(sizeInBase('BOX', all)).toBeNull()
    expect(sizeInBase('NOPE', all)).toBeNull()
  })

  it('stops on a circular conversion chain', () => {
    const a: Uom = { ...pnl, code: 'AAA', conv: '1 AAA = 2 BBB' }
    const b: Uom = { ...pnl, code: 'BBB', conv: '1 BBB = 2 AAA' }
    expect(sizeInBase('AAA', [a, b])).toBeNull()
  })

  it('validates a draft: required, format, duplicates, factor', () => {
    expect(validateDraft(blankDraft(), all, null)).toEqual({
      code: 'Enter a short code (e.g. PNL).',
      name: 'Enter a name for the unit.',
    })
    expect(validateDraft({ ...blankDraft(), code: 'pnl', name: 'x' }, all, null).code).toMatch(/already exists/)
    expect(validateDraft({ ...blankDraft(), code: 'pnl', name: 'x' }, all, 'PNL').code).toBeUndefined()
    expect(validateDraft({ ...blankDraft(), code: 'TOO LONG CODE', name: 'x' }, all, null).code).toMatch(/Letters and numbers/)
    expect(validateDraft({ ...blankDraft(), code: 'BX', name: 'Box', factor: '-2' }, all, null).factor).toBeDefined()
    expect(validateDraft({ ...blankDraft(), code: 'BX', name: 'Box', factor: 'abc' }, all, null).factor).toBeDefined()
    expect(validateDraft({ ...blankDraft(), code: 'BX', name: 'Box', factor: '12', sym: 'x' }, all, null)).toEqual({})
  })

  it('builds a custom unit from a draft and back', () => {
    const u = unitFromDraft({ code: ' bx12 ', name: ' Box of 12 ', cat: 'count', uqc: 'BOX', factor: '12', sym: ' bx ' })
    expect(u).toEqual({ code: 'BX12', name: 'Box of 12', cat: 'count', uqc: 'BOX', conv: '1 BX12 = 12 NOS', sym: 'bx', custom: true })
    expect(draftFromUnit(u)).toEqual({ code: 'BX12', name: 'Box of 12', cat: 'count', uqc: 'BOX', factor: '12', sym: 'bx' })
    expect(unitFromDraft({ ...blankDraft(), code: 'one', name: 'One' }).conv).toBe('—')
  })

  it('blocks deleting a default unit or one items still use', () => {
    expect(deleteBlockReason(DEFAULT_UNITS[0], 0)).toMatch(/locked/)
    expect(deleteBlockReason(pnl, 1)).toBe('1 item uses PNL. Change its unit first.')
    expect(deleteBlockReason(pnl, 3)).toBe('3 items use PNL. Change their unit first.')
    expect(deleteBlockReason(pnl, 0)).toBeNull()
  })

  it('fixes the code once an item uses the unit', () => {
    expect(codeLocked(0)).toBe(false)
    expect(codeLocked(2)).toBe(true)
  })

  it('filters by category and by code, name, UQC or category', () => {
    expect(filterUnits(all, { cat: 'area', query: '' })).toHaveLength(5)
    expect(filterUnits(all, { cat: 'all', query: 'panel' }).map((u) => u.code)).toEqual(['PNL'])
    expect(filterUnits(all, { cat: 'all', query: 'kgs' }).map((u) => u.code)).toEqual(['KG'])
    expect(filterUnits(all, { cat: 'length', query: 'rft' }).map((u) => u.code)).toEqual(['RFT'])
  })

  it('counts items per unit', () => {
    expect(countByUnit([{ uom: 'NOS' }, { uom: 'NOS' }, { uom: 'KG' }]).get('NOS')).toBe(2)
  })
})
