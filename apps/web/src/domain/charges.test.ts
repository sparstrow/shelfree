import type { Account, Charge } from '@/data/schemas'
import {
  accountText,
  blankCharge,
  chargeBroken,
  chargeDeleteBlocked,
  chargeLanded,
  chargeOnChange,
  duplicateCharge,
  normalizeCharge,
  validateCharge,
} from './charges'

const acct = (no: string, type: string, active = true): Account => ({
  no,
  name: `Account ${no}`,
  type,
  group: '',
  desc: '',
  system: true,
  active,
  directPosting: false,
  createdAt: '',
  updatedAt: '',
})
const accounts = [acct('5110', 'Expense'), acct('5115', 'Expense'), acct('5199', 'Expense', false)]
const charge = (over: Partial<Charge> = {}): Charge => ({ ...blankCharge(accounts), no: 'CRATE', name: 'Wooden crate', sac: '998540', ...over })

describe('charges', () => {
  it('defaults a new charge to purchase, 18% GST, allocated, account 5115', () => {
    expect(blankCharge(accounts)).toMatchObject({ direction: 'Purchase', gst: '18%', allocate: true, purchaseAcct: '5115' })
  })

  it('describes landed cost and accounts', () => {
    expect(chargeLanded(charge())).toBe('Allocated to items')
    expect(chargeLanded(charge({ allocate: false }))).toBe('Expensed')
    expect(chargeLanded(charge({ direction: 'Sales' }))).toBe('Not applicable')
    expect(accountText(accounts, '5199')).toBe('5199 · Account 5199 (inactive)')
    expect(accountText(accounts, '9999')).toBe('9999 · missing')
  })

  it('flags a charge whose posting account is unusable', () => {
    expect(chargeBroken(charge(), accounts)).toBe(false)
    expect(chargeBroken(charge({ purchaseAcct: '5199' }), accounts)).toBe(true)
    expect(chargeBroken(charge({ direction: 'Both' }), accounts)).toBe(true) // no income account
  })

  it('keeps fields consistent while editing and on save', () => {
    expect(chargeOnChange(charge({ no: 'crate' }), 'no').no).toBe('CRATE')
    expect(chargeOnChange(charge({ direction: 'Sales' }), 'direction').allocate).toBe(false)
    expect(normalizeCharge(charge({ direction: 'Sales', sac: ' 99 85 40 ' }))).toMatchObject({ purchaseAcct: '', allocate: false, sac: '998540' })
  })

  it('validates code, description, account, GST and HSN/SAC', () => {
    expect(validateCharge(charge(), [], accounts)).toEqual({})
    const bad = validateCharge(charge({ no: 'x', name: '', purchaseAcct: '5199', gst: '7%', sac: '12' }), [], accounts)
    expect(Object.keys(bad).sort()).toEqual(['gst', 'name', 'no', 'purchaseAcct', 'sac'])
    expect(validateCharge(charge(), [charge({ name: 'Other' })], accounts).no).toBe('Already used by Other.')
  })

  it('copies with the next free code and blocks deleting system charges', () => {
    expect(duplicateCharge(charge({ system: true }), [charge(), charge({ no: 'CRATE-2' })])).toMatchObject({ no: 'CRATE-3', name: 'Wooden crate (copy)', system: false })
    expect(chargeDeleteBlocked({ system: true })).toMatch(/System charge/)
    expect(chargeDeleteBlocked({ system: false })).toBeNull()
  })
})
