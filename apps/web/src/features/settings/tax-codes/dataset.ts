import type { Dataset, GridColumn } from '@/components/data-grid/model'
import type { TaxCode } from '@/data/schemas'
import {
  type RateDraft,
  type TaxCodeUsage,
  draftRates,
  rateSummary,
  taxRateOn,
} from '@/domain/tax-codes'
import { EM_DASH, fmtDate } from '@/lib/format'

/** Editable row: the code with its rates as drafts (`locked` = started before today), plus derived usage. */
export type TaxCodeRow = Omit<TaxCode, 'rates'> & {
  rates: RateDraft[]
  usage: TaxCodeUsage
  /** The date the row was built for (ISO): rate status and locks are relative to it. */
  today: string
}

export const toTaxCodeRow = (t: TaxCode, usage: TaxCodeUsage, today: string): TaxCodeRow => ({
  ...t,
  rates: draftRates(t, today, 'edit'),
  usage,
  today,
})

/** The stored shape of a row's rates (view and summary helpers read numbers). */
export const ratesOf = (r: Pick<TaxCodeRow, 'rates'>) => r.rates.map((x) => ({ rate: Number(x.rate), from: x.from }))

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

const sourceOf = (r: Pick<TaxCodeRow, 'system'>) => (r.system ? 'Built-in' : 'Custom')
const statusOf = (r: Pick<TaxCodeRow, 'active'>) => (r.active ? 'Active' : 'Inactive')

export function taxCodesDataset(): Dataset<TaxCodeRow> {
  const current = (r: TaxCodeRow) => taxRateOn({ kind: r.kind, rates: ratesOf(r) }, r.today)
  const raw = (r: TaxCodeRow, key: string): string | number => {
    switch (key) {
      case 'code':
        return r.code
      case 'name':
        return r.name
      case 'rate':
        return current(r)?.rate ?? ''
      case 'from':
        return current(r)?.from ?? ''
      case 'appliesTo':
        return r.appliesTo
      case 'source':
        return sourceOf(r)
      case 'charges':
        return r.usage.charges
      case 'status':
        return statusOf(r)
      default:
        return ''
    }
  }
  return {
    id: 'settings-tax-codes',
    noun: 'tax code',
    nounPlural: 'tax codes',
    idOf: (r) => r.code,
    columns: [
      col('code', 'Code', 100, { frozen: 'left', type: 'mono', hideable: false }),
      col('name', 'Name', 220, { min: 120 }),
      col('rate', 'Rate', 190, { type: 'num', align: 'right' }),
      col('from', 'Effective from', 130),
      col('appliesTo', 'Applies to', 110),
      col('source', 'Source', 100),
      col('charges', 'Charges', 90, { type: 'num', align: 'right' }),
      col('status', 'Status', 100, { type: 'pill' }),
    ],
    raw,
    text: (r, key) => {
      if (key === 'rate') return rateSummary({ kind: r.kind, rates: ratesOf(r) }, r.today, fmtDate)
      if (key === 'from') {
        const c = current(r)
        return c ? fmtDate(c.from) : EM_DASH
      }
      const v = raw(r, key)
      return v === '' ? EM_DASH : String(v)
    },
    searchBlob: (r) =>
      [r.code, r.name, r.desc, r.appliesTo, sourceOf(r), statusOf(r), rateSummary({ kind: r.kind, rates: ratesOf(r) }, r.today, fmtDate)]
        .join(' \u0001 ')
        .toLowerCase(),
    views: [
      { id: 'all', name: 'All codes', system: true, filters: [] },
      { id: 'active', name: 'Active', filters: [{ key: 'status', op: 'isAny', value: ['Active'] }] },
      { id: 'inactive', name: 'Inactive', filters: [{ key: 'status', op: 'isAny', value: ['Inactive'] }] },
    ],
    filterColumns: [
      { key: 'code', label: 'Code', type: 'text' },
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'appliesTo', label: 'Applies to', type: 'enum', options: ['Goods', 'Services', 'Both'] },
      { key: 'source', label: 'Source', type: 'enum', options: ['Built-in', 'Custom'] },
      { key: 'status', label: 'Status', type: 'enum', options: ['Active', 'Inactive'] },
    ],
  }
}
