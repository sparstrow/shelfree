import type { Dataset, GridColumn } from '@/components/data-grid/model'
import type { SettingsModuleId } from '@/components/settings/registry'
import type { PaymentTerm } from '@/data/schemas'
import { TERM_MODULES, TERM_MODULE_LABELS, type TermUsage, termSummary, usageText, usageTotal } from '@/domain/payment-terms'
import { EM_DASH } from '@/lib/format'

/**
 * Editable row. `days` is text while typing; `forPurchasing` / `forSales` are the
 * two module switches that make up `modules`; `usage` is worked out from vendors
 * and customers (never stored).
 */
export type PaymentTermRow = Omit<PaymentTerm, 'days'> & {
  days: number | string | null
  forPurchasing: boolean
  forSales: boolean
  usage: TermUsage
}

export const moduleSwitches = (modules: readonly string[]) => ({
  forPurchasing: modules.includes('purchasing'),
  forSales: modules.includes('sales'),
})

export const modulesOf = (r: Pick<PaymentTermRow, 'forPurchasing' | 'forSales'>): string[] => [
  ...(r.forPurchasing ? ['purchasing'] : []),
  ...(r.forSales ? ['sales'] : []),
]

/** Strict term from a draft row. */
export function toPaymentTerm(r: PaymentTermRow): PaymentTerm {
  const days =
    r.days === null || r.days === ''
      ? null
      : typeof r.days === 'number'
        ? r.days
        : Number(r.days.trim())
  return { code: r.code, name: r.name, days, modules: modulesOf(r), active: r.active }
}

export const withSwitches = (t: PaymentTerm, usage: TermUsage): PaymentTermRow => ({
  ...t,
  ...moduleSwitches(t.modules),
  usage,
})

const col = (key: string, label: string, width: number, extra: Partial<GridColumn> = {}): GridColumn => ({
  key,
  label,
  width,
  min: Math.min(width, 80),
  visible: true,
  align: 'left',
  type: 'text',
  sortable: true,
  ...extra,
})

const modulesText = (modules: readonly string[]) =>
  TERM_MODULES.filter((m) => modules.includes(m))
    .map((m) => TERM_MODULE_LABELS[m])
    .join(', ')
const statusOf = (t: Pick<PaymentTerm, 'active'>) => (t.active ? 'Active' : 'Inactive')

export function paymentTermsDataset(module?: SettingsModuleId): Dataset<PaymentTermRow> {
  const raw = (r: PaymentTermRow, key: string): string | number => {
    const t = toPaymentTerm(r)
    switch (key) {
      case 'code':
        return t.code
      case 'name':
        return t.name
      case 'days':
        return t.days === null ? '' : Number.isFinite(t.days) ? t.days : ''
      case 'modules':
        return modulesText(t.modules)
      case 'used':
        return usageTotal(r.usage)
      case 'status':
        return statusOf(t)
      default:
        return ''
    }
  }
  return {
    id: module ? `settings-terms-${module}` : 'settings-terms',
    noun: 'term',
    nounPlural: 'terms',
    idOf: (r) => r.code,
    columns: [
      col('code', 'Code', 104, { frozen: 'left', type: 'mono', hideable: false }),
      col('name', 'Name', 200, { min: 120 }),
      col('days', 'Net days', 100, { type: 'num', align: 'right' }),
      ...(!module ? [col('modules', 'Module', 150)] : []),
      col('used', 'Used by', 100, { type: 'num', align: 'right' }),
      col('status', 'Status', 100, { type: 'pill' }),
    ],
    raw,
    text: (r, key) => {
      const v = raw(r, key)
      return v === '' ? EM_DASH : String(v)
    },
    searchBlob: (r) =>
      [r.code, r.name, termSummary(toPaymentTerm(r)), modulesText(r.modules), usageText(r.usage), statusOf(r)]
        .join(' \u0001 ')
        .toLowerCase(),
    views: [
      { id: 'all', name: 'All terms', system: true, filters: [] },
      { id: 'active', name: 'Active', filters: [{ key: 'status', op: 'isAny', value: ['Active'] }] },
      { id: 'inactive', name: 'Inactive', filters: [{ key: 'status', op: 'isAny', value: ['Inactive'] }] },
    ],
    filterColumns: [
      { key: 'code', label: 'Code', type: 'text' },
      { key: 'name', label: 'Name', type: 'text' },
      ...(!module ? [{ key: 'modules', label: 'Module', type: 'text' as const }] : []),
      { key: 'status', label: 'Status', type: 'enum', options: ['Active', 'Inactive'] },
    ],
    defaultSort: { key: 'days', dir: 'desc' },
  }
}
