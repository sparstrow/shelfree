/**
 * Pure domain helpers for the Warehouse ▸ Item profile page: valuation,
 * site stock bars, purchasing history, BOM rollups / where-used, assembly
 * orders for the item, and per-item units of measure.
 * Reuses rules from `item.ts` and `production.ts`; no React or API calls.
 */
import type { AssemblyOrder, Bom, Item, PoStatus, PurchaseOrder, Vendor, Warehouse } from '@/data/schemas'
import {
  type ItemSiteStock,
  type ItemStockStatus,
  itemAvailable,
  itemCommitted,
  itemMargin,
  itemOnHand,
  itemSiteRows,
  itemStockStatus,
} from '@/domain/item'
import {
  activeBomFor,
  aoOpen,
  aoSiteName,
  aoStatusLabel,
  bomBuildable,
  bomReqQty,
  bomRollup,
  bomStatusLabel,
  bomUnitCostOf,
  mainLocationId,
} from '@/domain/production'
import { EM_DASH, money } from '@/lib/format'

export type ItemProfileStatus = 'Blocked' | ItemStockStatus

export interface ItemValuation {
  onHand: number
  committed: number
  available: number
  incoming: number
  unitCost: number
  unitPrice: number
  margin: number | null
  /** Inventory value at cost (`onHand * unitCost`). */
  stockValue: number
  /** Retail value at unit list price (`onHand * unitPrice`, 0 when unpriced). */
  retailValue: number
  reorderPoint: number
  reorderQty: number
  safetyStock: number
  reorderNeeded: boolean
  status: ItemProfileStatus
}

export interface ItemSiteStockBar extends ItemSiteStock {
  /** Bar fill width percentage (`0`–`100`) relative to the fullest site. */
  pct: number
}

export interface ItemTrackingCard {
  id: 'lot' | 'expiry' | 'serial'
  title: string
  emptyText: string
}

export interface ItemPurchaseOrderRow {
  no: string
  vendorNo: string
  vendorName: string
  status: PoStatus
  open: boolean
  qty: number
  unitCost: number
  orderDate: string
  expectedDate: string
}

export interface ItemBomComponentRow {
  item: string
  desc: string
  uom: string
  qtyPer: number
  scrapPct: number
  required: number
  unitCost: number
  lineCost: number
  isSubAssembly: boolean
}

export interface ItemBomVersionRow {
  no: string
  version: string
  status: Bom['status']
  statusLabel: string
  lineCount: number
  unitCost: number
  isActive: boolean
}

export interface ItemWhereUsedRow {
  bomNo: string
  parentItem: string
  parentDesc: string
  version: string
  statusLabel: string
  qtyPer: number
  uom: string
}

export interface ItemAssemblyOrderRow {
  no: string
  role: 'Builds item' | 'Uses item'
  item: string
  desc: string
  statusLabel: string
  open: boolean
  qty: number
  qtyFinished: number
  uom: string
  siteName: string
  dueDate: string
  orderDate: string
  lineQtyRequired?: number
}

export interface ItemBomSummary {
  versions: ItemBomVersionRow[]
  activeBom: Bom | null
  lines: ItemBomComponentRow[]
  rollup: ReturnType<typeof bomRollup> | null
  buildable: number
  costDeltaText: string | null
  whereUsed: ItemWhereUsedRow[]
  assemblyOrders: ItemAssemblyOrderRow[]
  openAssemblyOrders: ItemAssemblyOrderRow[]
}

export type UomCategory = 'qty' | 'mass' | 'vol' | 'len' | 'pack'

export interface UomDefinition {
  code: string
  name: string
  cat: UomCategory
  uqc: string
  /** Fixed conversion to any discrete base unit (e.g. DOZ → 12). */
  fixedFactor?: number
  custom?: boolean
}

export interface ItemUomState {
  list: string[]
  base: string
  qty: Record<string, number>
}

export type ItemUomRole = 'Base' | 'Master pack' | 'Pack unit'

export interface ItemUomRow {
  code: string
  name: string
  catName: string
  uqc: string
  base: string
  qtyInBase: number | null
  isBase: boolean
  isFixed: boolean
  role: ItemUomRole
}

export interface ItemUomSummary {
  base: string
  pack: string
  packLabel: string
  packSize: number | null
  rows: ItemUomRow[]
  availableToAdd: UomDefinition[]
}

const UOM_CATEGORY_LABELS: Readonly<Record<UomCategory, string>> = {
  qty: 'Quantity',
  mass: 'Weight',
  vol: 'Volume',
  len: 'Length',
  pack: 'Packaging',
}

