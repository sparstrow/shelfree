import { describe, expect, it } from 'vitest'
import type { CustomField } from '@/data/schemas'
import {
  entitiesForModule,
  moduleOfEntity,
  nextFieldId,
  normalizeField,
  optionsText,
  parseOptions,
  validateField,
} from './custom-fields'

const mk = (over: Partial<CustomField>): CustomField => ({
  id: 'CF0001',
  entity: 'item',
  module: 'warehouse',
  label: 'Country of origin',
  type: 'text',
  options: [],
  required: false,
  active: true,
  ...over,
})

describe('custom fields', () => {
  it('derives the module from the entity', () => {
    expect(moduleOfEntity('vendor')).toBe('purchasing')
    expect(entitiesForModule('purchasing')).toEqual(['vendor', 'purchase-order'])
    expect(entitiesForModule('finance')).toEqual([])
  })

  it('parses choices: trims, drops blanks and case-insensitive duplicates, keeps order', () => {
    expect(parseOptions(' Low, medium ,\nHigh,, low ')).toEqual(['Low', 'medium', 'High'])
    expect(optionsText(['A', 'B'])).toBe('A, B')
  })

  it('normalizes: module from entity, options only for lists', () => {
    expect(normalizeField(mk({ entity: 'vendor', type: 'text', options: ['x'] }))).toMatchObject({
      module: 'purchasing',
      options: [],
    })
    expect(normalizeField(mk({ type: 'list', options: [' a ', ''] })).options).toEqual(['a'])
  })

  it('needs a unique label per entity and two choices for a list', () => {
    const others = [mk({})]
    expect(validateField(mk({ id: 'CF2', label: 'country of origin' }), others).label).toMatch(/already/)
    expect(validateField(mk({ id: 'CF2', entity: 'vendor', label: 'Country of origin' }), others)).toEqual({})
    expect(validateField(mk({ label: '' }), []).label).toBeDefined()
    expect(validateField(mk({ type: 'list', options: ['One'] }), []).optionsText).toBeDefined()
    expect(validateField(mk({ type: 'list', options: ['One', 'Two'] }), [])).toEqual({})
  })

  it('numbers ids', () => {
    expect(nextFieldId([{ id: 'CF0004' }])).toBe('CF0005')
  })
})
