/**
 * Terminology (Settings ▸ Workspace ▸ Terminology): a rename layer. A workspace can call a
 * Location a "Store", a Vendor a "Supplier" and so on; screens read the label through
 * `termGet(terms, key, fallback)` and keep their own wording when nothing is overridden.
 * Pure rules; the backend stores the same key → text map. See docs/terminology/README.md.
 *
 * Keys follow the prototype: a single label is `module.finance` / `object.favorites.label` /
 * `field.lotBatch.label`; a record name is a pair `object.location.singular` + `.plural`.
 */

/** The overrides: key → text. A key with no entry (or blank text) means "use the original". */
export type TermMap = Readonly<Record<string, string>>

export const TERM_MAX_LENGTH = 40

/** What the label's text is when it isn't renamed: the override if it has text, else `fallback`. */
export function termGet(terms: TermMap | null | undefined, key: string, fallback: string): string {
  const value = terms?.[key]
  return value !== undefined && value !== null && String(value).trim() !== '' ? String(value) : fallback
}

/** `Location` / `Locations` for the location record, as the workspace calls them. */
export function recordTerm(terms: TermMap | null | undefined, base: string, singular: string, plural: string): { singular: string; plural: string } {
  return {
    singular: termGet(terms, `${base}.singular`, singular),
    plural: termGet(terms, `${base}.plural`, plural),
  }
}

export const LOCATION_TERM_BASE = 'object.location'

/** The workspace's name for a stock site (Settings ▸ Locations, Stock by location …). */
export const locationTerm = (terms: TermMap | null | undefined): { singular: string; plural: string } =>
  recordTerm(terms, LOCATION_TERM_BASE, 'Location', 'Locations')

/** The sidebar page that names a location: `Stock by Location` reads the workspace's word; every other label is unchanged. */
export const pageDisplayLabel = (label: string, locationSingular: string): string =>
  label === 'Stock by Location' ? `Stock by ${locationSingular}` : label

/** Capabilities a group of field renames waits for (the rows appear once the capability is on). */
export type TermCapability = 'lotBatch' | 'customerPricing'

interface PairDef {
  base: string
  label: string
  plural: string
}
interface SingleDef {
  key: string
  label: string
  capability?: TermCapability
}

export interface TermGroupDef {
  id: string
  name: string
  hint: string
  pairs?: readonly PairDef[]
  singles?: readonly SingleDef[]
}

/** Every renamable label, grouped as in the prototype's `termDefs()`. */
export const TERM_GROUPS: readonly TermGroupDef[] = [
  {
    id: 'modules',
    name: 'Modules & navigation',
    hint: 'Rename a module everywhere — sidebar, breadcrumb, tabs, page search.',
    singles: [
      { key: 'module.home', label: 'Home' },
      { key: 'module.finance', label: 'Finance' },
      { key: 'module.sales', label: 'Sales' },
      { key: 'module.purchasing', label: 'Purchasing' },
      { key: 'module.warehouse', label: 'Warehouse' },
      { key: 'module.production', label: 'Production' },
      { key: 'module.people', label: 'People' },
      { key: 'object.departments.label', label: 'Departments' },
    ],
  },
  {
    id: 'records',
    name: 'Records',
    hint: 'The core objects. Singular is used on a record, plural on list pages and titles.',
    pairs: [
      { base: 'object.item', label: 'Item', plural: 'Items' },
      { base: 'object.customer', label: 'Customer', plural: 'Customers' },
      { base: 'object.vendor', label: 'Vendor', plural: 'Vendors' },
      { base: 'object.po', label: 'Purchase order', plural: 'Purchase orders' },
      { base: LOCATION_TERM_BASE, label: 'Location', plural: 'Locations' },
      { base: 'object.bom', label: 'Bill of materials', plural: 'Bills of materials' },
      { base: 'object.assemblyOrder', label: 'Assembly order', plural: 'Assembly orders' },
      { base: 'object.component', label: 'Component', plural: 'Components' },
      { base: 'object.view', label: 'View', plural: 'Views' },
    ],
  },
  {
    id: 'favorites',
    name: 'Favorites & views',
    hint: 'What the pinned sidebar section is called — some teams say Pinned or Bookmarks.',
    singles: [{ key: 'object.favorites.label', label: 'Favorites' }],
  },
  {
    id: 'fields',
    name: 'Fields',
    hint: 'Names of individual fields. Applies to column headers, record labels and edit forms.',
    singles: [
      { key: 'field.lotBatch.label', label: 'Lot/Batch', capability: 'lotBatch' },
      { key: 'field.customerPrice.label', label: 'Customer price', capability: 'customerPricing' },
    ],
  },
]