export const SYSTEM_UOMS: readonly UomDefinition[] = [
  { code: 'NOS', name: 'Numbers', cat: 'qty', uqc: 'NOS' },
  { code: 'PCS', name: 'Pieces', cat: 'qty', uqc: 'PCS' },
  { code: 'PR', name: 'Pairs', cat: 'qty', uqc: 'PRS', fixedFactor: 2 },
  { code: 'DOZ', name: 'Dozen', cat: 'qty', uqc: 'DOZ', fixedFactor: 12 },
  { code: 'GRO', name: 'Gross', cat: 'qty', uqc: 'GYD', fixedFactor: 144 },
  { code: 'SET', name: 'Sets', cat: 'qty', uqc: 'SET' },
  { code: 'KGS', name: 'Kilograms', cat: 'mass', uqc: 'KGS' },
  { code: 'GMS', name: 'Grams', cat: 'mass', uqc: 'GMS' },
  { code: 'LTR', name: 'Litres', cat: 'vol', uqc: 'LTR' },
  { code: 'MLT', name: 'Millilitres', cat: 'vol', uqc: 'MLT' },
  { code: 'MTR', name: 'Metres', cat: 'len', uqc: 'MTR' },
  { code: 'CMS', name: 'Centimetres', cat: 'len', uqc: 'CMS' },
  { code: 'BOX', name: 'Box', cat: 'pack', uqc: 'BOX' },
  { code: 'CTN', name: 'Carton', cat: 'pack', uqc: 'CTN' },
  { code: 'PKT', name: 'Packet', cat: 'pack', uqc: 'PAC' },
  { code: 'BAG', name: 'Bag', cat: 'pack', uqc: 'BAG' },
  { code: 'BUN', name: 'Bundle', cat: 'pack', uqc: 'BUN' },
]

const METRIC_SCALES: Readonly<Record<string, { group: UomCategory; factor: number }>> = {
  KGS: { group: 'mass', factor: 1000 },
  GMS: { group: 'mass', factor: 1 },
  LTR: { group: 'vol', factor: 1000 },
  MLT: { group: 'vol', factor: 1 },
  MTR: { group: 'len', factor: 100 },
  CMS: { group: 'len', factor: 1 },
}

const BOM_STATUS_ORDER: Readonly<Record<Bom['status'], number>> = {
  active: 0,
  draft: 1,
  archived: 2,
}

/** Header status label for the Item profile (`Blocked` overrides stock status). */
export function itemProfileStatus(item: Pick<Item, 'blocked' | 'locs' | 'qtySO' | 'rp'>): ItemProfileStatus {
  return item.blocked ? 'Blocked' : itemStockStatus(item)
}

/** Stock quantities, margin, valuation and reorder state for one item. */
export function itemValuation(item: Item): ItemValuation {
  const onHand = itemOnHand(item)
  const committed = itemCommitted(item)
  const available = itemAvailable(item)
  const incoming = Number(item.qtySupply) || 0
  const unitCost = Number(item.cost) || 0
  const unitPrice = Number(item.price) || 0
  const margin = itemMargin(item)
  const reorderPoint = Number(item.rp) || 0
  return {
    onHand,
    committed,
    available,
    incoming,
    unitCost,
    unitPrice,
    margin,
    stockValue: Math.round(onHand * unitCost * 100) / 100,
    retailValue: unitPrice > 0 ? Math.round(onHand * unitPrice * 100) / 100 : 0,
    reorderPoint,
    reorderQty: Number(item.rq) || 0,
    safetyStock: Number(item.ss) || 0,
    reorderNeeded: available <= reorderPoint,
    status: itemProfileStatus(item),
  }
}

/** Per-site stock rows enriched with bar width percentages relative to the fullest site. */
export function itemSiteStockBars(
  item: Pick<Item, 'locs'>,
  warehouses: readonly Warehouse[],
): ItemSiteStockBar[] {
  const rows = itemSiteRows(item, warehouses)
  const max = Math.max(1, ...rows.map((r) => r.qty))
  return rows.map((r) => ({
    ...r,
    pct: Math.round((r.qty / max) * 100),
  }))
}

