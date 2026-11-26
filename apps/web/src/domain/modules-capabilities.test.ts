import { describe, expect, it } from 'vitest'
import {
  CAPABILITIES,
  DEFAULT_CAPABILITIES,
  DEFAULT_MODULES,
  enabledModuleIds,
  fromDraft,
  isCapabilityOn,
  isModuleLocked,
  isModuleOn,
  moduleOffNote,
  normalizeModules,
  toDraft,
} from './modules-capabilities'

describe('modules', () => {
  it('treats a missing module as on and keeps Home and Warehouse on whatever is stored', () => {
    expect(isModuleOn(undefined, 'sales')).toBe(true)
    expect(isModuleOn({ sales: false }, 'sales')).toBe(false)
    expect(isModuleOn({ home: false, warehouse: false }, 'home')).toBe(true)
    expect(isModuleOn({ warehouse: false }, 'warehouse')).toBe(true)
    expect(isModuleLocked('home')).toBe(true)
    expect(isModuleLocked('finance')).toBe(false)
  })

  it('lists the enabled modules in sidebar order', () => {
    expect(enabledModuleIds({ finance: false, notes: false })).toEqual([
      'home',
      'sales',
      'purchasing',
      'warehouse',
      'production',
      'people',
    ])
    expect(enabledModuleIds(DEFAULT_MODULES)).toHaveLength(8)
  })

  it('normalizes: every module present, locked ones on', () => {
    const n = normalizeModules({ home: false, sales: false })
    expect(Object.keys(n)).toHaveLength(8)
    expect(n.home).toBe(true)
    expect(n.sales).toBe(false)
    expect(n.finance).toBe(true)
  })

  it('says why a module is hidden, except for the locked ones', () => {
    expect(moduleOffNote('sales')).toMatch(/hidden/)
    expect(moduleOffNote('home')).toBeNull()
  })
})

describe('capabilities', () => {
  it('reads customer pricing from the pricing switch, the rest from the stored capabilities', () => {
    expect(isCapabilityOn({}, 'customerPricing', true)).toBe(true)
    expect(isCapabilityOn({ customerPricing: true }, 'customerPricing', false)).toBe(false)
    expect(isCapabilityOn({ production: true }, 'production', true)).toBe(true)
    expect(isCapabilityOn({}, 'production', true)).toBe(false)
    expect(isCapabilityOn({}, 'multiWarehouse', true)).toBe(true)
  })

  it('does not store customer pricing with the other capabilities', () => {
    expect('customerPricing' in DEFAULT_CAPABILITIES).toBe(false)
    expect(Object.keys(DEFAULT_CAPABILITIES)).toHaveLength(CAPABILITIES.length - 1)
  })
})

describe('draft round trip', () => {
  it('turns the stored values into one flat draft and back', () => {
    const draft = toDraft({ sales: false }, { production: true }, false)
    expect(draft['mod.sales']).toBe(false)
    expect(draft['mod.finance']).toBe(true)
    expect(draft['cap.production']).toBe(true)
    expect(draft['cap.customerPricing']).toBe(false)
    const back = fromDraft(draft)
    expect(back.modules.sales).toBe(false)
    expect(back.capabilities.production).toBe(true)
    expect('customerPricing' in back.capabilities).toBe(false)
    expect(back.customerPricing).toBe(false)
  })

  it('keeps a locked module on even when the draft says off', () => {
    const draft = toDraft(undefined, undefined, true)
    draft['mod.warehouse'] = false
    expect(fromDraft(draft).modules.warehouse).toBe(true)
  })
})
