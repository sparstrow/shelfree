/**
 * Regional & format (Settings ▸ Workspace ▸ Regional & format): currency, number and date
 * format, time zone, financial year and week start. Pure rules and formatters; the backend
 * stores the same values. See docs/regional/README.md.
 *
 * The app's own display helpers (`lib/format.ts`) don't read these yet (gap G-029); the
 * formatters here are the pure versions they will call, and `fiscalYearLabel` already feeds
 * the GST invoice-number preview.
 */

export const CURRENCY_OPTIONS = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD'] as const
export const TIMEZONE_OPTIONS = [
  'Asia/Kolkata (IST)',
  'America/New_York (ET)',
  'America/Los_Angeles (PT)',
  'Europe/London (GMT)',
  'Europe/Berlin (CET)',
  'Asia/Dubai (GST)',
  'Asia/Singapore (SGT)',
  'Australia/Sydney (AEST)',
] as const
export const DATE_FORMAT_OPTIONS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD-MMM-YYYY'] as const
export const NUMBER_FORMAT_OPTIONS = ['12,34,567.89', '1,234,567.89', '1.234.567,89', '1 234 567.89'] as const
export const FISCAL_START_OPTIONS = ['January', 'April', 'July', 'October'] as const
export const WEEK_START_OPTIONS = ['Monday', 'Sunday'] as const

export type RegionalSettings = {
  currency: string
  timezone: string
  dateFmt: string
  numFmt: string
  fiscalStart: string
  weekStart: string
}

/** Kanalora: India — rupees, lakh grouping, financial year from April, week from Monday. */
export const REGIONAL_DEFAULTS: RegionalSettings = {
  currency: 'INR',
  timezone: 'Asia/Kolkata (IST)',
  dateFmt: 'DD/MM/YYYY',
  numFmt: '12,34,567.89',
  fiscalStart: 'April',
  weekStart: 'Monday',
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Zero-based month a financial year starts in; April when the name is unknown. */
export function fiscalStartMonth(fiscalStart: string): number {
  const m = MONTHS.indexOf(String(fiscalStart).toLowerCase())
  return m < 0 ? 3 : m
}

/**
 * The financial-year label for a date: `2026-27` for a year starting in April (so 25 Nov 2026 is
 * `2026-27` and 12 Feb 2027 too); a calendar year (`2026`) when it starts in January.
 */
export function fiscalYearLabel(date: Date, fiscalStart: string): string {
  const m0 = fiscalStartMonth(fiscalStart)
  const y = date.getFullYear()
  if (m0 === 0) return String(y)
  const start = date.getMonth() >= m0 ? y : y - 1
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`
}

/** The financial-year label for today. */
export const fiscalYearNow = (fiscalStart: string): string => fiscalYearLabel(new Date(), fiscalStart)

const pad2 = (n: number) => String(n).padStart(2, '0')

/** A date in the chosen format; '' for an unusable value. */
export function formatDateAs(iso: string, dateFmt: string): string {
  const s = String(iso ?? '')
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00`) : new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  const [dd, mm, yyyy] = [pad2(d.getDate()), pad2(d.getMonth() + 1), String(d.getFullYear())]
  switch (dateFmt) {
    case 'MM/DD/YYYY':
      return `${mm}/${dd}/${yyyy}`
    case 'YYYY-MM-DD':
      return `${yyyy}-${mm}-${dd}`
    case 'DD-MMM-YYYY':
      return `${dd}-${MONTH_ABBR[d.getMonth()]}-${yyyy}`
    default:
      return `${dd}/${mm}/${yyyy}`
  }
}

/** Group an unsigned integer string: `lakh` = 12,34,567; otherwise thousands. */
function group(intPart: string, sep: string, lakh: boolean): string {
  if (intPart.length <= 3) return intPart
  const tail = intPart.slice(-3)
  let head = intPart.slice(0, -3)
  const size = lakh ? 2 : 3
  const parts: string[] = []
  while (head.length > size) {
    parts.unshift(head.slice(-size))
    head = head.slice(0, -size)
  }
  if (head) parts.unshift(head)
  return `${parts.join(sep)}${sep}${tail}`
}

/** A number in the chosen format with `decimals` places. */
export function formatNumberAs(n: number, numFmt: string, decimals = 2): string {
  const neg = n < 0
  const [intPart, frac = ''] = Math.abs(n || 0).toFixed(decimals).split('.')
  const [thousands, point, lakh] =
    numFmt === '1.234.567,89'
      ? ['.', ',', false]
      : numFmt === '1 234 567.89'
        ? [' ', '.', false]
        : numFmt === '1,234,567.89'
          ? [',', '.', false]
          : [',', '.', true]
  const body = group(intPart, thousands as string, lakh as boolean) + (decimals > 0 ? (point as string) + frac : '')
  return neg ? `-${body}` : body
}

const SYMBOLS: Readonly<Record<string, string>> = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'AED ', SGD: 'S$', AUD: 'A$', CAD: 'C$' }

/** An amount with the currency's symbol, in the chosen number format. */
export function formatMoneyAs(n: number, currency: string, numFmt: string): string {
  return `${n < 0 ? '-' : ''}${SYMBOLS[currency] ?? `${currency} `}${formatNumberAs(Math.abs(n), numFmt, 2)}`
}

/** Normalise a saved block: unknown values fall back to the defaults. */
export function normalizeRegional(input: Partial<RegionalSettings>): RegionalSettings {
  const pick = (value: string | undefined, allowed: readonly string[], fallback: string) =>
    value && allowed.includes(value) ? value : fallback
  return {
    currency: pick(input.currency, CURRENCY_OPTIONS, REGIONAL_DEFAULTS.currency),
    timezone: pick(input.timezone, TIMEZONE_OPTIONS, REGIONAL_DEFAULTS.timezone),
    dateFmt: pick(input.dateFmt, DATE_FORMAT_OPTIONS, REGIONAL_DEFAULTS.dateFmt),
    numFmt: pick(input.numFmt, NUMBER_FORMAT_OPTIONS, REGIONAL_DEFAULTS.numFmt),
    fiscalStart: pick(input.fiscalStart, FISCAL_START_OPTIONS, REGIONAL_DEFAULTS.fiscalStart),
    weekStart: pick(input.weekStart, WEEK_START_OPTIONS, REGIONAL_DEFAULTS.weekStart),
  }
}
