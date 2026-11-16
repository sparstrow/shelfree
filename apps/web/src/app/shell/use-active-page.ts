import { useRouterState } from '@tanstack/react-router'
import { type ModuleDef, type PageDef, resolvePath } from '@/app/nav'

export type ActivePage =
  | { kind: 'page'; module: ModuleDef; page: PageDef; rest: string[]; pathname: string }
  | { kind: 'departments'; pathname: string }
  | { kind: 'settings'; pathname: string }
  | { kind: 'other'; pathname: string }

export function describePath(pathname: string): ActivePage {
  if (pathname.startsWith('/departments')) return { kind: 'departments', pathname }
  if (pathname.startsWith('/settings')) return { kind: 'settings', pathname }
  const hit = resolvePath(pathname)
  return hit ? { kind: 'page', ...hit, pathname } : { kind: 'other', pathname }
}

/** What the current URL points at, in navigation terms. */
export function useActivePage(): ActivePage {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  return describePath(pathname)
}

/** Short label for a path — used by workspace tabs and recent pages. */
export function labelForPath(pathname: string): string {
  const at = describePath(pathname)
  if (at.kind === 'page') {
    // Record pages (…/vendors/V00001) are labelled by their record number.
    return at.rest.length > 0 && at.rest[0] !== 'new' ? decodeURIComponent(at.rest[0]) : at.page.label
  }
  if (at.kind === 'departments') return 'Departments'
  if (at.kind === 'settings') return 'Settings'
  return 'Shelfree'
}