/** Empty-state cards shown on Stock & locations for enabled tracking axes on the item. */
export function itemTrackingCards(
  item: Pick<Item, 'tracksLot' | 'tracksExpiry' | 'tracksSerial'>,
): ItemTrackingCard[] {
  const cards: ItemTrackingCard[] = []
  if (item.tracksLot) {
    cards.push({
      id: 'lot',
      title: item.tracksExpiry ? 'Lots & expiry' : 'Lots',
      emptyText: item.tracksExpiry
        ? 'No lots recorded yet. Lot numbers and their expiry dates are captured when goods are received.'
        : 'No lots recorded yet. Lot numbers are captured when goods are received.',
    })
  } else if (item.tracksExpiry) {
    cards.push({
      id: 'expiry',
      title: 'Expiry',
      emptyText: 'No expiry dates recorded yet. They are captured when goods are received.',
    })
  }
  if (item.tracksSerial) {
    cards.push({
      id: 'serial',
      title: 'Serial numbers',
      emptyText: 'No serial numbers recorded yet. Serials are captured on receipt and assigned on shipment.',
    })
  }
  return cards
}

/** Whether a purchase order is still open (not yet received, closed or cancelled). */
export function isPoOpen(status: PoStatus | string): boolean {
  return status === 'Draft' || status === 'Issued' || status === 'Partially received'
}

/** Find a vendor record matching the item's preferred vendor display name. */
export function vendorByName(name: string, vendors: readonly Vendor[]): Vendor | undefined {
  const needle = name.trim().toLowerCase()
  if (!needle) return undefined
  return vendors.find((v) => v.name.trim().toLowerCase() === needle)
}

/** Purchase orders containing `itemNo`, sorted newest order date first. */
export function itemPurchaseOrders(
  itemNo: string,
  orders: readonly PurchaseOrder[],
  vendors: readonly Vendor[],
): ItemPurchaseOrderRow[] {
  const vendorNames = new Map(vendors.map((v) => [v.no, v.name]))
  return orders
    .filter((po) => po.lines.some((l) => l.item === itemNo))
    .map((po) => {
      const matching = po.lines.filter((l) => l.item === itemNo)
      const qty = matching.reduce((sum, l) => sum + (Number(l.qty) || 0), 0)
      const unitCost = Number(matching[0]?.unitCost) || 0
      return {
        no: po.no,
        vendorNo: po.vendor,
        vendorName: vendorNames.get(po.vendor) ?? (po.vendor || EM_DASH),
        status: po.status,
        open: isPoOpen(po.status),
        qty,
        unitCost,
        orderDate: po.orderDate,
        expectedDate: po.expectedDate,
      }
    })
    .sort((a, b) => String(b.orderDate).localeCompare(a.orderDate) || String(b.no).localeCompare(a.no))
}

/** Open purchase orders (`Draft`, `Issued`, `Partially received`) containing `itemNo`. */
export function itemOpenPurchaseOrders(
  itemNo: string,
  orders: readonly PurchaseOrder[],
  vendors: readonly Vendor[],
): ItemPurchaseOrderRow[] {
  return itemPurchaseOrders(itemNo, orders, vendors).filter((po) => po.open)
}

/** Total ordered quantity across open PO rows for an item. */
export function itemOpenPoQty(rows: readonly ItemPurchaseOrderRow[]): number {
  return rows.filter((r) => r.open).reduce((sum, r) => sum + r.qty, 0)
}

/** Assembly orders that either build `itemNo` or consume it as a component, open first. */
export function itemAssemblyOrders(
  itemNo: string,
  assemblyOrders: readonly AssemblyOrder[],
  warehouses: readonly Warehouse[],
): ItemAssemblyOrderRow[] {
  const rows: ItemAssemblyOrderRow[] = []
  for (const ao of assemblyOrders) {
    const buildsItem = ao.item === itemNo
    const matchingLines = ao.lines.filter((l) => l.item === itemNo)
    if (!buildsItem && matchingLines.length === 0) continue
    rows.push({
      no: ao.no,
      role: buildsItem ? 'Builds item' : 'Uses item',
      item: ao.item,
      desc: ao.desc,
      statusLabel: aoStatusLabel(ao.status),
      open: aoOpen(ao.status),
      qty: Number(ao.qty) || 0,
      qtyFinished: Number(ao.qtyFinished) || 0,
      uom: ao.uom,
      siteName: aoSiteName(ao.location, warehouses),
      dueDate: ao.dueDate,
      orderDate: ao.orderDate,
      lineQtyRequired: buildsItem
        ? undefined
        : Math.round(matchingLines.reduce((sum, l) => sum + (Number(l.qtyRequired) || 0), 0) * 1000) / 1000,
    })
  }
  return rows.sort(
    (a, b) =>
      Number(b.open) - Number(a.open) ||
      String(a.dueDate).localeCompare(b.dueDate) ||
      String(b.no).localeCompare(a.no),
  )
}

