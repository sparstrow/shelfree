import { describe, expect, it } from 'vitest'
import type { StatusDef } from '@/data/schemas'
import {
  flowsForModule,
  moduleOfFlow,
  nextOrder,
  nextStatusId,
  normalizeStatus,
  statusDeleteBlock,
  statusEditBlock,
  statusesOfFlow,
  validateStatus,
} from './statuses'

const mk = (over: Partial<StatusDef>): StatusDef => ({
  id: 'STS0001',
  flow: 'sales-order',
  module: 'sales',
  name: 'Open',
  category: 'open',
  tone: 'info',
  order: 1,
  system: true,
  ...over,
})

describe('statuses', () => {
  it('derives the module from the flow', () => {
    expect(moduleOfFlow('purchase-receipt')).toBe('purchasing')
    expect(moduleOfFlow('assembly-order')).toBe('production')
    expect(flowsForModule('sales')).toEqual(['sales-order', 'sales-invoice'])
    expect(flowsForModule('people')).toEqual([])
  })

  it('normalizes name spacing, module and order', () => {
    const n = normalizeStatus(mk({ name: '  Packed   and   sealed ', flow: 'purchase-order', order: '3' as unknown as number }))
    expect(n.name).toBe('Packed and sealed')
    expect(n.module).toBe('purchasing')
    expect(n.order).toBe(3)
  })

  it('requires a unique name per flow, but allows the same name in another flow', () => {
    const others = [mk({ name: 'Open' })]
    expect(validateStatus(mk({ id: 'X', name: 'open', system: false }), others).name).toMatch(/already/)
    expect(validateStatus(mk({ id: 'X', name: 'Open', flow: 'sales-invoice', system: false }), others)).toEqual({})
    expect(validateStatus(mk({ name: '' }), []).name).toBeDefined()
    expect(validateStatus(mk({ name: 'x' }), []).name).toBeDefined()
    expect(validateStatus(mk({ order: 0 }), []).order).toBeDefined()
  })

  it('locks system statuses', () => {
    expect(statusDeleteBlock(mk({ system: true }))).toBeTruthy()
    expect(statusEditBlock(mk({ system: true }))).toBeTruthy()
    expect(statusDeleteBlock(mk({ system: false }))).toBeNull()
  })

  it('numbers ids and orders', () => {
    expect(nextStatusId([{ id: 'STS0007' }, { id: 'odd' }])).toBe('STS0008')
    expect(nextStatusId([])).toBe('STS0001')
    expect(nextOrder('sales-order', [mk({ order: 4 }), mk({ id: 'b', flow: 'sales-invoice', order: 9 })])).toBe(5)
  })

  it('lists a flow in order', () => {
    const all = [mk({ id: 'a', name: 'B', order: 2 }), mk({ id: 'b', name: 'A', order: 1 })]
    expect(statusesOfFlow('sales-order', all).map((s) => s.name)).toEqual(['A', 'B'])
  })
})
