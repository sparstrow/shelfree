/** Hooks for Settings ▸ Workspace ▸ Regional & format and Terminology (and `useTerm`, which any screen can call). */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '@/data/api/settings'
import { useSettings } from '@/data/queries/settings'
import type { RegionalSettings } from '@/domain/regional'
import { type TermMap, locationTerm, termGet } from '@/domain/terminology'

const SETTINGS_KEY = ['settings'] as const

/** Save the `regional` block only, on top of the latest stored settings. */
export function useUpdateRegionalSettings() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (next: RegionalSettings) => settingsApi.updateRegional(next),
    onSuccess: (data) => client.setQueryData(SETTINGS_KEY, data),
  })
}

/** Rename (text) or restore (`null`) labels. */
export function usePatchTerms() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (patch: Readonly<Record<string, string | null>>) => settingsApi.patchTerms(patch),
    onSuccess: (data) => client.setQueryData(SETTINGS_KEY, data),
  })
}

export function useResetTerms() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => settingsApi.resetTerms(),
    onSuccess: (data) => client.setQueryData(SETTINGS_KEY, data),
  })
}

const NO_TERMS: TermMap = {}

/** The renamed labels (empty until settings load). */
export function useTerms(): TermMap {
  return useSettings().data?.terms ?? NO_TERMS
}

/** A label as the workspace names it: `useTerm('module.finance', 'Finance')`. */
export function useTerm(key: string, fallback: string): string {
  return termGet(useTerms(), key, fallback)
}

/** The workspace's name for a stock site: `{ singular: 'Location', plural: 'Locations' }` unless renamed. */
export function useLocationTerm(): { singular: string; plural: string } {
  return locationTerm(useTerms())
}
