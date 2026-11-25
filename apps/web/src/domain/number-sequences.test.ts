import { afterEach, describe, expect, it } from 'vitest'
import { api } from '@/data/api'
import {
  CommandError,
  deleteNumberSequence,
  saveNumberSequence,
  setDefaultNumberSequence,
} from '@/data/api/commands'
import type { NumberSequence } from '@/data/schemas'
import {
  canDeleteSeries,
  formatNumber,
  moduleOfDocType,
  nextSequenceId,
  previewNext,
  setDefault,
  takeNext,
  validateSeries,
} from './number-sequences'

const makeSeries = (over: Partial<NumberSequence> = {}): NumberSequence => ({
  id: 'SEQ00001',
  docType: 'purchase-order',
  module: 'purchasing',
  name: 'Purchase orders',
  prefix: 'PO',
  digits: 5,
  next: 11,
  resets: 'never',
  isDefault: true,
  active: true,
  issued: 10,
  ...over,
})

describe('number sequences domain rules', () => {
  it('maps each document type to its owning module', () => {
    expect(moduleOfDocType('purchase-order')).toBe('purchasing')
    expect(moduleOfDocType('purchase-receipt')).toBe('purchasing')
    expect(moduleOfDocType('sales-order')).toBe('sales')
    expect(moduleOfDocType('sales-invoice')).toBe('sales')
    expect(moduleOfDocType('item')).toBe('warehouse')
    expect(moduleOfDocType('bom')).toBe('production')
    expect(moduleOfDocType('assembly-order')).toBe('production')
    expect(moduleOfDocType('employee')).toBe('people')
  })

  it('formats numbers with minimum padding and optional suffix, and previews next', () => {
    const s = makeSeries({ prefix: 'PO', digits: 5, next: 11 })
    expect(formatNumber(s, 11)).toBe('PO00011')
    expect(formatNumber(s, 100000)).toBe('PO100000')
    expect(previewNext(s)).toBe('PO00011')

    const withSuffix = makeSeries({ prefix: 'INV/', digits: 4, suffix: '/26-27', next: 42 })
    expect(formatNumber(withSuffix, 42)).toBe('INV/0042/26-27')
    expect(previewNext(withSuffix)).toBe('INV/0042/26-27')

    const suffixOnly = makeSeries({ prefix: '', digits: 3, suffix: '-KNL', next: 7 })
    expect(formatNumber(suffixOnly, 7)).toBe('007-KNL')
  })

  it('validates name, prefix/suffix, digits range, next floor, uniqueness, and default rules', () => {
    const base = makeSeries()
    expect(validateSeries(base, [base])).toEqual({})

    // Missing name and both prefix + suffix
    const blank = makeSeries({ id: 'SEQ00009', name: ' ', prefix: '', suffix: '', isDefault: false })
    const blankErr = validateSeries(blank, [base])
    expect(blankErr.name).toBeDefined()
    expect(blankErr.prefix).toBeDefined()

    // Suffix without prefix is allowed
    const suffixOnly = makeSeries({
      id: 'SEQ00009',
      name: 'Suffix series',
      prefix: '',
      suffix: '-PO',
      next: 1,
      issued: 0,
      isDefault: false,
    })
    expect(validateSeries(suffixOnly, [base])).toEqual({})

    // Digits 1-10
    expect(validateSeries(makeSeries({ digits: 0 }), [base]).digits).toBeDefined()
    expect(validateSeries(makeSeries({ digits: 11 }), [base]).digits).toBeDefined()
    expect(validateSeries(makeSeries({ digits: 5.5 }), [base]).digits).toBeDefined()
    expect(validateSeries(makeSeries({ digits: 1, prefix: 'X-' }), [base])).toEqual({})
    expect(validateSeries(makeSeries({ digits: 10, prefix: 'X-' }), [base])).toEqual({})

    // Next >= issued + 1 and never below saved value
    const bumpedSaved = makeSeries({ next: 25, issued: 10 })
    expect(validateSeries(makeSeries({ next: 10, issued: 10 }), [base]).next).toMatch(/at least 11/)
    expect(validateSeries(makeSeries({ next: 20, issued: 10 }), [bumpedSaved]).next).toMatch(/only go up/)
    expect(validateSeries(makeSeries({ next: 25, issued: 10 }), [bumpedSaved])).toEqual({})
    expect(validateSeries(makeSeries({ next: 30, issued: 10 }), [bumpedSaved])).toEqual({})

    // Unique output per docType across active series
    const dupFormat = makeSeries({
      id: 'SEQ00009',
      name: 'Second PO',
      prefix: 'PO',
      digits: 5,
      next: 100,
      issued: 0,
      isDefault: false,
    })
    expect(validateSeries(dupFormat, [base]).prefix).toBeDefined()

    const overlapPadding = makeSeries({
      id: 'SEQ00009',
      name: 'Padded PO',
      prefix: 'PO0',
      digits: 4,
      next: 11,
      issued: 0,
      isDefault: false,
    })
    expect(validateSeries(overlapPadding, [base]).prefix).toBeDefined()

    // Distinct prefix or suffix on same docType is allowed
    const branchPo = makeSeries({
      id: 'SEQ00009',
      name: 'Chennai PO',
      prefix: 'PO-CHN-',
      digits: 4,
      next: 1,
      issued: 0,
      isDefault: false,
    })
    expect(validateSeries(branchPo, [base])).toEqual({})

    // Inactive series does not collide with active format
    const inactiveSame = makeSeries({
      id: 'SEQ00009',
      name: 'Retired PO',
      prefix: 'PO',
      digits: 5,
      next: 1,
      issued: 0,
      active: false,
      isDefault: false,
    })
    expect(validateSeries(inactiveSame, [base])).toEqual({})

    // Different docType does not collide
    const otherDoc = makeSeries({
      id: 'SEQ00009',
      docType: 'sales-order',
      module: 'sales',
      name: 'Alt SO',
      prefix: 'PO',
      digits: 5,
      next: 1,
      issued: 0,
      isDefault: true,
    })
    expect(validateSeries(otherDoc, [base])).toEqual({})

    // One default per docType + default must be active
    const secondDefault = makeSeries({
      id: 'SEQ00009',
      name: 'Alt PO',
      prefix: 'PO-ALT-',
      next: 1,
      issued: 0,
      isDefault: true,
    })
    expect(validateSeries(secondDefault, [base]).isDefault).toBeDefined()

    const clearOnlyDefault = makeSeries({ isDefault: false })
    expect(validateSeries(clearOnlyDefault, [base]).isDefault).toBeDefined()

    const inactiveDefault = makeSeries({ active: false, isDefault: true })
    expect(validateSeries(inactiveDefault, [base]).active).toBeDefined()
  })

  it('allows deleting only unused series (issued === 0)', () => {
    expect(canDeleteSeries({ issued: 0 })).toBe(true)
    expect(canDeleteSeries({ issued: 1 })).toBe(false)
    expect(canDeleteSeries({ issued: 10 })).toBe(false)
  })

  it('switches the single default per docType and refuses inactive targets', () => {
    const po1 = makeSeries({ id: 'SEQ00001', isDefault: true, active: true })
    const po2 = makeSeries({ id: 'SEQ00009', name: 'Branch PO', prefix: 'PO-B-', next: 1, issued: 0, isDefault: false, active: true })
    const poInactive = makeSeries({ id: 'SEQ00010', name: 'Old PO', prefix: 'PO-OLD-', next: 1, issued: 0, isDefault: false, active: false })
    const grn = makeSeries({ id: 'SEQ00002', docType: 'purchase-receipt', module: 'purchasing', name: 'GRN', prefix: 'GRN', isDefault: true, active: true })

    const next = setDefault([po1, po2, poInactive, grn], 'SEQ00009')
    expect(next.find((s) => s.id === 'SEQ00001')?.isDefault).toBe(false)
    expect(next.find((s) => s.id === 'SEQ00009')?.isDefault).toBe(true)
    expect(next.find((s) => s.id === 'SEQ00002')?.isDefault).toBe(true)

    expect(() => setDefault([po1, po2, poInactive], 'SEQ00010')).toThrow(/active/i)
    expect(() => setDefault([po1, po2], 'MISSING')).toThrow(/not found/i)
  })

  it('takes next number without mutating and refuses inactive series', () => {
    const s = makeSeries({ prefix: 'PO', digits: 5, next: 11, issued: 10 })
    const res = takeNext(s)
    expect(res.number).toBe('PO00011')
    expect(res.series.next).toBe(12)
    expect(res.series.issued).toBe(11)
    expect(s.next).toBe(11)
    expect(s.issued).toBe(10)

    expect(() => takeNext({ ...s, active: false })).toThrow(/inactive/i)
  })

  it('generates sequential series IDs', () => {
    expect(nextSequenceId([])).toBe('SEQ00001')
    expect(nextSequenceId([{ id: 'SEQ00001' }, { id: 'SEQ00008' }])).toBe('SEQ00009')
  })
})

