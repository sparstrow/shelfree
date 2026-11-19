/**
 * Per-browser grid preferences remembered by dataset: whether the footer totals
 * row is shown and which aggregate each column's footer uses (the user's
 * override of the column's default). View-like data (a saved view's layout)
 * lives in the `savedViews` collection, not here; these are the quiet
 * "remember how I left it" preferences, like the sidebar state in `ui.ts`.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface GridPrefsState {
  /** `datasetId` → totals row switched on / off by the user (unset = the page's default). */
  totals: Record<string, boolean>
  /** `datasetId` → column key → aggregate kind. */
  aggregates: Record<string, Record<string, string>>
  setTotals: (datasetId: string, on: boolean) => void
  setAggregates: (datasetId: string, aggregates: Record<string, string>) => void
}

export const useGridPrefs = create<GridPrefsState>()(
  persist(
    (set) => ({
      totals: {},
      aggregates: {},
      setTotals: (datasetId, on) => set((s) => ({ totals: { ...s.totals, [datasetId]: on } })),
      setAggregates: (datasetId, aggregates) =>
        set((s) => ({ aggregates: { ...s.aggregates, [datasetId]: aggregates } })),
    }),
    { name: 'shelfree.v2.grid-prefs', version: 1 },
  ),
)
