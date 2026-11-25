/**
 * Pure multi-row bulk action rules — no React, no browser APIs.
 *
 * Covers:
 * - row eligibility evaluation and "k of n" count hints / tooltips
 * - bulk delete eligibility splitting
 * - bulk edit target splitting (open / locked / final) and field-value validation
 * - duplicate numbering (`-COPY`, `-COPY2`, …)
 *
 * The backend enforces the same per-row eligibility and lock checks inside one
 * transaction per bulk request. See docs/erp-app/README.md.
 */

export type BulkOpDotToken = 'info' | 'bad' | 'ok' | 'warn' | 'muted' | 'primary'

export type BulkEditFieldKind = 'date' | 'num' | 'select'

export type BulkEditLockState = 'open' | 'locked' | 'final'

export const BULK_SELECT_PLACEHOLDER = '__'

export interface BulkEditOption {
  value: string
  label: string
}

export interface BulkEditField<T = unknown> {
  key: string
  label: string
  kind: BulkEditFieldKind
  /** Options for `kind: 'select'`. A placeholder option is shown until one is picked. */
  options?: readonly BulkEditOption[]
  /** Placeholder label for `kind: 'select'`, e.g. `"Choose a location…"`. */
  placeholder?: string
  /** Numeric bounds for `kind: 'num'` (defaults: min 1, step 1). */
  min?: number
  step?: number
  /** Optional per-row predicate when a field only applies to some rows. */
  canEdit?: (row: T) => boolean
}

export interface BulkRowOpSpec<T> {
  key: string
  label: string
  dot: BulkOpDotToken
  /** Past participle for lock ops (e.g. `"reopened"`, `"locked"`). */
  past?: string
  /** Target status label for status ops (e.g. `"Issued"`, `"Cancelled"`, `"Closed"`). */
  to?: string
  /** Explanation shown when 0 rows apply or when ineligible rows are skipped. */
  why: string
  can: (row: T) => boolean
}

export interface BulkOpEvaluation<T> {
  eligible: T[]
  skipped: number
  count: number
  total: number
  hint: string
  enabled: boolean
  title: string
}

export interface BulkDeleteEvaluation<T> {
  eligible: T[]
  blocked: number
  blockedReasons: string[]
  count: number
  total: number
  hint: string
  title: string
}

export interface BulkEditTargets<T> {
  open: T[]
  locked: T[]
  final: T[]
  /** Number of distinct locked groups (e.g. locked purchase orders across selected lines). */
  lockedGroups: number
  total: number
}

export type BulkEditValueResult =
  | { ok: true; value: string | number }
  | { ok: false; error: string }

