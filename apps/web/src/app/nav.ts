/**
 * Navigation registry — every module and page in the app, in sidebar order.
 * URLs are `/<module>/<page-slug>`. Icon paths are the prototype's own 24×24
 * stroke paths (Lucide-style), kept verbatim so the sidebar looks identical.
 */

export type ModuleId =
  | 'home'
  | 'finance'
  | 'sales'
  | 'purchasing'
  | 'warehouse'
  | 'production'
  | 'people'
  | 'notes'

export interface PageDef {
  /** Display label, e.g. `Purchase Orders`. Also the key used in docs. */
  label: string
  /** URL segment, e.g. `purchase-orders`. */
  slug: string
  /** SVG path data for the 15 px sidebar icon. */
  icon: string
}

export interface ModuleDef {
  id: ModuleId
  name: string
  pages: PageDef[]
}

const doc = 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5'
const clip =
  'M9 2h6v3.5H9zM15 4h2.5A1.5 1.5 0 0 1 19 5.5v14A1.5 1.5 0 0 1 17.5 21h-11A1.5 1.5 0 0 1 5 19.5v-14A1.5 1.5 0 0 1 6.5 4H9'
const tag =
  'M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2a2 2 0 0 1-.6-1.4V4.5A1.5 1.5 0 0 1 4.3 3h7.2a2 2 0 0 1 1.4.6l7.7 7.7a2 2 0 0 1 0 2.1zM7.4 7.4h.01'
const percentTag =
  'M18.5 5.5 5.5 18.5M8 5.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5M16 13.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5'
const calc =
  'M6.5 3h11a1.5 1.5 0 0 1 1.5 1.5v15A1.5 1.5 0 0 1 17.5 21h-11A1.5 1.5 0 0 1 5 19.5v-15A1.5 1.5 0 0 1 6.5 3zM8.5 7h7M8.5 11h2M13.5 11h2M8.5 15h2M13.5 15h2'
const wrench =
  'M14.6 6.3a1 1 0 0 0 0 1.4l1.7 1.7a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z'
const box =
  'M20.5 8a1.5 1.5 0 0 0-.75-1.3l-7-4a1.5 1.5 0 0 0-1.5 0l-7 4A1.5 1.5 0 0 0 3.5 8v8a1.5 1.5 0 0 0 .75 1.3l7 4a1.5 1.5 0 0 0 1.5 0l7-4A1.5 1.5 0 0 0 20.5 16zM3.8 7.2 12 12l8.2-4.8M12 21.5V12'
const bomTree = 'M9.5 3h5v4h-5zM3 17h5v4H3zM16 17h5v4h-5zM12 7v4M5.5 17v-2.5h13V17'
const people =
  'M9.5 3.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7M16 20.5v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1.5M18 10.5a3 3 0 1 0 0-6M22 20.5V19a4 4 0 0 0-3-3.86'
const truck =
  'M2.5 5.5h11v11h-11zM13.5 9h4.2l2.8 3.6v3.9h-7M5 18.5a1.75 1.75 0 1 0 3.5 0a1.75 1.75 0 1 0-3.5 0M15.5 18.5a1.75 1.75 0 1 0 3.5 0a1.75 1.75 0 1 0-3.5 0'
const ruler =
  'M14.6 2.6l6.8 6.8a1 1 0 0 1 0 1.4L11 21.2a1 1 0 0 1-1.4 0L2.8 14.4a1 1 0 0 1 0-1.4L13.2 2.6a1 1 0 0 1 1.4 0M7.6 8.6l2 2M10.8 5.4l2 2M4.4 11.8l2 2'

export const ICON_FALLBACK = doc
export const ICON_VIEW = 'M21 4.5H3l7 8.3V19l4 1.5v-7.7z'
export const ICON_STAR = 'm12 3.6 2.7 5.5 6 .9-4.35 4.25L17.4 20 12 17.1 6.6 20l1.05-5.75L3.3 10l6-.9z'

const slugOf = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '-')
const page = (label: string, icon: string): PageDef => ({ label, slug: slugOf(label), icon })

