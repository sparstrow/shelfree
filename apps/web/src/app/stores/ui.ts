/**
 * UI-only state that should survive a reload: theme, sidebar, workspace tabs,
 * favourites, recent pages. This is per-browser preference data, not business
 * data — business records live behind `data/api`.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ModuleId } from '@/app/nav'

export type Theme = 'dark' | 'light'
export type DemoRole = 'owner' | 'admin' | 'member'

export interface WorkspaceTab {
  id: number
  /** Full app path this tab is showing, e.g. `/purchasing/purchase-orders`. */
  path: string
}

export interface FavoritePage {
  moduleId: ModuleId
  slug: string
}

interface UiState {
  theme: Theme
  navCollapsed: boolean
  /** Accordion state per module id (`settings` included). Unset = follow the active module. */
  navExpanded: Record<string, boolean>
  favOpen: boolean
  favorites: FavoritePage[]
  /** Most-recent-first page paths for the page search. */
  recents: string[]
  tabs: WorkspaceTab[]
  activeTabId: number
  tabSeq: number
  /** Demo-only "view as" switch; real roles come from the backend later. */
  demoRole: DemoRole
  /** User-resized column widths, per grid id. */
  columnWidths: Record<string, Record<string, number>>

  setTheme: (theme: Theme) => void
  setNavCollapsed: (collapsed: boolean) => void
  setNavExpanded: (id: string, open: boolean) => void
  toggleFavOpen: () => void
  toggleFavorite: (page: FavoritePage) => void
  pushRecent: (path: string) => void
  clearRecents: () => void
  setDemoRole: (role: DemoRole) => void
  setColumnWidths: (gridId: string, widths: Record<string, number>) => void

  /** Record where the active tab is (called on every navigation). */
  syncActiveTab: (path: string) => void
  openTab: (path: string) => number
  selectTab: (id: number) => void
  /** Close a tab; returns the path to navigate to if the active tab changed. */
  closeTab: (id: number) => string | null
}

const sameFav = (a: FavoritePage, b: FavoritePage) => a.moduleId === b.moduleId && a.slug === b.slug

export const useUi = create<UiState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      navCollapsed: false,
      navExpanded: {},
      favOpen: true,
      favorites: [],
      recents: [],
      tabs: [{ id: 1, path: '/' }],
      activeTabId: 1,
      tabSeq: 1,
      demoRole: 'owner',
      columnWidths: {},

      setTheme: (theme) => set({ theme }),
      setNavCollapsed: (navCollapsed) => set({ navCollapsed }),
      setNavExpanded: (id, open) => set((s) => ({ navExpanded: { ...s.navExpanded, [id]: open } })),
      toggleFavOpen: () => set((s) => ({ favOpen: !s.favOpen })),
      toggleFavorite: (page) =>
        set((s) => ({
          favorites: s.favorites.some((f) => sameFav(f, page))
            ? s.favorites.filter((f) => !sameFav(f, page))
            : [...s.favorites, page],
        })),
      pushRecent: (path) =>
        set((s) => ({ recents: [path, ...s.recents.filter((p) => p !== path)].slice(0, 10) })),
      clearRecents: () => set({ recents: [] }),
      setDemoRole: (demoRole) => set({ demoRole }),
      setColumnWidths: (gridId, widths) =>
        set((s) => ({ columnWidths: { ...s.columnWidths, [gridId]: widths } })),

      syncActiveTab: (path) =>
        set((s) => ({
          tabs: s.tabs.map((t) => (t.id === s.activeTabId && t.path !== path ? { ...t, path } : t)),
        })),
      openTab: (path) => {
        const id = get().tabSeq + 1
        set((s) => ({ tabs: [...s.tabs, { id, path }], activeTabId: id, tabSeq: id }))
        return id
      },
      selectTab: (id) => set({ activeTabId: id }),
      closeTab: (id) => {
        const { tabs, activeTabId } = get()
        if (tabs.length <= 1) return null
        const index = tabs.findIndex((t) => t.id === id)
        if (index < 0) return null
        const next = tabs.filter((t) => t.id !== id)
        if (id !== activeTabId) {
          set({ tabs: next })
          return null
        }
        const target = next[Math.max(0, index - 1)]
        set({ tabs: next, activeTabId: target.id })
        return target.path
      },
    }),
    { name: 'shelfree.v2.ui', version: 1 },
  ),
)
