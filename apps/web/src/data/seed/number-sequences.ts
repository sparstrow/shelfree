import type { NumberSequence, NumberSequenceDocType } from '@/data/schemas'
import { moduleOfDocType } from '@/domain/number-sequences'
import {
  seedAssemblyOrders,
  seedBOMs,
  seedEmployees,
  seedInvoices,
  seedItems,
  seedOrders,
  seedPurchaseOrders,
  seedPurchaseReceipts,
} from './seed-data.js'

interface NumberedSeedRow {
  no?: unknown
  id?: unknown
}

function idsFromSeed(rows: unknown[], field: 'no' | 'id'): string[] {
  return rows.map((row) => {
    const value = (row as NumberedSeedRow)[field]
    return typeof value === 'string' ? value : ''
  })
}

function statsForPrefix(
  nos: readonly string[],
  prefix: string,
): { max: number; digits: number; count: number } {
  const re = new RegExp(`^${prefix}(\\d+)$`)
  let max = 0
  let digits = 5
  let count = 0
  for (const raw of nos) {
    const m = re.exec(raw)
    if (!m) continue
    count += 1
    const n = Number.parseInt(m[1], 10)
    if (n > max) max = n
    digits = Math.max(digits, m[1].length)
  }
  return { max, digits, count }
}

interface SeedSequenceDef {
  docType: NumberSequenceDocType
  name: string
  prefix: string
  rows: () => unknown[]
  field: 'no' | 'id'
}

const SEQUENCE_DEFS: readonly SeedSequenceDef[] = [
  { docType: 'purchase-order', name: 'Purchase orders', prefix: 'PO', rows: seedPurchaseOrders, field: 'no' },
  { docType: 'purchase-receipt', name: 'Goods receipts', prefix: 'GRN', rows: seedPurchaseReceipts, field: 'no' },
  { docType: 'sales-order', name: 'Sales orders', prefix: 'SO', rows: seedOrders, field: 'no' },
  { docType: 'sales-invoice', name: 'Sales invoices', prefix: 'INV', rows: seedInvoices, field: 'no' },
  // Seeded items use free user SKUs (ASH-PWH-18, etc.) rather than the suggested ITM series,
  // so matching ^ITM(\d+)$ yields 0 issued and next = 1 (ITM00001).
  { docType: 'item', name: 'Items', prefix: 'ITM', rows: seedItems, field: 'no' },
  { docType: 'bom', name: 'Bills of materials', prefix: 'BOM', rows: seedBOMs, field: 'no' },
  { docType: 'assembly-order', name: 'Assembly orders', prefix: 'AO', rows: seedAssemblyOrders, field: 'no' },
  { docType: 'employee', name: 'Employees', prefix: 'EMP', rows: seedEmployees, field: 'id' },
]

/**
 * Default active number sequence per document type, computed directly from the
 * seeded documents so `next` is one past the highest existing number.
 */
export function seedNumberSequences(): NumberSequence[] {
  return SEQUENCE_DEFS.map((def, index) => {
    const nos = idsFromSeed(def.rows(), def.field)
    const { max, digits, count } = statsForPrefix(nos, def.prefix)
    return {
      id: `SEQ${String(index + 1).padStart(5, '0')}`,
      docType: def.docType,
      module: moduleOfDocType(def.docType),
      name: def.name,
      prefix: def.prefix,
      digits,
      next: max + 1,
      resets: 'never',
      isDefault: true,
      active: true,
      issued: count,
    }
  })
}
