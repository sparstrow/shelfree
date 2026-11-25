import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type Settings, settingsApi } from '@/data/api/settings'

const KEY = ['settings'] as const

/** Workspace configuration (Settings). */
export function useSettings() {
  return useQuery({ queryKey: KEY, queryFn: settingsApi.get, staleTime: Infinity })
}

export function useUpdateSettings() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: settingsApi.update,
    onSuccess: (data) => client.setQueryData(KEY, data),
  })
}

/** Save the `tax` block only, on top of the latest stored settings (never a stale copy of the others). */
export function useUpdateTaxSettings() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (next: Settings['tax']) => settingsApi.updateTax(next),
    onSuccess: (data) => client.setQueryData(KEY, data),
  })
}