export const MODULES: ModuleDef[] = [
  {
    id: 'home',
    name: 'Home',
    pages: [
      page('Dashboard', 'M3.5 3.5h6.5v6.5H3.5zM14 3.5h6.5v4.5H14zM14 12h6.5v8.5H14zM3.5 14h6.5v6.5H3.5z'),
      page('Activity', 'M3 12h4l3-8 4 16 3-8h4'),
    ],
  },
  {
    id: 'finance',
    name: 'Finance',
    pages: [
      page('Chart of Accounts', 'M5 5a2 2 0 0 1 2-2h12v18H7a2 2 0 0 1-2-2zM9 8h6.5M9 12h6.5'),
      page('General Ledger', 'M4 4.5h16v15H4zM4 9.5h16M9.5 9.5v10'),
      page('Bank Accounts', 'M3 10 12 4.5 21 10M5.5 10v8M12 10v8M18.5 10v8M3 20.5h18'),
      page('Tax', calc),
    ],
  },
  {
    id: 'sales',
    name: 'Sales',
    pages: [
      page(
        'Catalog',
        'M12 6.5C12 5 10 4 7 4H3.5v13.5H7c3 0 5 1 5 2.5M12 6.5C12 5 14 4 17 4h3.5v13.5H17c-3 0-5 1-5 2.5M12 6.5V20',
      ),
      page('Sales Orders', clip + 'M9 11h6M9 15h4'),
      page('Sales Invoices', doc + 'M9 12.5h6M9 16.5h4'),
      page('Customers', people),
      page('Sales Prices', percentTag),
    ],
  },
  {
    id: 'purchasing',
    name: 'Purchasing',
    pages: [
      page('Purchase Orders', clip + 'm8.8 13.2 2 2 3.4-3.4'),
      page('Purchase Lines', 'M4 6h16M4 12h10M4 18h7'),
      page(
        'Purchase Receipts',
        'M12 3.5v9.5m0 0 3.5-3.5M12 13l-3.5-3.5M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16',
      ),
      page('Vendors', 'M3 21V9.5l5-4.5 5 4.5V21M13 21V12h8v9M3 21h18M6 13h4M6 17h4M16 15h2M16 18h2'),
      page('Purchase Prices', tag),
      page('Charges', 'M6 3.5h12v17l-3-1.8-3 1.8-3-1.8-3 1.8zM9.5 8.5h5M9.5 12.5h5'),
      page('Carriers', truck),
      page('Purchase Invoices', doc + 'M9 12.5h6M9 16.5h6'),
    ],
  },
  {
    id: 'warehouse',
    name: 'Warehouse',
    pages: [
      page('Items', box),
      page('Units of Measure', ruler),
      page(
        'Stock by Location',
        'M12 21s6.5-5.4 6.5-11a6.5 6.5 0 1 0-13 0C5.5 15.6 12 21 12 21zM12 7.8a2.7 2.7 0 1 1 0 5.4 2.7 2.7 0 0 1 0-5.4',
      ),
      page('Transfer Orders', 'M3.5 8.5h13l-3.2-3.2M20.5 15.5h-13l3.2 3.2'),
      page(
        'Physical Inventory',
        'M4.5 3.5h15v17h-15zM9 3.5v17M4.5 9H9M4.5 14.5H9M11.5 8h5.5M11.5 12h5.5M11.5 16h4',
      ),
    ],
  },
  {
    id: 'production',
    name: 'Production',
    pages: [
      page('Bills of Materials', bomTree),
      page('Assembly Orders', wrench),
      page(
        'Production Orders',
        'M20.5 12a8.5 8.5 0 0 1-14.4 6.1L3.5 15.5M3.5 12a8.5 8.5 0 0 1 14.4-6.1l2.6 2.6M20.5 4.5v4h-4M3.5 19.5v-4h4',
      ),
    ],
  },
  {
    id: 'people',
    name: 'People',
    pages: [
      page(
        'Users',
        'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7.6a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 0 0 0-5.4M6.7 18.7a6.5 6.5 0 0 1 10.6 0',
      ),
      page(
        'Employees',
        'M6.5 2.5h11a1 1 0 0 1 1 1v18l-6.5-3-6.5 3v-18a1 1 0 0 1 1-1M12 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4M8.6 16a3.5 3.5 0 0 1 6.8 0',
      ),
      page(
        'Contacts',
        'M6.5 3h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1M3.5 8h2M3.5 12h2M3.5 16h2M12 7.5a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4M8.6 16.5a3.5 3.5 0 0 1 6.8 0',
      ),
      page('Time Sheets', 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7.5V12l3.2 1.9'),
    ],
  },
  {
    id: 'notes',
    name: 'Notes',
    pages: [page('Notes', doc)],
  },
]

export function findModule(id: string | undefined): ModuleDef | undefined {
  return MODULES.find((m) => m.id === id)
}

export function findPage(moduleId: string | undefined, slug: string | undefined) {
  const module = findModule(moduleId)
  const pageDef = module?.pages.find((p) => p.slug === slug)
  return module && pageDef ? { module, page: pageDef } : undefined
}

export function pagePath(moduleId: ModuleId, slug: string): string {
  return `/${moduleId}/${slug}`
}

/** Resolve a pathname (`/purchasing/purchase-orders/PO00011`) to its module/page. */
export function resolvePath(pathname: string) {
  const [, moduleId, slug, ...rest] = pathname.split('/')
  const hit = findPage(moduleId, slug)
  return hit ? { ...hit, rest } : undefined
}

export interface NavPageRow {
  moduleId: ModuleId
  moduleName: string
  label: string
  slug: string
  icon: string
}

/** Flat list of every page, for page search and the Departments directory. */
export function allNavPages(): NavPageRow[] {
  return MODULES.flatMap((m) =>
    m.pages.map((p) => ({
      moduleId: m.id,
      moduleName: m.name,
      label: p.label,
      slug: p.slug,
      icon: p.icon,
    })),
  )
}

/** Where the app opens: Purchasing ▸ Purchase Orders, as in the prototype. */
export const DEFAULT_LANDING = { module: 'purchasing' as ModuleId, slug: 'purchase-orders' }

/**
 * Pages that exist only while a scale capability is on (Settings ▸ Modules & capabilities):
 * `<moduleId>/<slug>` → capability key. Production Orders is routed manufacturing, beyond assembly.
 */
export const PAGE_CAPABILITY: Readonly<Record<string, string>> = {
  'production/production-orders': 'production',
}

/**
 * The modules the workspace has switched on, each with the pages whose capability is on.
 * `moduleOn` / `capabilityOn` come from the workspace settings (see `app/shell/use-nav-modules.ts`).
 */
export function visibleModules(
  moduleOn: (id: string) => boolean,
  capabilityOn: (key: string) => boolean,
): ModuleDef[] {
  return MODULES.filter((m) => moduleOn(m.id)).map((m) => {
    const pages = m.pages.filter((p) => {
      const cap = PAGE_CAPABILITY[`${m.id}/${p.slug}`]
      return !cap || capabilityOn(cap)
    })
    return pages.length === m.pages.length ? m : { ...m, pages }
  })
}
