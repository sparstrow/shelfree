import { Link, useNavigate } from '@tanstack/react-router'
import { Check, LogOut, Moon, Sun } from 'lucide-react'
import { type MouseEvent, type ReactNode, useRef, useState } from 'react'
import { ModuleIcon, PathIcon } from '@/app/icons'
import {
  ICON_STAR,
  MODULES,
  type ModuleDef,
  type ModuleId,
  type PageDef,
  findPage,
} from '@/app/nav'
import { type DemoRole, useUi } from '@/app/stores/ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useList } from '@/data/queries'
import { useMe, useWorkspace } from '@/data/queries/session'
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

function PageLink({
  module,
  page,
  active,
  badge,
}: {
  module: ModuleDef
  page: PageDef
  active: boolean
  badge?: string
}) {
  const fav = useUi((s) => s.favorites.some((f) => f.moduleId === module.id && f.slug === page.slug))
  const toggleFavorite = useUi((s) => s.toggleFavorite)
  const onStar = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleFavorite({ moduleId: module.id, slug: page.slug })
  }
  return (
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
        <span className="min-w-0 flex-1 truncate text-left">{page.label}</span>
        {badge && <Badge>{badge}</Badge>}
        {/* room for the star, which sits beside the link (not inside it) */}
        <span className="w-[15px] flex-none" />
      </Link>
      <button
        type="button"
        onClick={onStar}
        title={fav ? 'Remove from favorites' : 'Add to favorites'}
        aria-label={fav ? `Remove ${page.label} from favorites` : `Add ${page.label} to favorites`}
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
    </div>
  )
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

  const collapsed = useUi((s) => s.navCollapsed)
  const setCollapsed = useUi((s) => s.setNavCollapsed)
  const navExpanded = useUi((s) => s.navExpanded)
  const setNavExpanded = useUi((s) => s.setNavExpanded)
  const favOpen = useUi((s) => s.favOpen)
  const toggleFavOpen = useUi((s) => s.toggleFavOpen)
  const favorites = useUi((s) => s.favorites)
  const toggleFavorite = useUi((s) => s.toggleFavorite)
  const theme = useUi((s) => s.theme)
  const setTheme = useUi((s) => s.setTheme)
  const demoRole = useUi((s) => s.demoRole)
  const setDemoRole = useUi((s) => s.setDemoRole)

  const [flyout, setFlyout] = useState<Flyout | null>(null)
  const flyoutTimer = useRef<number | undefined>(undefined)

  const activeModuleId = active.kind === 'page' ? active.module.id : null
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

  const favRows = favorites
    .map((f) => findPage(f.moduleId, f.slug))
    .filter((hit): hit is NonNullable<typeof hit> => !!hit)
  const flyoutModule = flyout ? MODULES.find((m) => m.id === flyout.id) : undefined
  const roleLabel = ROLES.find((r) => r.id === demoRole)?.label ?? ''
  const isActivePage = (moduleId: string, slug: string) =>
    active.kind === 'page' && active.module.id === moduleId && active.page.slug === slug

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

        {/* Favorites */}
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
          {favRows.length > 0 && !collapsed && <Badge>{favRows.length}</Badge>}
          <Chevron open={favOpen} collapsed={collapsed} />
        </button>
        <Collapsible open={favOpen && !collapsed}>
          {favRows.length === 0 && (
            <div className="px-[10px] pt-1 pb-2 text-[11.5px] leading-[1.45] text-pretty text-muted-foreground">
              Star a page or view to pin it here.
            </div>
          )}
          {favRows.map(({ module, page }) => (
            <div key={module.id + '/' + page.slug} className="relative">
              <Link
                to="/$module/$page"
                params={{ module: module.id, page: page.slug }}
                title={`${module.name} › ${page.label}`}
                className={pageClass(isActivePage(module.id, page.slug))}
              >
                <span className="flex size-[14px] flex-none items-center justify-center opacity-70">
                  <PathIcon d={page.icon} size={13} strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1 truncate text-left">{page.label}</span>
                <span className="w-[15px] flex-none" />
              </Link>
              <button
                type="button"
                title="Unpin"
                aria-label={`Unpin ${page.label}`}
                onClick={() => toggleFavorite({ moduleId: module.id, slug: page.slug })}
                className="absolute top-1/2 right-[10px] flex size-[15px] -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 text-primary opacity-80 transition-[opacity,scale] duration-[140ms] hover:scale-[1.18] hover:opacity-100"
              >
                <StarGlyph on />
              </button>
            </div>
          ))}
        </Collapsible>

        {MODULES.map((module) => {
          const moduleActive = module.id === activeModuleId
          const expandable = module.pages.length > 1
          const open = expandable && !collapsed && isOpen(module.id)
          return (
            <div key={module.id} className="flex flex-col gap-0.5">
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
                  />
                ))}
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
              <Link to="/settings">
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
        </div>
      )}
    </aside>
  )
}
