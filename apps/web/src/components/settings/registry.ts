/**
 * Settings registry — single source of truth for every settings area, section,
 * URL, legacy redirect and setting search. Pure data and helpers (no React).
 *
 * Areas:
 *   - `workspace` — company-wide settings (central `/settings/<id>`)
 *   - `purchasing | sales | warehouse | production | finance | people` — module
 *     settings (`/<module>/settings/<id>`)
 *   - `shared` — whole cross-module shared lists (`/settings/shared/<list>`)
 *   - `personal` — signed-in user preferences (central `/settings/<id>`)
 */
import type { ModuleId } from '@/app/nav'
import type { HelpEntry, HelpMap } from '@/components/help/types'

export type SettingsModuleId =
  | 'purchasing'
  | 'sales'
  | 'warehouse'
  | 'production'
  | 'finance'
  | 'people'

export type SettingsAreaId = 'workspace' | SettingsModuleId | 'shared' | 'personal'
export type SettingsAreaKind = 'workspace' | 'module' | 'shared' | 'personal'
export type SectionType = 'form' | 'list' | 'custom'
export type SharedListId = 'sequences' | 'statuses' | 'fields' | 'terms' | 'tax-codes'

export interface SectionDef {
  /** URL segment inside its area. */
  id: string
  label: string
  /** Template kind: form (`SettingsSection`), list (`ListPage` embedded) or custom (`SettingsPage`). */
  type: SectionType
  /** Set when this section renders a shared cross-module list (or its module slice). */
  shared?: SharedListId
  /** Former `/settings/<id>` slugs that redirect here. */
  legacyIds?: readonly string[]
}

export interface SettingsArea {
  id: SettingsAreaId
  label: string
  kind: SettingsAreaKind
  sections: readonly SectionDef[]
}

export const SETTINGS_MODULE_IDS: readonly SettingsModuleId[] = [
  'purchasing',
  'sales',
  'warehouse',
  'production',
  'finance',
  'people',
]

const SETTINGS_MODULE_SET: ReadonlySet<string> = new Set(SETTINGS_MODULE_IDS)

export const SHARED_LIST_IDS: readonly SharedListId[] = [
  'sequences',
  'statuses',
  'fields',
  'terms',
  'tax-codes',
]

