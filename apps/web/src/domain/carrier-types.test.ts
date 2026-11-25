import { describe, expect, it } from 'vitest'
import type { CarrierTypeRecord } from '@/data/schemas'
import {
  behaviorLockReason,
  blankCarrierType,
  carrierTypeDeleteBlock,
  carrierTypeOnChange,
  carriersUsingType,
  normalizeCarrierType,
  suggestRefLabel,
  validateCarrierType,
} from './carrier-types'

const courier: CarrierTypeRecord = {
  code: 'COURIER',
  name: 'Courier',
  behavior: 'courier',
  refLabel: 'AWB',
  desc: '',
  active: true,
  system: true,
}
const rail: CarrierTypeRecord = { ...blankCarrierType(), code: 'RAIL', name: 'Rail parcel' }

describe('carrier types', () => {
  it('suggests a ref. label per behaviour', () => {
    expect(suggestRefLabel('courier')).toBe('AWB')
    expect(suggestRefLabel('gta')).toBe('LR no.')
    expect(suggestRefLabel('own')).toBe('')
  })

  it('counts carriers by code or legacy name', () => {
    expect(carriersUsingType(courier, [{ type: 'COURIER' }, { type: 'Courier' }, { type: 'GTA' }])).toBe(2)
  })

  it('locks behaviour for built-in types and types in use', () => {
    expect(behaviorLockReason(courier, 0)).toMatch(/Built-in/)
    expect(behaviorLockReason(rail, 2)).toMatch(/2 carriers use/)
    expect(behaviorLockReason(rail, 0)).toBeNull()
  })

  it('blocks delete for built-in and in-use types', () => {
    expect(carrierTypeDeleteBlock(courier, 0)).toMatch(/Built-in/)
    expect(carrierTypeDeleteBlock(rail, 1)).toMatch(/1 carrier uses/)
    expect(carrierTypeDeleteBlock(rail, 0)).toBeNull()
  })

  it('follows the suggested ref. label when behaviour changes, but keeps a custom one', () => {
    const toGta = carrierTypeOnChange({ ...rail, behavior: 'gta' }, 'behavior')
    expect(toGta.refLabel).toBe('LR no.')
    const custom = { ...rail, refLabel: 'Parcel no.' }
    expect(carrierTypeOnChange({ ...custom, behavior: 'gta' }, 'behavior').refLabel).toBe('Parcel no.')
  })

  it('normalizes: upper code, blank ref. label for own vehicle', () => {
    const n = normalizeCarrierType({ ...rail, code: ' rail ', behavior: 'own', refLabel: 'X' })
    expect(n.code).toBe('RAIL')
    expect(n.refLabel).toBe('')
  })

  it('validates code, name uniqueness and the at-least-one-active rule', () => {
    expect(validateCarrierType({ ...rail, code: 'R' }, [courier]).code).toBeDefined()
    expect(validateCarrierType({ ...rail, code: 'COURIER' }, [courier]).code).toMatch(/already/)
    expect(validateCarrierType({ ...rail, name: 'courier' }, [courier]).name).toMatch(/already/)
    expect(validateCarrierType({ ...rail, name: '' }, [courier]).name).toBeDefined()
    expect(validateCarrierType({ ...rail, active: false }, [{ ...courier, active: false }]).active).toBeDefined()
    expect(validateCarrierType(rail, [courier])).toEqual({})
  })
})
