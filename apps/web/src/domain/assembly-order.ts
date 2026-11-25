/**
 * Assembly order domain rules: numbering, BOM explosion, quantity rescaling,
 * status transitions, and atomic Finish (component consumption + output posting).
 *
 * Reuses shared BOM / availability helpers from `./production` without modifying it.
 */
import type { AssemblyOrder, AssemblyOrderLine, Bom, Item, Warehouse } from '@/data/schemas'
import { int } from '@/lib/format'
import { nextNo } from './numbering'
import {
  type ComponentShortage,
  activeBomFor,
  aoShortages,
  aoSiteName,
  availAt,
  bomReqQty,
  mainLocationId,
} from './production'

export interface ProductionSettings {
  outputLoc: string
  wipLoc: string
  manualConsumption: boolean
  allowShortRelease: boolean
  defaultScrap: number
  allowOverConsume: boolean
}

export const DEFAULT_PRODUCTION_SETTINGS: ProductionSettings = {
  outputLoc: 'WH-TVM',
  wipLoc: 'WH-ASSY',
  manualConsumption: false,
  allowShortRelease: true,
  defaultScrap: 0,
  allowOverConsume: true,
}

export interface FinishOrderInput {
  no: string
  qtyFinished: number
  /** Optional per-component consumption override keyed by component item no (when manualConsumption is enabled). */
  consumed?: Record<string, number>
}

export interface FinishLinePreview {
  lineNo: number
  item: string
  desc: string
  uom: string
  planned: number
  consumed: number
  available: number
  short: number
}

export type FinishResult =
  | { ok: false; error: string }
  | { ok: true; order: AssemblyOrder; updatedItems: Item[]; completed: boolean }

function round3(n: number): number {
  return Math.round(n * 1000) / 1000
}

