import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { type ModuleId, pagePath } from '@/app/nav'
import { useGridViews } from '@/app/stores/grid-views'
import { useUi } from '@/app/stores/ui'
import { useList } from '@/data/queries'
import {
  useAddFavoritePage,
  useAddFavoriteView,
  useDropFavorite,
  useReorderFavorites,
  useRemoveFavorite,
  useRenameSavedView,
  useRestoreFavorite,
} from '@/data/queries/favorites'
import { useFavoritesConfig } from '@/data/queries/workspace-config'
import type { Favorite, SavedView } from '@/data/schemas'
import { moveFavorite, sortFavorites } from '@/domain/favorites'

/** "Favorites" today; the label is a terminology setting later. */
export const FAVORITES_LABEL = 'Favorites'
const lower = FAVORITES_LABEL.toLowerCase()

/**
 * Everything the sidebar, the Departments page and the grid do with favourites,
 * with the toasts the prototype shows. Reads and writes go through the data seam.
 */
export function useFavoriteActions() {
  const router = useRouter()
  const openTab = useUi((s) => s.openTab)
  const setFavOpen = useUi((s) => s.setFavOpen)
  const requestView = useGridViews((s) => s.requestView)
  const favorites = useList('favorites')
  const views = useList('savedViews')
  const addPage = useAddFavoritePage()
  const addView = useAddFavoriteView()
  const remove = useRemoveFavorite()
  const restore = useRestoreFavorite()
  const reorder = useReorderFavorites()
  const drop = useDropFavorite()
  const rename = useRenameSavedView()
  // Settings ▸ Favorites & views: off removes the section and every star for everyone.
  const { enabled } = useFavoritesConfig()

  const all = favorites.data ?? []
  const viewById = (id: string | undefined): SavedView | undefined => (views.data ?? []).find((v) => v.id === id)

  const removeFavorite = (f: Favorite, label: string) => {
    remove.mutate(f.id)
    toast(`Removed from ${lower}`, { description: label, action: { label: 'Undo', onClick: () => restore.mutate(f) } })
  }

  return {
    enabled,
    /** Favourites in their order, without pointers to views that no longer exist. */
    list: sortFavorites(all).filter((f) => f.kind !== 'view' || viewById(f.viewId)),
    isLoading: favorites.isLoading || views.isLoading,
    viewById,
    pageFavorite: (module: string, page: string) => all.find((f) => f.kind === 'page' && f.module === module && f.page === page),
    viewFavorite: (viewId: string) => all.find((f) => f.kind === 'view' && f.viewId === viewId),

    /** Star / unstar a page. `label` is the page's name, for the toast. */
    togglePage: (module: string, page: string, label: string) => {
      if (!enabled) return
      const found = all.find((f) => f.kind === 'page' && f.module === module && f.page === page)
      if (found) return removeFavorite(found, label)
      addPage.mutate({ module, page })
      setFavOpen(true)
      toast(`Added to ${lower}`, { description: label })
    },
    /** Pin / unpin a saved view. */
    toggleView: (view: SavedView) => {
      if (!enabled) return
      const found = all.find((f) => f.kind === 'view' && f.viewId === view.id)
      if (found) return removeFavorite(found, view.name)
      addView.mutate(view.id)
      setFavOpen(true)
      toast(`Pinned to ${lower}`, { description: view.name })
    },
    removeFavorite,
    /** Rename the saved view behind a favourite (the name changes everywhere it shows). */
    renameView: (view: SavedView, name: string) => rename.mutate({ id: view.id, name }),

    /** Open a favourite: a page, or a saved view on its page with the view applied. */
    open: (f: Favorite, newTab = false) => {
      let path: string
      if (f.kind === 'view') {
        const view = viewById(f.viewId)
        if (!view) return
        path = view.path
        requestView(view.pageKey, view.id)
      } else {
        path = pagePath(f.module as ModuleId, f.page ?? '')
      }
      if (newTab) openTab(path)
      router.history.push(path)
    },

    move: (id: string, dir: -1 | 1) => reorder.mutate(moveFavorite(all, id, dir)),
    dropOn: (from: string, to: string) => {
      if (from !== to) drop.mutate({ from, to })
    },
  }
}
