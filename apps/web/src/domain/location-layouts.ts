/**
 * Floors, areas and layouts of a site (Settings ▸ Locations & warehouses). Pure functions only.
 * See docs/locations-warehouses/README.md ("React app", Data model).
 *
 * A site has `floors[]`; every floor has one layout holding its zones ("areas") and the rack runs
 * ("aisles") seeded inside racked areas. The setup wizard places the areas it was given on the
 * ground floor with `placeAreas`; the future Structure Designer reads and edits the same shape.
 * Distances are feet with the origin top-left, as in the prototype.
 */
import type { Floor, LayoutAisle, LayoutZone, LocationLayout, Warehouse } from '@/data/schemas'

// ── Area-type catalogue ─────────────────────────────────────────────────────

export type AreaStorage = 'racked' | 'floor' | 'none'

export interface AreaType {
  id: string
  name: string
  desc: string
  /** CSS colour (oklch) the area is drawn in. */
  color: string
  /** Default footprint, feet. */
  w: number
  h: number
  /** `racked` areas get shelving seeded; `floor` areas are open floor; `none` holds no stock. */
  storage: AreaStorage
}

/** The 12 building blocks of a Kanalora site (fixed, not user-editable). */
export const AREA_TYPES: readonly AreaType[] = [
  { id: 'receiving', name: 'Receiving', desc: 'Inbound vendor deliveries', color: 'oklch(0.78 0.11 245)', w: 30, h: 15, storage: 'floor' },
  { id: 'bulk', name: 'Bulk storage', desc: 'Cartons & pallet stock', color: 'oklch(0.74 0.13 58)', w: 34, h: 26, storage: 'racked' },
  { id: 'pick', name: 'Pick area', desc: 'Fast-moving pick face', color: 'oklch(0.78 0.14 300)', w: 34, h: 22, storage: 'racked' },
  { id: 'fragile', name: 'Fragile ceramic', desc: 'Padded shelves · lids & bases', color: 'oklch(0.84 0.12 95)', w: 30, h: 24, storage: 'racked' },
  { id: 'qc', name: 'QC & inspection', desc: 'Check, sort & hold', color: 'oklch(0.82 0.12 205)', w: 24, h: 15, storage: 'floor' },
  { id: 'components', name: 'Component bins', desc: 'Cones, cards & cartons', color: 'oklch(0.80 0.13 150)', w: 30, h: 24, storage: 'racked' },
  { id: 'assembly', name: 'Assembly', desc: 'Twist-lock fit, QC & kitting', color: 'oklch(0.80 0.13 345)', w: 24, h: 24, storage: 'floor' },
  { id: 'finished', name: 'Finished goods', desc: 'Packed & ready to ship', color: 'oklch(0.82 0.12 178)', w: 30, h: 22, storage: 'racked' },
  { id: 'shipping', name: 'Shipping', desc: 'Outbound staging & load', color: 'oklch(0.80 0.14 38)', w: 30, h: 15, storage: 'floor' },
  { id: 'staging', name: 'Staging', desc: 'Marshalling & wrap', color: 'oklch(0.74 0.035 250)', w: 24, h: 16, storage: 'floor' },
  { id: 'returns', name: 'Returns', desc: 'Breakage claims & re-check', color: 'oklch(0.72 0.17 22)', w: 18, h: 16, storage: 'floor' },
  { id: 'office', name: 'Office', desc: 'Admin & billing desk', color: 'oklch(0.71 0.02 280)', w: 16, h: 14, storage: 'none' },
]

/** What the prototype falls back to for a zone whose type isn't in the catalogue. */
const FALLBACK_AREA: AreaType = {
  id: 'storage',
  name: 'Storage',
  desc: 'General storage',
  color: 'var(--primary)',
  w: 60,
  h: 50,
  storage: 'racked',
}

export const areaTypeById = (id: string): AreaType => AREA_TYPES.find((t) => t.id === id) ?? FALLBACK_AREA

/** An area type and how many of it to place. */
export interface AreaPick {
  id: string
  count: number
}

/** Most areas of one type the wizard offers. */
export const AREA_COUNT_MAX = 6

export const totalAreas = (picks: readonly AreaPick[]): number => picks.reduce((n, p) => n + p.count, 0)

