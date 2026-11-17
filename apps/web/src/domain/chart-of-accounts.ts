/**
 * Chart of accounts — ledger accounts (`1xxx` Asset, `2xxx` Liability,
 * `3xxx` Equity, `4xxx` Income, `5xxx`/`6xxx` Expense). Pure rules; the
 * backend must apply the same validation. See docs/chart-of-accounts/README.md.
 */
import type { Account, Charge } from '@/data/schemas'

export const ACCOUNT_TYPES = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'] as const
export type AccountType = (typeof ACCOUNT_TYPES)[number]

export const ACCOUNT_GROUPS: Record<string, readonly string[]> = {
  Asset: ['Current assets', 'Non-current assets'],
  Liability: ['Current liabilities', 'Non-current liabilities'],
  Equity: ['Equity'],
  Income: ['Revenue from operations', 'Other income'],
  Expense: ['Direct expenses', 'Indirect expenses'],
}

export const ALL_ACCOUNT_GROUPS: readonly string[] = ACCOUNT_TYPES.flatMap((t) => ACCOUNT_GROUPS[t] ?? [])

export const ACCOUNT_PREFIXES: Record<string, readonly string[]> = {
  Asset: ['1'],
  Liability: ['2'],
  Equity: ['3'],
  Income: ['4'],
  Expense: ['5', '6'],
}

export function accountLead(type: string, group: string): string {
  if (type === 'Expense') return group === 'Indirect expenses' ? '6' : '5'
  return ACCOUNT_PREFIXES[type]?.[0] ?? '1'
}

export function accountRangeHint(type: string): string {
  return (ACCOUNT_PREFIXES[type] ?? []).map((p) => `${p}xxx`).join(' or ')
}

export function accountNormalBalance(type: string): 'Debit' | 'Credit' {
  return type === 'Asset' || type === 'Expense' ? 'Debit' : 'Credit'
}

export const accountSource = (a: Pick<Account, 'system'>) => (a.system ? 'System' : 'Custom')
export const accountStatus = (a: Pick<Account, 'active'>) => (a.active === false ? 'Inactive' : 'Active')
export const accountPosting = (a: Pick<Account, 'directPosting'>) => (a.directPosting ? 'Allowed' : 'Documents only')

/** Charges that post to this account on purchases or sales. */
export function chargesUsingAccount(no: string, charges: readonly Charge[]): Charge[] {
  return charges.filter((c) => c.purchaseAcct === no || c.salesAcct === no)
}

/** Next free 4-digit code (`p010`, `p020` … `p990`) for the type and group. */
export function nextAccountCode(type: string, group: string, accounts: readonly Pick<Account, 'no'>[]): string {
  const prefix = accountLead(type, group)
  const used = new Set(accounts.map((r) => r.no))
  for (let n = Number(`${prefix}010`); n <= Number(`${prefix}990`); n += 10) {
    const code = String(n)
    if (!used.has(code)) return code
  }
  return ''
}

export function blankAccount(accounts: readonly Pick<Account, 'no'>[]): Account {
  return {
    no: nextAccountCode('Expense', 'Indirect expenses', accounts),
    name: '',
    type: 'Expense',
    group: 'Indirect expenses',
    desc: '',
    system: false,
    active: true,
    directPosting: true,
    createdAt: '',
    updatedAt: '',
  }
}

export function duplicateAccount(a: Account, accounts: readonly Pick<Account, 'no'>[]): Account {
  return {
    ...a,
    no: nextAccountCode(a.type, a.group, accounts),
    name: `${a.name} (copy)`,
    system: false,
    active: true,
    createdAt: '',
    updatedAt: '',
  }
}

export interface AccountOnChangeOptions {
  mode?: 'edit' | 'new'
  accounts?: readonly Pick<Account, 'no'>[]
  autoCode?: boolean
}

/** Keep dependent fields (group, and auto-proposed code on new records) consistent while editing. */
export function accountOnChange(d: Account, key: string, options?: AccountOnChangeOptions): Account {
  const n = { ...d }
  if (key === 'type') {
    n.group = ACCOUNT_GROUPS[n.type]?.[0] ?? ''
  }
  if (options?.mode === 'new' && options.autoCode && (key === 'type' || key === 'group') && options.accounts) {
    n.no = nextAccountCode(n.type, n.group, options.accounts)
  }
  return n
}

export function normalizeAccount(d: Account): Account {
  return {
    ...d,
    no: String(d.no || '').trim(),
    name: String(d.name || '').trim(),
    desc: String(d.desc || '').trim(),
  }
}

export function validateAccount(
  d: Account,
  others: readonly Account[],
  charges: readonly Charge[],
): Record<string, string> {
  const e: Record<string, string> = {}
  const prefixes = ACCOUNT_PREFIXES[d.type] ?? []
  if (!/^\d{4}$/.test(d.no)) {
    e.no = 'Use a 4-digit code.'
  } else if (!prefixes.includes(d.no[0])) {
    e.no = `${d.type} codes start with ${prefixes.join(' or ')}.`
  } else {
    const hit = others.find((r) => r.no === d.no)
    if (hit) e.no = `Already used by ${hit.name}.`
  }

  if (!d.name) {
    e.name = 'Enter an account name.'
  } else if (others.some((r) => r.name.toLowerCase() === d.name.toLowerCase())) {
    e.name = 'Another account already has this name.'
  }

  if (!(ACCOUNT_GROUPS[d.type] ?? []).includes(d.group)) {
    e.group = 'Pick a group for this type.'
  }

  if (d.active === false) {
    const used = chargesUsingAccount(d.no, charges).filter((c) => c.active !== false)
    if (used.length) {
      e.active = `Used by active charge ${used.map((c) => c.no).join(', ')} — point it at another account first.`
    }
  }

  return e
}

/** Why an account can't be deleted, or null. */
export function accountDeleteBlocked(a: Pick<Account, 'no' | 'system'>, charges: readonly Charge[]): string | null {
  if (a.system) return 'System account — Shelfree posts to it automatically, so it can’t be deleted.'
  const used = chargesUsingAccount(a.no, charges)
  if (!used.length) return null
  return `Used by charge ${used.map((c) => c.no).join(', ')} — point ${used.length === 1 ? 'it' : 'them'} at another account first.`
}
