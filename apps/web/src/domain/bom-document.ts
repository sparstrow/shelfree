/**
 * Pure editing, validation, tree-expansion, and cost-application rules for the
 * Bill of materials document. Reuses costing, availability, and resolution helpers
 * from `production.ts`. See `docs/production/README.md`.
 */
import type { Bom, BomLine, Item } from '@/data/schemas'
import { money } from '@/lib/format'
import { nextNo } from './numbering'
import { activeBomFor, bomReqQty } from './production'

export type BomEditableField =
  | 'parentItem'
  | 'version'
  | 'status'
  | 'effectiveFrom'
  | 'effectiveTo'
  | 'outputQty'
  | 'labourCost'
  | 'overheadPct'
  | 'kind'
  | 'yieldPct'

export interface BomTreeRow {
  line: BomLine
  depth: number
  required: number
  hasSub: boolean
  subKey: string
  open: boolean
  /** Index in the root BOM's `lines` array when `depth === 0`; `-1` for expanded sub-assembly rows. */
  lineIndex: number
}

export interface BomCostDelta {
  text: string
  tone: 'muted' | 'ok' | 'warn'
}

export function bomNextNo(boms: readonly Pick<Bom, 'no'>[]): string {
  return nextNo(
    'BOM',
    boms.map((b) => b.no),
  )
}

export function newBom(
  no: string,
  today: string,
  options?: {
    parentItem?: string
    items?: readonly Item[]
    wipLocation?: string
    createdBy?: string
  },
): Bom {
  const parentNo = options?.parentItem ?? ''
  const parent = parentNo ? options?.items?.find((i) => i.no === parentNo) : undefined
  const stamp = `${today}T09:00:00`
  return {
    no,
    parentItem: parentNo,
    parentDesc: parent?.desc ?? '',
    kind: 'assembly',
    version: 'v1',
    status: 'draft',
    effectiveFrom: today,
    effectiveTo: null,
    outputQty: 1,
    uom: parent?.uom || 'NOS',
    labourCost: 0,
    overheadPct: 0,
    lines: [],
    notes: '',
    operations: [],
    yieldPct: 100,
    wipLocation: options?.wipLocation ?? 'WH-ASSY',
    createdAt: stamp,
    updatedAt: stamp,
    createdBy: options?.createdBy ?? '',
  }
}

export function renumberBomLines(lines: readonly BomLine[]): BomLine[] {
  return lines.map((line, index) => ({ ...line, lineNo: (index + 1) * 10 }))
}

export function newBomLine(item: Item, lineNo = 10, defaultScrap = 0): BomLine {
  return {
    lineNo,
    item: item.no,
    desc: item.desc,
    qtyPer: 1,
    uom: item.uom || 'NOS',
    scrapPct: defaultScrap,
    note: '',
  }
}

export function bomSetField<K extends BomEditableField>(
  bom: Bom,
  field: K,
  value: Bom[K],
  items: readonly Item[],
): Bom {
  if (field === 'parentItem') {
    const parentNo = String(value ?? '')
    const item = items.find((i) => i.no === parentNo)
    return {
      ...bom,
      parentItem: parentNo,
      parentDesc: item?.desc ?? '',
      uom: item?.uom || 'NOS',
    }
  }
  if (field === 'outputQty') {
    return { ...bom, outputQty: Math.max(1, Number(value) || 1) }
  }
  if (field === 'labourCost' || field === 'overheadPct') {
    return { ...bom, [field]: Math.max(0, Number(value) || 0) }
  }
  if (field === 'yieldPct') {
    return { ...bom, yieldPct: Math.max(1, Math.min(100, Number(value) || 100)) }
  }
  if (field === 'effectiveFrom' || field === 'effectiveTo') {
    return { ...bom, [field]: (value as string | null) || null }
  }
  return { ...bom, [field]: value }
}

export function bomAddLine(bom: Bom, itemNo: string, items: readonly Item[], defaultScrap = 0): Bom {
  const item = items.find((i) => i.no === itemNo)
  if (!item) return bom
  const next = [...bom.lines, newBomLine(item, (bom.lines.length + 1) * 10, defaultScrap)]
  return { ...bom, lines: renumberBomLines(next) }
}

export function bomRemoveLine(bom: Bom, index: number): Bom {
  return {
    ...bom,
    lines: renumberBomLines(bom.lines.filter((_, i) => i !== index)),
  }
}

export function bomSetLine(bom: Bom, index: number, field: 'qtyPer' | 'scrapPct', raw: string | number): Bom {
  const val = Math.max(0, Number.parseFloat(String(raw)) || 0)
  return {
    ...bom,
    lines: bom.lines.map((line, i) => (i === index ? { ...line, [field]: val } : line)),
  }
}

export function bomMoveLine(bom: Bom, index: number, dir: -1 | 1): Bom {
  const target = index + dir
  if (index < 0 || index >= bom.lines.length || target < 0 || target >= bom.lines.length) {
    return bom
  }
  const next = [...bom.lines]
  const tmp = next[index]
  next[index] = next[target]
  next[target] = tmp
  return { ...bom, lines: renumberBomLines(next) }
}

export function bomToggleSub(expanded: Readonly<Record<string, boolean>>, key: string): Record<string, boolean> {
  return { ...expanded, [key]: !expanded[key] }
}