function addDaysIso(isoDate: string, days: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate
  const d = new Date(isoDate + 'T00:00:00Z')
  if (Number.isNaN(d.getTime())) return isoDate
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function aoNextNo(orders: readonly Pick<AssemblyOrder, 'no'>[]): string {
  return nextNo(
    'AO',
    orders.map((o) => o.no),
  )
}

export function newAssemblyOrder(
  orders: readonly Pick<AssemblyOrder, 'no'>[],
  today: string,
  opts?: { defaultLoc?: string; createdAt?: string },
): AssemblyOrder {
  return {
    no: aoNextNo(orders),
    item: '',
    desc: '',
    uom: 'EA',
    bomId: '',
    bomVersion: '',
    qty: 1,
    qtyFinished: 0,
    location: opts?.defaultLoc || DEFAULT_PRODUCTION_SETTINGS.outputLoc,
    dueDate: addDaysIso(today, 7),
    orderDate: today,
    status: 'draft',
    assignee: null,
    lines: [],
    sourceSalesLine: null,
    notes: '',
    createdAt: opts?.createdAt ?? new Date().toISOString(),
  }
}

/** Whether item selection and order quantity are still editable. */
export function aoEditable(order: Pick<AssemblyOrder, 'status'>): boolean {
  return order.status === 'planned' || order.status === 'draft'
}

/** Whether header scheduling fields and Save are locked. */
export function aoReadOnly(order: Pick<AssemblyOrder, 'status'>): boolean {
  return order.status === 'finished' || order.status === 'cancelled'
}

export function aoRemainingQty(order: Pick<AssemblyOrder, 'qty' | 'qtyFinished'>): number {
  return Math.max(0, round3((order.qty || 0) - (order.qtyFinished || 0)))
}

export function aoProgressPct(order: Pick<AssemblyOrder, 'qty' | 'qtyFinished'>): number {
  if (!(order.qty > 0)) return 0
  return Math.min(100, Math.round(((order.qtyFinished || 0) / order.qty) * 100))
}

/** Snapshot components from `bom` onto `order` for `order.qty`. */
export function aoExplode(order: AssemblyOrder, bom: Bom | undefined): AssemblyOrder {
  if (!bom) {
    return { ...order, bomId: '', bomVersion: '', lines: [] }
  }
  const lines: AssemblyOrderLine[] = bom.lines.map((line, index) => ({
    lineNo: line.lineNo || index + 1,
    item: line.item,
    desc: line.desc,
    uom: line.uom,
    scrapPct: Number(line.scrapPct) || 0,
    qtyRequired: bomReqQty(line, order.qty, bom.outputQty || 1),
    qtyConsumed: 0,
    note: line.note || '',
  }))
  return {
    ...order,
    bomId: bom.no,
    bomVersion: bom.version,
    lines,
  }
}

/** Choose an output item on a draft order and explode its active BOM on `date`. */
export function aoApplyItem(
  order: AssemblyOrder,
  item: Pick<Item, 'no' | 'desc' | 'uom'>,
  boms: readonly Bom[],
  date: string,
): AssemblyOrder {
  const bom = activeBomFor(boms, item.no, date || order.orderDate)
  return aoExplode(
    {
      ...order,
      item: item.no,
      desc: item.desc,
      uom: item.uom || 'EA',
    },
    bom,
  )
}

/** Update order quantity and rescale required component quantities. */
export function aoSetQuantity(order: AssemblyOrder, nextQty: number, bom?: Bom): AssemblyOrder {
  const qty = Number.isFinite(nextQty) ? Math.max(0, nextQty) : 0
  const prevQty = order.qty || 0
  const lines = order.lines.map((line) => {
    if (bom && bom.no === order.bomId) {
      const bomLine =
        bom.lines.find((bl) => bl.lineNo === line.lineNo && bl.item === line.item) ??
        bom.lines.find((bl) => bl.item === line.item)
      if (bomLine) {
        return { ...line, qtyRequired: bomReqQty(bomLine, qty, bom.outputQty || 1) }
      }
    }
    const scaled = prevQty > 0 ? round3(((Number(line.qtyRequired) || 0) / prevQty) * qty) : line.qtyRequired
    return { ...line, qtyRequired: scaled }
  })
  return { ...order, qty, lines }
}

/** Why saving header/draft edits is invalid, or null when allowed. */
export function aoSaveError(order: Pick<AssemblyOrder, 'status' | 'item' | 'qty'>): string | null {
  if (aoReadOnly(order)) return 'Closed assembly orders cannot be edited.'
  if (!order.item) return 'Choose the item to assemble.'
  if (!(order.qty > 0)) return 'Quantity must be greater than zero.'
  return null
}

/** Why releasing this order is blocked, or null when allowed. */
export function aoReleaseError(
  order: AssemblyOrder,
  items: readonly Item[],
  mainLocId = 'WH-TVM',
  cfg: Pick<ProductionSettings, 'allowShortRelease'> = DEFAULT_PRODUCTION_SETTINGS,
): string | null {
  if (order.status !== 'draft' && order.status !== 'planned') {
    return 'Only draft orders can be released.'
  }
  if (!order.item || !order.bomId) {
    return 'This item has no active bill of materials — create one first.'
  }
  if (!(order.qty > 0)) {
    return 'Quantity must be greater than zero.'
  }
  const shortages = aoShortages(order, items, mainLocId)
  if (shortages.length > 0 && !cfg.allowShortRelease) {
    const first = shortages[0]
    return `Short ${int(first.short)} × ${first.item}. Releasing with shortages is switched off in Settings.`
  }
  return null
}

export function aoReleaseOrder(
  order: AssemblyOrder,
  items: readonly Item[],
  mainLocId = 'WH-TVM',
  cfg: Pick<ProductionSettings, 'allowShortRelease'> = DEFAULT_PRODUCTION_SETTINGS,
): { ok: false; error: string } | { ok: true; order: AssemblyOrder; shortages: ComponentShortage[] } {
  const error = aoReleaseError(order, items, mainLocId, cfg)
  if (error) return { ok: false, error }
  return {
    ok: true,
    order: { ...order, status: 'released' },
    shortages: aoShortages(order, items, mainLocId),
  }
}

export function aoStartOrder(
  order: AssemblyOrder,
): { ok: false; error: string } | { ok: true; order: AssemblyOrder } {
  if (order.status !== 'released') {
    return { ok: false, error: 'Only released orders can be started.' }
  }
  return { ok: true, order: { ...order, status: 'inProgress' } }
}

export function aoCancelOrder(
  order: AssemblyOrder,
): { ok: false; error: string } | { ok: true; order: AssemblyOrder } {
  if (aoReadOnly(order)) {
    return { ok: false, error: 'This assembly order is already closed.' }
  }
  return { ok: true, order: { ...order, status: 'cancelled' } }
}

export function aoReopenOrder(
  order: AssemblyOrder,
  isAdmin: boolean,
): { ok: false; error: string } | { ok: true; order: AssemblyOrder } {
  if (order.status !== 'finished') {
    return { ok: false, error: 'Only finished orders can be reopened.' }
  }
  if (!isAdmin) {
    return { ok: false, error: 'Only admins can reopen finished orders.' }
  }
  return { ok: true, order: { ...order, status: 'inProgress' } }
}

/** Planned component consumption for finishing `qtyNow` units on `order`. */
export function aoPlannedConsumptionForQty(
  order: Pick<AssemblyOrder, 'qty' | 'lines' | 'location'>,
  qtyNow: number,
  items: readonly Item[],
  mainLocId = 'WH-TVM',
  consumedOverrides?: Record<string, number>,
): FinishLinePreview[] {
  const siteId = order.location || mainLocId
  const orderQty = order.qty || 1
  const q = Number.isFinite(qtyNow) && qtyNow > 0 ? qtyNow : 0
  return order.lines.map((line) => {
    const planned = round3(((Number(line.qtyRequired) || 0) * q) / orderQty)
    const rawOverride = consumedOverrides?.[line.item]
    const consumed = rawOverride !== undefined ? round3(rawOverride) : planned
    const available = availAt(line.item, siteId, items, mainLocId)
    const short = consumed > available ? round3(consumed - available) : 0
    return {
      lineNo: line.lineNo,
      item: line.item,
      desc: line.desc,
      uom: line.uom,
      planned,
      consumed,
      available,
      short,
    }
  })
}

/** Pure Finish calculation: validates inputs, over-consume guard, and available stock (all-or-nothing). */
export function aoFinish(params: {
  order: AssemblyOrder
  qtyFinished: number
  consumed?: Record<string, number>
  items: readonly Item[]
  warehouses?: readonly Warehouse[]
  mainLocId?: string
  cfg?: Pick<ProductionSettings, 'manualConsumption' | 'allowOverConsume'>
}): FinishResult {
  const { order, qtyFinished, consumed, items, warehouses = [], cfg = DEFAULT_PRODUCTION_SETTINGS } = params
  const resolvedMain = params.mainLocId ?? mainLocationId(warehouses)
  const siteId = order.location || resolvedMain
  const siteName = warehouses.length ? aoSiteName(siteId, warehouses) : siteId

  if (order.status !== 'inProgress') {
    return { ok: false, error: 'Start the assembly order before finishing.' }
  }
  if (!order.item) {
    return { ok: false, error: 'This assembly order has no output item.' }
  }
  if (!Number.isFinite(qtyFinished) || qtyFinished <= 0) {
    return { ok: false, error: 'Enter how many were finished.' }
  }

  const remaining = aoRemainingQty(order)
  if (qtyFinished > remaining + 0.0001) {
    return {
      ok: false,
      error: `Only ${int(remaining)} ${order.uom || ''} remaining on ${order.no}.`.trim(),
    }
  }

  // Per-component overrides only count when manual consumption is switched on.
  const overrides = cfg.manualConsumption ? consumed : undefined
  const previews = aoPlannedConsumptionForQty(order, qtyFinished, items, resolvedMain, overrides)

  for (const p of previews) {
    if (!Number.isFinite(p.consumed) || p.consumed < 0) {
      return { ok: false, error: 'Consumed quantity cannot be negative.' }
    }
    if (!cfg.allowOverConsume && p.consumed > p.planned + 0.0001) {
      return { ok: false, error: 'Consuming more than planned is switched off in Settings.' }
    }
  }

  // Aggregate per item in case a future BOM repeats the same component item across lines.
  const consumeByItem = new Map<string, { desc: string; qty: number }>()
  for (const p of previews) {
    const prev = consumeByItem.get(p.item)
    consumeByItem.set(p.item, {
      desc: p.desc,
      qty: round3((prev?.qty ?? 0) + p.consumed),
    })
  }

  for (const [itemNo, { desc, qty }] of consumeByItem) {
    const available = availAt(itemNo, siteId, items, resolvedMain)
    if (qty > available + 0.0001) {
      const short = round3(qty - available)
      return {
        ok: false,
        error: `Short ${int(short)} × ${desc} (${itemNo}) at ${siteName} — receive or transfer stock before finishing.`,
      }
    }
  }

  const nextQtyFinished = Math.min(order.qty, round3((order.qtyFinished || 0) + qtyFinished))
  const completed = nextQtyFinished >= order.qty - 0.0001
  const nextLines: AssemblyOrderLine[] = order.lines.map((line, idx) => ({
    ...line,
    qtyConsumed: round3((line.qtyConsumed || 0) + (previews[idx]?.consumed ?? 0)),
  }))

  const nextOrder: AssemblyOrder = {
    ...order,
    qtyFinished: completed ? order.qty : nextQtyFinished,
    status: completed ? 'finished' : 'inProgress',
    lines: nextLines,
  }

  const updatedItems: Item[] = []
  for (const it of items) {
    const consumedQty = consumeByItem.get(it.no)?.qty ?? 0
    const outputAdd = it.no === order.item ? qtyFinished : 0
    const delta = round3(outputAdd - consumedQty)
    if (delta === 0) continue
    updatedItems.push({
      ...it,
      locs: {
        ...it.locs,
        [siteId]: Math.max(0, round3((it.locs[siteId] ?? 0) + delta)),
      },
    })
  }

  return { ok: true, order: nextOrder, updatedItems, completed }
}

// ── Settings ▸ Assembly & production ─────────────────────────────────────────

/** Error for the default scrap allowance (a percentage from 0 to 100), or null. */
export function defaultScrapError(value: number): string | null {
  return Number.isFinite(value) && value >= 0 && value <= 100 ? null : 'Enter a percentage from 0 to 100.'
}

/** Error for a location pick (output / work-in-progress), or null. */
export function productionLocationError(id: string, label: string): string | null {
  return id.trim() ? null : `Choose ${label}.`
}
