/** Hooks for Settings ▸ Workspace ▸ GST registrations. */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  cancelGstRegistration,
  deleteGstRegistration,
  makeGstRegistrationPrimary,
  reactivateGstRegistration,
  restoreGstRegistration,
  saveGstRegistration,
} from '@/data/api/gst-registrations'
import type { GstRegistration } from '@/data/schemas'

/** A registration change also moves the workspace GSTIN mirror and what Locations show. */
const refresh = (client: ReturnType<typeof useQueryClient>) =>
  Promise.all(['gstRegistrations', 'warehouses'].map((name) => client.invalidateQueries({ queryKey: [name] }))).then(() =>
    client.invalidateQueries({ queryKey: ['session', 'workspace'] }),
  )

export function useSaveGstRegistration() {
  const client = useQueryClient()
  return useMutation({ mutationFn: (r: GstRegistration) => saveGstRegistration(r), onSuccess: () => refresh(client) })
}

export function useMakeGstRegistrationPrimary() {
  const client = useQueryClient()
  return useMutation({ mutationFn: (id: string) => makeGstRegistrationPrimary(id), onSuccess: () => refresh(client) })
}

export function useCancelGstRegistration() {
  const client = useQueryClient()
  return useMutation({ mutationFn: (id: string) => cancelGstRegistration(id), onSuccess: () => refresh(client) })
}

export function useReactivateGstRegistration() {
  const client = useQueryClient()
  return useMutation({ mutationFn: (id: string) => reactivateGstRegistration(id), onSuccess: () => refresh(client) })
}

export function useDeleteGstRegistration() {
  const client = useQueryClient()
  return useMutation({ mutationFn: (id: string) => deleteGstRegistration(id), onSuccess: () => refresh(client) })
}

export function useRestoreGstRegistration() {
  const client = useQueryClient()
  return useMutation({ mutationFn: (r: GstRegistration) => restoreGstRegistration(r), onSuccess: () => refresh(client) })
}
