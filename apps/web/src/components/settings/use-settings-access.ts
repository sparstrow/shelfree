/**
 * Hook that resolves view/edit access for a Settings area from the active demo
 * role (`useUi().demoRole`) and the signed-in user's record (`useMe()` matched
 * against `useList('users')`). Pure access rules live in
 * `domain/settings-permissions.ts`; the backend enforces the same checks.
 */
import { useMemo } from 'react'
import { useUi } from '@/app/stores/ui'
import { useList } from '@/data/queries'
import { useMe } from '@/data/queries/session'
import { type SettingsActor, canEditArea, canViewArea } from '@/domain/settings-permissions'
import { type SettingsAreaId, findArea } from './registry'

export interface SettingsAccess {
  canView: boolean
  canEdit: boolean
  /** True while a member's user record is still loading for a module area. */
  isLoading: boolean
}

/** Resolve the current `SettingsActor` from UI demo role + current user record. */
export function useSettingsActor(): { actor: SettingsActor; isLoading: boolean } {
  const demoRole = useUi((s) => s.demoRole)
  const me = useMe()
  const users = useList('users')

  const actor = useMemo<SettingsActor>(() => {
    if (demoRole === 'owner' || demoRole === 'admin') {
      return { role: demoRole, user: null }
    }
    const email = me.data?.email?.trim().toLowerCase()
    const currentUser = email
      ? (users.data ?? []).find((u) => u.email.trim().toLowerCase() === email) ?? null
      : null
    return { role: demoRole, user: currentUser }
  }, [demoRole, me.data?.email, users.data])

  const isLoading = demoRole === 'member' && (me.isLoading || users.isLoading)
  return { actor, isLoading }
}

/** Whether the current user can view and/or edit a settings area (`workspace`, module, `shared`, `personal`). */
export function useSettingsAccess(area: SettingsAreaId): SettingsAccess {
  const areaObj = findArea(area)
  const { actor, isLoading: actorLoading } = useSettingsActor()

  return useMemo<SettingsAccess>(() => {
    if (!areaObj) return { canView: false, canEdit: false, isLoading: false }
    const moduleId = areaObj.kind === 'module' ? areaObj.id : undefined
    return {
      canView: canViewArea(actor, areaObj.kind, moduleId),
      canEdit: canEditArea(actor, areaObj.kind, moduleId),
      isLoading: areaObj.kind === 'module' && actorLoading,
    }
  }, [areaObj, actor, actorLoading])
}
