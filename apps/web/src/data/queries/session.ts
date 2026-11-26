import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type Me, sessionApi } from '@/data/api/session'

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

/** Query options for the signed-in user — usable in route `beforeLoad` (`context.queryClient`). */
export const meQueryOptions = { queryKey: ME_KEY, queryFn: sessionApi.me, staleTime: Infinity } as const

export function useMe() {
  return useQuery(meQueryOptions)
}

/**
 * Save part of the signed-in user's own settings (Settings ▸ Personal). Only the keys given change; the rest of
 * the record is read fresh at save time, so a section never writes back a stale copy of another's values.
 */
export function useUpdateMe() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<Me>) => sessionApi.patchMe(patch),
    onSuccess: (data) => {
      client.setQueryData(ME_KEY, data)
      // A profile change is mirrored to the People ▸ Users record.
      void client.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