describe('number sequences commands', () => {
  afterEach(async () => {
    await api.numberSequences.reset()
  })

  it('saves valid series, switches default, and refuses deleting issued series', async () => {
    const initial = await api.numberSequences.list()
    expect(initial).toHaveLength(8)

    // Refuses deleting an issued series
    await expect(deleteNumberSequence('SEQ00001')).rejects.toThrow(CommandError)

    // Save a second active PO series with distinct prefix
    const second = await saveNumberSequence({
      id: nextSequenceId(initial),
      docType: 'purchase-order',
      module: 'sales', // normalized from docType -> 'purchasing'
      name: 'Chennai PO',
      prefix: 'PO-CHN-',
      digits: 4,
      next: 1,
      resets: 'yearly-apr',
      isDefault: false,
      active: true,
      issued: 0,
    })
    expect(second.module).toBe('purchasing')
    expect(previewNext(second)).toBe('PO-CHN-0001')

    // Refuses saving an overlapping active PO series
    await expect(
      saveNumberSequence({
        ...second,
        id: 'SEQ00099',
        name: 'Duplicate',
        prefix: 'PO',
        digits: 5,
      }),
    ).rejects.toThrow(CommandError)

    // Switch default to the new series
    const afterDefault = await setDefaultNumberSequence(second.id)
    expect(afterDefault.find((s) => s.id === second.id)?.isDefault).toBe(true)
    expect(afterDefault.find((s) => s.id === 'SEQ00001')?.isDefault).toBe(false)

    // Refuses setting an inactive series as default
    const inactive = await saveNumberSequence({
      id: 'SEQ00010',
      docType: 'purchase-order',
      module: 'purchasing',
      name: 'Dormant PO',
      prefix: 'PO-OLD-',
      digits: 4,
      next: 1,
      resets: 'never',
      isDefault: false,
      active: false,
      issued: 0,
    })
    await expect(setDefaultNumberSequence(inactive.id)).rejects.toThrow(CommandError)

    // Unused series can be deleted cleanly
    await deleteNumberSequence(inactive.id)
    expect(await api.numberSequences.get(inactive.id)).toBeNull()
  })
})
