import { useMemo } from 'react'
import { type ModuleDef, type NavPageRow, visibleModules } from '@/app/nav'
import { useSettings } from '@/data/queries/settings'
import { isCapabilityOn, isModuleOn } from '@/domain/modules-capabilities'

/** The modules and pages the workspace shows: modules that are on, pages whose capability is on. */
export function useNavModules(): ModuleDef[] {
  const settings = useSettings().data
  const modules = settings?.modules
  const caps = settings?.capabilities
  const pricing = settings?.salesPricing.enabled ?? true
  return useMemo(
    () => visibleModules((id) => isModuleOn(modules, id), (key) => isCapabilityOn(caps, key, pricing)),
    [modules, caps, pricing],
  )
}

/** Flat page list over `useNavModules()` (page search, Departments). */
export function useNavPages(): NavPageRow[] {
  const mods = useNavModules()
  return useMemo(
    () =>
      mods.flatMap((m) =>
        m.pages.map((p) => ({ moduleId: m.id, moduleName: m.name, label: p.label, slug: p.slug, icon: p.icon })),
      ),
    [mods],
  )
}
