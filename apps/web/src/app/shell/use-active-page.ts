import { useRouterState } from '@tanstack/react-router'
import { type ModuleDef, type PageDef, findModule, resolvePath } from '@/app/nav'
import { moduleSettingsFromPath } from '@/components/settings/registry'

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

/** Singular names for document screens opened from a list page. */
export const DOCUMENT_NAMES: Record<string, string> = {
  'purchasing/purchase-orders': 'Purchase Order',
  'purchasing/purchase-receipts': 'Purchase Receipt',
  'production/bills-of-materials': 'Bill of Materials',
  'production/assembly-orders': 'Assembly Order',
}

/** Short label for a path — used by workspace tabs and recent pages. */
export function labelForPath(pathname: string): string {
  const at = describePath(pathname)
  if (at.kind === 'page') {
    if (at.rest.length === 0) return at.page.label
    // Document screens keep a fixed name; record pages (…/vendors/V00001) show the record number.
    const documentName = DOCUMENT_NAMES[at.module.id + '/' + at.page.slug]
    if (documentName) return documentName
    return at.rest[0] !== 'new' ? decodeURIComponent(at.rest[0]) : at.page.label
  }
  if (at.kind === 'departments') return 'Departments'
  if (at.kind === 'settings') return 'Settings'
  const settingsModule = moduleSettingsFromPath(pathname)
  if (settingsModule) return `${findModule(settingsModule)?.name ?? ''} settings`.trim()
  return 'Shelfree'
}