/** `"1 purchase order"` / `"3 purchase orders"`. */
export function pluralNoun(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

/** `"3"` when every selected row applies, otherwise `"1 of 3"`. */
export function bulkCountHint(eligibleCount: number, totalCount: number): string {
  return eligibleCount === totalCount ? String(eligibleCount) : `${eligibleCount} of ${totalCount}`
}

/** Tooltip text for a bulk status / lock op button or menu item. */
export function bulkOpTitle(
  op: Pick<BulkRowOpSpec<unknown>, 'past' | 'to' | 'why'>,
  eligibleCount: number,
  totalCount: number,
): string {
  if (eligibleCount === 0) return op.why
  if (op.past) return `${eligibleCount} of ${totalCount} selected can be ${op.past}`
  if (op.to) return `${eligibleCount} of ${totalCount} selected can be set to ${op.to}`
  return `${eligibleCount} of ${totalCount} selected`
}

/** Evaluate which selected rows a status or lock op applies to. */
export function evaluateBulkOp<T>(
  op: Pick<BulkRowOpSpec<T>, 'can' | 'past' | 'to' | 'why'>,
  rows: readonly T[],
): BulkOpEvaluation<T> {
  const total = rows.length
  const eligible = rows.filter(op.can)
  const count = eligible.length
  return {
    eligible,
    skipped: total - count,
    count,
    total,
    hint: bulkCountHint(count, total),
    enabled: count > 0,
    title: bulkOpTitle(op, count, total),
  }
}

/** Evaluate which selected rows can be deleted and why the rest cannot. */
export function evaluateBulkDelete<T>(
  rows: readonly T[],
  canDelete?: (row: T) => true | string,
): BulkDeleteEvaluation<T> {
  const total = rows.length
  if (!canDelete) {
    return {
      eligible: [...rows],
      blocked: 0,
      blockedReasons: [],
      count: total,
      total,
      hint: bulkCountHint(total, total),
      title: '',
    }
  }
  const eligible: T[] = []
  const blockedReasons: string[] = []
  for (const row of rows) {
    const verdict = canDelete(row)
    if (verdict === true) {
      eligible.push(row)
    } else {
      blockedReasons.push(verdict)
    }
  }
  const count = eligible.length
  return {
    eligible,
    blocked: total - count,
    blockedReasons,
    count,
    total,
    hint: bulkCountHint(count, total),
    title: count < total ? (blockedReasons[0] ?? '') : '',
  }
}

/**
 * Partition selected rows into editable (`open`), reopenable (`locked`), and
 * immutable (`final`). When `lockGroupOf` is provided, `lockedGroups` counts
 * distinct parent records among locked rows (e.g. locked POs for purchase lines).
 */
export function splitBulkEditTargets<T>(
  rows: readonly T[],
  lockStateOf?: (row: T) => BulkEditLockState,
  lockGroupOf?: (row: T) => string,
): BulkEditTargets<T> {
  const open: T[] = []
  const locked: T[] = []
  const final: T[] = []
  for (const row of rows) {
    const state = lockStateOf ? lockStateOf(row) : 'open'
    if (state === 'open') open.push(row)
    else if (state === 'locked') locked.push(row)
    else final.push(row)
  }
  const lockedGroups = lockGroupOf ? new Set(locked.map(lockGroupOf)).size : locked.length
  return {
    open,
    locked,
    final,
    lockedGroups,
    total: rows.length,
  }
}

/** Validate and parse a bulk-edit input value according to its field kind. */
export function parseBulkEditValue(
  field: Pick<BulkEditField, 'kind' | 'label'>,
  raw: string,
): BulkEditValueResult {
  if (field.kind === 'select') {
    if (raw === BULK_SELECT_PLACEHOLDER) {
      return { ok: false, error: `Choose a ${field.label.toLowerCase()}.` }
    }
    return { ok: true, value: raw }
  }
  if (field.kind === 'date') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw || '')) {
      return { ok: false, error: 'Pick a date.' }
    }
    return { ok: true, value: raw }
  }
  const trimmed = raw.trim()
  if (!trimmed) {
    return { ok: false, error: 'Enter a whole number above 0.' }
  }
  const n = Number(trimmed)
  if (!(n > 0) || Math.floor(n) !== n) {
    return { ok: false, error: 'Enter a whole number above 0.' }
  }
  return { ok: true, value: n }
}

/**
 * Next non-colliding copy number for an entity duplicated with `-COPY`
 * (`ITM001` → `ITM001-COPY`, `ITM001-COPY2`, `ITM001-COPY3`, …).
 */
export function nextDupNo(existingNos: readonly string[], baseNo: string): string {
  const existing = new Set(existingNos)
  let candidate = `${baseNo}-COPY`
  let i = 1
  while (existing.has(candidate)) {
    i += 1
    candidate = `${baseNo}-COPY${i}`
  }
  return candidate
}

/** Allocate sequential non-colliding `-COPY` numbers for a batch of base numbers. */
export function allocateDupNos(existingNos: readonly string[], baseNos: readonly string[]): string[] {
  const taken = [...existingNos]
  const out: string[] = []
  for (const baseNo of baseNos) {
    const next = nextDupNo(taken, baseNo)
    taken.push(next)
    out.push(next)
  }
  return out
}
