import type { AoStatus, AssemblyOrder, Bom, BomKind, BomStatus, Item, Warehouse } from '@/data/schemas'
import { EM_DASH, int } from '@/lib/format'

const BOM_STATUS_LABELS: Record<BomStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  archived: 'Archived',
}

const BOM_KIND_LABELS: Record<BomKind, string> = {
  assembly: 'Assembly',
  production: 'Production',
}

const AO_STATUS_LABELS: Record<AoStatus, string> = {
  planned: 'Planned',
  draft: 'Draft',
  released: 'Released',
  inProgress: 'In progress',
  finished: 'Finished',
  cancelled: 'Cancelled',
}

const MAX_ROLLUP_DEPTH = 6

export interface BomRollup {
  materials: number
  labour: number
  overhead: number
  unit: number
}

export interface ComponentShortage {
  item: string
  desc: string
  uom: string
  required: number
  available: number
  short: number
}

export function bomStatusLabel(status: BomStatus | string): string {
  return BOM_STATUS_LABELS[status as BomStatus] ?? status
}

export function bomKindLabel(kind: BomKind | string | undefined): string {
  return BOM_KIND_LABELS[kind as BomKind] ?? 'Assembly'
}

export function aoStatusLabel(status: AoStatus | string): string {
  return AO_STATUS_LABELS[status as AoStatus] ?? status
}

export function aoOpen(status: AoStatus | string): boolean {
  return status === 'planned' || status === 'draft' || status === 'released' || status === 'inProgress'
}

/** Principal active warehouse id (where committed sales stock is netted). */
export function mainLocationId(warehouses: readonly Warehouse[]): string {
  return (
    warehouses.find((w) => w.pobStatus === 'principal' && w.status !== 'inactive') ??
    warehouses.find((w) => w.status === 'active') ??
    warehouses[0]
  )?.id ?? 'WH-TVM'
}

/** Short display label for a warehouse/location id (strips the prefix before an em-dash). */
export function aoSiteName(locationId: string, warehouses: readonly Warehouse[]): string {
  const warehouse = warehouses.find((w) => w.id === locationId)
  if (warehouse) return warehouse.name.replace(/^[^—]+—\s*/, '')
  return locationId || EM_DASH
}

/** Required component quantity for building `qty` parent units on a BOM line, rounded to 3 decimals. */
export function bomReqQty(
  line: { qtyPer: number; scrapPct?: number },
  qty: number,
  outputQty = 1,
): number {
  const per = Number(line.qtyPer) || 0
  const scrap = Number(line.scrapPct) || 0
  const out = outputQty || 1
  return Math.round(((per * (1 + scrap / 100) * (qty || 0)) / out) * 1000) / 1000
}

/** Resolve the active BOM version for `parentItem` on `date` (`YYYY-MM-DD`). */
export function activeBomFor(boms: readonly Bom[], parentItem: string, date: string): Bom | undefined {
  return boms.find(
    (b) =>
      b.parentItem === parentItem &&
      b.status === 'active' &&
      (!b.effectiveFrom || b.effectiveFrom <= date) &&
      (!b.effectiveTo || b.effectiveTo >= date),
  )
}

/** Unit cost of `itemNo`, recursing through active sub-assembly BOMs up to `MAX_ROLLUP_DEPTH`. */
export function bomUnitCostOf(
  itemNo: string,
  boms: readonly Bom[],
  items: readonly Item[],
  date: string,
  depth = 0,
): number {
  if (depth < MAX_ROLLUP_DEPTH) {
    const subBom = activeBomFor(boms, itemNo, date)
    if (subBom) return bomRollup(subBom, boms, items, date, depth + 1).unit
  }
  return items.find((i) => i.no === itemNo)?.cost ?? 0
}

/** Compute materials, labour, overhead, and per-unit rolled-up cost for a BOM. */
export function bomRollup(
  bom: Bom,
  boms: readonly Bom[],
  items: readonly Item[],
  date: string,
  depth = 0,
): BomRollup {
  let materials = 0
  for (const line of bom.lines) {
    const unitCost = bomUnitCostOf(line.item, boms, items, date, depth)
    const scrapFactor = 1 + (Number(line.scrapPct) || 0) / 100
    materials += unitCost * (Number(line.qtyPer) || 0) * scrapFactor
  }
  const labour = Number(bom.labourCost) || 0
  const overhead = (materials + labour) * ((Number(bom.overheadPct) || 0) / 100)
  const unit = (materials + labour + overhead) / (bom.outputQty || 1)
  return { materials, labour, overhead, unit }
}

