import { ArrowDown, ArrowUp } from 'lucide-react'
import { type KeyboardEvent, type ReactNode, useState } from 'react'
import { toast } from 'sonner'
import { findModule, findPage } from '@/app/nav'
import { useUi } from '@/app/stores/ui'
import { HelpTarget } from '@/components/help/HelpTarget'
import { useFavoriteActions } from '@/components/saved-views/use-favorite-actions'
import { SettingsPage } from '@/components/settings/SettingsPage'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useList } from '@/data/queries'
import {
  useDeleteSavedView,
  useDuplicateSavedView,
  useRenameSavedView,
  useRestoreSavedView,
  useToggleDefaultSavedView,
} from '@/data/queries/favorites'
import { useMe, useUpdateMe } from '@/data/queries/session'
import type { Favorite, SavedView } from '@/data/schemas'
import { isSettingsModule } from '@/components/settings/registry'
import { FAVORITES_PERSONAL_HELP as HELP } from './help'

const card = 'rounded-xl border border-border bg-card px-5 pt-4 pb-3'
const rowClass = 'flex items-center gap-3 border-b border-dashed border-border py-2 last:border-b-0'
const iconBtn = 'hover-lift size-7 flex-none text-muted-foreground hover:text-foreground'

function Group({ title, help, children }: { title: string; help: (typeof HELP)[string]; children: ReactNode }) {
  return (
    <section aria-label={title} className={card}>
      <div className="mb-1.5 flex items-center">
        <HelpTarget help={help} label={title}>
          <h2 className="m-0 text-[13px] font-bold">{title}</h2>
        </HelpTarget>
      </div>
      {children}
    </section>
  )
}

/** Name and where it points, for one favourite. */
function describeFavorite(fav: Favorite, view: SavedView | undefined): { kind: string; name: string; where: string } | null {
  if (fav.kind === 'view') return view ? { kind: 'View', name: view.name, where: view.pageLabel } : null
  if (fav.page === 'settings' && fav.module && isSettingsModule(fav.module)) {
    const mod = findModule(fav.module)
    return mod ? { kind: 'Page', name: `${mod.name} Settings`, where: 'Settings' } : null
  }
  const hit = findPage(fav.module, fav.page)
  return hit ? { kind: 'Page', name: hit.page.label, where: hit.module.name } : null
}

/**
 * Settings ▸ Personal ▸ Favorites & views (`/settings/me-favorites`). The per-person half of Favorites & views:
 * it edits the same `favorites` and `savedViews` collections the sidebar and the grids use (no second store), and
 * respects the workspace rules in Settings ▸ Favorites & views (`favoritesConfig`). Editable by every user.
 */
