/**
 * Pure domain helpers for the Departments page directory.
 * Builds module/page groups from the single navigation registry (`MODULES`),
 * applies filtering + Setup sub-grouping, and handles keyboard focus movement.
 */
import { type ModuleDef, type ModuleId, pagePath } from '@/app/nav'

/** Page labels grouped under the Setup hairline inside each department block. */
export const SETUP_PAGE_LABELS: ReadonlySet<string> = new Set([
  'Units of Measure',
  'Chart of Accounts',
  'Tax',
  'Sales Prices',
  'Purchase Prices',
  'Charges',
  'Carriers',
])

/** Pages ported to React so far (`<moduleId>/<slug>`). Everything else shows "Coming soon". */
export const BUILT_REACT_PAGES: ReadonlySet<string> = new Set([
  'finance/chart-of-accounts',
  'sales/customers',
  'purchasing/purchase-orders',
  'purchasing/purchase-lines',
  'purchasing/purchase-receipts',
  'purchasing/vendors',
  'purchasing/purchase-prices',
  'purchasing/charges',
  'purchasing/carriers',
  'warehouse/items',
  'production/bills-of-materials',
  'production/assembly-orders',
  'people/contacts',
  'notes/notes',
])

export interface DepartmentPageEntry {
  key: string
  moduleId: ModuleId
  moduleName: string
  label: string
  slug: string
  icon: string
  path: string
  built: boolean
  isSetup: boolean
}

export interface DepartmentBlock {
  id: ModuleId
  name: string
  totalCount: number
  work: DepartmentPageEntry[]
  setup: DepartmentPageEntry[]
  all: DepartmentPageEntry[]
}

/** Build filtered department blocks from the sidebar module registry. */
export function buildDepartmentBlocks(
  modules: readonly ModuleDef[],
  query: string,
  builtPages: ReadonlySet<string> = BUILT_REACT_PAGES,
): DepartmentBlock[] {
  const q = query.trim().toLowerCase()
  const blocks: DepartmentBlock[] = []

  for (const mod of modules) {
    const entries: DepartmentPageEntry[] = []
    for (const page of mod.pages) {
      if (q && !page.label.toLowerCase().includes(q) && !mod.name.toLowerCase().includes(q)) continue
      const key = `${mod.id}/${page.slug}`
      entries.push({
        key,
        moduleId: mod.id,
        moduleName: mod.name,
        label: page.label,
        slug: page.slug,
        icon: page.icon,
        path: pagePath(mod.id, page.slug),
        built: builtPages.has(key),
        isSetup: SETUP_PAGE_LABELS.has(page.label),
      })
    }
    if (entries.length === 0) continue
    const work = entries.filter((e) => !e.isSetup)
    const setup = entries.filter((e) => e.isSetup)
    blocks.push({
      id: mod.id,
      name: mod.name,
      totalCount: entries.length,
      work,
      setup,
      all: [...work, ...setup],
    })
  }

  return blocks
}

/** Flatten blocks into visual keyboard navigation order (work pages then setup pages per block). */
export function flattenDepartmentBlocks(blocks: readonly DepartmentBlock[]): DepartmentPageEntry[] {
  return blocks.flatMap((b) => b.all)
}

/** Clamp a focus index to `[0, length - 1]`, or `-1` when empty. */
export function clampDepartmentFocus(index: number, length: number): number {
  if (length <= 0) return -1
  return Math.max(0, Math.min(index, length - 1))
}

export type DepartmentNavDirection = 'ArrowDown' | 'ArrowUp' | 'ArrowRight' | 'ArrowLeft'

/** Move keyboard focus across pages (Up/Down) or jump between department blocks (Left/Right). */
export function stepDepartmentFocus(
  flat: readonly DepartmentPageEntry[],
  currentIndex: number,
  direction: DepartmentNavDirection,
): number {
  if (flat.length === 0) return -1
  const cur = clampDepartmentFocus(currentIndex, flat.length)
  if (direction === 'ArrowDown') return (cur + 1) % flat.length
  if (direction === 'ArrowUp') return (cur - 1 + flat.length) % flat.length

  const moduleIds: ModuleId[] = []
  for (const entry of flat) {
    if (moduleIds[moduleIds.length - 1] !== entry.moduleId) moduleIds.push(entry.moduleId)
  }
  const at = moduleIds.indexOf(flat[cur].moduleId)
  const target =
    direction === 'ArrowRight'
      ? moduleIds[(at + 1) % moduleIds.length]
      : moduleIds[(at - 1 + moduleIds.length) % moduleIds.length]
  return flat.findIndex((entry) => entry.moduleId === target)
}
