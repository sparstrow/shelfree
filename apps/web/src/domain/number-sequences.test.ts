import { afterEach, describe, expect, it } from 'vitest'
import { api } from '@/data/api'
import {
  CommandError,
  createPurchaseOrder,
  createPurchaseReceipt,
  deleteNumberSequence,
  duplicatePurchaseOrders,
  issueNumber,
  postPurchaseReceipt,
  saveNumberSequence,
  setDefaultNumberSequence,
} from '@/data/api/commands'
import type { NumberSequence } from '@/data/schemas'
import { newPurchaseOrder } from './purchase-order-editing'
import { receiptDraftFromOrder } from './purchase-receipt'
import {
  canDeleteSeries,
  defaultSeriesFor,
  docTypesForModule,
  formatNumber,
  formatSeriesPattern,
  moduleOfDocType,
  nextFree,
  nextSequenceId,
  previewNext,
  seriesStatus,
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
    // A second default takes the default over on save (setDefault demotes the old one).
    expect(validateSeries(secondDefault, [base]).isDefault).toBeUndefined()

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

  it('skips past existing document numbers when stored next is stale and ignores other prefixes', () => {
    const stale = makeSeries({ prefix: 'PO', digits: 5, next: 5, issued: 4 })
    const res = nextFree(stale, ['PO00001', 'PO00005', 'PO00010'])
    expect(res.number).toBe('PO00011')
    expect(res.series.next).toBe(12)
    expect(res.series.issued).toBe(5)

    // Ahead of existing numbers: respects the bumped next value.
    const bumped = makeSeries({ prefix: 'PO', digits: 5, next: 50, issued: 10 })
    const resBumped = nextFree(bumped, ['PO00001', 'PO00010'])
    expect(resBumped.number).toBe('PO00050')
    expect(resBumped.series.next).toBe(51)
    expect(resBumped.series.issued).toBe(11)

    // Distinct prefix or suffix ignores unrelated document numbers and handles regex chars safely.
    const branch = makeSeries({ prefix: 'KPO.', digits: 4, suffix: '/26-27', next: 1, issued: 0 })
    const resBranch = nextFree(branch, ['PO00010', 'KPO.0003/26-27'])
    expect(resBranch.number).toBe('KPO.0004/26-27')
    expect(resBranch.series.next).toBe(5)
    expect(resBranch.series.issued).toBe(1)

    expect(() => nextFree({ ...stale, active: false }, [])).toThrow(/inactive/i)
  })

  it('provides module doc types, default lookup, format pattern, and status labels', () => {
    expect(docTypesForModule('purchasing')).toEqual(['purchase-order', 'purchase-receipt'])
    expect(docTypesForModule('finance')).toEqual([])
    expect(formatSeriesPattern(makeSeries({ prefix: 'INV/', digits: 4, suffix: '/26-27' }))).toBe('INV/####/26-27')
    expect(seriesStatus({ active: true, isDefault: true })).toBe('Default')
    expect(seriesStatus({ active: true, isDefault: false })).toBe('Active')
    expect(seriesStatus({ active: false, isDefault: false })).toBe('Inactive')

    const active = makeSeries({ id: 'SEQ00001', active: true, isDefault: true })
    const inactive = makeSeries({ id: 'SEQ00002', active: false, isDefault: true })
    expect(defaultSeriesFor([inactive, active], 'purchase-order')?.id).toBe('SEQ00001')
    expect(defaultSeriesFor([inactive], 'purchase-order')).toBeNull()
  })
})

describe('number sequences commands', () => {
  afterEach(async () => {
    await Promise.all([
      api.numberSequences.reset(),
      api.purchaseOrders.reset(),
      api.purchaseReceipts.reset(),
      api.items.reset(),
    ])
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

  it('issues numbers from the default active series for purchase orders, duplicates, and receipts', async () => {
    // Issue directly from default PO series
    const firstNo = await issueNumber('purchase-order')
    expect(firstNo).toBe('PO00011')
    const afterFirst = await api.numberSequences.get('SEQ00001')
    expect(afterFirst?.next).toBe(12)
    expect(afterFirst?.issued).toBe(11)

    // Add a second PO series, set it default, and create + duplicate POs
    const kpo = await saveNumberSequence({
      id: 'SEQ00009',
      docType: 'purchase-order',
      module: 'purchasing',
      name: 'Kanalora PO',
      prefix: 'KPO',
      digits: 5,
      next: 1,
      resets: 'never',
      isDefault: false,
      active: true,
      issued: 0,
    })
    await setDefaultNumberSequence(kpo.id)

    const createdPo = await createPurchaseOrder({
      ...newPurchaseOrder('PREVIEW', '2026-11-25'),
      vendor: 'V00001',
    })
    expect(createdPo.no).toBe('KPO00001')
    expect((await api.purchaseOrders.get('KPO00001'))?.vendor).toBe('V00001')

    const duplicated = await duplicatePurchaseOrders(['PO00001'], '2026-11-25')
    expect(duplicated.created.map((p) => p.no)).toEqual(['KPO00002'])
    expect((await api.numberSequences.get(kpo.id))?.issued).toBe(2)

    // Receipts: create draft and post a fresh receipt both issue from the default receipt series
    const orders = await api.purchaseOrders.list()
    const receipts = await api.purchaseReceipts.list()
    const po9 = orders.find((p) => p.no === 'PO00009')!
    const draftPr = receiptDraftFromOrder(po9, receipts, '2026-11-25')
    const savedPr = await createPurchaseReceipt(draftPr)
    expect(savedPr.no).toBe('GRN00006')

    const freshToPost = receiptDraftFromOrder(po9, await api.purchaseReceipts.list(), '2026-11-25')
    freshToPost.lines = freshToPost.lines.map((l, idx) => ({ ...l, qtyReceived: idx === 0 ? 1 : 0 }))
    const postedPr = await postPurchaseReceipt(freshToPost, { isNew: true })
    expect(postedPr.no).toBe('GRN00007')
    expect(postedPr.status).toBe('Posted')

    // A new receipt whose preview number collides with a stored one (stale `next`) gets a fresh
    // number instead of overwriting the stored receipt.
    const stale = receiptDraftFromOrder(po9, await api.purchaseReceipts.list(), '2026-11-25')
    stale.no = 'GRN00006'
    stale.lines = stale.lines.map((l, idx) => ({ ...l, qtyReceived: idx === 0 ? 1 : 0 }))
    const postedStale = await postPurchaseReceipt(stale, { isNew: true })
    expect(postedStale.no).toBe('GRN00008')
    expect((await api.purchaseReceipts.list()).find((r) => r.no === 'GRN00006')?.status).not.toBe('Posted')

    // Missing active default throws a helpful CommandError
    await api.numberSequences.remove('SEQ00001')
    await api.numberSequences.remove(kpo.id)
    await expect(issueNumber('purchase-order')).rejects.toThrow(
      'No active number series for Purchase orders. Add one in Settings ▸ Number sequences.',
    )
  })
})
