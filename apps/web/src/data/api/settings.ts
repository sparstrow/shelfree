/**
 * Workspace configuration — the switches and parameters set under Settings.
 * One document per workspace. Stored in localStorage today; the backend will
 * own it per tenant. Extend the schema as each settings page is ported.
 */
import { z } from 'zod'
import { taxCalcSchema } from '@/data/schemas'
import {
  BRANCH_VALUE_VALUES,
  COMP_INTER_STATE_VALUES,
  ITC_BOOKING_VALUES,
  PAPER_TRANSFER_VALUES,
  TAX_SETTINGS_DEFAULTS,
} from '@/domain/tax-settings'
import { DEFAULT_PRODUCTION_SETTINGS } from '@/domain/assembly-order'
import { REGIONAL_DEFAULTS, type RegionalSettings, normalizeRegional } from '@/domain/regional'
import { type TermMap, applyTermPatch, knownTermKeys } from '@/domain/terminology'
import { CUSTOMER_PRICING_MODES, DEFAULT_SALES_PRICING_SETTINGS } from '@/domain/sales-prices'

// Run 2.4 block (Sales pricing, Assembly & production) — kept apart from the other sections.
/** Who may have their own customer price, and what a sales line does without one. */
export const salesPricingSchema = z.object({
  /** Customer pricing capability on/off (Modules & capabilities will own this switch; no row in Sales pricing). */
  enabled: z.boolean(),
  mode: z.enum(CUSTOMER_PRICING_MODES),
  /** ISO date; accounts opened on or after it are eligible in `newOnly` mode. Stamped when the mode is switched. */
  newCutoff: z.string(),
  fallbackToList: z.boolean(),
  blockUnpriced: z.boolean(),
})
export type SalesPricingConfig = z.infer<typeof salesPricingSchema>

/** Defaults and behaviour of assembly orders and bills of materials. */
export const productionSchema = z.object({
  outputLoc: z.string(),
  wipLoc: z.string(),
  manualConsumption: z.boolean(),
  allowShortRelease: z.boolean(),
  /** Percent, 0–100. */
  defaultScrap: z.number(),
  allowOverConsume: z.boolean(),
})
export type ProductionConfig = z.infer<typeof productionSchema>

// Run 2.5a block (Regional & format, Terminology) — kept apart from the other sections.
export const regionalSchema = z.object({
  currency: z.string(),
  timezone: z.string(),
  dateFmt: z.string(),
  numFmt: z.string(),
  fiscalStart: z.string(),
  weekStart: z.string(),
})
/** Renamed labels: key → text (see `domain/terminology`). Only keys with text are stored. */
export const termsSchema = z.record(z.string(), z.string())

export const settingsSchema = z.object({
  purchasing: z.object({
    /** Lock PO unit cost to the vendor's price list (Settings ▸ Purchase prices). */
    lockCostToPriceList: z.boolean(),
    /** Block saving a PO line below the vendor's minimum quantity. */
    blockBelowMinQty: z.boolean(),
  }),
  tax: z.object({
    /** Tax worked out on each line, or on each tax-rate total. */
    taxCalc: taxCalcSchema,
    /** Round the document total to the rupee. */
    roundTotal: z.boolean(),
    /** A composition vendor supplying from another state: warn, or block issuing. */
    compInterState: z.enum(COMP_INTER_STATE_VALUES),
    /** Chart-of-accounts number the rounding difference posts to (Settings ▸ Tax settings). */
    roundOffAcct: z.string(),
    /** People with the override permission may change the tax on one line. */
    lineOverride: z.boolean(),
    /** Flag a party whose GSTIN state differs from its address state. */
    mismatchWarn: z.boolean(),
    /** Bill-to and ship-to in different states: warn, or block the purchase order. */
    paperTransfer: z.enum(PAPER_TRANSFER_VALUES),
    /** When input tax credit is booked. */
    itcBooking: z.enum(ITC_BOOKING_VALUES),
    /** The value put on a branch invoice. */
    branchValue: z.enum(BRANCH_VALUE_VALUES),
    /** Share of selling price (1–100) when branchValue is pctSell. */
    branchPct: z.number().min(1).max(100),
  }),
  // Run 2.4 block — Settings ▸ Sales pricing and Settings ▸ Assembly & production.
  salesPricing: salesPricingSchema,
  production: productionSchema,
  // Run 2.5a block — Settings ▸ Regional & format and Settings ▸ Terminology.
  regional: regionalSchema,
  terms: termsSchema,
})
export type Settings = z.infer<typeof settingsSchema>