export const areaCountLabel = (n: number): string => `${n} ${n === 1 ? 'area' : 'areas'}`

/** Toggle an area type in the pick list (added with a count of 1, or removed). */
export function toggleAreaPick(picks: readonly AreaPick[], id: string): AreaPick[] {
  return picks.some((p) => p.id === id) ? picks.filter((p) => p.id !== id) : [...picks, { id, count: 1 }]
}

/** Change a picked type's count by `delta`, kept between 1 and `AREA_COUNT_MAX`. */
export function stepAreaPick(picks: readonly AreaPick[], id: string, delta: number): AreaPick[] {
  return picks.map((p) => (p.id === id ? { ...p, count: Math.max(1, Math.min(AREA_COUNT_MAX, p.count + delta)) } : p))
}

// ── Placement ───────────────────────────────────────────────────────────────

/** Gaps used when laying areas out (feet). */
const PAD = 8
const GAP = 8
/** Width of a placed floor, and its height until a row runs past it. */
export const PLACED_FLOOR_W = 224
export const PLACED_FLOOR_H = 152
/** Size of a floor that has no areas yet. */
export const EMPTY_FLOOR_W = 80
export const EMPTY_FLOOR_H = 56
/** Length of one rack bay, feet (the prototype's `BAY_FT`). */
const BAY_FT = 4

const pad2 = (n: number): string => String(n).padStart(2, '0')

/** Three letters of the area's name, numbered when taken: `FRA`, `FRA2`, `FRA3`. */
export function areaCode(used: ReadonlySet<string>, name: string): string {
  const base = (name.replace(/[^A-Za-z]/g, '').slice(0, 3) || 'ARE').toUpperCase()
  let code = base
  for (let i = 1; used.has(code); ) code = `${base}${++i}`
  return code
}

/**
 * Shelving seeded inside a racked area: two runs when it is wide enough (28 ft), else one.
 * `zoneIndex` is the area's position in the layout and keeps the codes and ids unique.
 */
export function seedRows(zone: LayoutZone, type: AreaType, zoneIndex: number): LayoutAisle[] {
  if (type.storage !== 'racked') return []
  const runs = zone.w >= 28 ? 2 : 1
  const out: LayoutAisle[] = []
  for (let i = 0; i < runs; i++) {
    out.push({
      id: `a-${zoneIndex}-${i}`,
      zoneId: zone.id,
      code: `${(type.name[0] ?? 'A').toUpperCase()}${pad2(zoneIndex + 1)}${i + 1}`,
      dir: 'v',
      x: zone.x + 8 + i * 14,
      y: zone.y + 4,
      bays: Math.max(4, Math.min(10, Math.round((zone.h - 8) / BAY_FT))),
      levels: type.id === 'fragile' ? 3 : 4,
      binsPerBay: type.id === 'components' ? 3 : type.id === 'fragile' ? 1 : 2,
      sides: 2,
      aisleWidth: 6,
    })
  }
  return out
}

/** What `placeAreas` puts on a floor. */
export interface PlacedAreas {
  floorW: number
  floorH: number
  zones: LayoutZone[]
  aisles: LayoutAisle[]
}

/**
 * Lay the picked areas out left to right, wrapping to a new row when one would pass the floor's edge
 * (prototype `seedAreas`). The floor grows taller when a row runs off the bottom. Racked areas get
 * their shelving. Deterministic: the same picks always give the same ids and positions.
 */
export function placeAreas(picks: readonly AreaPick[]): PlacedAreas {
  const placed: PlacedAreas = { floorW: PLACED_FLOOR_W, floorH: PLACED_FLOOR_H, zones: [], aisles: [] }
  const flat: string[] = []
  for (const p of picks) for (let i = 0; i < p.count; i++) flat.push(p.id)
  const used = new Set<string>()
  let x = PAD
  let y = PAD
  let rowH = 0
  flat.forEach((typeId, idx) => {
    const t = areaTypeById(typeId)
    if (x + t.w > placed.floorW - PAD) {
      x = PAD
      y += rowH + GAP
      rowH = 0
    }
    if (y + t.h > placed.floorH - PAD) placed.floorH = y + t.h + PAD
    const code = areaCode(used, t.name)
    used.add(code)
    const zone: LayoutZone = {
      id: `z-${idx}-${t.id}`,
      code,
      name: t.name,
      type: t.id,
      color: t.color,
      status: 'available',
      x,
      y,
      w: t.w,
      h: t.h,
    }
    placed.zones.push(zone)
    placed.aisles.push(...seedRows(zone, t, idx))
    x += t.w + GAP
    rowH = Math.max(rowH, t.h)
  })
  return placed
}

