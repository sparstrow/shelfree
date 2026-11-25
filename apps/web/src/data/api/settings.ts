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
import { DEFAULT_FAVORITES_CONFIG, FAVORITES_CAP_MAX, FAVORITES_CAP_MIN, VIEW_SHARE_ROLES } from '@/domain/favorites'
import { DEFAULT_CAPABILITIES, DEFAULT_MODULES, normalizeModules } from '@/domain/modules-capabilities'
import { DEFAULT_NAVIGATION_SETTINGS } from '@/domain/navigation-settings'

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
// Run 2.5b block (Modules & capabilities, Navigation, Favorites & views).
/** Module on / off (missing = on). Home and Warehouse are always on. */
export const modulesSchema = z.record(z.string(), z.boolean())
/** Scale capabilities on / off. Customer pricing is not here: its switch is `salesPricing.enabled`. */
export const capabilitiesSchema = z.record(z.string(), z.boolean())
export const navigationSchema = z.object({
  departments: z.boolean(),
  jumpBackIn: z.boolean(),
  showUnbuilt: z.boolean(),
})
export type NavigationConfig = z.infer<typeof navigationSchema>
export const favoritesConfigSchema = z.object({
  enabled: z.boolean(),
  cap: z.number().int().min(FAVORITES_CAP_MIN).max(FAVORITES_CAP_MAX),
  shareRole: z.enum(VIEW_SHARE_ROLES),
})
export type FavoritesConfigBlock = z.infer<typeof favoritesConfigSchema>

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
  // Run 2.5b block — Settings ▸ Modules & capabilities, Navigation, Favorites & views.
  modules: modulesSchema,
  capabilities: capabilitiesSchema,
  navigation: navigationSchema,
  favoritesConfig: favoritesConfigSchema,
})
export type Settings = z.infer<typeof settingsSchema>

export const DEFAULT_SETTINGS: Settings = {
  purchasing: { lockCostToPriceList: true, blockBelowMinQty: true },
  tax: { ...TAX_SETTINGS_DEFAULTS },
  salesPricing: { ...DEFAULT_SALES_PRICING_SETTINGS },
  production: { ...DEFAULT_PRODUCTION_SETTINGS },
  regional: { ...REGIONAL_DEFAULTS },
  terms: {},
  modules: { ...DEFAULT_MODULES },
  capabilities: { ...DEFAULT_CAPABILITIES },
  navigation: { ...DEFAULT_NAVIGATION_SETTINGS },
  favoritesConfig: { ...DEFAULT_FAVORITES_CONFIG },
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
        modules: { ...DEFAULT_SETTINGS.modules, ...stored.modules },
        capabilities: { ...DEFAULT_SETTINGS.capabilities, ...stored.capabilities },
        navigation: { ...DEFAULT_SETTINGS.navigation, ...stored.navigation },
        favoritesConfig: { ...DEFAULT_SETTINGS.favoritesConfig, ...stored.favoritesConfig },
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
  /**
   * Save modules, capabilities and the customer-pricing switch together (one block-level save): the
   * switch lives in `salesPricing.enabled`, so there is one source and a stale tab cannot split them.
   */
  updateModulesCapabilities: (next: {
    modules: Record<string, boolean>
    capabilities: Record<string, boolean>
    customerPricing: boolean
  }): Promise<Settings> => {
    const cur = read()
    return settingsApi.update({
      ...cur,
      modules: modulesSchema.parse(normalizeModules(next.modules)),
      capabilities: capabilitiesSchema.parse(next.capabilities),
      salesPricing: { ...cur.salesPricing, enabled: next.customerPricing },
    })
  },
  updateNavigation: (next: NavigationConfig): Promise<Settings> =>
    settingsApi.update({ ...read(), navigation: navigationSchema.parse(next) }),
  updateFavoritesConfig: (next: FavoritesConfigBlock): Promise<Settings> =>
    settingsApi.update({ ...read(), favoritesConfig: favoritesConfigSchema.parse(next) }),
  updateTax: (next: Settings['tax']): Promise<Settings> => settingsApi.update({ ...read(), tax: next }),
}
