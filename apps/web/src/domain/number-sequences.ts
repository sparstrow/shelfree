/**
 * Pure business rules for Number sequences (`Settings ▸ Shared lists ▸ Number sequences`
 * and module settings slices). No React, DOM, or storage — the backend enforces the
 * exact same invariants and issues numbers atomically inside document transactions.
 */
import type { NumberSequence, NumberSequenceDocType } from '@/data/schemas'

export type SequenceModuleId = 'purchasing' | 'sales' | 'warehouse' | 'production' | 'people'

const DOC_TYPE_MODULES: Record<NumberSequenceDocType, SequenceModuleId> = {
  'purchase-order': 'purchasing',
  'purchase-receipt': 'purchasing',
  'sales-order': 'sales',
  'sales-invoice': 'sales',
  item: 'warehouse',
  bom: 'production',
  'assembly-order': 'production',
  employee: 'people',
}

/** Map a document type to its owning module id. */
export function moduleOfDocType(docType: NumberSequenceDocType): SequenceModuleId {
  return DOC_TYPE_MODULES[docType]
}

/** Format a running number `n` with the series' prefix, zero-padded digits, and optional suffix. */
export function formatNumber(
  series: Pick<NumberSequence, 'prefix' | 'digits' | 'suffix'>,
  n: number,
): string {
  const value = Math.max(0, Math.floor(Number(n) || 0))
  const width = Math.max(1, Math.min(10, Math.floor(Number(series.digits) || 1)))
  return `${series.prefix ?? ''}${String(value).padStart(width, '0')}${series.suffix ?? ''}`
}

/** Preview the next number that will be issued by this series. */
export function previewNext(series: Pick<NumberSequence, 'prefix' | 'digits' | 'suffix' | 'next'>): string {
  return formatNumber(series, series.next)
}

function canOverlapFormats(
  a: Pick<NumberSequence, 'prefix' | 'suffix'>,
  b: Pick<NumberSequence, 'prefix' | 'suffix'>,
): boolean {
  const p1 = a.prefix ?? ''
  const p2 = b.prefix ?? ''
  const s1 = a.suffix ?? ''
  const s2 = b.suffix ?? ''
  const digitsOnly = /^\d*$/
  const prefixOverlap =
    p1.length >= p2.length
      ? p1.startsWith(p2) && digitsOnly.test(p1.slice(p2.length))
      : p2.startsWith(p1) && digitsOnly.test(p2.slice(p1.length))
  const suffixOverlap =
    s1.length >= s2.length
      ? s1.endsWith(s2) && digitsOnly.test(s1.slice(0, s1.length - s2.length))
      : s2.endsWith(s1) && digitsOnly.test(s2.slice(0, s2.length - s1.length))
  return prefixOverlap && suffixOverlap
}

/**
 * Validate a number sequence against GST-audit and uniqueness invariants.
 * Returns field errors by key (empty object when valid).
 */
export function validateSeries(
  series: NumberSequence,
  all: readonly NumberSequence[],
): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!series.name.trim()) {
    errors.name = 'Enter a name for this series.'
  }

  const prefix = (series.prefix ?? '').trim()
  const suffix = (series.suffix ?? '').trim()
  if (!prefix && !suffix) {
    errors.prefix = 'Enter a prefix or a suffix.'
  }

  if (!Number.isInteger(series.digits) || series.digits < 1 || series.digits > 10) {
    errors.digits = 'Use a whole number from 1 to 10.'
  }

  if (!Number.isInteger(series.issued) || series.issued < 0) {
    errors.issued = 'Issued count cannot be negative.'
  }

  const saved = all.find((s) => s.id === series.id)
  if (!Number.isInteger(series.next) || series.next < 1) {
    errors.next = 'Next number must be 1 or more.'
  } else if (Number.isInteger(series.issued) && series.issued >= 0 && series.next < series.issued + 1) {
    errors.next = `Next number must be at least ${series.issued + 1} (${series.issued} already issued).`
  } else if (saved && series.next < saved.next) {
    errors.next = `Next number can only go up (saved value is ${saved.next}).`
  }

  const others = all.filter((s) => s.id !== series.id)
  const othersSameType = others.filter((s) => s.docType === series.docType)

  if (series.isDefault && !series.active) {
    errors.active = 'The default series must be active.'
  }

  const otherDefault = othersSameType.find((s) => s.isDefault)
  if (series.isDefault && otherDefault) {
    errors.isDefault = `${otherDefault.name} is already the default for this document type.`
  } else if (!series.isDefault && !otherDefault) {
    errors.isDefault = 'One series for each document type must be the default.'
  }

  if (series.active && (prefix || suffix)) {
    const normalizedSeries = { ...series, prefix, suffix }
    const candidatePreview = previewNext(normalizedSeries)
    const conflict = othersSameType.find((o) => {
      if (!o.active) return false
      const normalizedOther = { ...o, prefix: (o.prefix ?? '').trim(), suffix: (o.suffix ?? '').trim() }
      return (
        canOverlapFormats(normalizedSeries, normalizedOther) ||
        previewNext(normalizedOther) === candidatePreview
      )
    })
    if (conflict) {
      const key = prefix ? 'prefix' : 'suffix'
      if (!errors[key]) {
        errors[key] = `Conflicts with active series ${conflict.name} (${previewNext(conflict)}).`
      }
    }
  }

  return errors
}

/** A series may only be deleted before it has issued any number; deactivate it otherwise. */
export function canDeleteSeries(series: Pick<NumberSequence, 'issued'>): boolean {
  return series.issued === 0
}

/**
 * Make `id` the sole default series for its document type.
 * Throws if the series does not exist or is inactive.
 */
export function setDefault(all: readonly NumberSequence[], id: string): NumberSequence[] {
  const target = all.find((s) => s.id === id)
  if (!target) throw new Error(`Number sequence ${id} not found.`)
  if (!target.active) throw new Error('Only an active series can be set as the default.')
  return all.map((s) => (s.docType === target.docType ? { ...s, isDefault: s.id === id } : s))
}

/** Issue the next formatted number from `series` and return the incremented copy without mutating. */
export function takeNext(series: NumberSequence): { number: string; series: NumberSequence } {
  if (!series.active) throw new Error('Cannot issue a number from an inactive series.')
  const number = formatNumber(series, series.next)
  return {
    number,
    series: {
      ...series,
      next: series.next + 1,
      issued: series.issued + 1,
    },
  }
}

/** Next sequential series ID (`SEQ00001`, `SEQ00002`…). */
export function nextSequenceId(all: readonly Pick<NumberSequence, 'id'>[]): string {
  let max = 0
  for (const s of all) {
    const m = /^SEQ(\d+)$/.exec(s.id)
    if (m) max = Math.max(max, Number.parseInt(m[1], 10))
  }
  return `SEQ${String(max + 1).padStart(5, '0')}`
}
