import { toast } from 'sonner'
import { useGridViews } from '@/app/stores/grid-views'
import { useUi } from '@/app/stores/ui'
import {
  type NewSavedView,
  useCreateSavedView,
  useDeleteSavedView,
  useDuplicateSavedView,
  useRenameSavedView,
  useRestoreSavedView,
  useToggleDefaultSavedView,
  useUpdateSavedViewState,
} from '@/data/queries/favorites'
import type { SavedView } from '@/data/schemas'
import { type GridDefaults, type GridSnapshot, viewDataFromSnapshot } from '@/domain/saved-views'
import type { PageIdentity } from './use-page-identity'

/** "View" today; a terminology setting later. */
export const VIEW_NOUN = 'View'

/**
 * What the grid's Views menu does with saved views, with the prototype's toasts.
 * `getSnapshot` reads the grid's state at the moment of the action.
 */
export function useViewActions(identity: PageIdentity, defaults: GridDefaults, getSnapshot: () => GridSnapshot) {
  const create = useCreateSavedView()
  const update = useUpdateSavedViewState()
  const rename = useRenameSavedView()
  const duplicate = useDuplicateSavedView()
  const toggleDefault = useToggleDefaultSavedView()
  const remove = useDeleteSavedView()
  const restore = useRestoreSavedView()
  const setFavOpen = useUi((s) => s.setFavOpen)
  const setRenamingFavorite = useGridViews((s) => s.setRenamingFavorite)

  const input = (name: string, snapshot: GridSnapshot, autoCreated = false): NewSavedView => ({
    name,
    module: identity.module,
    page: identity.page,
    pageKey: identity.pageKey,
    path: identity.path,
    pageLabel: identity.pageLabel,
    autoCreated,
    ...viewDataFromSnapshot(snapshot, defaults),
  })

  return {
    /** Save the current state as a new view (the name is made unique on the page). */
    saveAs: async (name: string): Promise<SavedView | null> => {
      const nm = name.trim()
      if (!nm) {
        toast('Name required', { description: 'Enter a view name' })
        return null
      }
      const { view } = await create.mutateAsync({ input: input(nm, getSnapshot()) })
      toast(`${VIEW_NOUN} saved`, { description: view.name })
      return view
    },

    /** Put the current state into an existing view. */
    update: async (view: SavedView) => {
      await update.mutateAsync({ id: view.id, state: viewDataFromSnapshot(getSnapshot(), defaults) })
      toast(`${VIEW_NOUN} updated`, { description: view.name })
    },

    rename: async (view: SavedView, name: string) => {
      await rename.mutateAsync({ id: view.id, name })
    },

    duplicate: async (view: SavedView) => {
      const copy = await duplicate.mutateAsync(view.id)
      if (copy) toast(`${VIEW_NOUN} duplicated`, { description: copy.name })
    },

    toggleDefault: async (view: SavedView) => {
      const res = await toggleDefault.mutateAsync(view.id)
      if (!res) return
      toast(res.on ? 'Default view set' : 'Default view cleared', {
        description: res.view.name + (res.on ? ` · opens with ${identity.pageLabel}` : ''),
      })
    },

    /** Delete with Undo (which puts back the view and the favourites that pointed at it). */
    remove: async (view: SavedView) => {
      const gone = await remove.mutateAsync(view.id)
      if (!gone) return
      toast(`${VIEW_NOUN} deleted`, {
        description: view.name,
        action: {
          label: 'Undo',
          onClick: async () => {
            await restore.mutateAsync({ view: gone.view, favorites: gone.favorites })
            toast(`${VIEW_NOUN} restored`, { description: view.name })
          },
        },
      })
    },

    /**
     * Pin the current (unsaved) state: saves it as `<Page> · my view`, pins it and
     * opens the sidebar rename input, so the user can name it where they see it.
     */
    pinCurrent: async (): Promise<SavedView> => {
      const { view, favorite } = await create.mutateAsync({
        input: input(`${identity.pageLabel} · my view`, getSnapshot(), true),
        pin: true,
      })
      setFavOpen(true)
      if (favorite) setRenamingFavorite(favorite.id)
      toast(`${VIEW_NOUN} saved & pinned`, { description: 'Rename it in the sidebar' })
      return view
    },

    /** A built-in view cannot be pointed at, so pinning one makes a private copy of it. */
    pinBuiltIn: async (name: string, snapshot: GridSnapshot): Promise<SavedView> => {
      const { view } = await create.mutateAsync({ input: input(name, snapshot, true), pin: true })
      setFavOpen(true)
      toast(`Pinned to favorites`, { description: view.name })
      return view
    },
  }
}
