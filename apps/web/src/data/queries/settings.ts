import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '@/data/api/settings'

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
