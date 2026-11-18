/**
 * Short-lived hand-offs between the sidebar and the list grids. Nothing here is
 * saved: the data (views, favourites) lives behind `data/queries/favorites.ts`.
 */
import { create } from 'zustand'

interface GridViewsState {
  /** A saved view the grid on `pageKey` must open with (set when a view favourite is opened). */
  intent: { pageKey: string; viewId: string } | null
  requestView: (pageKey: string, viewId: string) => void
  clearIntent: () => void
  /** The saved view each mounted grid is showing, by page — the sidebar highlights its favourite. */
  active: Record<string, string>
  setActive: (pageKey: string, viewId: string | null) => void
  /** The view favourite whose name is being typed in the sidebar right now. */
  renamingFavoriteId: string | null
  setRenamingFavorite: (id: string | null) => void
}

export const useGridViews = create<GridViewsState>()((set) => ({
  intent: null,
  requestView: (pageKey, viewId) => set({ intent: { pageKey, viewId } }),
  clearIntent: () => set({ intent: null }),
  active: {},
  setActive: (pageKey, viewId) =>
    set((s) => {
      if ((s.active[pageKey] ?? null) === viewId) return s
      const { [pageKey]: _gone, ...rest } = s.active
      return { active: viewId ? { ...rest, [pageKey]: viewId } : rest }
    }),
  renamingFavoriteId: null,
  setRenamingFavorite: (renamingFavoriteId) => set({ renamingFavoriteId }),
}))
