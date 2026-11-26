/**
 * Locations & warehouses (Settings ▸ Locations & warehouses): the single registry
 * of physical sites that hold stock. Rules for saving, deleting and the principal
 * place of business. Pure functions only. See docs/locations-warehouses/README.md.
 *
 * Stock (`item.locs`) and assembly orders refer to a site by `id`; purchase orders,
 * receipts and sales orders refer to it by `code`.
 */
import type { AssemblyOrder, GstRegistration, Item, PurchaseOrder, PurchaseReceipt, SalesOrder, Warehouse } from '@/data/schemas'
import { gstStateByCode } from './gst'
import { locationRegistrationError } from './gst-registrations'
import { normalizeFloors, validateFloors } from './location-layouts'

export const LOCATION_TYPES = [
  { value: 'mixed', label: 'Manufacturing + DC' },
  { value: 'dc', label: 'Distribution' },
  { value: '3pl', label: 'Third-party (3PL)' },
  { value: 'retail', label: 'Retail' },
] as const

export const LOCATION_STATUSES = [
  { value: 'setup', label: 'Setting up' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const

export const LOCATION_POB = [
  { value: 'principal', label: 'Principal place of business' },
  { value: 'additional', label: 'Additional place of business' },
  { value: 'undeclared', label: 'Not on the certificate yet' },
] as const

/** Countries offered for a site (prototype list). */
export const LOCATION_COUNTRIES = [
  { value: 'IN', label: 'India' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'SG', label: 'Singapore' },
  { value: 'US', label: 'United States' },
] as const

export const locationTypeLabel = (type: string): string =>
  LOCATION_TYPES.find((t) => t.value === type)?.label ?? type

export const locationStatusLabel = (status: string): string =>
  LOCATION_STATUSES.find((s) => s.value === status)?.label ?? 'Setting up'

export const locationPobLabel = (pob: string): string =>
  ({ principal: 'Principal place', additional: 'Additional place', undeclared: 'Not on certificate' })[pob] ??
  'Not on certificate'

export const locationCountryLabel = (code: string): string =>
  LOCATION_COUNTRIES.find((c) => c.value === code)?.label ?? code

export const isIndianSite = (w: Pick<Warehouse, 'country'>): boolean => !w.country || w.country === 'IN'

/** `Tamil Nadu` for state code `33`; the raw value for non-Indian sites. */
export function locationStateLabel(w: Pick<Warehouse, 'country' | 'state'>): string {
  if (!isIndianSite(w)) return w.state
  return gstStateByCode(w.state)?.name ?? w.state
}

export function locationAddress(w: Warehouse): string {
  return [w.addr, w.city, locationStateLabel(w), w.zip].filter(Boolean).join(', ')
}

export const normalizeLocationCode = (code: string): string => code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '')

/** `WH-<CODE>`, numbered when that id is taken (a code can be edited, the id never changes). */
export function nextLocationId(all: readonly Warehouse[], code: string): string {
  const taken = new Set(all.map((w) => w.id))
  const base = `WH-${normalizeLocationCode(code) || 'SITE'}`
  let id = base
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`
  return id
}

/** What refers to a site: units in stock and open documents (blocks delete and a state change). */
export interface LocationUsage {
  stock: number
  /** Open documents: Draft / Issued / Partially received POs, Draft receipts, draft / released / in-progress assembly orders, Open / Released sales orders. */
  openDocs: number
  /** Every document, open or not, that carries the site's code (locks the code). */
  docs: number
}

export interface LocationUsageSources {
  items: readonly Pick<Item, 'locs'>[]
  purchaseOrders: readonly Pick<PurchaseOrder, 'location' | 'status'>[]
  purchaseReceipts: readonly Pick<PurchaseReceipt, 'location' | 'status'>[]
  assemblyOrders: readonly Pick<AssemblyOrder, 'location' | 'status'>[]
  salesOrders: readonly Pick<SalesOrder, 'location' | 'status'>[]
}

const OPEN_PO = ['Draft', 'Issued', 'Partially received']
const OPEN_AO = ['draft', 'released', 'inProgress']
const OPEN_SO = ['Open', 'Released']

export function locationUsage(
  warehouses: readonly Pick<Warehouse, 'id' | 'code'>[],
  src: LocationUsageSources,
): Map<string, LocationUsage> {
  const out = new Map<string, LocationUsage>()
  const byCode = new Map<string, string>()
  for (const w of warehouses) {
    out.set(w.id, { stock: 0, openDocs: 0, docs: 0 })
    byCode.set(w.code, w.id)
  }
  for (const it of src.items) {
    for (const [id, qty] of Object.entries(it.locs ?? {})) {
      const u = out.get(id)
      if (u) u.stock += Number(qty) || 0
    }
  }
  const bump = (id: string | undefined, open: boolean) => {
    const u = id ? out.get(id) : undefined
    if (!u) return
    u.docs += 1
    if (open) u.openDocs += 1
  }
  for (const p of src.purchaseOrders) bump(byCode.get(p.location), OPEN_PO.includes(p.status))
  for (const r of src.purchaseReceipts) bump(byCode.get(r.location), r.status === 'Draft')
  for (const a of src.assemblyOrders) bump(a.location, OPEN_AO.includes(a.status))
  for (const o of src.salesOrders) bump(byCode.get(o.location), OPEN_SO.includes(o.status))
  return out
}

/** Writing "1 open document uses" / "3 open documents use". */
const docsPhrase = (n: number): string => `${n} open ${n === 1 ? 'document uses' : 'documents use'}`

/**
 * Field errors for a site being saved (empty when valid). `original` is the saved
 * record when editing; `others` excludes the site being edited.
 */
export function validateLocation(
  draft: Warehouse,
  others: readonly Warehouse[],
  original: Warehouse | null,
  usage: LocationUsage | undefined,
  vendorNos: ReadonlySet<string>,
  /** The business's GST registrations. When given, an Active site must be in a state one of them covers (G-017). */
  registrations?: readonly GstRegistration[],
): Record<string, string> {
  const errors: Record<string, string> = {}
  const code = normalizeLocationCode(draft.code)
  if (!draft.name.trim()) errors.name = 'Enter a warehouse name.'
  if (!code) errors.code = 'Enter a short code (e.g. MAIN).'
  else if (others.some((w) => w.code === code)) errors.code = `Code “${code}” is already used by another warehouse.`
  else if (original && original.code !== code && (usage?.docs ?? 0) > 0) {
    errors.code = 'Documents already refer to this code — it can’t change.'
  }
  const floorsError = draft.floors ? validateFloors(draft.floors) : null
  if (floorsError) errors.floors = floorsError
  const indian = isIndianSite(draft)
  if (indian && !draft.state) {
    errors.state = 'Choose the state — it decides which GST registration this site files under.'
  } else if (
    original &&
    (original.state !== draft.state || (original.country || 'IN') !== (draft.country || 'IN')) &&
    (usage?.openDocs ?? 0) > 0
  ) {
    errors.state = `${docsPhrase(usage?.openDocs ?? 0)} this site. Close them before moving it to another state.`
  }
  if (draft.type === '3pl' && draft.operatorVendorId && !vendorNos.has(draft.operatorVendorId)) {
    errors.operatorVendorId = 'The 3PL vendor on this site no longer exists — pick another.'
  }
  // An active site files under the registration of its state, so one has to exist (checked when the site becomes
  // active or moves state — an already-active site isn't blocked from unrelated edits).
  if (registrations && !errors.status && !errors.state) {
    const becomesActive = !original || original.status !== 'active' || original.state !== draft.state || (original.country || 'IN') !== (draft.country || 'IN')
    const missing = becomesActive ? locationRegistrationError(draft, registrations) : null
    if (missing) errors.status = missing
  }
  // There is always at least one active location.
  const wasActive = original?.status === 'active'
  if (wasActive && draft.status !== 'active' && !others.some((w) => w.status === 'active')) {
    errors.status = 'There must always be one active location — make another one active first.'
  }
  return errors
}

/** Normalise a draft before validating and saving (trim, upper-case the code, clear fields that don't apply). */
export function normalizeLocation(draft: Warehouse): Warehouse {
  const indian = isIndianSite(draft)
  return {
    ...draft,
    name: draft.name.trim(),
    code: normalizeLocationCode(draft.code),
    addr: draft.addr.trim(),
    city: draft.city.trim(),
    zip: draft.zip.trim(),
    country: draft.country || 'IN',
    state: indian ? draft.state : draft.state.trim(),
    area: Number.isFinite(Number(draft.area)) && Number(draft.area) > 0 ? Math.round(Number(draft.area)) : 0,
    pobStatus: indian ? draft.pobStatus || 'undeclared' : 'undeclared',
    operatorVendorId: draft.type === '3pl' ? draft.operatorVendorId : '',
    ...(draft.floors ? { floors: normalizeFloors(draft.floors) } : {}),
  }
}

/**
 * One principal place of business per state: saving a site as Principal moves the
 * state's previous principal to Additional. Returns the new list and the site moved.
 */
export function applyPrincipal(
  list: readonly Warehouse[],
  id: string,
): { list: Warehouse[]; moved: Warehouse | null } {
  const site = list.find((w) => w.id === id)
  if (!site || site.pobStatus !== 'principal' || !isIndianSite(site)) return { list: [...list], moved: null }
  let moved: Warehouse | null = null
  const out = list.map((w) => {
    if (w.id !== id && isIndianSite(w) && w.state === site.state && w.pobStatus === 'principal') {
      moved = { ...w, pobStatus: 'additional' }
      return moved
    }
    return w
  })
  return { list: out, moved }
}

/** The saved site that would lose Principal if `draft` is saved as the principal place. */
export function principalDisplaced(draft: Warehouse, all: readonly Warehouse[]): Warehouse | null {
  if (draft.pobStatus !== 'principal' || !isIndianSite(draft) || !draft.state) return null
  return all.find((w) => w.id !== draft.id && isIndianSite(w) && w.state === draft.state && w.pobStatus === 'principal') ?? null
}

/** Why a site can't be deleted, or null. */
export function locationDeleteBlockReason(
  site: Warehouse,
  all: readonly Warehouse[],
  usage: LocationUsage | undefined,
): string | null {
  const stock = usage?.stock ?? 0
  const open = usage?.openDocs ?? 0
  if (stock > 0 || open > 0) {
    const parts = [
      stock > 0 ? `${stock.toLocaleString('en-IN')} units in stock` : '',
      open > 0 ? `${open} open ${open === 1 ? 'document' : 'documents'}` : '',
    ].filter(Boolean)
    return `${parts.join(' and ')} — set it to Inactive instead.`
  }
  if (site.pobStatus === 'principal' && all.length > 1) {
    return 'It’s the principal place of business on your GST registration — make another site principal first.'
  }
  const others = all.filter((w) => w.id !== site.id)
  if (site.status === 'active' && !others.some((w) => w.status === 'active')) {
    return 'There must always be one active location — make another one active first.'
  }
  if (others.length === 0) return 'The last location can’t be deleted.'
  return null
}

/** Sites offered in pickers: not inactive, plus any inactive site that still holds stock. */
export const selectableLocations = (all: readonly Warehouse[], usage?: Map<string, LocationUsage>): Warehouse[] =>
  all.filter((w) => w.status !== 'inactive' || (usage?.get(w.id)?.stock ?? 0) > 0)
