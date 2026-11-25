/** Seed rows for the Finance settings lists (run 2.3): tax codes and the GST state table. */
import type { TaxCode } from '@/data/schemas'
import { GST_STATES, type GstState } from '@/domain/gst'
import { TAX_CODE_DEFAULTS } from '@/domain/tax-codes'

const STAMP = '2026-09-25T09:00:00.000Z'

export function seedTaxCodes(): TaxCode[] {
  return TAX_CODE_DEFAULTS.map((t) => ({ ...t, createdAt: STAMP, updatedAt: STAMP }))
}

export function seedGstStates(): GstState[] {
  return GST_STATES.map((s) => ({ ...s }))
}
