/**
 * Charges — non-stock lines on documents (freight, packing, insurance,
 * loading). Pure rules; the backend must apply the same validation.
 * See docs/charges/README.md.
 */
import type { Account, Charge } from '@/data/schemas'

export const CHARGE_DIRECTIONS = ['Purchase', 'Sales', 'Both'] as const
export const CHARGE_GST_RATES = ['Goods rate', '0%', '5%', '12%', '18%', '28%'] as const

export const chargeBuys = (direction: string) => direction === 'Purchase' || direction === 'Both'
export const chargeSells = (direction: string) => direction === 'Sales' || direction === 'Both'

export const chargeSource = (c: Pick<Charge, 'system'>) => (c.system ? 'System' : 'Custom')
export const chargeStatus = (c: Pick<Charge, 'active'>) => (c.active === false ? 'Inactive' : 'Active')

/** How the charge reaches cost: spread over received items, expensed, or n/a for sales-only. */
export function chargeLanded(c: Pick<Charge, 'direction' | 'allocate'>): string {
  if (!chargeBuys(c.direction)) return 'Not applicable'
  return c.allocate ? 'Allocated to items' : 'Expensed'
}

/** `5110 · Freight inward`, flagging inactive or missing accounts. */
export function accountText(accounts: readonly Account[], no: string): string {
  if (!no) return ''
  const a = accounts.find((x) => x.no === no)
  return a ? `${a.no} · ${a.name}${a.active === false ? ' (inactive)' : ''}` : `${no} · missing`
}

const accountUsable = (accounts: readonly Account[], no: string, type: string) => {
  const a = accounts.find((x) => x.no === no)
  return !!a && a.active !== false && a.type === type
}

/** The charge points at a missing or inactive posting account. */
export function chargeBroken(c: Charge, accounts: readonly Account[]): boolean {
  return (
    (chargeBuys(c.direction) && !accountUsable(accounts, c.purchaseAcct, 'Expense')) ||
    (chargeSells(c.direction) && !accountUsable(accounts, c.salesAcct, 'Income'))
  )
}

/** Account options for a type; keeps the current account listed even if inactive. */
export function accountOptions(accounts: readonly Account[], type: string, current: string) {
  return [
    { value: '', label: 'Select an account…' },
    ...accounts
      .filter((a) => a.type === type && (a.active !== false || a.no === current))
      .map((a) => ({ value: a.no, label: `${a.no} · ${a.name}${a.active === false ? ' (inactive)' : ''}` })),
  ]
}

export function blankCharge(accounts: readonly Account[]): Charge {
  return {
    no: '',
    name: '',
    direction: 'Purchase',
    purchaseAcct: accountUsable(accounts, '5115', 'Expense') ? '5115' : '',
    salesAcct: '',
    gst: '18%',
    sac: '',
    allocate: true,
    system: false,
    active: true,
    desc: '',
    createdAt: '',
    updatedAt: '',
  }
}

/** The next free `CODE-n` for a copy. */
export function nextChargeCode(base: string, charges: readonly Pick<Charge, 'no'>[]): string {
  const used = new Set(charges.map((c) => c.no))
  const b = String(base || 'CHG').slice(0, 9)
  for (let n = 2; n < 100; n++) {
    const code = `${b}-${n}`
    if (!used.has(code)) return code
  }
  return b
}

export function duplicateCharge(c: Charge, charges: readonly Charge[]): Charge {
  return { ...c, no: nextChargeCode(c.no, charges), name: `${c.name} (copy)`, system: false, active: true, createdAt: '', updatedAt: '' }
}

/** Keep dependent fields consistent while editing. */
export function chargeOnChange(d: Charge, key: string): Charge {
  const n = { ...d }
  if (key === 'no') n.no = String(n.no || '').toUpperCase()
  if (key === 'direction') {
    if (!chargeBuys(n.direction)) n.allocate = false
    else if (!chargeBuys(d.direction)) n.allocate = true
  }
  return n
}

export function normalizeCharge(d: Charge): Charge {
  const n: Charge = {
    ...d,
    no: String(d.no || '').trim().toUpperCase(),
    name: String(d.name || '').trim(),
    sac: String(d.sac || '').replace(/\s+/g, ''),
    desc: String(d.desc || '').trim(),
  }
  if (!chargeBuys(n.direction)) {
    n.purchaseAcct = ''
    n.allocate = false
  }
  if (!chargeSells(n.direction)) n.salesAcct = ''
  return n
}

export function validateCharge(d: Charge, others: readonly Charge[], accounts: readonly Account[]): Record<string, string> {
  const e: Record<string, string> = {}
  if (!/^[A-Z0-9][A-Z0-9-]{1,11}$/.test(d.no)) e.no = 'Use 2–12 letters, digits or hyphens.'
  else {
    const hit = others.find((c) => c.no === d.no)
    if (hit) e.no = `Already used by ${hit.name}.`
  }
  if (!d.name) e.name = 'Enter a description.'
  else if (others.some((c) => c.name.toLowerCase() === d.name.toLowerCase())) e.name = 'Another charge already has this description.'
  if (chargeBuys(d.direction) && !accountUsable(accounts, d.purchaseAcct, 'Expense')) {
    const a = accounts.find((x) => x.no === d.purchaseAcct)
    e.purchaseAcct = a && a.active === false ? 'This account is inactive — pick an active expense account.' : 'Pick the expense account this charge posts to.'
  }
  if (chargeSells(d.direction) && !accountUsable(accounts, d.salesAcct, 'Income')) {
    e.salesAcct = accounts.some((a) => a.type === 'Income' && a.active !== false)
      ? 'Pick the income account this charge posts to.'
      : 'No income accounts yet — they arrive with Sales finance. Add one in the Chart of Accounts first.'
  }
  if (!(CHARGE_GST_RATES as readonly string[]).includes(d.gst)) e.gst = 'Pick a GST rate.'
  if (!/^(\d{4}|\d{6}|\d{8})$/.test(d.sac)) e.sac = 'Use a 4, 6 or 8-digit HSN/SAC code.'
  return e
}

/** Why a charge can't be deleted, or null. */
export function chargeDeleteBlocked(c: Pick<Charge, 'system'>): string | null {
  return c.system ? 'System charge — freight policies generate lines with it, so it can’t be deleted.' : null
}
