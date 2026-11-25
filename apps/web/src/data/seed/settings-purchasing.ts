/** Seed rows for the Purchasing settings lists (run 2.1): carrier types, statuses, custom fields, payment terms. */
import type { CarrierTypeRecord, CustomField, PaymentTerm, StatusDef } from '@/data/schemas'
import { CARRIER_TYPE_DEFAULTS } from '@/domain/carriers'
import { moduleOfEntity } from '@/domain/custom-fields'
import { moduleOfFlow } from '@/domain/statuses'

const STAMP = '2026-09-24T09:00:00.000Z'

export function seedCarrierTypes(): CarrierTypeRecord[] {
  return CARRIER_TYPE_DEFAULTS.map((t) => ({ ...t, createdAt: STAMP, updatedAt: STAMP }))
}

type StatusRow = [name: string, category: StatusDef['category'], tone: StatusDef['tone']]

/** The statuses the app's own rules use today (domain/status.ts tones), plus Kanalora's custom ones. */
const SYSTEM_STATUSES: ReadonlyArray<readonly [StatusDef['flow'], StatusRow[]]> = [
  [
    'purchase-order',
    [
      ['Draft', 'open', 'neutral'],
      ['Issued', 'open', 'info'],
      ['Partially received', 'open', 'warn'],
      ['Received', 'closed', 'ok'],
      ['Closed', 'closed', 'ok'],
      ['Cancelled', 'closed', 'bad'],
    ],
  ],
  [
    'purchase-receipt',
    [
      ['Draft', 'open', 'neutral'],
      ['Posted', 'closed', 'ok'],
      ['Cancelled', 'closed', 'bad'],
    ],
  ],
  [
    'sales-order',
    [
      ['Open', 'open', 'info'],
      ['Released', 'open', 'info'],
      ['Shipped', 'open', 'warn'],
      ['Invoiced', 'closed', 'ok'],
    ],
  ],
  [
    'sales-invoice',
    [
      ['Draft', 'open', 'neutral'],
      ['Open', 'open', 'info'],
      ['Overdue', 'open', 'bad'],
      ['Paid', 'closed', 'ok'],
    ],
  ],
  [
    'bom',
    [
      ['Draft', 'open', 'neutral'],
      ['Active', 'open', 'ok'],
      ['Archived', 'closed', 'neutral'],
    ],
  ],
  [
    'assembly-order',
    [
      ['Planned', 'open', 'neutral'],
      ['Draft', 'open', 'neutral'],
      ['Released', 'open', 'info'],
      ['In progress', 'open', 'warn'],
      ['Finished', 'closed', 'ok'],
      ['Cancelled', 'closed', 'bad'],
    ],
  ],
]

export function seedStatuses(): StatusDef[] {
  const out: StatusDef[] = []
  const add = (flow: StatusDef['flow'], row: StatusRow, order: number, system: boolean) => {
    out.push({
      id: `STS${String(out.length + 1).padStart(4, '0')}`,
      flow,
      module: moduleOfFlow(flow),
      name: row[0],
      category: row[1],
      tone: row[2],
      order,
      system,
    })
  }
  for (const [flow, rows] of SYSTEM_STATUSES) rows.forEach((row, i) => add(flow, row, i + 1, true))
  // Kanalora's own stages (the prototype's example: a packing stage between Released and Shipped).
  add('sales-order', ['Packed', 'open', 'info'], 5, false)
  add('purchase-order', ['Awaiting QC', 'open', 'warn'], 7, false)
  return out
}

export function seedCustomFields(): CustomField[] {
  const F = (
    entity: CustomField['entity'],
    label: string,
    type: CustomField['type'],
    options: string[] = [],
    required = false,
  ): Omit<CustomField, 'id'> => ({ entity, module: moduleOfEntity(entity), label, type, options, required, active: true })
  const rows = [
    F('item', 'Country of origin', 'text'),
    F('item', 'Hazard class', 'list', ['None', 'Flammable', 'Irritant']),
    F('customer', 'Loyalty tier', 'list', ['Standard', 'Silver', 'Gold']),
    F('vendor', 'Kiln batch capacity', 'number'),
    F('vendor', 'Licence valid till', 'date'),
    F('purchase-order', 'Kiln batch ref.', 'text'),
  ]
  return rows.map((r, i) => ({ id: `CF${String(i + 1).padStart(4, '0')}`, ...r }))
}

export function seedPaymentTerms(): PaymentTerm[] {
  const both = ['purchasing', 'sales']
  return [
    { code: 'NET30', name: 'Net 30 days', days: 30, modules: both, active: true },
    { code: 'NET15', name: 'Net 15 days', days: 15, modules: both, active: true },
    { code: 'COD', name: 'Cash on delivery', days: 0, modules: both, active: true },
    { code: 'EOM', name: 'End of month', days: null, modules: both, active: true },
  ]
}
