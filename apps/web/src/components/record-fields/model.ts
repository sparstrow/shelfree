/** Field model for in-place rows (see FieldRows.tsx). */
import { EM_DASH } from '@/lib/format'

export type EditorFieldType = 'text' | 'number' | 'date' | 'area' | 'select' | 'toggle' | 'lookup'

export interface EditorOption {
  value: string
  label: string
}

export interface EditorField<T> {
  key: keyof T & string
  label: string
  type: EditorFieldType
  options?: readonly (string | EditorOption)[]
  /** Lookup source when `type === 'lookup'`. */
  source?: 'contacts'
  /** Allow clearing a lookup value back to empty (default true). */
  allowNone?: boolean
  mono?: boolean
  /** Shown as text in edit mode too (system records, derived values). */
  locked?: boolean
  placeholder?: string
  /** Help for the field — shown in the label's tooltip, never inline. */
  hint?: string
  /** Toggle wording. */
  onText?: string
  offText?: string
  /** View-mode text. Default: the option label, the value, or "—". */
  display?: (record: T) => string
  /** Muted view text (e.g. "Not added"). */
  muted?: (record: T) => boolean
  /** Step of a number input (e.g. `0.01` for money). */
  step?: string
  /** Max characters accepted by a text input. */
  maxLength?: number
  /** View mode shows a copy button at the end of the value. */
  copyable?: boolean
}

export const optionsOf = (field: { options?: readonly (string | EditorOption)[] }): EditorOption[] =>
  (field.options ?? []).map((o) => (typeof o === 'string' ? { value: o, label: o } : o))

export function fieldViewText<T>(field: EditorField<T>, record: T): string {
  if (field.display) return field.display(record) || EM_DASH
  const value = record[field.key]
  if (field.type === 'toggle') return value ? (field.onText ?? 'On') : (field.offText ?? 'Off')
  if (value === '' || value == null) return EM_DASH
  const option = optionsOf(field).find((o) => o.value === String(value))
  return option ? option.label : String(value)
}

/** The 32 px box every value lives in, in both modes. */
export const fieldBoxClass =
  'flex min-h-8 w-full min-w-0 items-center rounded-lg border px-[10px] text-[13px] transition-colors duration-[140ms]'
