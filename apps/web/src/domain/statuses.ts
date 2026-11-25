/**
 * Statuses & stages — the status list of each document flow (Settings ▸ Statuses & stages,
 * module slices and Shared lists). Pure rules; the backend enforces the same.
 * See docs/statuses/README.md.
 *
 * A status belongs to one flow (a document type) and a flow belongs to exactly one module,
 * so a status carries one `module` (decided from the flow). System statuses are the ones the
 * app's own rules move documents through: they are locked. Custom statuses are the business's own.
 */
import type { StatusDef } from '@/data/schemas'

export type StatusFlow = StatusDef['flow']
export type StatusCategory = StatusDef['category']
export type StatusTone = StatusDef['tone']
export type StatusModuleId = 'purchasing' | 'sales' | 'production'

const FLOW_INFO: Readonly<Record<StatusFlow, { label: string; module: StatusModuleId }>> = {
  'purchase-order': { label: 'Purchase order', module: 'purchasing' },
  'purchase-receipt': { label: 'Goods receipt', module: 'purchasing' },
  'sales-order': { label: 'Sales order', module: 'sales' },
  'sales-invoice': { label: 'Sales invoice', module: 'sales' },
  bom: { label: 'Bill of materials', module: 'production' },
  'assembly-order': { label: 'Assembly order', module: 'production' },
}

export const STATUS_FLOW_IDS = Object.keys(FLOW_INFO) as StatusFlow[]

export const STATUS_MODULE_LABELS: Readonly<Record<StatusModuleId, string>> = {
  purchasing: 'Purchasing',
  sales: 'Sales',
  production: 'Production',
}

export const CATEGORY_LABELS: Readonly<Record<StatusCategory, string>> = { open: 'Open', closed: 'Closed' }
export const TONE_LABELS: Readonly<Record<StatusTone, string>> = {
  neutral: 'Grey',
  info: 'Blue',
  warn: 'Amber',
  ok: 'Green',
  bad: 'Red',
}

export function flowLabel(flow: StatusFlow): string {
  return FLOW_INFO[flow]?.label ?? flow
}

export function moduleOfFlow(flow: StatusFlow): StatusModuleId {
  return FLOW_INFO[flow].module
}

/** Flows owned by a settings module id (empty for modules without document statuses). */
export function flowsForModule(moduleId: string): StatusFlow[] {
  return STATUS_FLOW_IDS.filter((f) => FLOW_INFO[f].module === moduleId)
}

export function moduleLabel(moduleId: string): string {
  return STATUS_MODULE_LABELS[moduleId as StatusModuleId] ?? moduleId
}

export function sourceOf(s: Pick<StatusDef, 'system'>): 'System' | 'Custom' {
  return s.system ? 'System' : 'Custom'
}

export const NAME_MAX = 24

export function normalizeStatus(d: StatusDef): StatusDef {
  const order = Number(d.order)
  return { ...d, name: d.name.trim().replace(/\s+/g, ' '), module: moduleOfFlow(d.flow), order }
}

export function validateStatus(d: StatusDef, others: readonly StatusDef[]): Record<string, string> {
  const fe: Record<string, string> = {}
  if (!FLOW_INFO[d.flow]) fe.flow = 'Pick the document this status belongs to.'
  if (!d.name) fe.name = 'Enter a name.'
  else if (d.name.length < 2 || d.name.length > NAME_MAX) fe.name = `Use 2–${NAME_MAX} characters.`
  else if (others.some((o) => o.flow === d.flow && o.name.toLowerCase() === d.name.toLowerCase())) {
    fe.name = `${flowLabel(d.flow)} already has a status with this name.`
  }
  if (!Number.isInteger(d.order) || d.order < 1) fe.order = 'Use a whole number from 1.'
  return fe
}

export function statusDeleteBlock(s: Pick<StatusDef, 'system'>): string | null {
  return s.system ? 'System statuses are used by Shelfree’s own rules and can’t be deleted.' : null
}

export function statusEditBlock(s: Pick<StatusDef, 'system'>): string | null {
  return s.system ? 'System statuses are locked — add a custom status instead.' : null
}

/** Next order number in a flow (one after the highest). */
export function nextOrder(flow: StatusFlow, all: readonly StatusDef[]): number {
  return all.filter((s) => s.flow === flow).reduce((m, s) => Math.max(m, s.order), 0) + 1
}

export function nextStatusId(all: readonly Pick<StatusDef, 'id'>[]): string {
  let max = 0
  for (const s of all) {
    const m = /^STS(\d+)$/.exec(s.id)
    if (m) max = Math.max(max, Number.parseInt(m[1], 10))
  }
  return `STS${String(max + 1).padStart(4, '0')}`
}

/** Statuses of a flow in display order. */
export function statusesOfFlow(flow: StatusFlow, all: readonly StatusDef[]): StatusDef[] {
  return all.filter((s) => s.flow === flow).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
}
