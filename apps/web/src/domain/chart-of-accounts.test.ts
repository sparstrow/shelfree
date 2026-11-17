import type { Account, Charge } from '@/data/schemas'
import {
  ACCOUNT_GROUPS,
  accountDeleteBlocked,
  accountLead,
  accountNormalBalance,
  accountOnChange,
  accountPosting,
  accountRangeHint,
  accountSource,
  accountStatus,
  blankAccount,
  chargesUsingAccount,
  duplicateAccount,
  nextAccountCode,
  normalizeAccount,
  validateAccount,
} from './chart-of-accounts'

const acct = (over: Partial<Account> = {}): Account => ({
  no: '6010',
  name: 'Office stationery',
  type: 'Expense',
  group: 'Indirect expenses',
  desc: '',
  system: false,
  active: true,
  directPosting: true,
  createdAt: '',
  updatedAt: '',
  ...over,
})

const charge = (over: Partial<Charge> = {}): Charge => ({
  no: 'FRT-IN',
  name: 'Freight inward',
  direction: 'Purchase',
  purchaseAcct: '5110',
  salesAcct: '',
  gst: 'Goods rate',
  sac: '996511',
  allocate: true,
  system: false,
  active: true,
  desc: '',
  createdAt: '',
  updatedAt: '',
  ...over,
})

const seedLike = [
  acct({ no: '1300', name: 'Inventory', type: 'Asset', group: 'Current assets', system: true, directPosting: false }),
  acct({ no: '2100', name: 'Accounts payable', type: 'Liability', group: 'Current liabilities', system: true, directPosting: false }),
  acct({ no: '5110', name: 'Freight inward', type: 'Expense', group: 'Direct expenses', system: true }),
]