/** Sentence comparing an active BOM's rolled-up unit cost to the item cost on file. */
export function itemBomCostDelta(rollUnit: number, itemCost: number): string | null {
  if (!(itemCost > 0)) return null
  const diff = rollUnit - itemCost
  if (Math.abs(diff) < 0.005) return 'Matches the item cost on file.'
  return diff > 0
    ? `Rolls up ${money(diff)} above the item cost on file.`
    : `Rolls up ${money(-diff)} below the item cost on file.`
}

/** Made-from BOM versions, rolled-up cost, where-used BOMs, and AOs for `item`. */
export function itemBomSummary(
  item: Item,
  boms: readonly Bom[],
  items: readonly Item[],
  assemblyOrders: readonly AssemblyOrder[],
  warehouses: readonly Warehouse[],
  date: string,
): ItemBomSummary {
  const activeBom = activeBomFor(boms, item.no, date) ?? null
  const versions = boms
    .filter((b) => b.parentItem === item.no)
    .slice()
    .sort(
      (a, b) =>
        BOM_STATUS_ORDER[a.status] - BOM_STATUS_ORDER[b.status] ||
        String(b.effectiveFrom ?? '').localeCompare(a.effectiveFrom ?? '') ||
        String(b.no).localeCompare(a.no),
    )
    .map((b) => ({
      no: b.no,
      version: b.version,
      status: b.status,
      statusLabel: bomStatusLabel(b.status),
      lineCount: b.lines.length,
      unitCost: bomRollup(b, boms, items, date).unit,
      isActive: !!activeBom && b.no === activeBom.no,
    }))

  const rollup = activeBom ? bomRollup(activeBom, boms, items, date) : null
  const mainLoc = mainLocationId(warehouses)
  const buildable = activeBom ? bomBuildable(activeBom, items, mainLoc, mainLoc) : 0
  const costDeltaText = rollup ? itemBomCostDelta(rollup.unit, Number(item.cost) || 0) : null

  const lines: ItemBomComponentRow[] = activeBom
    ? activeBom.lines.map((l) => {
        const unitCost = bomUnitCostOf(l.item, boms, items, date)
        const required = bomReqQty(l, 1, activeBom.outputQty)
        return {
          item: l.item,
          desc: l.desc,
          uom: l.uom,
          qtyPer: Number(l.qtyPer) || 0,
          scrapPct: Number(l.scrapPct) || 0,
          required,
          unitCost,
          lineCost: Math.round(unitCost * required * 100) / 100,
          isSubAssembly: !!activeBomFor(boms, l.item, date),
        }
      })
    : []

  const whereUsed: ItemWhereUsedRow[] = boms
    .filter((b) => b.status !== 'archived' && b.lines.some((l) => l.item === item.no))
    .slice()
    .sort((a, b) => String(a.no).localeCompare(b.no))
    .map((b) => {
      const matching = b.lines.filter((l) => l.item === item.no)
      const qtyPer = Math.round(matching.reduce((sum, l) => sum + (Number(l.qtyPer) || 0), 0) * 1000) / 1000
      return {
        bomNo: b.no,
        parentItem: b.parentItem,
        parentDesc: b.parentDesc || '',
        version: b.version,
        statusLabel: bomStatusLabel(b.status),
        qtyPer,
        uom: matching[0]?.uom || item.uom,
      }
    })

  const aos = itemAssemblyOrders(item.no, assemblyOrders, warehouses)
  return {
    versions,
    activeBom,
    lines,
    rollup,
    buildable,
    costDeltaText,
    whereUsed,
    assemblyOrders: aos,
    openAssemblyOrders: aos.filter((a) => a.open),
  }
}

/** Human label for a UoM measurement category. */
export function uomCatName(cat: UomCategory | '' | undefined): string {
  return cat ? UOM_CATEGORY_LABELS[cat] : EM_DASH
}

/** Fixed factor expressing 1 `code` in `base` units when globally defined; otherwise null. */
export function uomFixedSizeInBase(
  code: string,
  base: string,
  uoms: readonly UomDefinition[] = SYSTEM_UOMS,
): number | null {
  if (!code || !base) return null
  if (code === base) return 1

  const metricCode = METRIC_SCALES[code]
  const metricBase = METRIC_SCALES[base]
  if (metricCode && metricBase && metricCode.group === metricBase.group) {
    return metricCode.factor / metricBase.factor
  }

  const def = uoms.find((u) => u.code === code)
  const baseDef = uoms.find((u) => u.code === base)
  const baseIsPhysicalMetric =
    baseDef?.cat === 'mass' || baseDef?.cat === 'vol' || baseDef?.cat === 'len'
  if (def?.fixedFactor != null && !baseIsPhysicalMetric) {
    return def.fixedFactor
  }
  if ((code === 'NOS' && base === 'PCS') || (code === 'PCS' && base === 'NOS')) {
    return 1
  }
  return null
}

