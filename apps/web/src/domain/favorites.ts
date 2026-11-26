/**
 * Sidebar favourites — the pure rules (no React, no browser APIs).
 *
 * A favourite is a live pointer to a page or to a saved view, with a
 * user-controlled order. Past the cap the rest collapse behind "Show all".
 */

export interface FavoriteLike {
  id: string
  kind: 'page' | 'view'
  order: number
}

/** Soft cap on rows shown before "Show all" (a per-user setting later). */
export const DEFAULT_FAVORITES_CAP = 10

export function sortFavorites<F extends FavoriteLike>(list: readonly F[]): F[] {
  return [...list].sort((a, b) => a.order - b.order)
}

export function nextFavoriteOrder(list: readonly FavoriteLike[]): number {
  return list.length ? Math.max(...list.map((f) => f.order)) + 1 : 0
}

/** Same list with `order` 0…n-1 in the given sequence. */
export function renumberFavorites<F extends FavoriteLike>(ordered: readonly F[]): F[] {
  return ordered.map((f, i) => ({ ...f, order: i }))
}

/** Drag `fromId` onto `toId`: it takes that position, the rest shift. */
export function dropFavorite<F extends FavoriteLike>(list: readonly F[], fromId: string, toId: string): F[] {
  if (fromId === toId) return renumberFavorites(sortFavorites(list))
  const arr = sortFavorites(list)
  const from = arr.findIndex((f) => f.id === fromId)
  const to = arr.findIndex((f) => f.id === toId)
  if (from < 0 || to < 0) return renumberFavorites(arr)
  const [moved] = arr.splice(from, 1)
  arr.splice(to, 0, moved)
  return renumberFavorites(arr)
}

/** Move one step up (-1) or down (1). Stays put at either end. */
export function moveFavorite<F extends FavoriteLike>(list: readonly F[], id: string, dir: -1 | 1): F[] {
  const arr = sortFavorites(list)
  const i = arr.findIndex((f) => f.id === id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= arr.length) return renumberFavorites(arr)
  const t = arr[i]
  arr[i] = arr[j]
  arr[j] = t
  return renumberFavorites(arr)
}

/** The rows to show, and how many were folded away. */
export function capFavorites<T>(sorted: readonly T[], cap: number, showAll: boolean) {
  const limit = cap > 0 ? cap : DEFAULT_FAVORITES_CAP
  return { shown: showAll ? [...sorted] : sorted.slice(0, limit), overflow: sorted.length > limit }
}

export const overflowLabel = (total: number, showAll: boolean) => (showAll ? 'Show fewer' : `Show all (${total})`)

/** Favourites that point at a saved view (removed together with it). */
export function favoritesOfView<F extends FavoriteLike & { viewId?: string | null }>(list: readonly F[], viewId: string): F[] {
  return list.filter((f) => f.kind === 'view' && f.viewId === viewId)
}

// ── Workspace configuration (Settings ▸ Favorites & views) ───────────────────

export const FAVORITES_CAP_MIN = 3
export const FAVORITES_CAP_MAX = 30

/** Who may share a saved view with the team (specified now; inert until shared views ship). */
export const VIEW_SHARE_ROLES = ['admin', 'owner', 'any'] as const
export type ViewShareRole = (typeof VIEW_SHARE_ROLES)[number]

export const VIEW_SHARE_ROLE_LABELS: Readonly<Record<ViewShareRole, string>> = {
  admin: 'Owner & admins',
  owner: 'Owner only',
  any: 'Anyone on the team',
}

export interface FavoritesConfig {
  /** Off removes the sidebar section and every star button for everyone. */
  enabled: boolean
  /** Pins shown before "Show all". */
  cap: number
  shareRole: ViewShareRole
}

export const DEFAULT_FAVORITES_CONFIG: FavoritesConfig = {
  enabled: true,
  cap: DEFAULT_FAVORITES_CAP,
  shareRole: 'admin',
}

/** Blocking message for the cap, or null. A whole number from 3 to 30. */
export function favoritesCapError(cap: number): string | null {
  if (!Number.isInteger(cap) || cap < FAVORITES_CAP_MIN || cap > FAVORITES_CAP_MAX) {
    return `Enter a whole number from ${FAVORITES_CAP_MIN} to ${FAVORITES_CAP_MAX}.`
  }
  return null
}
