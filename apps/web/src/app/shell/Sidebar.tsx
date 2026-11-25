import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { Check, LogOut, Moon, Sun } from 'lucide-react'
import { type DragEvent, type MouseEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { ModuleIcon, PathIcon } from '@/app/icons'
import {
  ICON_STAR,
  ICON_VIEW,
  type ModuleDef,
  type ModuleId,
  type PageDef,
  findModule,
  findPage,
} from '@/app/nav'
import { useNavModules } from '@/app/shell/use-nav-modules'
import { useGridViews } from '@/app/stores/grid-views'
import { type DemoRole, useUi } from '@/app/stores/ui'
import { useFavoriteActions } from '@/components/saved-views/use-favorite-actions'
import { pageIdentityOf } from '@/components/saved-views/use-page-identity'
import { firstSection, isSettingsModule, moduleSettingsFromPath } from '@/components/settings/registry'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useList } from '@/data/queries'
import { useLocationTerm } from '@/data/queries/regional-terminology'
import { pageDisplayLabel } from '@/domain/terminology'
import type { Favorite } from '@/data/schemas'
import { capFavorites, overflowLabel } from '@/domain/favorites'
import { useMe, useWorkspace } from '@/data/queries/session'
import { useFavoritesConfig, useNavigationSettings } from '@/data/queries/workspace-config'
import { isTypingTarget } from '@/lib/keyboard'
import { cn } from '@/lib/utils'
import { useActivePage } from './use-active-page'

const ROLES: { id: DemoRole; label: string; desc: string }[] = [
  { id: 'owner', label: 'Owner', desc: 'Full access — billing, plan, everything.' },
  { id: 'admin', label: 'Admin', desc: 'Manage settings & data, no billing.' },
  { id: 'member', label: 'Member', desc: 'Use the app; no admin settings.' },
]

const headClass = (active: boolean, collapsed: boolean) =>
  cn(
    'hover-lift flex h-10 w-full items-center rounded-[10px] border-0 text-left text-[13.5px] hover:bg-tint-12',
    collapsed ? 'justify-center gap-0 px-0' : 'justify-start gap-[11px] px-[11px]',
    active ? 'bg-primary-tint font-semibold text-primary' : 'bg-transparent font-medium text-foreground',
  )

const pageClass = (active: boolean) =>
  cn(
    'hover-lift group/page flex w-full items-center gap-2 rounded-lg border-0 px-[10px] py-[7px] text-[13.5px] hover:bg-tint-14 hover:text-foreground',
    active
      ? 'bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] font-semibold text-primary'
      : 'bg-transparent font-medium text-muted-foreground',
  )

const textClass = (collapsed: boolean) =>
  cn(
    'transition-opacity duration-[120ms]',
    collapsed
      ? 'pointer-events-none w-0 flex-none overflow-hidden opacity-0'
      : 'min-w-0 flex-1 truncate text-left',
  )

function Chevron({ open, collapsed }: { open: boolean; collapsed: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn(
        'flex-none opacity-55 transition-transform duration-[180ms] ease-[cubic-bezier(.4,0,.2,1)]',
        open && 'rotate-90',
        collapsed && 'hidden',
      )}
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

/** Animated accordion body: grid rows 0fr ↔ 1fr, as in the prototype. */
function Collapsible({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows,opacity] duration-[260ms] ease-[cubic-bezier(.4,0,.2,1)]',
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
      )}
      inert={!open}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="mt-0.5 mb-[5px] ml-[19px] flex flex-col gap-px border-l border-border pl-[13px]">
          {children}
        </div>
      </div>
    </div>
  )
}

function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'warn' }) {
  return (
    <span
      className={cn(
        'tnum flex-none rounded-full px-[7px] py-px text-[10.5px] font-semibold',
        tone === 'warn' ? 'bg-warn-bg text-warn-fg' : 'bg-neutral-bg text-muted-foreground',
      )}
    >
      {children}
    </span>
  )
}