export const SETTINGS_AREAS: readonly SettingsArea[] = [
  {
    id: 'workspace',
    label: 'Workspace',
    kind: 'workspace',
    sections: [
      { id: 'ws-profile', label: 'Business profile', type: 'form' },
      { id: 'ws-gst', label: 'GST registrations', type: 'list' },
      { id: 'ws-plan', label: 'Plan & billing', type: 'custom' },
      { id: 'ws-modules', label: 'Modules & capabilities', type: 'custom' },
      { id: 'ws-regional', label: 'Regional & format', type: 'form' },
      { id: 'ws-team', label: 'Team & roles', type: 'list' },
      { id: 'terminology', label: 'Terminology', type: 'list' },
      { id: 'cfg-nav', label: 'Navigation', type: 'custom' },
      { id: 'cfg-favorites', label: 'Favorites & views', type: 'custom' },
      { id: 'cfg-states', label: 'States & territories', type: 'list' },
    ],
  },
  {
    id: 'purchasing',
    label: 'Purchasing',
    kind: 'module',
    sections: [
      { id: 'carrier-types', label: 'Carrier types', type: 'list' },
      { id: 'sequences', label: 'Number sequences', type: 'list', shared: 'sequences' },
      { id: 'statuses', label: 'Statuses & stages', type: 'list', shared: 'statuses' },
      { id: 'fields', label: 'Custom fields', type: 'list', shared: 'fields' },
      { id: 'terms', label: 'Payment terms', type: 'list', shared: 'terms' },
    ],
  },
  {
    id: 'sales',
    label: 'Sales',
    kind: 'module',
    sections: [
      { id: 'cfg-pricing', label: 'Sales pricing', type: 'form' },
      { id: 'sequences', label: 'Number sequences', type: 'list', shared: 'sequences' },
      { id: 'statuses', label: 'Statuses & stages', type: 'list', shared: 'statuses' },
      { id: 'fields', label: 'Custom fields', type: 'list', shared: 'fields' },
      { id: 'terms', label: 'Payment terms', type: 'list', shared: 'terms' },
    ],
  },
  {
    id: 'warehouse',
    label: 'Warehouse',
    kind: 'module',
    sections: [
      { id: 'uom', label: 'Units of measure', type: 'list' },
      { id: 'categories', label: 'Item categories', type: 'list' },
      { id: 'locations', label: 'Locations & warehouses', type: 'list' },
      { id: 'sequences', label: 'Number sequences', type: 'list', shared: 'sequences' },
      { id: 'fields', label: 'Custom fields', type: 'list', shared: 'fields' },
    ],
  },
  {
    id: 'production',
    label: 'Production',
    kind: 'module',
    sections: [
      { id: 'assembly', label: 'Assembly & production', type: 'form' },
      { id: 'sequences', label: 'Number sequences', type: 'list', shared: 'sequences' },
      { id: 'statuses', label: 'Statuses & stages', type: 'list', shared: 'statuses' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    kind: 'module',
    sections: [
      { id: 'cfg-taxset', label: 'Tax settings', type: 'form' },
      { id: 'tax-codes', label: 'Tax codes', type: 'list', shared: 'tax-codes' },
      { id: 'sequences', label: 'Number sequences', type: 'list', shared: 'sequences' },
    ],
  },
  {
    id: 'people',
    label: 'People',
    kind: 'module',
    sections: [
      { id: 'fields', label: 'Custom fields', type: 'list', shared: 'fields' },
      { id: 'sequences', label: 'Number sequences', type: 'list', shared: 'sequences' },
    ],
  },
  {
    id: 'shared',
    label: 'Shared lists',
    kind: 'shared',
    sections: [
      { id: 'sequences', label: 'Number sequences', type: 'list', shared: 'sequences', legacyIds: ['cfg-sequences'] },
      { id: 'statuses', label: 'Statuses & stages', type: 'list', shared: 'statuses', legacyIds: ['cfg-statuses'] },
      { id: 'fields', label: 'Custom fields', type: 'list', shared: 'fields', legacyIds: ['cfg-fields'] },
      { id: 'terms', label: 'Payment terms', type: 'list', shared: 'terms', legacyIds: ['cfg-terms'] },
      { id: 'tax-codes', label: 'Tax codes', type: 'list', shared: 'tax-codes', legacyIds: ['cfg-tax'] },
    ],
  },
  {
    id: 'personal',
    label: 'Personal',
    kind: 'personal',
    sections: [
      { id: 'me-profile', label: 'Profile', type: 'form' },
      { id: 'me-appearance', label: 'Appearance', type: 'form' },
      { id: 'me-notifications', label: 'Notifications', type: 'form' },
      { id: 'me-language', label: 'Language & region', type: 'form' },
      { id: 'me-defaults', label: 'Personal defaults', type: 'form' },
      { id: 'me-favorites', label: 'Favorites & views', type: 'custom' },
      { id: 'me-security', label: 'Security', type: 'form' },
      { id: 'shortcuts', label: 'Keyboard shortcuts', type: 'custom' },
    ],
  },
]

export interface FoundSection {
  area: SettingsArea
  section: SectionDef
}

export function isSettingsModule(id: string): id is SettingsModuleId {
  return SETTINGS_MODULE_SET.has(id)
}

export function findArea(areaId: string): SettingsArea | null {
  return SETTINGS_AREAS.find((a) => a.id === areaId) ?? null
}

/** Find a section inside a specific area (`workspace`, a module id, `shared`, or `personal`). */
export function findSection(areaId: string, sectionId: string): FoundSection | null {
  const area = findArea(areaId)
  if (!area) return null
  const section = area.sections.find((s) => s.id === sectionId)
  return section ? { area, section } : null
}

/** Find a section served directly at `/settings/<section>` (workspace or personal). */
export function findCentralSection(sectionId: string): FoundSection | null {
  return findSection('workspace', sectionId) ?? findSection('personal', sectionId)
}

/** Canonical URL for a section inside its area. */
export function sectionPath(area: SettingsArea | SettingsAreaId, section: SectionDef | string): string {
  const areaObj = typeof area === 'string' ? findArea(area) : area
  const sectionId = typeof section === 'string' ? section : section.id
  if (!areaObj) return `/settings/${sectionId}`
  if (areaObj.kind === 'module') return `/${areaObj.id}/settings/${sectionId}`
  if (areaObj.kind === 'shared') return `/settings/shared/${sectionId}`
  return `/settings/${sectionId}`
}

/** First section of an area (where `/<module>/settings` and `/settings` land). */
export function firstSection(area: SettingsArea | SettingsAreaId): SectionDef {
  const areaObj = typeof area === 'string' ? findArea(area) : area
  if (!areaObj || areaObj.sections.length === 0) {
    throw new Error(`Settings area has no sections: ${String(area)}`)
  }
  return areaObj.sections[0]
}

/**
 * Resolve a former `/settings/<oldId>` slug to its new area + section.
 * Returns `null` when `oldId` still lives at `/settings/<oldId>` or does not exist.
 */
export function legacyTarget(oldId: string): FoundSection | null {
  if (findCentralSection(oldId)) return null
  for (const area of SETTINGS_AREAS) {
    for (const section of area.sections) {
      if (section.legacyIds?.includes(oldId)) return { area, section }
    }
  }
  for (const area of SETTINGS_AREAS) {
    if (area.kind !== 'module') continue
    for (const section of area.sections) {
      if (!section.shared && section.id === oldId) return { area, section }
    }
  }
  return null
}

/** Resolve a former `/settings/<oldId>` slug to its canonical redirect URL, or `null`. */
export function legacyRedirect(oldId: string): string | null {
  const target = legacyTarget(oldId)
  return target ? sectionPath(target.area, target.section) : null
}

/**
 * Return settings areas visible for the given enabled modules (or all modules when omitted).
 * Non-module areas (`workspace`, `shared`, `personal`) are always included in canonical order.
 */
export function areasForModules(
  enabledModules?: readonly (ModuleId | string)[] | ReadonlySet<string>,
): SettingsArea[] {
  if (!enabledModules) return [...SETTINGS_AREAS]
  const enabled = enabledModules instanceof Set ? enabledModules : new Set(enabledModules)
  return SETTINGS_AREAS.filter((a) => a.kind !== 'module' || enabled.has(a.id))
}

/** If `pathname` is `/<module>/settings` or `/<module>/settings/...` for a settings module, return its id. */
export function moduleSettingsFromPath(pathname: string): SettingsModuleId | null {
  const [, moduleId, segment] = pathname.split('/')
  if (segment === 'settings' && moduleId && isSettingsModule(moduleId)) return moduleId
  return null
}

export interface SettingsSearchMatch {
  /** Stable key for list rendering. */
  id: string
  area: SettingsArea
  section: SectionDef
  /** Primary display label (section label or row label). */
  label: string
  /** Secondary text shown beside the match (area name, or `Area · Section` for row hits). */
  areaLabel: string
  /** Canonical path to the section (without `?find=`). */
  path: string
  /** Present when the match is a row inside the section; navigate with `?find=<rowKey>`. */
  rowKey?: string
  /** Lower is better: 0 = label prefix, 1 = word prefix, 2 = contains, 3 = help text. */
  rank: number
}

function helpEntryText(entry: HelpEntry | undefined): string {
  if (!entry) return ''
  const parts: string[] = []
  if (entry.body) parts.push(entry.body)
  if (entry.note) parts.push(entry.note)
  if (entry.options) {
    for (const opt of entry.options) {
      parts.push(opt.label, opt.desc)
    }
  }
  return parts.join(' ')
}

function scoreMatch(label: string, query: string, words: readonly string[], extraText?: string): number | null {
  const lower = label.toLowerCase()
  if (lower.startsWith(query)) return 0
  const labelWords = lower.split(/[\s/\-–—,&]+/).filter(Boolean)
  if (labelWords.some((w) => w.startsWith(query))) return 1
  if (lower.includes(query)) return 2
  const hay = extraText ? `${lower} ${extraText.toLowerCase()}` : lower
  if (words.length > 0 && words.every((w) => hay.includes(w))) return 3
  return null
}

/**
 * Search settings sections and (when `helpMaps` is provided) row labels / help text.
 * Ranked: label prefix (0) > word prefix (1) > label contains (2) > help text (3).
 */
export function searchSettings(
  query: string,
  helpMaps?: Readonly<Record<string, HelpMap>>,
  areas: readonly SettingsArea[] = SETTINGS_AREAS,
  /** Most matches returned (the list shows the best ones; keep typing to narrow). */
  limit = 8,
): SettingsSearchMatch[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const words = q.split(/\s+/).filter(Boolean)

  const hits: { match: SettingsSearchMatch; order: number }[] = []
  let order = 0

  for (const area of areas) {
    for (const section of area.sections) {
      const path = sectionPath(area, section)
      const helpMap = helpMaps?.[section.id]
      const pageExtra = `${area.label} ${helpEntryText(helpMap?.page)}`
      const secRank = scoreMatch(section.label, q, words, pageExtra)
      if (secRank !== null) {
        hits.push({
          match: {
            id: path,
            area,
            section,
            label: section.label,
            areaLabel: area.label,
            path,
            rank: secRank,
          },
          order: order++,
        })
      }

      if (!helpMap) continue
      // One hit per row label in a section (help maps can describe a field twice, e.g. grid column + drawer field).
      const seenRows = new Set<string>()
      for (const [key, entry] of Object.entries(helpMap)) {
        if (key === 'page') continue
        const rowLabel = entry.title.toLowerCase()
        if (seenRows.has(rowLabel)) continue
        const rowRank = scoreMatch(entry.title, q, words, helpEntryText(entry))
        if (rowRank !== null) {
          seenRows.add(rowLabel)
          hits.push({
            match: {
              id: `${path}#${key}`,
              area,
              section,
              label: entry.title,
              areaLabel: `${area.label} · ${section.label}`,
              path,
              rowKey: key,
              rank: rowRank,
            },
            order: order++,
          })
        }
      }
    }
  }

  hits.sort((a, b) => {
    if (a.match.rank !== b.match.rank) return a.match.rank - b.match.rank
    const aRow = a.match.rowKey ? 1 : 0
    const bRow = b.match.rowKey ? 1 : 0
    if (aRow !== bRow) return aRow - bRow
    return a.order - b.order
  })

  return hits.slice(0, limit).map((h) => h.match)
}