// ── Layout records ──────────────────────────────────────────────────────────

export const layoutId = (siteId: string, floorId: string): string => `${siteId}::${floorId}`

export function emptyLayout(siteId: string, floorId: string): LocationLayout {
  return {
    id: layoutId(siteId, floorId),
    warehouseId: siteId,
    floorId,
    floorW: EMPTY_FLOOR_W,
    floorH: EMPTY_FLOOR_H,
    zones: [],
    aisles: [],
    bins: {},
  }
}

/**
 * The layouts of a new site: the picked areas on the first (ground) floor, every other floor empty
 * (prototype `commitWizard`).
 */
export function buildLayouts(siteId: string, floors: readonly Floor[], picks: readonly AreaPick[]): LocationLayout[] {
  return floors.map((floor, i) => {
    if (i > 0 || picks.length === 0) return emptyLayout(siteId, floor.id)
    const placed = placeAreas(picks)
    return {
      id: layoutId(siteId, floor.id),
      warehouseId: siteId,
      floorId: floor.id,
      floorW: placed.floorW,
      floorH: placed.floorH,
      zones: placed.zones,
      aisles: placed.aisles,
      bins: {},
    }
  })
}

/** Areas per floor id for one site. */
export function floorAreaCounts(layouts: readonly LocationLayout[], siteId: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const l of layouts) if (l.warehouseId === siteId) out[l.floorId] = l.zones.length
  return out
}

/** Areas on all floors of one site. */
export const siteAreaCount = (layouts: readonly LocationLayout[], siteId: string): number =>
  Object.values(floorAreaCounts(layouts, siteId)).reduce((n, c) => n + c, 0)

// ── Floors ──────────────────────────────────────────────────────────────────

export const DEFAULT_FLOOR: Floor = { id: 'l1', name: 'Ground floor', code: 'L1', level: 1 }

export const FLOOR_CODE_MAX = 4

export const FLOOR_CODE_ERROR = 'Each floor needs a unique code (e.g. L1, L2, MZ).'

/** A site's floors, ground first. A site without any reads as one ground floor. */
export function floorsOf(site: Pick<Warehouse, 'floors'>): Floor[] {
  const list = site.floors?.length ? site.floors : [DEFAULT_FLOOR]
  return [...list].sort((a, b) => a.level - b.level)
}

export const normalizeFloorCode = (code: string): string => code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, FLOOR_CODE_MAX)

const freeFloorId = (floors: readonly Floor[]): string => {
  const taken = new Set(floors.map((f) => f.id))
  let n = floors.length + 1
  while (taken.has(`f${n}`)) n++
  return `f${n}`
}

/**
 * Clean the floors for saving: levels follow the order (ground = 1), a blank name becomes `Level n`,
 * a blank code `L<n>`, codes are upper-case letters and digits. Keeps each floor's id.
 */
export function normalizeFloors(floors: readonly Floor[] | undefined): Floor[] {
  const list = floors?.length ? floors : [DEFAULT_FLOOR]
  const out: Floor[] = []
  list.forEach((f, i) => {
    out.push({
      id: f.id || freeFloorId(out),
      name: f.name.trim() || `Level ${i + 1}`,
      code: normalizeFloorCode(f.code) || `L${i + 1}`,
      level: i + 1,
    })
  })
  return out
}

/** The error to show when two floors share a code (after cleaning), else null. */
export function validateFloors(floors: readonly Floor[] | undefined): string | null {
  const codes = normalizeFloors(floors).map((f) => f.code)
  return new Set(codes).size === codes.length ? null : FLOOR_CODE_ERROR
}

