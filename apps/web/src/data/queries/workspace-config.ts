/**
 * Readers and writers of the workspace configuration that shapes the app chrome: which modules and
 * capabilities are on, the navigation defaults, and the Favorites & views rules.
 * Until the settings load every reader returns the defaults (everything on), so nothing flickers away.
 */
import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query'
import { type FavoritesConfigBlock, type NavigationConfig, settingsApi } from '@/data/api/settings'
import { DEFAULT_FAVORITES_CONFIG, type FavoritesConfig } from '@/domain/favorites'
import {
  type ModulesCapabilitiesValue,
  enabledModuleIds,
  isCapabilityOn,
  isModuleOn,
} from '@/domain/modules-capabilities'
import { DEFAULT_NAVIGATION_SETTINGS, type NavigationSettings } from '@/domain/navigation-settings'
import { settingsQueryOptions, useSettings } from './settings'

const KEY = ['settings'] as const

/** Ids of the modules that are on. */
export function useEnabledModules(): ReadonlySet<string> {
  const modules = useSettings().data?.modules
  return new Set(enabledModuleIds(modules))
}

export function useIsModuleOn(id: string): boolean {
  return isModuleOn(useSettings().data?.modules, id)
}

/** Whether a scale capability is on (customer pricing reads `salesPricing.enabled`). */
export function useCapability(key: string): boolean {
  const settings = useSettings().data
  return isCapabilityOn(settings?.capabilities, key, settings?.salesPricing.enabled ?? true)
}

export function useNavigationSettings(): NavigationSettings {
  return useSettings().data?.navigation ?? DEFAULT_NAVIGATION_SETTINGS
}

export function useFavoritesConfig(): FavoritesConfig {
  return useSettings().data?.favoritesConfig ?? DEFAULT_FAVORITES_CONFIG
}

export function useUpdateModulesCapabilities() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (next: ModulesCapabilitiesValue) => settingsApi.updateModulesCapabilities(next),
    onSuccess: (data) => client.setQueryData(KEY, data),
  })
}

export function useUpdateNavigation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (next: NavigationConfig) => settingsApi.updateNavigation(next),
    onSuccess: (data) => client.setQueryData(KEY, data),
  })
}

export function useUpdateFavoritesConfig() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (next: FavoritesConfigBlock) => settingsApi.updateFavoritesConfig(next),
    onSuccess: (data) => client.setQueryData(KEY, data),
  })
}


/** For route `beforeLoad`: is this module on? (Waits for the settings; the defaults mean on.) */
export async function isModuleEnabledNow(queryClient: QueryClient, id: string): Promise<boolean> {
  const settings = await queryClient.ensureQueryData(settingsQueryOptions)
  return isModuleOn(settings.modules, id)
}