/** Net available stock at `locKey` (subtracts `qtySO` on the principal location). */
export function availAt(
  itemNo: string,
  locKey: string,
  items: readonly Item[],
  mainLocId = 'WH-TVM',
): number {
  const item = items.find((i) => i.no === itemNo)
  if (!item) return 0
  const onHand = item.locs[locKey] ?? 0
  const committed = locKey === mainLocId ? item.qtySO || 0 : 0
  return Math.max(0, onHand - committed)
}

/** Whole units of the BOM's parent item buildable from current stock at `locKey`. */
export function bomBuildable(
  bom: Pick<Bom, 'lines' | 'outputQty'>,
  items: readonly Item[],
  locKey = 'WH-TVM',
  mainLocId = 'WH-TVM',
): number {
  if (!bom.lines.length) return 0
  let min = Infinity
  for (const line of bom.lines) {
    const perUnit = bomReqQty(line, 1, bom.outputQty)
    if (perUnit <= 0) continue
    const available = availAt(line.item, locKey, items, mainLocId)
    min = Math.min(min, Math.floor(available / perUnit))
  }
  return min === Infinity ? 0 : min
}

/** Component lines short of required stock at `locKey`. */
export function bomShortages(
  lines: ReadonlyArray<{
    item: string
    desc: string
    uom: string
    qtyPer?: number
    scrapPct?: number
    qtyRequired?: number
  }>,
  qty: number,
  items: readonly Item[],
  locKey = 'WH-TVM',
  outputQty = 1,
  mainLocId = 'WH-TVM',
): ComponentShortage[] {
  const out: ComponentShortage[] = []
  for (const line of lines) {
    const required =
      line.qtyRequired != null
        ? line.qtyRequired
        : bomReqQty({ qtyPer: line.qtyPer ?? 0, scrapPct: line.scrapPct ?? 0 }, qty, outputQty)
    const available = availAt(line.item, locKey, items, mainLocId)
    const short = Math.max(0, Math.round((required - available) * 1000) / 1000)
    if (short > 0) {
      out.push({
        item: line.item,
        desc: line.desc,
        uom: line.uom,
        required,
        available,
        short,
      })
    }
  }
  return out
}

export function aoShortages(
  order: Pick<AssemblyOrder, 'lines' | 'qty' | 'location'>,
  items: readonly Item[],
  mainLocId = 'WH-TVM',
): ComponentShortage[] {
  return bomShortages(order.lines, order.qty, items, order.location, 1, mainLocId)
}

export function aoShortageSummary(shortages: readonly ComponentShortage[]): string | null {
  if (shortages.length === 0) return null
  const first = shortages[0]
  return `Short ${int(first.short)} × ${first.desc}${shortages.length > 1 ? ` and ${shortages.length - 1} more` : ''}`
}

/** Whole units of the assembly order's parent item buildable from stock at its output location. */
export function aoBuildable(
  order: Pick<AssemblyOrder, 'lines' | 'qty' | 'location'>,
  items: readonly Item[],
  mainLocId = 'WH-TVM',
): number {
  if (!order.lines.length) return 0
  let min = Infinity
  for (const line of order.lines) {
    const perUnit = (Number(line.qtyRequired) || 0) / (order.qty || 1)
    if (perUnit <= 0) continue
    const available = availAt(line.item, order.location, items, mainLocId)
    min = Math.min(min, Math.floor(available / perUnit))
  }
  return min === Infinity ? 0 : min
}

/** Only draft or archived BOMs unused by any assembly order may be deleted. */
export function bomDeleteBlockedReason(
  bom: Pick<Bom, 'no' | 'status'>,
  orders: ReadonlyArray<Pick<AssemblyOrder, 'no' | 'bomId'>>,
): string | null {
  if (bom.status === 'active') return 'Active BOMs cannot be deleted — archive it first.'
  const usedBy = orders.filter((ao) => ao.bomId === bom.no)
  if (usedBy.length > 0) {
    return `Used by assembly ${usedBy.length === 1 ? `order ${usedBy[0].no}` : `${usedBy.length} orders`}.`
  }
  return null
}

/** Assembly orders can only be deleted in their opening (draft / planned) status. */
export function aoDeleteBlockedReason(order: Pick<AssemblyOrder, 'status'>): string | null {
  if (order.status === 'planned' || order.status === 'draft') return null
  return 'Only draft or planned assembly orders can be deleted.'
}
