/** Hooks for Settings ▸ Item categories and Settings ▸ Locations & warehouses. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteItemCategory,
  deleteWarehouse,
  loadLocationUsage,
  restoreItemCategory,
  saveItemCategory,
  saveWarehouse,
} from '@/data/api/warehouse-settings'
import type { ItemCategory, Warehouse } from '@/data/schemas'
import { useList } from './index'

/** The category tree. */
export function useItemCategories() {
  return useList('itemCategories')
}

/** Items carry a category name, so changing a category refreshes items too. */
const refreshCategoryReaders = (client: ReturnType<typeof useQueryClient>) =>
  Promise.all(['itemCategories', 'items'].map((name) => client.invalidateQueries({ queryKey: [name] })))

export function useSaveItemCategory() {
  const client = useQueryClient()
  return useMutation({ mutationFn: (cat: ItemCategory) => saveItemCategory(cat), onSuccess: () => refreshCategoryReaders(client) })
}

export function useDeleteItemCategory() {
  const client = useQueryClient()
  return useMutation({ mutationFn: (id: string) => deleteItemCategory(id), onSuccess: () => refreshCategoryReaders(client) })
}

export function useRestoreItemCategory() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ cat, lifted }: { cat: ItemCategory; lifted: readonly string[] }) => restoreItemCategory(cat, lifted),
    onSuccess: () => refreshCategoryReaders(client),
  })
}

/** Stock and open documents per site, keyed by site id. */
export function useLocationUsage() {
  return useQuery({
    queryKey: ['warehouses', 'usage'] as const,
    queryFn: () => loadLocationUsage(),
  })
}

/** Usage depends on stock and documents too, so any write there refreshes it via the shared prefix of the other keys. */
const refreshLocationReaders = (client: ReturnType<typeof useQueryClient>) =>
  client.invalidateQueries({ queryKey: ['warehouses'] })

export function useSaveWarehouse() {
  const client = useQueryClient()
  return useMutation({ mutationFn: (w: Warehouse) => saveWarehouse(w), onSuccess: () => refreshLocationReaders(client) })
}

export function useDeleteWarehouse() {
  const client = useQueryClient()
  return useMutation({ mutationFn: (id: string) => deleteWarehouse(id), onSuccess: () => refreshLocationReaders(client) })
}
