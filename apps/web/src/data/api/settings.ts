/**
 * Workspace configuration — the switches and parameters set under Settings.
 * One document per workspace. Stored in localStorage today; the backend will
 * own it per tenant. Extend the schema as each settings page is ported.
 */
import { z } from 'zod'
import { taxCalcSchema } from '@/data/schemas'

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
    compInterState: z.enum(['warn', 'block']),
  }),
})
export type Settings = z.infer<typeof settingsSchema>

export const DEFAULT_SETTINGS: Settings = {
  purchasing: { lockCostToPriceList: true, blockBelowMinQty: true },
  tax: { taxCalc: 'line', roundTotal: true, compInterState: 'warn' },
}

const KEY = 'shelfree.v2.settings'

function read(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const stored = JSON.parse(raw) as Partial<Settings>
      return settingsSchema.parse({
        purchasing: { ...DEFAULT_SETTINGS.purchasing, ...stored.purchasing },
        tax: { ...DEFAULT_SETTINGS.tax, ...stored.tax },
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
}
