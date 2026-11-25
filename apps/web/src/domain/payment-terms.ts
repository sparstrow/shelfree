/**
 * Payment terms — the terms offered to customers and agreed with vendors
 * (Settings ▸ Payment terms, module slices and Shared lists). Pure rules; the backend
 * enforces the same. See docs/payment-terms/README.md.
 *
 * A term can serve several modules (Purchasing and Sales), so it carries `modules[]` and a
 * module slice filters by inclusion. Vendors store `paymentTerms` and customers `terms` as
 * free text today (`NET 30`); a term is "in use" when that text matches its code or name.
 */
import type { Customer, PaymentTerm, Vendor } from '@/data/schemas'

export type TermModuleId = 'purchasing' | 'sales'

export const TERM_MODULES: readonly TermModuleId[] = ['purchasing', 'sales']

export const TERM_MODULE_LABELS: Readonly<Record<TermModuleId, string>> = {
  purchasing: 'Purchasing',
  sales: 'Sales',
}

export const MAX_DAYS = 365

/** `NET 30`, `net30` and `Net 30 days` compare equal to the code NET30 / name. */
export function termKey(text: string): string {
  return text.toUpperCase().replace(/[\s_-]+/g, '')
}

export function termMatches(term: Pick<PaymentTerm, 'code' | 'name'>, text: string): boolean {
  if (!text.trim()) return false
  const k = termKey(text)
  return k === termKey(term.code) || k === termKey(term.name)
}

export interface TermUsage {
  vendors: number
  customers: number
}

export function termUsage(
  term: Pick<PaymentTerm, 'code' | 'name'>,
  vendors: readonly Pick<Vendor, 'paymentTerms'>[],
  customers: readonly Pick<Customer, 'terms'>[],
): TermUsage {
  return {
    vendors: vendors.filter((v) => termMatches(term, v.paymentTerms)).length,
    customers: customers.filter((c) => termMatches(term, c.terms)).length,
  }
}

export function usageTotal(u: TermUsage): number {
  return u.vendors + u.customers
}

export function usageText(u: TermUsage): string {
  const parts: string[] = []
  if (u.vendors) parts.push(`${u.vendors} ${u.vendors === 1 ? 'vendor' : 'vendors'}`)
  if (u.customers) parts.push(`${u.customers} ${u.customers === 1 ? 'customer' : 'customers'}`)
  return parts.join(' and ')
}

export function termDeleteBlock(u: TermUsage): string | null {
  const total = usageTotal(u)
  if (total === 0) return null
  return `Used by ${usageText(u)} — move ${total === 1 ? 'it' : 'them'} to another term first, or make this one inactive.`
}

export function termCodeLocked(u: TermUsage): boolean {
  return usageTotal(u) > 0
}

export function termSummary(term: Pick<PaymentTerm, 'days'>): string {
  if (term.days === null) return '—'
  return term.days === 0 ? 'Due on delivery' : `${term.days} ${term.days === 1 ? 'day' : 'days'}`
}

export function normalizeTerm(d: PaymentTerm): PaymentTerm {
  return { ...d, code: d.code.trim().toUpperCase(), name: d.name.trim().replace(/\s+/g, ' ') }
}

export function validateTerm(
  d: PaymentTerm,
  others: readonly PaymentTerm[],
  usage: TermUsage,
  original?: PaymentTerm | null,
): Record<string, string> {
  const fe: Record<string, string> = {}
  if (!/^[A-Z0-9][A-Z0-9-]{1,11}$/.test(d.code)) fe.code = 'Use 2–12 letters, digits or hyphens.'
  else if (others.some((t) => t.code === d.code)) fe.code = 'This code is already used.'

  if (!d.name) fe.name = 'Enter a name.'
  else if (others.some((t) => t.name.toLowerCase() === d.name.toLowerCase())) fe.name = 'Another term already has this name.'

  if (d.days !== null && (!Number.isInteger(d.days) || d.days < 0 || d.days > MAX_DAYS)) {
    fe.days = `Use whole days from 0 to ${MAX_DAYS}, or leave blank.`
  }

  if (d.modules.length === 0) fe.modules = 'Offer the term in at least one module.'
  else if (original) {
    // A module can't be dropped while its records still use the term.
    if (!d.modules.includes('purchasing') && original.modules.includes('purchasing') && usage.vendors > 0) {
      fe.modules = `${usage.vendors} ${usage.vendors === 1 ? 'vendor uses' : 'vendors use'} this term — keep Purchasing on.`
    } else if (!d.modules.includes('sales') && original.modules.includes('sales') && usage.customers > 0) {
      fe.modules = `${usage.customers} ${usage.customers === 1 ? 'customer uses' : 'customers use'} this term — keep Sales on.`
    }
  }
  return fe
}

/** Terms offered in a module (or all terms when none given). */
export function termsForModule<T extends Pick<PaymentTerm, 'modules'>>(terms: readonly T[], moduleId?: string): T[] {
  return moduleId ? terms.filter((t) => t.modules.includes(moduleId)) : [...terms]
}
