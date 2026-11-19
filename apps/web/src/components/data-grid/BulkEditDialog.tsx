import { Lock, LockOpen } from 'lucide-react'
import { type KeyboardEvent, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  BULK_SELECT_PLACEHOLDER,
  type BulkEditField,
  type BulkEditLockState,
  type BulkEditTargets,
  parseBulkEditValue,
  pluralNoun,
  splitBulkEditTargets,
} from '@/domain/bulk-actions'
import { int } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface GridBulkEdit<T> {
  /** Columns offered in the bulk edit dialog (only user-entered fields). */
  fields: readonly BulkEditField<T>[]
  /** Optional lock state per row (`open` | `locked` | `final`). Omit when every row is editable. */
  lockState?: (row: T) => BulkEditLockState
  /** Optional group key for locked rows (e.g. parent PO no. on Purchase Lines) so the dialog counts locked orders. */
  lockGroup?: (row: T) => string
  /** Custom state line text for locked rows. */
  lockedText?: (targets: BulkEditTargets<T>) => string
  /** Custom state line text for final rows. */
  finalText?: (targets: BulkEditTargets<T>) => string
  /** Custom button label for Reopen & apply. */
  reopenLabel?: (targets: BulkEditTargets<T>) => string
  /**
   * Apply the chosen value across the selection. Return an error message to keep the
   * dialog open and show it; return nothing on success (caller shows the Undo toast).
   */
  apply: (
    rows: T[],
    field: BulkEditField<T>,
    value: string | number,
    ctx: { reopen: boolean; targets: BulkEditTargets<T>; clearSelection: () => void },
  ) => string | void | Promise<string | void>
}

export interface BulkEditDialogProps<T> {
  open: boolean
  onClose: () => void
  noun: string
  nounPlural: string
  rows: readonly T[]
  config: GridBulkEdit<T>
  clearSelection: () => void
}

const fieldControlClass =
  'h-[34px] w-full rounded-lg border border-input bg-background px-2.5 text-[13px] text-foreground outline-none transition-[border-color,box-shadow] duration-[140ms] focus:border-ring focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--ring)_25%,transparent)]'

const secondaryButtonClass =
  'hover-lift inline-flex h-8 items-center gap-[7px] rounded-lg border border-border bg-card px-[13px] text-[13px] font-medium text-foreground hover:bg-tint-16 disabled:pointer-events-none disabled:opacity-50'

const primaryButtonClass =
  'hover-lift inline-flex h-8 items-center gap-[7px] rounded-lg border-0 bg-primary px-[14px] text-[13px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:pointer-events-none disabled:opacity-50'

