import { describe, expect, it } from 'vitest'
import {
  BULK_SELECT_PLACEHOLDER,
  allocateDupNos,
  bulkCountHint,
  bulkOpTitle,
  evaluateBulkDelete,
  evaluateBulkOp,
  nextDupNo,
  parseBulkEditValue,
  pluralNoun,
  splitBulkEditTargets,
} from './bulk-actions'

describe('bulk count hints & titles', () => {
  it('formats plural nouns', () => {
    expect(pluralNoun(1, 'purchase order', 'purchase orders')).toBe('1 purchase order')
    expect(pluralNoun(3, 'purchase order', 'purchase orders')).toBe('3 purchase orders')
  })

  it('shows plain count when all rows match and "k of n" otherwise', () => {
    expect(bulkCountHint(3, 3)).toBe('3')
    expect(bulkCountHint(1, 3)).toBe('1 of 3')
    expect(bulkCountHint(0, 2)).toBe('0 of 2')
  })

  it('builds status, lock and zero-eligible tooltips', () => {
    const statusOp = { to: 'Issued', why: 'Only drafts can be issued.' }
    expect(bulkOpTitle(statusOp, 2, 3)).toBe('2 of 3 selected can be set to Issued')
    expect(bulkOpTitle(statusOp, 0, 3)).toBe('Only drafts can be issued.')

    const lockOp = { past: 'reopened', why: 'Only locked orders can be reopened.' }
    expect(bulkOpTitle(lockOp, 1, 3)).toBe('1 of 3 selected can be reopened')
    expect(bulkOpTitle(lockOp, 0, 3)).toBe('Only locked orders can be reopened.')
  })

  it('evaluates row eligibility for an op', () => {
    const rows = [
      { id: '1', status: 'Draft' },
      { id: '2', status: 'Issued' },
      { id: '3', status: 'Received' },
    ]
    const ev = evaluateBulkOp(
      {
        to: 'Issued',
        why: 'Only drafts can be issued.',
        can: (r) => r.status === 'Draft',
      },
      rows,
    )
    expect(ev.eligible.map((r) => r.id)).toEqual(['1'])
    expect(ev.count).toBe(1)
    expect(ev.skipped).toBe(2)
    expect(ev.total).toBe(3)
    expect(ev.hint).toBe('1 of 3')
    expect(ev.enabled).toBe(true)
    expect(ev.title).toBe('1 of 3 selected can be set to Issued')
  })

  it('evaluates bulk delete eligibility and blocked reasons', () => {
    const rows = [
      { id: 'PO00001', status: 'Issued' },
      { id: 'PO00006', status: 'Draft' },
      { id: 'PO00004', status: 'Received' },
    ]
    const ev = evaluateBulkDelete(rows, (r) =>
      r.status === 'Draft' ? true : 'Only draft purchase orders can be deleted',
    )
    expect(ev.eligible.map((r) => r.id)).toEqual(['PO00006'])
    expect(ev.blocked).toBe(2)
    expect(ev.hint).toBe('1 of 3')
    expect(ev.title).toBe('Only draft purchase orders can be deleted')

    const allOk = evaluateBulkDelete([{ id: 'PO00006', status: 'Draft' }], (r) =>
      r.status === 'Draft' ? true : 'Only draft purchase orders can be deleted',
    )
    expect(allOk.hint).toBe('1')
    expect(allOk.title).toBe('')
  })
})