export function bomTree(
  bom: Pick<Bom, 'no' | 'parentItem' | 'outputQty' | 'lines'>,
  boms: readonly Bom[],
  date: string,
  expanded: Readonly<Record<string, boolean>>,
  qty = 1,
  depth = 0,
  out: BomTreeRow[] = [],
  visited?: ReadonlySet<string>,
): BomTreeRow[] {
  const branch = new Set(visited)
  if (bom.parentItem) branch.add(bom.parentItem)

  bom.lines.forEach((line, index) => {
    const required = bomReqQty(line, qty, bom.outputQty)
    const sub = depth < 5 && !branch.has(line.item) ? activeBomFor(boms, line.item, date) : undefined
    const subKey = `${bom.no || ''}/${line.item}`
    const open = !!expanded[subKey]
    out.push({
      line,
      depth,
      required,
      hasSub: !!sub,
      subKey,
      open,
      lineIndex: depth === 0 ? index : -1,
    })
    if (sub && open) {
      bomTree(sub, boms, date, expanded, required, depth + 1, out, branch)
    }
  })
  return out
}

/** Detect a direct or sub-assembly cycle back to `parentItem`; returns the loop chain or null. */
export function bomCycle(
  parentItem: string,
  lines: readonly Pick<BomLine, 'item'>[],
  boms: readonly Bom[],
  date: string,
  seen?: readonly string[],
  depth = 0,
): string | null {
  if (!parentItem) return null
  const chain = seen ?? [parentItem]
  if (depth > 6) return null
  for (const line of lines) {
    if (line.item === parentItem || chain.includes(line.item)) {
      return [...chain, line.item].join(' → ')
    }
    const sub = activeBomFor(boms, line.item, date)
    if (sub) {
      const bad = bomCycle(parentItem, sub.lines, boms, date, [...chain, line.item], depth + 1)
      if (bad) return bad
    }
  }
  return null
}

/** Full BOM validation (used on Activate, and when saving an active BOM). */
export function bomValidate(bom: Bom, boms: readonly Bom[], date: string): string {
  if (!bom.parentItem) return 'Choose the item this BOM makes.'
  if (!bom.lines.length) return 'Add at least one component.'
  if (bom.lines.some((line) => !(Number(line.qtyPer) > 0))) {
    return 'Every component needs a quantity greater than zero.'
  }
  const seen = new Set<string>()
  for (const line of bom.lines) {
    if (seen.has(line.item)) {
      return `Component ${line.item} is listed twice — combine the lines instead.`
    }
    seen.add(line.item)
  }
  const cyc = bomCycle(bom.parentItem, bom.lines, boms, date)
  if (cyc) return `This would make the item part of itself: ${cyc}`
  if (bom.status === 'active') {
    const clash = boms.find(
      (b) =>
        b.no !== bom.no &&
        b.parentItem === bom.parentItem &&
        b.status === 'active' &&
        (!bom.effectiveTo || !b.effectiveFrom || b.effectiveFrom <= bom.effectiveTo) &&
        (!b.effectiveTo || !bom.effectiveFrom || bom.effectiveFrom <= b.effectiveTo),
    )
    if (clash) {
      return `Another active BOM (${clash.no} · ${clash.version}) already covers these dates. Archive it or set an end date first.`
    }
  }
  return ''
}

/** Validation when clicking Save: requires parent item, rejects cycles, and enforces full rules if active. */
export function bomSaveDraftError(bom: Bom, boms: readonly Bom[], date: string): string {
  if (!bom.parentItem) return 'Choose the item this BOM makes.'
  if (bom.status === 'active') return bomValidate(bom, boms, date)
  const cyc = bomCycle(bom.parentItem, bom.lines, boms, date)
  if (cyc) return `This would make the item part of itself: ${cyc}`
  return ''
}

export function prepareBomSave(bom: Bom, nowIso: string): Bom {
  return {
    ...bom,
    lines: renumberBomLines(bom.lines),
    updatedAt: nowIso,
  }
}

export function prepareBomActivate(bom: Bom, nowIso: string): Bom {
  return {
    ...bom,
    status: 'active',
    lines: renumberBomLines(bom.lines),
    updatedAt: nowIso,
  }
}

export function prepareBomArchive(bom: Bom, today: string, nowIso: string): Bom {
  return {
    ...bom,
    status: 'archived',
    effectiveTo: bom.effectiveTo || today,
    lines: renumberBomLines(bom.lines),
    updatedAt: nowIso,
  }
}

export function bomCostDelta(rollupUnit: number, item: Item | undefined): BomCostDelta {
  if (!item) return { text: '', tone: 'muted' }
  const cur = item.cost || 0
  if (Math.abs(rollupUnit - cur) < 0.005) {
    return { text: 'Matches the item cost', tone: 'ok' }
  }
  if (rollupUnit > cur) {
    return { text: `+${money(rollupUnit - cur)} vs item cost`, tone: 'warn' }
  }
  return { text: `−${money(cur - rollupUnit)} vs item cost`, tone: 'warn' }
}

export function applyBomCostToItem(item: Item, rollupUnit: number): Item {
  return {
    ...item,
    cost: Math.round(rollupUnit * 100) / 100,
  }
}