/** A floor to add after the last one: `Level n`, code `L<n>`, the next level up. */
export function newFloor(floors: readonly Floor[]): Floor {
  const level = floors.reduce((m, f) => Math.max(m, f.level), 0) + 1
  const codes = new Set(floors.map((f) => normalizeFloorCode(f.code)))
  let n = floors.length + 1
  while (codes.has(`L${n}`)) n++
  return { id: freeFloorId(floors), name: `Level ${floors.length + 1}`, code: `L${n}`, level }
}

/** Switch a draft between a single level and a building (prototype `setMulti`). Single keeps only the first floor. */
export function setMultiLevel(floors: readonly Floor[], multi: boolean): Floor[] {
  const first = floors[0] ?? DEFAULT_FLOOR
  if (!multi) return [first]
  if (floors.length >= 2) return [...floors]
  return [first, { id: freeFloorId([first]), name: 'Level 2', code: 'L2', level: 2 }]
}

/** Why a floor can't be removed, or null. Areas on it have to be removed first. */
export function floorRemoveBlockReason(floor: Pick<Floor, 'name'>, areaCount: number): string | null {
  if (areaCount <= 0) return null
  return `${floor.name} has ${areaCount} ${areaCount === 1 ? 'area' : 'areas'} — remove ${areaCount === 1 ? 'it' : 'them'} first.`
}

/** The floors dropped by a save that still have areas (so the save is refused). */
export function floorsRemovedWithAreas(
  before: readonly Floor[],
  after: readonly Floor[],
  counts: Readonly<Record<string, number>>,
): Floor[] {
  const keep = new Set(after.map((f) => f.id))
  return before.filter((f) => !keep.has(f.id) && (counts[f.id] ?? 0) > 0)
}

/** One-line description of the building, e.g. `Single floor` or `3 floors`. */
export const floorWord = (floors: readonly Floor[]): string => (floors.length > 1 ? `${floors.length} floors` : 'Single floor')

// ── Quick starts and codes ──────────────────────────────────────────────────

/** Short code from a name: initials of two or more words (max 4), else the first word's first 4 letters; `WH` when empty. */
export function suggestLocationCode(name: string): string {
  const words = name
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .split(/\s+/)
    .filter(Boolean)
  const code = words.length >= 2 ? words.map((w) => w[0]).join('').slice(0, 4) : (words[0] ?? 'WH').slice(0, 4)
  return code || 'WH'
}

export interface AreaTemplate {
  id: string
  name: string
  desc: string
  /** Site type the template sets. */
  type: string
  multi: boolean
  areas: AreaPick[]
}

/** The wizard's quick starts (prototype `applyTemplate`). */
export const AREA_TEMPLATES: readonly AreaTemplate[] = [
  {
    id: 'stockroom',
    name: 'Small stockroom',
    desc: '4 areas · single floor',
    type: 'retail',
    multi: false,
    areas: [
      { id: 'receiving', count: 1 },
      { id: 'components', count: 1 },
      { id: 'finished', count: 1 },
      { id: 'shipping', count: 1 },
    ],
  },
  {
    id: 'dc',
    name: 'Single-floor DC',
    desc: '5 areas · single floor',
    type: 'dc',
    multi: false,
    areas: [
      { id: 'receiving', count: 1 },
      { id: 'bulk', count: 2 },
      { id: 'pick', count: 1 },
      { id: 'shipping', count: 1 },
    ],
  },
  {
    id: 'building',
    name: 'Multi-floor building',
    desc: '6 areas · 2 floors',
    type: 'mixed',
    multi: true,
    areas: [
      { id: 'receiving', count: 1 },
      { id: 'qc', count: 1 },
      { id: 'assembly', count: 1 },
      { id: 'fragile', count: 1 },
      { id: 'finished', count: 1 },
      { id: 'office', count: 1 },
    ],
  },
]

/** What applying a quick start changes on a wizard draft: the site type, the floors and the areas. */
export function applyAreaTemplate(
  templateId: string,
  floors: readonly Floor[],
): { type: string; floors: Floor[]; areas: AreaPick[] } | null {
  const t = AREA_TEMPLATES.find((x) => x.id === templateId)
  if (!t) return null
  return { type: t.type, floors: setMultiLevel(floors, t.multi), areas: t.areas.map((a) => ({ ...a })) }
}
