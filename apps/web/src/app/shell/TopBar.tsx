import { Link } from '@tanstack/react-router'
import { Bell, ChevronRight, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { PageSearch } from './PageSearch'
import { useActivePage } from './use-active-page'

export interface TopBarProps {
  /** Overrides the page name in the breadcrumb (document screens: "Purchase Order"). */
  pageLabel?: string
  /** Settings only: the group between "Settings" and the section (Workspace, Configuration…). */
  crumb?: string
  /** Record count shown as a pill beside the page name (table pages). */
  count?: number
  countTitle?: string
  /** Primary "New …" action (table pages). */
  newLabel?: string
  onNew?: () => void
  /** Extra controls placed before the page search. */
  children?: ReactNode
}

const crumbClass =
  '-mx-1 -my-0.5 rounded-[5px] border-0 bg-transparent px-1 py-0.5 text-[13px] text-muted-foreground transition-colors duration-[120ms] hover:bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)] hover:text-foreground'

/** The 56 px page header: breadcrumb, count, page search, notifications, New. */
export function TopBar({ pageLabel, crumb, count, countTitle, newLabel, onNew, children }: TopBarProps) {
  const active = useActivePage()
  // List pages take their <h1> from the breadcrumb; document screens bring their own.
  const Current = pageLabel ? 'span' : 'h1'

  return (
    <header className="flex h-14 flex-none items-center gap-[9px] border-b border-border px-5">
      {active.kind === 'page' ? (
        <>
          <Link
            to="/$module/$page"
            params={{ module: active.module.id, page: active.module.pages[0].slug }}
            className={crumbClass}
          >
            {active.module.name}
          </Link>
          <ChevronRight className="size-[14px] text-muted-foreground opacity-60" strokeWidth={2} />
          <Current className="m-0 text-[13px] font-semibold">{pageLabel ?? active.page.label}</Current>
        </>
      ) : active.kind === 'settings' && pageLabel ? (
        // Settings ▸ Group ▸ Section (the section's own h1 is in the page body).
        <>
          <Link to="/settings" className={crumbClass}>
            Settings
          </Link>
          {crumb && (
            <>
              <ChevronRight className="size-[14px] text-muted-foreground opacity-60" strokeWidth={2} />
              <span className="text-[13px] text-muted-foreground">{crumb}</span>
            </>
          )}
          <ChevronRight className="size-[14px] text-muted-foreground opacity-60" strokeWidth={2} />
          <span className="m-0 text-[13px] font-semibold">{pageLabel}</span>
        </>
      ) : (
        <Current className="m-0 text-[13px] font-semibold">
          {pageLabel ?? (active.kind === 'departments' ? 'Departments' : active.kind === 'settings' ? 'Settings' : 'Shelfree')}
        </Current>
      )}
      {count !== undefined && (
        <span
          title={countTitle}
          className="tnum rounded-full bg-muted px-[9px] py-0.5 text-[11.5px] font-medium text-muted-foreground"
        >
          {count}
        </span>
      )}
      <div className="flex-1" />
      {children}
      <PageSearch />
      <button
        type="button"
        title="Notifications"
        aria-label="Notifications"
        className="hover-lift flex size-8 items-center justify-center rounded-lg border-0 bg-transparent text-muted-foreground hover:bg-tint-16 hover:text-foreground"
      >
        <Bell className="size-[17px]" strokeWidth={1.9} />
      </button>
      {newLabel && (
        <>
          <div className="mx-[3px] h-[22px] w-px bg-border" />
          <button
            type="button"
            onClick={onNew}
            title={newLabel}
            className="inline-flex h-[34px] flex-none items-center gap-[7px] rounded-lg border-0 bg-primary px-[14px] text-[13px] font-semibold whitespace-nowrap text-new-btn-fg shadow-base transition-[background-color,transform,box-shadow] duration-[140ms] hover:-translate-y-px hover:bg-primary-hover hover:shadow-[0_5px_16px_-5px_rgb(0_0_0/0.4)]"
          >
            <Plus className="size-[15px]" strokeWidth={2.4} />
            {newLabel}
          </button>
        </>
      )}
    </header>
  )
}
