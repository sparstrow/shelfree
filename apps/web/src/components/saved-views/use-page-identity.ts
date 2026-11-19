import { useRouterState } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { pagePath } from '@/app/nav'
import { describePath, labelForPath } from '@/app/shell/use-active-page'

/** Which page a grid sits on: the key its saved views are filed under, and where they open. */
export interface PageIdentity {
  /** `module/page` for sidebar pages, else the URL path. */
  pageKey: string
  /** Sidebar module id and page slug ('' when the page is not in the sidebar). */
  module: string
  page: string
  /** Where a saved view of this page opens. */
  path: string
  pageLabel: string
}

export function pageIdentityOf(pathname: string): PageIdentity {
  const at = describePath(pathname)
  if (at.kind === 'page' && at.rest.length === 0) {
    return {
      pageKey: `${at.module.id}/${at.page.slug}`,
      module: at.module.id,
      page: at.page.slug,
      path: pagePath(at.module.id, at.page.slug),
      pageLabel: at.page.label,
    }
  }
  return { pageKey: pathname, module: '', page: '', path: pathname, pageLabel: labelForPath(pathname) }
}

/**
 * The page a component was mounted on. Fixed at mount on purpose: while the
 * router moves to another page the old page's grid is still on screen for a
 * moment, and it must keep acting as the page it is (not the page being opened).
 */
export function usePageIdentity(): PageIdentity {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [mountedOn] = useState(pathname)
  return useMemo(() => pageIdentityOf(mountedOn), [mountedOn])
}
