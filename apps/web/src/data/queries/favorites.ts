/**
 * Saved views and favourites: reads come from the generic collection hooks
 * (`useList('savedViews')`, `useList('favorites')`); each action here is one
 * command in `data/api/commands.ts`, and refreshes both collections because a
 * view change can drop or rename what a favourite points at.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  type NewSavedView,
  addFavoritePage,
  addFavoriteView,
  createSavedView,
  deleteSavedView,
  dropFavoriteOn,
  duplicateSavedView,
  renameSavedView,
  restoreFavorite,
  restoreSavedView,
  saveFavoriteOrder,
  toggleDefaultSavedView,
  updateSavedViewState,
} from '@/data/api/commands'
import type { Favorite, SavedView } from '@/data/schemas'
import { api } from '@/data/api'
import type { ViewStateData } from '@/domain/saved-views'

export type { NewSavedView }

/** A command that touches views and/or favourites, then refreshes both lists. */
function useCommand<A, R>(run: (arg: A) => Promise<R>) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: run,
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ['savedViews'] }),
        client.invalidateQueries({ queryKey: ['favorites'] }),
      ]),
  })
}

export const useCreateSavedView = () =>
  useCommand(({ input, pin }: { input: NewSavedView; pin?: boolean }) => createSavedView(input, pin))
export const useUpdateSavedViewState = () =>
  useCommand(({ id, state }: { id: string; state: ViewStateData }) => updateSavedViewState(id, state))
export const useRenameSavedView = () => useCommand(({ id, name }: { id: string; name: string }) => renameSavedView(id, name))
export const useDuplicateSavedView = () => useCommand((id: string) => duplicateSavedView(id))
export const useToggleDefaultSavedView = () => useCommand((id: string) => toggleDefaultSavedView(id))
export const useDeleteSavedView = () => useCommand((id: string) => deleteSavedView(id))
export const useRestoreSavedView = () =>
  useCommand(({ view, favorites }: { view: SavedView; favorites: Favorite[] }) => restoreSavedView(view, favorites))

export const useAddFavoritePage = () => useCommand(({ module, page }: { module: string; page: string }) => addFavoritePage(module, page))
export const useAddFavoriteView = () => useCommand((viewId: string) => addFavoriteView(viewId))
export const useRemoveFavorite = () => useCommand((id: string) => api.favorites.remove(id))
export const useRestoreFavorite = () => useCommand((favorite: Favorite) => restoreFavorite(favorite))
export const useReorderFavorites = () => useCommand((ordered: Favorite[]) => saveFavoriteOrder(ordered))
export const useDropFavorite = () => useCommand(({ from, to }: { from: string; to: string }) => dropFavoriteOn(from, to))