function BulkEditBody<T>({
  onClose,
  noun,
  nounPlural,
  rows,
  config,
  clearSelection,
}: Omit<BulkEditDialogProps<T>, 'open'>) {
  const first = config.fields[0]
  const [fieldKey, setFieldKey] = useState(first.key)
  const [value, setValue] = useState(first.kind === 'select' ? BULK_SELECT_PLACEHOLDER : '')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const field = config.fields.find((f) => f.key === fieldKey) ?? first
  const targets = useMemo(
    () => splitBulkEditTargets(rows, config.lockState, config.lockGroup),
    [rows, config.lockState, config.lockGroup],
  )

  const openCount = targets.open.length
  const lockedCount = targets.locked.length
  const finalCount = targets.final.length

  const title = `Edit ${pluralNoun(targets.total, noun, nounPlural)}`
  const lockedText =
    config.lockedText?.(targets) ?? `${int(lockedCount)} locked — reopen to edit`
  const finalText =
    config.finalText?.(targets) ??
    `${int(finalCount)} can’t be edited — received, closed and cancelled orders stay locked`
  const reopenLabel =
    config.reopenLabel?.(targets) ??
    `Reopen ${int(lockedCount)} & apply to ${int(openCount + lockedCount)}`

  const changeField = (nextKey: string) => {
    const nextField = config.fields.find((f) => f.key === nextKey) ?? first
    setFieldKey(nextField.key)
    setValue(nextField.kind === 'select' ? BULK_SELECT_PLACEHOLDER : '')
    setError('')
  }

  const submit = async (reopen: boolean) => {
    if (submitting) return
    const parsed = parseBulkEditValue(field, value)
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const problem = await config.apply([...rows], field, parsed.value, {
        reopen,
        targets,
        clearSelection,
      })
      if (problem) {
        setError(problem)
        return
      }
      onClose()
    } catch {
      setError('Could not apply the changes. Check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && (e.target as HTMLElement | null)?.tagName !== 'BUTTON') {
      e.preventDefault()
      e.stopPropagation()
      if ((e.metaKey || e.ctrlKey) && lockedCount > 0) {
        void submit(true)
      } else if (openCount > 0) {
        void submit(false)
      } else if (lockedCount > 0) {
        void submit(true)
      }
    }
  }

  return (
    <DialogContent
      className="sm:max-w-[460px] gap-[14px] rounded-[14px] border border-border bg-card p-5 ring-0"
      onKeyDown={onKeyDown}
    >
      <DialogHeader className="gap-0">
        <DialogTitle className="text-[15px] font-bold">{title}</DialogTitle>
        <DialogDescription className="sr-only">
          Choose a column and a new value to apply across the selected rows.
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5">
        <label htmlFor="be-field" className="text-xs font-medium text-muted-foreground">
          Column
        </label>
        <select
          id="be-field"
          autoFocus
          value={field.key}
          onChange={(e) => changeField(e.target.value)}
          className={fieldControlClass}
        >
          {config.fields.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>

        <label htmlFor="be-value" className="text-xs font-medium text-muted-foreground">
          New value
        </label>
        <div className="min-w-0">
          {field.kind === 'date' && (
            <input
              id="be-value"
              type="date"
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                setError('')
              }}
              className={fieldControlClass}
            />
          )}
          {field.kind === 'num' && (
            <input
              id="be-value"
              type="number"
              min={field.min ?? 1}
              step={field.step ?? 1}
              inputMode="numeric"
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                setError('')
              }}
              className={cn(fieldControlClass, 'tnum')}
            />
          )}
          {field.kind === 'select' && (
            <select
              id="be-value"
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                setError('')
              }}
              className={fieldControlClass}
            >
              <option value={BULK_SELECT_PLACEHOLDER}>
                {field.placeholder ?? `Choose a ${field.label.toLowerCase()}…`}
              </option>
              {(field.options ?? []).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-[7px] rounded-[10px] bg-muted px-3 py-2.5 text-[12.5px]">
        {openCount > 0 && (
          <div className="flex items-center gap-2 text-foreground">
            <LockOpen className="size-[13px] flex-none text-ok-fg" strokeWidth={2} />
            <span className="tnum">{int(openCount)} editable</span>
          </div>
        )}
        {lockedCount > 0 && (
          <div className="flex items-center gap-2 text-warn-fg">
            <Lock className="size-[13px] flex-none" strokeWidth={2} />
            <span className="tnum">{lockedText}</span>
          </div>
        )}
        {finalCount > 0 && (
          <div className="flex items-center gap-2 text-bad-fg">
            <Lock className="size-[13px] flex-none" strokeWidth={2} />
            <span className="tnum">{finalText}</span>
          </div>
        )}
      </div>

      {error && (
        <div role="alert" className="text-[12.5px] text-bad-fg">
          {error}
        </div>
      )}

      <DialogFooter className="mx-0 mb-0 flex-row flex-wrap items-center justify-end gap-2 rounded-none border-0 bg-transparent p-0">
        <button type="button" onClick={onClose} className={secondaryButtonClass}>
          Cancel
        </button>
        {openCount > 0 && lockedCount > 0 && (
          <button
            type="button"
            disabled={submitting}
            onClick={() => void submit(true)}
            title="Ctrl/Cmd + Enter"
            className={secondaryButtonClass}
          >
            <LockOpen className="size-[13px]" strokeWidth={2} />
            {reopenLabel}
          </button>
        )}
        {openCount === 0 && lockedCount > 0 && (
          <button
            type="button"
            disabled={submitting}
            onClick={() => void submit(true)}
            title="Enter"
            className={primaryButtonClass}
          >
            <LockOpen className="size-[13px]" strokeWidth={2} />
            {reopenLabel}
          </button>
        )}
        {openCount > 0 && (
          <button
            type="button"
            disabled={submitting}
            onClick={() => void submit(false)}
            title="Enter"
            className={primaryButtonClass}
          >
            Apply to {int(openCount)}
          </button>
        )}
      </DialogFooter>
    </DialogContent>
  )
}

/** One-column bulk edit dialog across selected grid rows. */
export function BulkEditDialog<T>({
  open,
  onClose,
  noun,
  nounPlural,
  rows,
  config,
  clearSelection,
}: BulkEditDialogProps<T>) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      {open && config.fields.length > 0 && rows.length > 0 && (
        <BulkEditBody
          onClose={onClose}
          noun={noun}
          nounPlural={nounPlural}
          rows={rows}
          config={config}
          clearSelection={clearSelection}
        />
      )}
    </Dialog>
  )
}