describe('chart of accounts', () => {
  it('derives normal balance, source, status, posting, lead digit and range hints', () => {
    expect(accountNormalBalance('Asset')).toBe('Debit')
    expect(accountNormalBalance('Expense')).toBe('Debit')
    expect(accountNormalBalance('Liability')).toBe('Credit')
    expect(accountNormalBalance('Equity')).toBe('Credit')
    expect(accountNormalBalance('Income')).toBe('Credit')

    expect(accountSource({ system: true })).toBe('System')
    expect(accountSource({ system: false })).toBe('Custom')
    expect(accountStatus({ active: true })).toBe('Active')
    expect(accountStatus({ active: false })).toBe('Inactive')
    expect(accountPosting({ directPosting: true })).toBe('Allowed')
    expect(accountPosting({ directPosting: false })).toBe('Documents only')

    expect(accountLead('Expense', 'Direct expenses')).toBe('5')
    expect(accountLead('Expense', 'Indirect expenses')).toBe('6')
    expect(accountLead('Asset', 'Current assets')).toBe('1')
    expect(accountRangeHint('Expense')).toBe('5xxx or 6xxx')
    expect(accountRangeHint('Liability')).toBe('2xxx')
  })

  it('proposes the next free code by type/group and defaults new accounts', () => {
    expect(nextAccountCode('Expense', 'Indirect expenses', [acct({ no: '6010' })])).toBe('6020')
    expect(nextAccountCode('Expense', 'Direct expenses', seedLike)).toBe('5010')
    expect(nextAccountCode('Asset', 'Current assets', seedLike)).toBe('1010')
    expect(blankAccount(seedLike)).toMatchObject({
      no: '6010',
      type: 'Expense',
      group: 'Indirect expenses',
      directPosting: true,
      active: true,
      system: false,
    })
  })

  it('resets group on type change and updates auto-proposed codes only in new mode', () => {
    const start = blankAccount(seedLike)
    const toAsset = accountOnChange({ ...start, type: 'Asset' }, 'type', {
      mode: 'new',
      accounts: seedLike,
      autoCode: true,
    })
    expect(toAsset).toMatchObject({ type: 'Asset', group: 'Current assets', no: '1010' })

    const toDirectExpense = accountOnChange({ ...toAsset, type: 'Expense' }, 'type', {
      mode: 'new',
      accounts: seedLike,
      autoCode: true,
    })
    expect(toDirectExpense).toMatchObject({ type: 'Expense', group: 'Direct expenses', no: '5010' })

    const toIndirectExpense = accountOnChange({ ...toDirectExpense, group: 'Indirect expenses' }, 'group', {
      mode: 'new',
      accounts: seedLike,
      autoCode: true,
    })
    expect(toIndirectExpense.no).toBe('6010')

    // Manual code edit or edit mode keeps the code untouched.
    expect(
      accountOnChange({ ...toAsset, no: '1234', type: 'Liability' }, 'type', {
        mode: 'new',
        accounts: seedLike,
        autoCode: false,
      }),
    ).toMatchObject({ group: ACCOUNT_GROUPS.Liability[0], no: '1234' })

    expect(
      accountOnChange({ ...acct({ no: '6555', type: 'Asset', group: 'Current assets' }), type: 'Liability' }, 'type', {
        mode: 'edit',
        accounts: seedLike,
        autoCode: true,
      }),
    ).toMatchObject({ group: 'Current liabilities', no: '6555' })
  })

  it('normalizes trimmed fields and duplicates as custom active copies', () => {
    expect(normalizeAccount(acct({ no: ' 6010 ', name: '  Stationery ', desc: ' Pens ' }))).toMatchObject({
      no: '6010',
      name: 'Stationery',
      desc: 'Pens',
    })

    const copy = duplicateAccount(
      acct({ no: '6010', name: 'Office stationery', system: true, active: false, createdAt: 'x', updatedAt: 'y' }),
      [acct({ no: '6010' }), acct({ no: '6020' })],
    )
    expect(copy).toMatchObject({
      no: '6030',
      name: 'Office stationery (copy)',
      system: false,
      active: true,
      createdAt: '',
      updatedAt: '',
    })
  })

  it('validates code, name, group and active charges on deactivation', () => {
    const charges = [
      charge({ no: 'PKG', purchaseAcct: '6010', active: true }),
      charge({ no: 'OLD', purchaseAcct: '6020', active: false }),
    ]
    expect(validateAccount(acct(), seedLike, charges)).toEqual({})

    expect(validateAccount(acct({ no: '601', name: '', group: 'Current assets' }), seedLike, charges)).toEqual({
      no: 'Use a 4-digit code.',
      name: 'Enter an account name.',
      group: 'Pick a group for this type.',
    })

    expect(validateAccount(acct({ no: '1010' }), seedLike, charges).no).toBe('Expense codes start with 5 or 6.')
    expect(validateAccount(acct({ no: '5110' }), seedLike, charges).no).toBe('Already used by Freight inward.')
    expect(validateAccount(acct({ name: 'freight inward' }), seedLike, charges).name).toBe(
      'Another account already has this name.',
    )

    expect(validateAccount(acct({ no: '6010', active: false }), seedLike, charges).active).toBe(
      'Used by active charge PKG — point it at another account first.',
    )
    expect(validateAccount(acct({ no: '6020', active: false }), seedLike, charges)).toEqual({})
  })

  it('finds linked charges and blocks deleting system or charge-linked accounts', () => {
    const charges = [
      charge({ no: 'FRT-IN', purchaseAcct: '5110' }),
      charge({ no: 'INS', purchaseAcct: '6010' }),
      charge({ no: 'SHP', direction: 'Sales', purchaseAcct: '', salesAcct: '6010' }),
    ]
    expect(chargesUsingAccount('6010', charges).map((c) => c.no)).toEqual(['INS', 'SHP'])

    expect(accountDeleteBlocked({ no: '5110', system: true }, charges)).toBe(
      'System account — Shelfree posts to it automatically, so it can’t be deleted.',
    )
    expect(accountDeleteBlocked({ no: '6010', system: false }, charges)).toBe(
      'Used by charge INS, SHP — point them at another account first.',
    )
    expect(accountDeleteBlocked({ no: '6010', system: false }, [charge({ no: 'INS', purchaseAcct: '6010' })])).toBe(
      'Used by charge INS — point it at another account first.',
    )
    expect(accountDeleteBlocked({ no: '6090', system: false }, charges)).toBeNull()
  })
})
