/**
 * In-place field rows — the label | value grid shared by every record surface
 * (the editable drawer, the record page cards).
 *
 * Follows CLAUDE.md "Edit in place": the same rows, in the same order and
 * position, in view and edit. View text sits in a transparent-bordered 32 px
 * box at the exact x/y its control will occupy; editing only swaps the text
 * for the control in that box. Locked fields stay text. Field help lives in a
 * tooltip on the label ("Quiet pages"). Errors show under the value.
 */
import { Check, Copy, Info } from 'lucide-react'
import { useState } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { EM_DASH } from '@/lib/format'
import { cn } from '@/lib/utils'

export type EditorFieldType = 'text' | 'number' | 'area' | 'select' | 'toggle'

export interface EditorOption {
  value: string
  label: string
}

export interface EditorField<T> {
  key: keyof T & string
  label: string
  type: EditorFieldType
  options?: readonly (string | EditorOption)[]
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

const LAYOUTS = {
  /** Drawer: narrow label column. */
  compact: 'grid-cols-[124px_1fr]',
  /** Page card: label takes 2 / 5 of the row. */
  wide: 'grid-cols-[minmax(96px,2fr)_minmax(0,3fr)]',
} as const

export interface FieldRowsProps<T> {
  fields: readonly EditorField<T>[]
  /** Current values: the draft while editing, otherwise the record's own. */
  values: T
  editing: boolean
  errors?: Record<string, string>
  onChange: (key: keyof T & string, value: unknown) => void
  /** Unique per mounted group — input ids are `${idPrefix}-${key}`. */
  idPrefix?: string
  layout?: keyof typeof LAYOUTS
  hintSide?: 'left' | 'right'
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      aria-label={`Copy ${label}`}
      title={done ? 'Copied' : `Copy ${label}`}
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(
          () => {
            setDone(true)
            setTimeout(() => setDone(false), 1400)
          },
          () => undefined,
        )
      }}
      className="hover-lift absolute top-1/2 right-1 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground hover:bg-tint-16 hover:text-foreground"
    >
      {done ? <Check className="size-3" strokeWidth={2} /> : <Copy className="size-3" strokeWidth={2} />}
    </button>
  )
}

export function FieldRows<T>({
  fields,
  values,
  editing,
  errors = {},
  onChange,
  idPrefix = 'ed',
  layout = 'compact',
  hintSide = 'left',
}: FieldRowsProps<T>) {
  return (
    <>
      {fields.map((field) => {
        const error = errors[field.key]
        const id = `${idPrefix}-${field.key}`
        const live = editing && !field.locked
        const value = values[field.key]
        const text = fieldViewText(field, values)
        const muted = (editing && field.locked) || !!field.muted?.(values)
        const copy = !!field.copyable && !editing && text !== EM_DASH && !muted
        return (
          <div
            key={field.key}
            data-field={field.key}
            className={cn('grid items-start gap-x-2 border-b border-dashed border-border py-1', LAYOUTS[layout])}
          >
            <span className="flex min-h-8 items-center gap-1 text-[12.5px] text-muted-foreground">
              <label htmlFor={live ? id : undefined}>{field.label}</label>
              {field.hint && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={`About ${field.label}`}
                      className="inline-flex size-4 items-center justify-center rounded-full border-0 bg-transparent p-0 text-muted-foreground opacity-60 transition-opacity duration-[140ms] hover:opacity-100 focus-visible:opacity-100"
                    >
                      <Info className="size-3" strokeWidth={2} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side={hintSide} className="max-w-[260px] text-xs leading-normal">
                    {field.hint}
                  </TooltipContent>
                </Tooltip>
              )}
            </span>
            <div className="min-w-0">
              {!live ? (
                <div
                  className={cn(
                    fieldBoxClass,
                    'relative border-transparent font-medium',
                    field.type === 'area' ? 'items-start py-[7px] whitespace-pre-wrap' : 'truncate',
                    field.mono && 'font-mono text-xs',
                    muted && 'text-muted-foreground',
                    copy && 'pr-8',
                  )}
                  title={editing && field.locked ? 'Locked' : text}
                >
                  {text}
                  {copy && <CopyButton text={text} label={field.label} />}
                </div>
              ) : field.type === 'select' ? (
                <select
                  id={id}
                  value={value == null ? '' : String(value)}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  aria-invalid={!!error}
                  className={cn(fieldBoxClass, 'h-8 bg-transparent text-foreground outline-none focus:border-ring', error ? 'border-bad-fg' : 'border-input')}
                >
                  {optionsOf(field).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : field.type === 'area' ? (
                <textarea
                  id={id}
                  value={value == null ? '' : String(value)}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  aria-invalid={!!error}
                  className={cn(
                    fieldBoxClass,
                    'min-h-[68px] resize-y bg-transparent py-[7px] leading-[1.45] text-foreground outline-none placeholder:text-muted-foreground focus:border-ring',
                    error ? 'border-bad-fg' : 'border-input',
                  )}
                />
              ) : field.type === 'toggle' ? (
                <div className={cn(fieldBoxClass, 'gap-2 border-transparent px-0')}>
                  <button
                    id={id}
                    type="button"
                    role="switch"
                    aria-checked={!!value}
                    onClick={() => onChange(field.key, !value)}
                    className={cn(
                      'relative inline-flex h-[18px] w-8 flex-none items-center rounded-full border-0 p-0 transition-colors duration-[160ms]',
                      value ? 'bg-primary' : 'bg-input',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute size-[14px] rounded-full bg-background shadow-base transition-transform duration-[160ms]',
                        value ? 'translate-x-[16px]' : 'translate-x-[2px]',
                      )}
                    />
                  </button>
                  <span className="text-[13px] font-medium">{value ? (field.onText ?? 'On') : (field.offText ?? 'Off')}</span>
                </div>
              ) : (
                <input
                  id={id}
                  type={field.type === 'number' ? 'number' : 'text'}
                  value={value == null ? '' : String(value)}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  maxLength={field.maxLength}
                  aria-invalid={!!error}
                  className={cn(
                    fieldBoxClass,
                    'h-8 bg-transparent text-foreground outline-none placeholder:text-muted-foreground focus:border-ring',
                    field.mono && 'font-mono text-xs',
                    error ? 'border-bad-fg' : 'border-input',
                  )}
                />
              )}
              {editing && error && (
                <div role="alert" className="mt-1 animate-sf-slide text-[11.5px] font-medium text-bad-fg">
                  {error}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </>
  )
}
