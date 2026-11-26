import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { securityApi } from '@/data/api/security'

const SESSIONS_KEY = ['security', 'sessions'] as const

/** Where the signed-in user is signed in. */
export function useSessions() {
  return useQuery({ queryKey: SESSIONS_KEY, queryFn: securityApi.sessions, staleTime: Infinity })
}

/** Change password: validated, then handled by the backend. Stores nothing. */
export function useChangePassword() {
  return useMutation({ mutationFn: securityApi.changePassword })
}

export function useSignOutOtherSessions() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: securityApi.signOutOthers,
    onSuccess: () => client.invalidateQueries({ queryKey: SESSIONS_KEY }),
  })
}
