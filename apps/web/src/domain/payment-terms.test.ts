import { describe, expect, it } from 'vitest'
import type { PaymentTerm } from '@/data/schemas'
import {
  normalizeTerm,
  termCodeLocked,
  termDeleteBlock,
  termKey,
  termMatches,
  termSummary,
  termUsage,
  termsForModule,
  usageText,
  validateTerm,
} from './payment-terms'

const net30: PaymentTerm = { code: 'NET30', name: 'Net 30 days', days: 30, modules: ['purchasing', 'sales'], active: true }
const none = { vendors: 0, customers: 0 }

describe('payment terms', () => {
  it('matches free text by code or name, ignoring spaces and case', () => {
    expect(termKey('net 30')).toBe('NET30')
    expect(termMatches(net30, 'NET 30')).toBe(true)
    expect(termMatches(net30, 'Net 30 days')).toBe(true)
    expect(termMatches(net30, 'NET 15')).toBe(false)
    expect(termMatches(net30, '')).toBe(false)
  })

  it('counts vendors and customers using a term', () => {
    const u = termUsage(net30, [{ paymentTerms: 'NET 30' }, { paymentTerms: 'NET 15' }], [{ terms: 'NET 30' }, { terms: 'NET30' }])
    expect(u).toEqual({ vendors: 1, customers: 2 })
    expect(usageText(u)).toBe('1 vendor and 2 customers')
  })

  it('blocks delete and locks the code while in use', () => {
    expect(termDeleteBlock(none)).toBeNull()
    expect(termDeleteBlock({ vendors: 2, customers: 0 })).toMatch(/Used by 2 vendors/)
    expect(termCodeLocked({ vendors: 0, customers: 1 })).toBe(true)
    expect(termCodeLocked(none)).toBe(false)
  })

  it('summarises days', () => {
    expect(termSummary({ days: 30 })).toBe('30 days')
    expect(termSummary({ days: 0 })).toBe('Due on delivery')
    expect(termSummary({ days: null })).toBe('—')
  })

  it('validates code, name, days and modules', () => {
    const d = { ...net30, code: 'NET45', name: 'Net 45 days', days: 45 }
    expect(validateTerm(d, [net30], none)).toEqual({})
    expect(validateTerm({ ...d, code: 'NET30' }, [net30], none).code).toMatch(/already/)
    expect(validateTerm({ ...d, code: 'N' }, [net30], none).code).toBeDefined()
    expect(validateTerm({ ...d, name: 'net 30 DAYS' }, [net30], none).name).toMatch(/already/)
    expect(validateTerm({ ...d, days: -1 }, [net30], none).days).toBeDefined()
    expect(validateTerm({ ...d, days: 400 }, [net30], none).days).toBeDefined()
    expect(validateTerm({ ...d, days: null }, [net30], none)).toEqual({})
    expect(validateTerm({ ...d, modules: [] }, [net30], none).modules).toBeDefined()
  })

  it('refuses to drop a module whose records use the term', () => {
    const noPurchasing = { ...net30, modules: ['sales'] }
    expect(validateTerm(noPurchasing, [], { vendors: 2, customers: 0 }, net30).modules).toMatch(/keep Purchasing/)
    expect(validateTerm(noPurchasing, [], { vendors: 0, customers: 2 }, net30)).toEqual({})
    const noSales = { ...net30, modules: ['purchasing'] }
    expect(validateTerm(noSales, [], { vendors: 0, customers: 1 }, net30).modules).toMatch(/keep Sales/)
  })

  it('normalizes and filters by module inclusion', () => {
    expect(normalizeTerm({ ...net30, code: ' net45 ', name: ' Net  45 ' })).toMatchObject({ code: 'NET45', name: 'Net 45' })
    const sales: PaymentTerm = { ...net30, code: 'ADV', modules: ['sales'] }
    expect(termsForModule([net30, sales], 'purchasing').map((t) => t.code)).toEqual(['NET30'])
    expect(termsForModule([net30, sales]).length).toBe(2)
  })
})