export function FavoritesSection() {
  const actions = useFavoriteActions()
  const views = useList('savedViews')
  const me = useMe()
  const updateMe = useUpdateMe()
  const recentCount = useUi((s) => s.recents.length)
  const clearRecents = useUi((s) => s.clearRecents)
  const rename = useRenameSavedView()
  const duplicate = useDuplicateSavedView()
  const toggleDefault = useToggleDefaultSavedView()
  const remove = useDeleteSavedView()
  const restore = useRestoreSavedView()
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null)

  const favRows = actions.list
    .map((fav) => ({ fav, info: describeFavorite(fav, actions.viewById(fav.viewId)) }))
    .filter((r): r is { fav: Favorite; info: NonNullable<ReturnType<typeof describeFavorite>> } => !!r.info)
  const myViews = (views.data ?? []).filter((v) => v.deletedAt == null).sort((a, b) => a.name.localeCompare(b.name))

  const commitRename = () => {
    if (!renaming) return
    const view = myViews.find((v) => v.id === renaming.id)
    const name = renaming.name.trim()
    setRenaming(null)
    if (view && name && name !== view.name) rename.mutate({ id: view.id, name })
  }
  const onRenameKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitRename()
    if (e.key === 'Escape') {
      e.stopPropagation()
      setRenaming(null)
    }
  }
  const deleteView = (view: SavedView) =>
    remove.mutate(view.id, {
      onSuccess: (removed) => {
        if (!removed) return
        toast('View deleted', {
          description: view.name,
          action: { label: 'Undo', onClick: () => restore.mutate({ view: removed.view, favorites: removed.favorites }) },
        })
      },
    })
  const showRecents = me.data?.showRecents !== false

  return (
    <SettingsPage
      title="Favorites & views"
      help={HELP.page}
      isLoading={actions.isLoading || views.isLoading || me.isLoading}
      error={views.error ?? me.error}
      onRetry={() => void views.refetch()}
      width="wide"
    >
      <Group title="Pinned in the sidebar" help={HELP.pins}>
        {favRows.length === 0 ? (
          <p className="m-0 py-3 text-[12.5px] text-muted-foreground">
            Nothing pinned yet. Star a page, or pin a saved view, to keep it in your sidebar.
          </p>
        ) : (
          favRows.map(({ fav, info }, i) => (
            <div key={fav.id} data-row={fav.id} className={rowClass}>
              <span className="w-10 flex-none text-[10.5px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">{info.kind}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{info.name}</span>
                <span className="block truncate text-[11.5px] text-muted-foreground">{info.where}</span>
              </span>
              <Button variant="ghost" size="icon-sm" className={iconBtn} title="Move up" aria-label={`Move ${info.name} up`} disabled={i === 0} onClick={() => actions.move(fav.id, -1)}>
                <ArrowUp />
              </Button>
              <Button variant="ghost" size="icon-sm" className={iconBtn} title="Move down" aria-label={`Move ${info.name} down`} disabled={i === favRows.length - 1} onClick={() => actions.move(fav.id, 1)}>
                <ArrowDown />
              </Button>
              <Button variant="outline" size="sm" className="hover-lift" onClick={() => actions.removeFavorite(fav, info.name)}>
                Remove
              </Button>
            </div>
          ))
        )}
      </Group>

      <Group title="My saved views" help={HELP.views}>
        {myViews.length === 0 ? (
          <p className="m-0 py-3 text-[12.5px] text-muted-foreground">
            No saved views yet. Filter a list, then use Save view in its toolbar.
          </p>
        ) : (
          myViews.map((view) => {
            const pinned = !!actions.viewFavorite(view.id)
            const meta = `${view.filters.length} ${view.filters.length === 1 ? 'filter' : 'filters'}`
            return (
              <div key={view.id} data-row={view.id} className={rowClass}>
                <span className="min-w-0 flex-1">
                  {renaming?.id === view.id ? (
                    <input
                      autoFocus
                      aria-label={`Rename ${view.name}`}
                      value={renaming.name}
                      onChange={(e) => setRenaming({ id: view.id, name: e.target.value })}
                      onKeyDown={onRenameKey}
                      onBlur={commitRename}
                      className="h-7 w-full rounded-md border border-ring bg-transparent px-2 text-[13px] font-medium outline-none"
                    />
                  ) : (
                    <span className="block truncate text-[13px] font-medium">{view.name}</span>
                  )}
                  <span className="block truncate text-[11.5px] text-muted-foreground">
                    {view.pageLabel} · {meta}
                  </span>
                </span>
                <Button variant="outline" size="sm" className="hover-lift" onClick={() => toggleDefault.mutate(view.id)}>
                  {view.isDefaultFor ? 'Remove default' : 'Make default'}
                </Button>
                {actions.enabled && (
                  <Button variant="outline" size="sm" className="hover-lift" onClick={() => actions.toggleView(view)}>
                    {pinned ? 'Unpin' : 'Pin'}
                  </Button>
                )}
                <Button variant="outline" size="sm" className="hover-lift" onClick={() => setRenaming({ id: view.id, name: view.name })}>
                  Rename
                </Button>
                <Button variant="outline" size="sm" className="hover-lift" onClick={() => duplicate.mutate(view.id)}>
                  Duplicate
                </Button>
                <Button variant="outline" size="sm" className="hover-lift" onClick={() => deleteView(view)}>
                  Delete
                </Button>
              </div>
            )
          })
        )}
      </Group>

      <Group title="Recent pages" help={HELP.recents}>
        <div className={rowClass}>
          <span className="min-w-0 flex-1">
            <label htmlFor="me-favorites-recents" className="block text-[12.5px] text-muted-foreground">
              Show recents in page search
            </label>
            <span className="tnum block text-[11.5px] text-muted-foreground">{recentCount} remembered.</span>
          </span>
          <Button variant="outline" size="sm" className="hover-lift" disabled={recentCount === 0} onClick={clearRecents}>
            Clear
          </Button>
          <Switch id="me-favorites-recents" checked={showRecents} onCheckedChange={(next) => updateMe.mutate({ showRecents: next })} />
        </div>
      </Group>
    </SettingsPage>
  )
}