describe('bulk edit target splitting', () => {
  it('partitions rows into open, locked and final', () => {
    const rows = [
      { id: 'A', state: 'open' as const },
      { id: 'B', state: 'locked' as const },
      { id: 'C', state: 'final' as const },
      { id: 'D', state: 'locked' as const },
    ]
    const t = splitBulkEditTargets(rows, (r) => r.state)
    expect(t.open.map((r) => r.id)).toEqual(['A'])
    expect(t.locked.map((r) => r.id)).toEqual(['B', 'D'])
    expect(t.final.map((r) => r.id)).toEqual(['C'])
    expect(t.lockedGroups).toBe(2)
    expect(t.total).toBe(4)
  })

  it('counts distinct locked groups when a group key is supplied', () => {
    const lines = [
      { id: 'PO1-1', po: 'PO1', state: 'locked' as const },
      { id: 'PO1-2', po: 'PO1', state: 'locked' as const },
      { id: 'PO2-1', po: 'PO2', state: 'locked' as const },
      { id: 'PO3-1', po: 'PO3', state: 'open' as const },
    ]
    const t = splitBulkEditTargets(
      lines,
      (r) => r.state,
      (r) => r.po,
    )
    expect(t.open).toHaveLength(1)
    expect(t.locked).toHaveLength(3)
    expect(t.lockedGroups).toBe(2)
  })

  it('treats every row as open when no lockStateOf is provided', () => {
    const t = splitBulkEditTargets([{ id: '1' }, { id: '2' }])
    expect(t.open).toHaveLength(2)
    expect(t.locked).toHaveLength(0)
    expect(t.final).toHaveLength(0)
  })
})

describe('bulk edit value parsing', () => {
  it('validates select fields and allows empty string (e.g. Unassigned) once picked', () => {
    const field = { kind: 'select' as const, label: 'Buyer' }
    expect(parseBulkEditValue(field, BULK_SELECT_PLACEHOLDER)).toEqual({
      ok: false,
      error: 'Choose a buyer.',
    })
    expect(parseBulkEditValue(field, '')).toEqual({ ok: true, value: '' })
    expect(parseBulkEditValue(field, 'EMP00007')).toEqual({ ok: true, value: 'EMP00007' })
  })

  it('validates ISO dates', () => {
    const field = { kind: 'date' as const, label: 'Expected date' }
    expect(parseBulkEditValue(field, '')).toEqual({ ok: false, error: 'Pick a date.' })
    expect(parseBulkEditValue(field, '2026-8-1')).toEqual({ ok: false, error: 'Pick a date.' })
    expect(parseBulkEditValue(field, '2026-08-01')).toEqual({ ok: true, value: '2026-08-01' })
  })

  it('validates positive whole numbers', () => {
    const field = { kind: 'num' as const, label: 'Qty ordered' }
    expect(parseBulkEditValue(field, '')).toEqual({ ok: false, error: 'Enter a whole number above 0.' })
    expect(parseBulkEditValue(field, '0')).toEqual({ ok: false, error: 'Enter a whole number above 0.' })
    expect(parseBulkEditValue(field, '-5')).toEqual({ ok: false, error: 'Enter a whole number above 0.' })
    expect(parseBulkEditValue(field, '12.5')).toEqual({ ok: false, error: 'Enter a whole number above 0.' })
    expect(parseBulkEditValue(field, '50')).toEqual({ ok: true, value: 50 })
  })
})

describe('duplicate numbering', () => {
  it('appends -COPY and increments on collisions', () => {
    expect(nextDupNo(['ASH-PWH-18'], 'ASH-PWH-18')).toBe('ASH-PWH-18-COPY')
    expect(nextDupNo(['ASH-PWH-18', 'ASH-PWH-18-COPY'], 'ASH-PWH-18')).toBe('ASH-PWH-18-COPY2')
    expect(nextDupNo(['ASH-PWH-18', 'ASH-PWH-18-COPY', 'ASH-PWH-18-COPY2'], 'ASH-PWH-18')).toBe('ASH-PWH-18-COPY3')
  })

  it('allocates distinct numbers across a batch', () => {
    expect(allocateDupNos(['V00001', 'V00001-COPY'], ['V00001', 'V00001', 'V00002'])).toEqual([
      'V00001-COPY2',
      'V00001-COPY3',
      'V00002-COPY',
    ])
  })
})