export const DEFAULT_SETTINGS: Settings = {
  purchasing: { lockCostToPriceList: true, blockBelowMinQty: true },
  tax: { ...TAX_SETTINGS_DEFAULTS },
  salesPricing: { ...DEFAULT_SALES_PRICING_SETTINGS },
  production: { ...DEFAULT_PRODUCTION_SETTINGS },
  regional: { ...REGIONAL_DEFAULTS },
  terms: {},
}

const KEY = 'shelfree.v2.settings'

/** Keep only keys the app knows, with non-blank text (older or hand-edited storage can't poison labels). */
function readTerms(stored: unknown): Record<string, string> {
  const known = knownTermKeys()
  const out: Record<string, string> = {}
  if (stored && typeof stored === 'object') {
    for (const [key, value] of Object.entries(stored as Record<string, unknown>)) {
      if (known.has(key) && typeof value === 'string' && value.trim() !== '') out[key] = value
    }
  }
  return out
}

function read(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const stored = JSON.parse(raw) as Partial<Settings>
      return settingsSchema.parse({
        purchasing: { ...DEFAULT_SETTINGS.purchasing, ...stored.purchasing },
        tax: { ...DEFAULT_SETTINGS.tax, ...stored.tax },
        salesPricing: { ...DEFAULT_SETTINGS.salesPricing, ...stored.salesPricing },
        production: { ...DEFAULT_SETTINGS.production, ...stored.production },
        regional: normalizeRegional({ ...DEFAULT_SETTINGS.regional, ...stored.regional }),
        terms: readTerms(stored.terms),
      })
    }
  } catch {
    // Unreadable or outdated settings: fall back to defaults.
  }
  return structuredClone(DEFAULT_SETTINGS)
}

export const settingsApi = {
  get: (): Promise<Settings> => Promise.resolve(read()),
  update: (next: Settings): Promise<Settings> => {
    const parsed = settingsSchema.parse(next)
    try {
      localStorage.setItem(KEY, JSON.stringify(parsed))
    } catch {
      // Storage unavailable: the change lasts for this session only.
    }
    return Promise.resolve(parsed)
  },
  /** Save one block without touching the others (they may have changed since this tab loaded). */
  updateSalesPricing: (next: SalesPricingConfig): Promise<Settings> =>
    settingsApi.update({ ...read(), salesPricing: salesPricingSchema.parse(next) }),
  updateProduction: (next: ProductionConfig): Promise<Settings> =>
    settingsApi.update({ ...read(), production: productionSchema.parse(next) }),
  /** Regional & format. Backend: `PATCH /workspace/regional`, owner / admin only. */
  updateRegional: (next: RegionalSettings): Promise<Settings> =>
    settingsApi.update({ ...read(), regional: normalizeRegional(next) }),
  /** Terminology: set (text) or clear (`null`) individual labels on top of the latest stored map. */
  patchTerms: (patch: Readonly<Record<string, string | null>>): Promise<Settings> =>
    settingsApi.update({ ...read(), terms: applyTermPatch(read().terms as TermMap, patch) }),
  resetTerms: (): Promise<Settings> => settingsApi.update({ ...read(), terms: {} }),
  updateTax: (next: Settings['tax']): Promise<Settings> => settingsApi.update({ ...read(), tax: next }),
}