/** A renamable label as one row of the Terminology list. */
export interface TermRow {
  /** `object.location` for a pair, the full key for a single label. */
  id: string
  group: string
  groupName: string
  pair: boolean
  /** Original wording. */
  origSingular: string
  origPlural: string
  /** Wording now (the override, else the original). */
  singular: string
  plural: string
  renamed: boolean
}

const singularKey = (r: Pick<TermRow, 'id' | 'pair'>) => (r.pair ? `${r.id}.singular` : r.id)
const pluralKey = (r: Pick<TermRow, 'id'>) => `${r.id}.plural`

/** The rows of the list, in the prototype's order. `capabilities` lists the capabilities that are on. */
export function termRows(terms: TermMap | null | undefined, capabilities: readonly TermCapability[] = []): TermRow[] {
  const rows: TermRow[] = []
  for (const g of TERM_GROUPS) {
    for (const p of g.pairs ?? []) {
      const singular = termGet(terms, `${p.base}.singular`, p.label)
      const plural = termGet(terms, `${p.base}.plural`, p.plural)
      rows.push({
        id: p.base,
        group: g.id,
        groupName: g.name,
        pair: true,
        origSingular: p.label,
        origPlural: p.plural,
        singular,
        plural,
        renamed: singular !== p.label || plural !== p.plural,
      })
    }
    for (const s of g.singles ?? []) {
      if (s.capability && !capabilities.includes(s.capability)) continue
      const singular = termGet(terms, s.key, s.label)
      rows.push({
        id: s.key,
        group: g.id,
        groupName: g.name,
        pair: false,
        origSingular: s.label,
        origPlural: '',
        singular,
        plural: '',
        renamed: singular !== s.label,
      })
    }
  }
  return rows
}

/** How many labels are renamed (the badge beside the section): a singular + plural pair counts once. */
export const renamedCount = (terms: TermMap | null | undefined): number =>
  new Set(
    Object.entries(terms ?? {})
      .filter(([, v]) => String(v).trim() !== '')
      .map(([k]) => k.replace(/.(singular|plural)$/, '')),
  ).size

/** Field errors for an edited row (empty when valid). Blank text is fine — it means "use the original". */
export function validateTermRow(row: Pick<TermRow, 'pair' | 'singular' | 'plural'>): Record<string, string> {
  const errors: Record<string, string> = {}
  const check = (value: string, key: 'singular' | 'plural') => {
    if (value.trim().length > TERM_MAX_LENGTH) errors[key] = `Keep it to ${TERM_MAX_LENGTH} characters or fewer.`
    // eslint-disable-next-line no-control-regex
    else if (/[\u0000-\u001f<>]/.test(value)) errors[key] = 'Use letters, numbers and spaces — no < or > characters.'
  }
  check(row.singular, 'singular')
  if (row.pair) check(row.plural, 'plural')
  return errors
}

/**
 * The change to store for an edited row: a key with text is an override, `null` removes it
 * (blank, or the same as the original).
 */
export function termPatch(row: TermRow): Record<string, string | null> {
  const norm = (value: string, orig: string) => {
    const v = value.trim().replace(/\s+/g, ' ')
    return v === '' || v === orig ? null : v
  }
  const patch: Record<string, string | null> = { [singularKey(row)]: norm(row.singular, row.origSingular) }
  if (row.pair) patch[pluralKey(row)] = norm(row.plural, row.origPlural)
  return patch
}

/** The patch that puts one row back to its original wording. */
export function termResetPatch(row: Pick<TermRow, 'id' | 'pair'>): Record<string, null> {
  return row.pair ? { [`${row.id}.singular`]: null, [`${row.id}.plural`]: null } : { [row.id]: null }
}

/** Apply a patch (`null` deletes) to a map — the same merge the stored document uses. */
export function applyTermPatch(terms: TermMap, patch: Readonly<Record<string, string | null>>): Record<string, string> {
  const out: Record<string, string> = { ...terms }
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value.trim() === '') delete out[key]
    else out[key] = value
  }
  return out
}

/** Every key a definition can write — anything else in a stored map is dropped on read. */
export function knownTermKeys(): Set<string> {
  const keys = new Set<string>()
  for (const g of TERM_GROUPS) {
    for (const p of g.pairs ?? []) {
      keys.add(`${p.base}.singular`)
      keys.add(`${p.base}.plural`)
    }
    for (const s of g.singles ?? []) keys.add(s.key)
  }
  return keys
}
