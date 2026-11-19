/**
 * Saved views and favourites belong to the signed-in user. The mock has one
 * user; the backend scopes both collections to the session, so none of this
 * code ever names a user other than the caller.
 */
import type { Favorite } from '@/data/schemas'
import { api } from './index'

/** The mock's one signed-in user. Backend: taken from the session, never sent by the client. */
export const CURRENT_USER_ID = 'me'

export const newId = (prefix: string): string => prefix + Date.now() + Math.floor(Math.random() * 1000)

const UI_KEY = 'shelfree.v2.ui'

/**
 * One-time move of the page favourites the first React build kept in the UI
 * preferences (`shelfree.v2.ui` ▸ `state.favorites`) into the `favorites`
 * collection. Safe to run every start: once moved, the old list is removed, so
 * there is nothing left to move. Runs when this module loads — before anything
 * can rewrite the preferences key — and not at all when there is nothing to move.
 */
export function migrateLegacyFavorites(): void {
  try {
    const raw = localStorage.getItem(UI_KEY)
    if (!raw) return
    const stored = JSON.parse(raw) as { state?: { favorites?: unknown } }
    const legacy = stored?.state?.favorites
    if (legacy === undefined) return
    const pages = Array.isArray(legacy)
      ? legacy.filter(
          (f): f is { moduleId: string; slug: string } =>
            !!f && typeof f.moduleId === 'string' && typeof f.slug === 'string',
        )
      : []
    if (pages.length) {
      const now = Date.now()
      // Collection writes are synchronous under the promise; a failure throws before the old list is dropped.
      void api.favorites.upsertMany(
        pages.map(
          (f, i): Favorite => ({
            id: `f${now}${i}`,
            userId: CURRENT_USER_ID,
            kind: 'page',
            module: f.moduleId,
            page: f.slug,
            order: i,
            createdAt: now,
          }),
        ),
      )
    }
    delete (stored.state as { favorites?: unknown }).favorites
    localStorage.setItem(UI_KEY, JSON.stringify(stored))
  } catch {
    // Unreadable preferences or storage: leave them as they are and try again next start.
  }
}

migrateLegacyFavorites()
