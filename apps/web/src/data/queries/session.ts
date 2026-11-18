import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { sessionApi } from '@/data/api/session'

const WORKSPACE_KEY = ['session', 'workspace'] as const
const ME_KEY = ['session', 'me'] as const

export function useWorkspace() {
  return useQuery({ queryKey: WORKSPACE_KEY, queryFn: sessionApi.workspace, staleTime: Infinity })
}

/** Save the workspace identity (Settings ▸ Business profile). */
export function useUpdateWorkspace() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: sessionApi.updateWorkspace,
    onSuccess: (data) => client.setQueryData(WORKSPACE_KEY, data),
  })
}

export function useMe() {
  return useQuery({ queryKey: ME_KEY, queryFn: sessionApi.me, staleTime: Infinity })
}

/** Save the signed-in user's own settings. */
export function useUpdateMe() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: sessionApi.updateMe,
    onSuccess: (data) => client.setQueryData(ME_KEY, data),
  })
}
