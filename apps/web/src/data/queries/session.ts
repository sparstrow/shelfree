import { useQuery } from '@tanstack/react-query'
import { sessionApi } from '@/data/api/session'

export function useWorkspace() {
  return useQuery({ queryKey: ['session', 'workspace'], queryFn: sessionApi.workspace, staleTime: Infinity })
}

export function useMe() {
  return useQuery({ queryKey: ['session', 'me'], queryFn: sessionApi.me, staleTime: Infinity })
}
