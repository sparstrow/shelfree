/**
 * Tax settings — the workspace-wide GST behaviour (Settings ▸ Finance ▸ Tax settings).
 * Pure rules and option lists; the backend enforces the same. See docs/tax-settings/README.md.
 *
 * Read today: `taxCalc`, `roundTotal` (vendor tax method on purchase orders) and
 * `compInterState` (issuing a PO to a composition vendor in another state). The rest is
 * stored and shown; the tax engine, postings and stock transfers read it when they are built.
 */
import type { Account } from '@/data/schemas'

export const TAX_CALC_VALUES = ['line', 'rate'] as const
export const PAPER_TRANSFER_VALUES = ['warn', 'block'] as const
export const COMP_INTER_STATE_VALUES = ['warn', 'block'] as const
export const ITC_BOOKING_VALUES = ['onBill', 'on2bMatch'] as const
export const BRANCH_VALUE_VALUES = ['landed', 'purchase', 'pctSell'] as const

export type TaxSettings = {
  /** Tax worked out on each line, or on each tax-rate total. */
  taxCalc: (typeof TAX_CALC_VALUES)[number]
  /** Round the document total to the rupee. */
  roundTotal: boolean
  /** Chart-of-accounts number the rounding difference posts to. */
  roundOffAcct: string
  /** People with the override permission may change the tax on one line. */
  lineOverride: boolean
  /** Flag a party whose GSTIN state differs from its address state. */
  mismatchWarn: boolean
  /** Bill-to and ship-to in different states: warn, or block the purchase order. */
  paperTransfer: (typeof PAPER_TRANSFER_VALUES)[number]
  /** A composition vendor supplying from another state: warn, or block issuing. */
  compInterState: (typeof COMP_INTER_STATE_VALUES)[number]
  /** When input tax credit is booked. */
  itcBooking: (typeof ITC_BOOKING_VALUES)[number]
  /** The value put on a branch invoice. */
  branchValue: (typeof BRANCH_VALUE_VALUES)[number]
  /** Share of selling price (1–100) when `branchValue` is `pctSell`. */
  branchPct: number
}

export const TAX_SETTINGS_DEFAULTS: TaxSettings = {
  taxCalc: 'line',
  roundTotal: true,
  roundOffAcct: '6190',
  lineOverride: true,
  mismatchWarn: true,
  paperTransfer: 'warn',
  compInterState: 'warn',
  itcBooking: 'onBill',
  branchValue: 'landed',
  branchPct: 90,
}

export interface TaxOption {
  value: string
  label: string
  desc: string
}

export const TAX_CALC_OPTIONS: readonly TaxOption[] = [
  {
    value: 'line',
    label: 'On each line',
    desc: 'Tax is worked out on each line and rounded, then added up. Line taxes always add up to the tax total. Most billing software and e-invoices work this way.',
  },
  {
    value: 'rate',
    label: 'On each tax-rate total',
    desc: 'Lines are grouped by tax rate, and tax is worked out once on each group’s taxable total. The tax total can differ from the sum of the line taxes by a few paise.',
  },
]

export const PAPER_TRANSFER_OPTIONS: readonly TaxOption[] = [
  {
    value: 'warn',
    label: 'Allow with a warning',
    desc: 'The PO saves with a warning. When the goods arrive, a branch invoice from the billed state to the receiving state is drafted for review.',
  },
  {
    value: 'block',
    label: 'Block the purchase order',
    desc: 'The PO can’t be saved until bill-to matches the ship-to location’s registration.',
  },
]

export const COMP_INTER_STATE_OPTIONS: readonly TaxOption[] = [
  {
    value: 'warn',
    label: 'Allow with a warning',
    desc: 'The PO shows a warning so someone checks the vendor’s registration before issuing.',
  },
  {
    value: 'block',
    label: 'Block issuing the order',
    desc: 'The PO can still be saved as a draft, but can’t be issued until the ship-to location or the vendor changes.',
  },
]

export const ITC_BOOKING_OPTIONS: readonly TaxOption[] = [
  {
    value: 'onBill',
    label: 'When the bill is posted',
    desc: 'Credit goes straight to CGST / SGST / IGST input. Bills missing from GSTR-2B are flagged on the reconciliation screen.',
  },
  {
    value: 'on2bMatch',
    label: 'After it matches GSTR-2B',
    desc: 'Credit waits in 1420 GST input — awaiting 2B match, and moves across once the bill is matched. Safer, one more step.',
  },
]

export const BRANCH_VALUE_OPTIONS: readonly TaxOption[] = [
  { value: 'landed', label: 'Landed cost', desc: 'What the stock cost you, including freight and other purchase charges.' },
  { value: 'purchase', label: 'Purchase cost', desc: 'The vendor price only, without freight.' },
  {
    value: 'pctSell',
    label: 'A share of selling price',
    desc: 'A set share of the receiving branch’s selling price. GST rules accept 90%.',
  },
]

/** Rounding differences post to an income or expense account. */
export const isRoundOffAccount = (a: Pick<Account, 'type' | 'active'>): boolean =>
  a.active !== false && (a.type === 'Income' || a.type === 'Expense')

/**
 * Options of the round-off account select: every active income / expense account, A–Z by number,
 * plus the saved value when it is no longer offered (so it stays visible, never silently swapped).
 */
export function roundOffOptions(
  accounts: readonly Pick<Account, 'no' | 'name' | 'type' | 'active'>[],
  current: string,
): { value: string; label: string }[] {
  const offered = accounts
    .filter(isRoundOffAccount)
    .sort((a, b) => a.no.localeCompare(b.no))
    .map((a) => ({ value: a.no, label: `${a.no} · ${a.name}` }))
  if (current && !offered.some((o) => o.value === current)) {
    const known = accounts.find((a) => a.no === current)
    offered.unshift({ value: current, label: known ? `${current} · ${known.name} (not available)` : `${current} (missing)` })
  }
  return offered
}

/** Error for the round-off account while rounding is on, or null. */
export function roundOffError(
  accountNo: string,
  accounts: readonly Pick<Account, 'no' | 'type' | 'active'>[],
  roundTotal: boolean,
): string | null {
  if (!roundTotal) return null
  const account = accounts.find((a) => a.no === accountNo)
  if (!account) return 'Pick an account for the rounding difference.'
  if (!isRoundOffAccount(account)) return 'Pick an active income or expense account.'
  return null
}

/** Error for the share of selling price, or null. Only matters for `pctSell`. */
export function branchPctError(value: number, branchValue: TaxSettings['branchValue']): string | null {
  if (branchValue !== 'pctSell') return null
  if (!Number.isFinite(value) || value < 1 || value > 100) return 'Enter a share from 1 to 100.'
  if (Math.round(value * 100) !== value * 100) return 'Use at most two decimals.'
  return null
}

/** Normalise before saving: a share outside the used mode keeps its last good value, never NaN. */
export function normalizeTaxSettings(next: TaxSettings): TaxSettings {
  const pct = Number.isFinite(next.branchPct) ? Math.min(100, Math.max(1, Math.round(next.branchPct * 100) / 100)) : TAX_SETTINGS_DEFAULTS.branchPct
  return { ...next, roundOffAcct: next.roundOffAcct.trim(), branchPct: next.branchValue === 'pctSell' ? next.branchPct : pct }
}

/** Option label for a stored value (used by the help popover's current marker and tests). */
export function optionLabel(options: readonly TaxOption[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value
}