function StarGlyph({ on }: { on: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill={on ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={on ? 1.4 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICON_STAR} />
    </svg>
  )
}

/** Record counts shown as sidebar badges. */
function useNavBadges(): Record<string, string | undefined> {
  const items = useList('items').data
  const customers = useList('customers').data
  const vendors = useList('vendors').data
  const accounts = useList('accounts').data
  const charges = useList('charges').data
  const carriers = useList('carriers').data
  const n = (rows: unknown[] | undefined) => (rows ? String(rows.length) : undefined)
  return {
    'warehouse/items': n(items),
    'sales/customers': n(customers),
    'purchasing/vendors': n(vendors),
    'finance/chart-of-accounts': n(accounts),
    'purchasing/charges': n(charges),
    'purchasing/carriers': n(carriers),
  }
}

const ctxItem = 'gap-2 text-[12.5px] font-medium'

function PageLink({
  module,
  page,
  active,
  badge,
  fav,
  favEnabled,
  onToggleFav,
  onOpenInTab,
}: {
  module: ModuleDef
  page: PageDef
  active: boolean
  badge?: string
  fav: boolean
  /** Settings ▸ Favorites & views: off removes every star (workspace-wide). */
  favEnabled: boolean
  onToggleFav: () => void
  onOpenInTab: () => void
}) {
  // The workspace's own word for a location (Settings ▸ Terminology) in the one page that names it.
  const label = pageDisplayLabel(page.label, useLocationTerm().singular)
  const onStar = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onToggleFav()
  }
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="group/page relative">
          <Link
            to="/$module/$page"
            params={{ module: module.id, page: page.slug }}
            className={pageClass(active)}
            aria-current={active ? 'page' : undefined}
          >
            <span className="flex size-[15px] flex-none items-center justify-center opacity-80">
              <PathIcon d={page.icon} />
            </span>
            <span className="min-w-0 flex-1 truncate text-left">{label}</span>
            {badge && <Badge>{badge}</Badge>}
            {/* room for the star, which sits beside the link (not inside it) */}
            <span className="w-[15px] flex-none" />
          </Link>
          {favEnabled && (
          <button
            type="button"
            onClick={onStar}
            title={fav ? 'Remove from favorites' : 'Add to favorites'}
            aria-label={fav ? `Remove ${label} from favorites` : `Add ${label} to favorites`}
            aria-pressed={fav}
            className={cn(
              'absolute top-1/2 right-[10px] flex size-[15px] -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 transition-[opacity,scale] duration-[140ms] hover:scale-[1.18] hover:opacity-100 focus-visible:opacity-100',
              fav
                ? 'text-primary opacity-95'
                : cn('opacity-0 group-hover/page:opacity-50', active ? 'text-primary' : 'text-muted-foreground'),
            )}
          >
            <StarGlyph on={fav} />
          </button>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-[196px]">
        <ContextMenuLabel className="truncate text-[11px] font-semibold text-muted-foreground">{label}</ContextMenuLabel>
        {favEnabled && (
          <ContextMenuItem className={ctxItem} onSelect={onToggleFav}>
            {fav ? 'Remove from favorites' : 'Add to favorites'}
          </ContextMenuItem>
        )}
        <ContextMenuItem className={ctxItem} onSelect={onOpenInTab}>
          Open in new tab
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

const ICON_SETTINGS =
  'M12 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'

function ModuleSettingsLink({
  module,
  active,
  fav,
  favEnabled,
  onToggleFav,
  onOpenInTab,
}: {
  module: ModuleDef
  active: boolean
  fav: boolean
  /** Settings ▸ Favorites & views: off removes every star (workspace-wide). */
  favEnabled: boolean
  onToggleFav: () => void
  onOpenInTab: () => void
}) {
  const onStar = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onToggleFav()
  }
  const label = `${module.name} Settings`
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="group/page relative">
          <Link
            to="/$module/settings"
            params={{ module: module.id }}
            className={pageClass(active)}
            aria-current={active ? 'page' : undefined}
          >
            <span className="flex size-[15px] flex-none items-center justify-center opacity-80">
              <ModuleIcon id="settings" size={15} strokeWidth={1.7} />
            </span>
            <span className="min-w-0 flex-1 truncate text-left">Settings</span>
            <span className="w-[15px] flex-none" />
          </Link>
          {favEnabled && (
          <button
            type="button"
            onClick={onStar}
            title={fav ? 'Remove from favorites' : 'Add to favorites'}
            aria-label={fav ? `Remove ${label} from favorites` : `Add ${label} to favorites`}
            aria-pressed={fav}
            className={cn(
              'absolute top-1/2 right-[10px] flex size-[15px] -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 transition-[opacity,scale] duration-[140ms] hover:scale-[1.18] hover:opacity-100 focus-visible:opacity-100',
              fav
                ? 'text-primary opacity-95'
                : cn('opacity-0 group-hover/page:opacity-50', active ? 'text-primary' : 'text-muted-foreground'),
            )}
          >
            <StarGlyph on={fav} />
          </button>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-[196px]">
        <ContextMenuLabel className="truncate text-[11px] font-semibold text-muted-foreground">{label}</ContextMenuLabel>
        {favEnabled && (
          <ContextMenuItem className={ctxItem} onSelect={onToggleFav}>
            {fav ? 'Remove from favorites' : 'Add to favorites'}
          </ContextMenuItem>
        )}
        <ContextMenuItem className={ctxItem} onSelect={onOpenInTab}>
          Open in new tab
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

/** The name box of a view favourite being renamed in place: Enter / click away saves, Esc cancels. */
function RenameInput({ initial, onCommit, onCancel }: { initial: string; onCommit: (name: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(initial)
  const done = useRef(false)
  const finish = (save: boolean) => {
    if (done.current) return
    done.current = true
    if (save) onCommit(value)
    else onCancel()
  }
  return (
    <input
      autoFocus
      aria-label="Rename view"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onFocus={(e) => e.currentTarget.select()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          finish(true)
        } else if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          finish(false)
        }
      }}
      onBlur={() => finish(true)}
      className="h-[30px] w-full rounded-lg border border-primary bg-input px-[9px] text-[13px] text-foreground outline-none"
    />
  )
}

/** One resolved row of the Favorites section. */
interface FavRow {
  fav: Favorite
  isView: boolean
  label: string
  sub: string
  icon: string
  title: string
  active: boolean
}

interface Flyout {
  id: ModuleId
  top: number
}

export function Sidebar() {
  const navigate = useNavigate()
  const active = useActivePage()
  const badges = useNavBadges()
  const workspace = useWorkspace().data
  const me = useMe().data
  const navModules = useNavModules()
  const navSettings = useNavigationSettings()
  const favConfig = useFavoritesConfig()

  const collapsed = useUi((s) => s.navCollapsed)
  const setCollapsed = useUi((s) => s.setNavCollapsed)
  const navExpanded = useUi((s) => s.navExpanded)
  const setNavExpanded = useUi((s) => s.setNavExpanded)
  const favOpen = useUi((s) => s.favOpen)
  const toggleFavOpen = useUi((s) => s.toggleFavOpen)
  const setFavOpen = useUi((s) => s.setFavOpen)
  const openTab = useUi((s) => s.openTab)
  const router = useRouter()
  const favoriteActions = useFavoriteActions()
  const gridActiveView = useGridViews((s) => s.active)
  const renamingId = useGridViews((s) => s.renamingFavoriteId)
  const setRenamingFavorite = useGridViews((s) => s.setRenamingFavorite)
  const theme = useUi((s) => s.theme)
  const setTheme = useUi((s) => s.setTheme)
  const demoRole = useUi((s) => s.demoRole)
  const setDemoRole = useUi((s) => s.setDemoRole)

  const [flyout, setFlyout] = useState<Flyout | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [dropId, setDropId] = useState<string | null>(null)
  const dragId = useRef<string | null>(null)
  const flyoutTimer = useRef<number | undefined>(undefined)

  const moduleSettingsId = moduleSettingsFromPath(active.pathname)
  const activeModuleId = active.kind === 'page' ? active.module.id : moduleSettingsId
  const isOpen = (id: string) => (navExpanded[id] !== undefined ? navExpanded[id] : id === activeModuleId)

  const toggleModule = (module: ModuleDef) => {
    // Single-page modules (Notes) and the collapsed rail have nothing to expand: go to the page.
    if (module.pages.length <= 1 || collapsed) {
      void navigate({ to: '/$module/$page', params: { module: module.id, page: module.pages[0].slug } })
      return
    }
    const open = isOpen(module.id)
    setNavExpanded(module.id, !open)
    if (!open && module.id !== activeModuleId) {
      void navigate({ to: '/$module/$page', params: { module: module.id, page: module.pages[0].slug } })
    }
  }

  const showFlyout = (id: ModuleId, el: HTMLElement) => {
    if (!collapsed) return
    window.clearTimeout(flyoutTimer.current)
    const rect = el.getBoundingClientRect()
    setFlyout({ id, top: Math.max(8, Math.min(rect.top, window.innerHeight - 320)) })
  }
  const hideFlyout = () => {
    window.clearTimeout(flyoutTimer.current)
    flyoutTimer.current = window.setTimeout(() => setFlyout(null), 130)
  }
  const keepFlyout = () => window.clearTimeout(flyoutTimer.current)

  const activePageKey = active.kind === 'page' ? pageIdentityOf(active.pathname).pageKey : null
  const isActivePage = (moduleId: string, slug: string) =>
    active.kind === 'page' && active.module.id === moduleId && active.page.slug === slug
  const allFavRows: FavRow[] = []
  for (const fav of favoriteActions.list) {
    if (fav.kind === 'view') {
      const view = favoriteActions.viewById(fav.viewId)
      if (!view) continue
      allFavRows.push({
        fav,
        isView: true,
        label: view.name,
        sub: view.pageLabel,
        icon: ICON_VIEW,
        title: `${view.pageLabel} · ${view.name}`,
        active: activePageKey === view.pageKey && gridActiveView[view.pageKey] === view.id,
      })
      continue
    }
    if (fav.page === 'settings' && fav.module && isSettingsModule(fav.module)) {
      const mod = findModule(fav.module)
      if (!mod) continue
      allFavRows.push({
        fav,
        isView: false,
        label: `${mod.name} Settings`,
        sub: '',
        icon: ICON_SETTINGS,
        title: `${mod.name} › Settings`,
        active: moduleSettingsId === mod.id,
      })
      continue
    }
    const hit = findPage(fav.module, fav.page)
    if (!hit) continue // a page the user can no longer reach is hidden, not broken
    allFavRows.push({
      fav,
      isView: false,
      label: hit.page.label,
      sub: '',
      icon: hit.page.icon,
      title: `${hit.module.name} › ${hit.page.label}`,
      active: isActivePage(hit.module.id, hit.page.slug),
    })
  }
  const { shown: favRows, overflow: favOverflow } = capFavorites(allFavRows, favConfig.cap, showAll)
  const flyoutModule = flyout ? navModules.find((m) => m.id === flyout.id) : undefined
  const roleLabel = ROLES.find((r) => r.id === demoRole)?.label ?? ''

  const openPageInTab = (moduleId: string, slug: string) => {
    const path = `/${moduleId}/${slug}`
    openTab(path)
    router.history.push(path)
  }

  // Ctrl+Alt+F focuses the first favourite; Ctrl+1…9 opens the Nth.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (!favConfig.enabled || !(e.ctrlKey || e.metaKey) || e.shiftKey || isTypingTarget(e.target)) return
      if (e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setCollapsed(false)
        setFavOpen(true)
        window.setTimeout(() => document.querySelector<HTMLElement>('[data-fav-row]')?.focus(), 60)
      } else if (!e.altKey && /^[1-9]$/.test(e.key)) {
        const row = allFavRows[Number(e.key) - 1]
        if (!row) return
        e.preventDefault()
        favoriteActions.open(row.fav)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const dragProps = (id: string) => ({
    draggable: true,
    onDragStart: (e: DragEvent) => {
      dragId.current = id
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', id)
    },
    onDragOver: (e: DragEvent) => {
      e.preventDefault()
      if (dropId !== id) setDropId(id)
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault()
      const from = dragId.current
      dragId.current = null
      setDropId(null)
      if (from) favoriteActions.dropOn(from, id)
    },
    onDragEnd: () => {
      dragId.current = null
      setDropId(null)
    },
  })

  return (
    <aside
      className={cn(
        'relative z-40 flex min-h-0 flex-none flex-col border-r border-border bg-sidebar transition-[width] duration-[240ms] ease-[cubic-bezier(.4,0,.2,1)]',
        collapsed ? 'w-[70px]' : 'w-[248px]',
      )}
    >
      <button
        type="button"
        onClick={() => {
          setCollapsed(!collapsed)
          setFlyout(null)
        }}
        title={collapsed ? 'Expand menu' : 'Collapse menu'}
        aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
        aria-expanded={!collapsed}
        className="absolute top-[46px] -right-[13px] z-[60] flex size-[26px] items-center justify-center rounded-full border border-border bg-panel text-muted-foreground shadow-base transition-[background-color,color,transform,box-shadow] duration-150 hover:-translate-y-px hover:scale-[1.06] hover:bg-primary hover:text-primary-foreground hover:shadow-lift"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={cn(
            'size-[15px] transition-transform duration-[240ms] ease-[cubic-bezier(.4,0,.2,1)]',
            collapsed && 'rotate-180',
          )}
        >
          <path d="m14 6-6 6 6 6" />
        </svg>
      </button>

      <div
        className={cn(
          'flex h-14 flex-none items-center border-b border-border',
          collapsed ? 'justify-center gap-0 px-0' : 'justify-start gap-[11px] px-4',
        )}
      >
        <div className="flex size-8 flex-none items-center justify-center rounded-[9px] bg-primary text-base font-bold text-primary-foreground">
          S
        </div>
        <div className={collapsed ? 'pointer-events-none w-0 overflow-hidden opacity-0' : 'min-w-0'}>
          <div className="text-[14.5px] leading-[1.15] font-bold tracking-[-0.01em]">Shelfree</div>
          <div className="truncate text-[11px] leading-tight text-muted-foreground">
            {workspace ? `${workspace.name} · Inventory` : ' '}
          </div>
        </div>
      </div>

      <nav
        aria-label="Main"
        className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-auto px-[10px] pt-[10px] pb-1.5 *:shrink-0"
      >
        {navSettings.departments && (
          <>
        <Link
          to="/departments"
          title={collapsed ? 'Departments' : undefined}
          className={headClass(active.kind === 'departments', collapsed)}
        >
          <span className="flex size-[19px] flex-none items-center justify-center">
            <ModuleIcon id="departments" size={18} />
          </span>
          <span className={textClass(collapsed)}>Departments</span>
        </Link>
        <div className="mx-1 mt-[7px] mb-[5px] h-px bg-border" />
          </>
        )}

        {/* Favorites — Settings ▸ Favorites & views can switch the whole section off. */}
        {favConfig.enabled && (
          <>
        <button
          type="button"
          onClick={toggleFavOpen}
          title={collapsed ? 'Favorites' : undefined}
          aria-expanded={favOpen && !collapsed}
          className={cn(
            'flex h-10 w-full items-center rounded-[10px] border-0 bg-transparent text-left text-[13.5px] font-medium text-foreground transition-colors duration-[140ms] hover:bg-tint-10',
            collapsed ? 'justify-center px-0' : 'gap-[11px] px-[11px]',
          )}
        >
          <span className="flex size-[19px] flex-none items-center justify-center text-primary">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d={ICON_STAR} />
            </svg>
          </span>
          <span className={textClass(collapsed)}>Favorites</span>
          {allFavRows.length > 0 && !collapsed && <Badge>{allFavRows.length}</Badge>}
          <Chevron open={favOpen} collapsed={collapsed} />
        </button>
        <Collapsible open={favOpen && !collapsed}>
          {allFavRows.length === 0 && (
            <div className="px-[10px] pt-1 pb-2 text-[11.5px] leading-[1.45] text-pretty text-muted-foreground">
              Star a page or view to pin it here.
            </div>
          )}
          {favRows.map((row) => {
            const { fav } = row
            if (renamingId === fav.id && row.isView) {
              return (
                <RenameInput
                  key={fav.id}
                  initial={row.label}
                  onCancel={() => setRenamingFavorite(null)}
                  onCommit={(name) => {
                    setRenamingFavorite(null)
                    const view = favoriteActions.viewById(fav.viewId)
                    if (view) favoriteActions.renameView(view, name)
                  }}
                />
              )
            }
            return (
              <ContextMenu key={fav.id}>
                <ContextMenuTrigger asChild>
                  <div className="relative">
                    <button
                      type="button"
                      data-fav-row
                      title={row.title}
                      onClick={() => favoriteActions.open(fav)}
                      {...dragProps(fav.id)}
                      className={cn(
                        pageClass(row.active),
                        'border-t-2 text-left',
                        dropId === fav.id ? 'border-t-primary' : 'border-t-transparent',
                      )}
                    >
                      <span className="flex size-[14px] flex-none items-center justify-center opacity-70">
                        <PathIcon d={row.icon} size={13} strokeWidth={1.8} />
                      </span>
                      <span className="min-w-0 flex-1 text-left">
                        <span className="block truncate">{row.label}</span>
                        {row.isView && (
                          <span className="block truncate text-[10.5px] font-medium text-muted-foreground">{row.sub}</span>
                        )}
                      </span>
                      <span className="w-[15px] flex-none" />
                    </button>
                    <button
                      type="button"
                      title="Unpin"
                      aria-label={`Unpin ${row.label}`}
                      onClick={() => favoriteActions.removeFavorite(fav, row.label)}
                      className="absolute top-1/2 right-[10px] flex size-[15px] -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 text-primary opacity-80 transition-[opacity,scale] duration-[140ms] hover:scale-[1.18] hover:opacity-100 focus-visible:opacity-100"
                    >
                      <StarGlyph on />
                    </button>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="min-w-[196px]">
                  <ContextMenuLabel className="truncate text-[11px] font-semibold text-muted-foreground">{row.label}</ContextMenuLabel>
                  {row.isView && (
                    <ContextMenuItem className={ctxItem} onSelect={() => setRenamingFavorite(fav.id)}>
                      Rename
                    </ContextMenuItem>
                  )}
                  <ContextMenuItem className={ctxItem} onSelect={() => favoriteActions.open(fav, true)}>
                    Open in new tab
                  </ContextMenuItem>
                  <ContextMenuItem className={ctxItem} onSelect={() => favoriteActions.move(fav.id, -1)}>
                    Move up
                  </ContextMenuItem>
                  <ContextMenuItem className={ctxItem} onSelect={() => favoriteActions.move(fav.id, 1)}>
                    Move down
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    className={cn(ctxItem, 'text-bad-fg focus:bg-bad-bg focus:text-bad-fg')}
                    onSelect={() => favoriteActions.removeFavorite(fav, row.label)}
                  >
                    Remove
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            )
          })}
          {favOverflow && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="flex w-full items-center gap-1.5 rounded-lg border-0 bg-transparent px-[10px] py-[5px] text-left text-[11.5px] font-semibold text-muted-foreground transition-colors duration-[140ms] hover:text-foreground"
            >
              {overflowLabel(allFavRows.length, showAll)}
            </button>
          )}
        </Collapsible>
          </>
        )}

        {navModules.map((module) => {
          const moduleActive = module.id === activeModuleId
          const hasSettings = isSettingsModule(module.id)
          const expandable = module.pages.length > 1 || hasSettings
          const open = expandable && !collapsed && isOpen(module.id)
          return (
            <div key={module.id} data-module={module.id} className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => toggleModule(module)}
                onMouseEnter={(e) => showFlyout(module.id, e.currentTarget)}
                onMouseLeave={hideFlyout}
                title={collapsed ? module.name : undefined}
                aria-expanded={open}
                className={headClass(moduleActive, collapsed)}
              >
                <span className="flex size-[19px] flex-none items-center justify-center">
                  <ModuleIcon id={module.id} />
                </span>
                <span className={textClass(collapsed)}>{module.name}</span>
                {expandable && <Chevron open={open} collapsed={collapsed} />}
              </button>
              <Collapsible open={open}>
                {module.pages.map((page) => (
                  <PageLink
                    key={page.slug}
                    module={module}
                    page={page}
                    active={isActivePage(module.id, page.slug)}
                    badge={badges[module.id + '/' + page.slug]}
                    fav={!!favoriteActions.pageFavorite(module.id, page.slug)}
                    favEnabled={favConfig.enabled}
                    onToggleFav={() => favoriteActions.togglePage(module.id, page.slug, page.label)}
                    onOpenInTab={() => openPageInTab(module.id, page.slug)}
                  />
                ))}
                {hasSettings && (
                  <ModuleSettingsLink
                    module={module}
                    active={moduleSettingsId === module.id}
                    fav={!!favoriteActions.pageFavorite(module.id, 'settings')}
                    favEnabled={favConfig.enabled}
                    onToggleFav={() => favoriteActions.togglePage(module.id, 'settings', `${module.name} Settings`)}
                    onOpenInTab={() => openPageInTab(module.id, 'settings')}
                  />
                )}
              </Collapsible>
            </div>
          )
        })}
      </nav>

      <div className="flex flex-none flex-col gap-0.5 border-t border-border px-[10px] pt-2 pb-[10px]">
        <Link
          to="/settings"
          title={collapsed ? 'Settings' : undefined}
          className={headClass(active.kind === 'settings', collapsed)}
        >
          <span className="flex size-[19px] flex-none items-center justify-center">
            <ModuleIcon id="settings" size={18} />
          </span>
          <span className={textClass(collapsed)}>Settings</span>
          <Chevron open={false} collapsed={collapsed} />
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Account menu"
              className={cn(
                'hover-lift flex h-11 items-center rounded-[10px] border-0 bg-transparent text-left hover:bg-tint-12',
                collapsed ? 'justify-center gap-0 px-0' : 'justify-start gap-[11px] px-2',
              )}
            >
              <span className="flex size-[30px] flex-none items-center justify-center rounded-full bg-avatar text-[11px] font-semibold text-danger-fg">
                {me?.avatar}
              </span>
              <span className={collapsed ? 'pointer-events-none w-0 overflow-hidden opacity-0' : 'min-w-0 flex-1'}>
                <span className="block truncate text-[12.5px] leading-tight font-semibold text-foreground">
                  {me?.name}
                </span>
                <span className="block truncate text-[11px] leading-tight text-muted-foreground">
                  {me ? `${me.title} · ${roleLabel}` : ''}
                </span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-[228px] rounded-xl p-[7px]">
            <div className="flex items-center gap-[10px] px-[9px] pt-2 pb-[10px]">
              <span className="flex size-[34px] flex-none items-center justify-center rounded-full bg-avatar text-xs font-semibold text-danger-fg">
                {me?.avatar}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold">{me?.name}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{me?.email}</span>
              </span>
            </div>
            <DropdownMenuItem asChild className="gap-[10px] text-[12.5px] font-medium">
              <Link to="/settings/$section" params={{ section: firstSection('personal').id }}>
                <ModuleIcon id="settings" size={15} />
                My settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-[10px] text-[12.5px] font-medium"
              onSelect={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="size-[15px]" /> : <Moon className="size-[15px]" />}
              {theme === 'dark' ? 'Light theme' : 'Dark theme'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="px-[9px] pt-1.5 pb-1 text-[10px] font-semibold tracking-[0.08em] text-muted-foreground">
              VIEW AS · DEMO
            </DropdownMenuLabel>
            {ROLES.map((role) => (
              <DropdownMenuItem
                key={role.id}
                onSelect={() => setDemoRole(role.id)}
                className={cn(
                  'gap-[10px]',
                  demoRole === role.id && 'bg-[color-mix(in_oklab,var(--primary)_12%,transparent)]',
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-semibold">{role.label}</span>
                  <span className="block text-[11px] leading-tight text-muted-foreground">{role.desc}</span>
                </span>
                {demoRole === role.id && <Check className="size-[15px] text-primary" strokeWidth={2.4} />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled
              className="gap-[10px] text-[12.5px] font-medium focus:bg-bad-bg focus:text-bad-fg"
            >
              <LogOut className="size-[15px]" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Collapsed-rail flyout submenu */}
      {collapsed && flyout && flyoutModule && (
        <div
          onMouseEnter={keepFlyout}
          onMouseLeave={hideFlyout}
          style={{ top: flyout.top }}
          className="fixed left-[70px] z-[200] min-w-[198px] animate-sf-pop rounded-xl border border-border bg-panel p-[7px] shadow-pop"
        >
          <div className="px-[9px] pt-[5px] pb-1.5 text-[11px] font-bold tracking-[0.02em] text-muted-foreground">
            {flyoutModule.name}
          </div>
          {flyoutModule.pages.map((page) => (
            <Link
              key={page.slug}
              to="/$module/$page"
              params={{ module: flyoutModule.id, page: page.slug }}
              onClick={() => setFlyout(null)}
              className={pageClass(isActivePage(flyoutModule.id, page.slug))}
            >
              <span className="flex size-[15px] flex-none items-center justify-center opacity-80">
                <PathIcon d={page.icon} />
              </span>
              <span className="min-w-0 flex-1 truncate text-left">{page.label}</span>
              {badges[flyoutModule.id + '/' + page.slug] && (
                <Badge>{badges[flyoutModule.id + '/' + page.slug]}</Badge>
              )}
            </Link>
          ))}
          {isSettingsModule(flyoutModule.id) && (
            <Link
              to="/$module/settings"
              params={{ module: flyoutModule.id }}
              onClick={() => setFlyout(null)}
              aria-current={moduleSettingsId === flyoutModule.id ? 'page' : undefined}
              className={pageClass(moduleSettingsId === flyoutModule.id)}
            >
              <span className="flex size-[15px] flex-none items-center justify-center opacity-80">
                <ModuleIcon id="settings" size={15} strokeWidth={1.7} />
              </span>
              <span className="min-w-0 flex-1 truncate text-left">Settings</span>
            </Link>
          )}
        </div>
      )}
    </aside>
  )
}