/** Conversion factor of `code` relative to `state.base`, or null if missing. */
export function itemUomBaseSize(
  state: ItemUomState,
  code: string,
  uoms: readonly UomDefinition[] = SYSTEM_UOMS,
): number | null {
  if (!code) return null
  if (code === state.base) return 1
  const fixed = uomFixedSizeInBase(code, state.base, uoms)
  if (fixed != null) return fixed
  const manual = Number(state.qty[code])
  return Number.isFinite(manual) && manual > 0 ? manual : null
}

/** Default per-item UoM state seeded from the item's stored base unit code. */
export function defaultItemUomState(baseUom: string): ItemUomState {
  const base = baseUom.trim()
  return {
    list: base ? [base] : [],
    base,
    qty: {},
  }
}

/** Automatically derive the Master pack as the non-base unit holding the most base units (> 1). */
export function computeMasterPack(
  state: ItemUomState,
  uoms: readonly UomDefinition[] = SYSTEM_UOMS,
): string {
  let bestCode = ''
  let bestSize = 1
  for (const code of state.list) {
    if (code === state.base) continue
    const size = itemUomBaseSize(state, code, uoms)
    if (size != null && size > bestSize) {
      bestSize = size
      bestCode = code
    }
  }
  return bestCode
}

/** Switch the item's base unit to another unit already attached to the item. */
export function setItemUomBase(state: ItemUomState, code: string): ItemUomState {
  if (!state.list.includes(code) || state.base === code) return state
  const nextQty = { ...state.qty }
  delete nextQty[code]
  return { ...state, base: code, qty: nextQty }
}

/** Set or clear a manual conversion factor for a non-fixed unit on the item. */
export function setItemUomQty(state: ItemUomState, code: string, qty: number | null): ItemUomState {
  if (!state.list.includes(code) || code === state.base) return state
  const nextQty = { ...state.qty }
  if (qty == null || !Number.isFinite(qty) || qty <= 0) {
    delete nextQty[code]
  } else {
    nextQty[code] = qty
  }
  return { ...state, qty: nextQty }
}

/** Attach a global UoM code to an item (making it base if the item had no units). */
export function addItemUom(state: ItemUomState, code: string): ItemUomState {
  if (!code || state.list.includes(code)) return state
  return {
    list: [...state.list, code],
    base: state.base || code,
    qty: { ...state.qty },
  }
}

/** Remove a unit from an item, promoting the first remaining unit to base if needed. */
export function removeItemUom(state: ItemUomState, code: string): ItemUomState {
  if (!state.list.includes(code)) return state
  const list = state.list.filter((c) => c !== code)
  const qty = { ...state.qty }
  delete qty[code]
  const base = state.base === code ? (list[0] ?? '') : state.base
  if (base) delete qty[base]
  return { list, base, qty }
}

/** Build the derived UoM summary, table rows, master pack, and addable units for one item. */
export function buildItemUomSummary(
  state: ItemUomState,
  uoms: readonly UomDefinition[] = SYSTEM_UOMS,
): ItemUomSummary {
  const byCode = new Map(uoms.map((u) => [u.code, u]))
  const pack = computeMasterPack(state, uoms)
  const packDef = pack ? byCode.get(pack) : undefined
  const packSize = pack ? itemUomBaseSize(state, pack, uoms) : null

  const rows: ItemUomRow[] = state.list.map((code) => {
    const def = byCode.get(code)
    const isBase = code === state.base
    const fixed = isBase ? null : uomFixedSizeInBase(code, state.base, uoms)
    const manual = state.qty[code]
    const qtyInBase = isBase
      ? 1
      : fixed != null
        ? fixed
        : Number.isFinite(manual) && manual > 0
          ? manual
          : null
    const role: ItemUomRole = isBase ? 'Base' : code === pack ? 'Master pack' : 'Pack unit'
    return {
      code,
      name: def?.name ?? EM_DASH,
      catName: uomCatName(def?.cat),
      uqc: def?.uqc ?? 'OTH',
      base: state.base,
      qtyInBase,
      isBase,
      isFixed: fixed != null,
      role,
    }
  })

  const attached = new Set(state.list)
  const availableToAdd = uoms.filter((u) => !attached.has(u.code))

  return {
    base: state.base,
    pack,
    packLabel: pack ? (packDef ? `${packDef.name} (${pack})` : pack) : '',
    packSize,
    rows,
    availableToAdd,
  }
}
