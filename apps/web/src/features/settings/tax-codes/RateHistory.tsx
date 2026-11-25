import { Lock, Plus, X } from 'lucide-react'
import { HelpTarget } from '@/components/help/HelpTarget'
import { fieldBoxClass } from '@/components/record-fields/model'
import { type RateDraft, pctText } from '@/domain/tax-codes'
import { fmtDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { TAX_CODES_HELP as HELP } from './help'

type Tag = 'Current' | 'Past' | 'Scheduled' | 'New'

/** Where each row stands today: the latest row that has started is Current, earlier ones Past. */
function tags(rows: readonly RateDraft[], today: string, existing: boolean): Tag[] {
  const started = rows.filter((r) => r.from && r.from <= today).map((r) => r.from).sort()
  const current = started[started.length - 1]
  return rows.map((r) => {
    if (!r.locked && !existing) return 'New'
    if (r.from > today) return 'Scheduled'
    return r.from === current ? 'Current' : 'Past'
  })
}

const tagClass: Record<Tag, string> = {
  Current: 'bg-ok-bg text-ok-fg',
  Past: 'bg-muted text-muted-foreground',
  Scheduled: 'bg-info-bg text-info-fg',
  New: 'bg-tint-12 text-foreground',
}

const inputClass = (error: boolean) =>
  cn(
    fieldBoxClass,
    'h-8 bg-transparent text-foreground outline-none placeholder:text-muted-foreground focus:border-ring tnum',
    error ? 'border-bad-fg' : 'border-input hover:border-ring/60',
  )

/**
 * The rate-history table of a tax code, in the drawer. View mode (no `onChange`) is plain text;
 * edit mode edits unlocked rows in place and adds a dated rate change.
 */
export function RateHistory({
  rows,
  today,
  existing,
  onChange,
  onAdd,
  errors = {},
}: {
  rows: readonly RateDraft[]
  today: string
  /** True when editing a saved code (rows entered now are "Scheduled" / "Current", not "New"). */
  existing: boolean
  onChange?: (rows: RateDraft[]) => void
  /** Adds a blank dated row (`newRateRow`). */
  onAdd?: () => void
  errors?: Record<string, string>
}) {
  const status = tags(rows, today, existing)
  const editing = !!onChange
  const patch = (i: number, change: Partial<RateDraft>) => onChange?.(rows.map((r, j) => (j === i ? { ...r, ...change } : r)))
  return (
    <section aria-label="Rate history" className="mt-3">
      <div className="group/row my-1.5 flex items-center">
        <HelpTarget help={HELP.rates} label="Rate history">
          <h3 className="m-0 text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">Rate history</h3>
        </HelpTarget>
      </div>
      {rows.length === 0 && <div className="py-2 text-[12.5px] text-muted-foreground">No rates yet.</div>}
      {rows.map((row, i) => {
        const rateError = errors[`rates.${i}.rate`]
        const fromError = errors[`rates.${i}.from`]
        const tag = status[i]
        return (
          <div key={i} className="border-b border-dashed border-border py-1.5 last:border-b-0">
            <div className="grid grid-cols-[84px_minmax(0,1fr)_auto_28px] items-center gap-2">
              {editing && !row.locked ? (
                <input
                  aria-label={`Rate ${i + 1} (%)`}
                  inputMode="decimal"
                  placeholder="%"
                  value={String(row.rate)}
                  aria-invalid={!!rateError}
                  onChange={(e) => patch(i, { rate: e.target.value })}
                  className={inputClass(!!rateError)}
                />
              ) : (
                <span className="tnum text-[13px] font-medium">{pctText(Number(row.rate))}</span>
              )}
              {editing && !row.locked ? (
                <input
                  type="date"
                  aria-label={`Effective from ${i + 1}`}
                  value={row.from}
                  aria-invalid={!!fromError}
                  onChange={(e) => patch(i, { from: e.target.value })}
                  className={inputClass(!!fromError)}
                />
              ) : (
                <span className="tnum text-[13px] text-muted-foreground">from {fmtDate(row.from)}</span>
              )}
              <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', tagClass[tag])}>{tag}</span>
              {editing && row.locked ? (
                <span title="Locked — documents already use this rate" className="inline-flex size-7 items-center justify-center text-muted-foreground">
                  <Lock className="size-3.5" strokeWidth={1.8} aria-label="Locked" />
                </span>
              ) : editing ? (
                <button
                  type="button"
                  aria-label={`Remove rate ${i + 1}`}
                  onClick={() => onChange?.(rows.filter((_, j) => j !== i))}
                  className="hover-lift inline-flex size-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:border-bad-fg hover:bg-bad-bg hover:text-bad-fg"
                >
                  <X className="size-3.5" strokeWidth={1.8} />
                </button>
              ) : (
                <span />
              )}
            </div>
            {(rateError || fromError) && (
              <div role="alert" className="mt-1 text-[11.5px] text-bad-fg">
                {[rateError, fromError].filter(Boolean).join(' ')}
              </div>
            )}
          </div>
        )
      })}
      {errors.rates && !Object.keys(errors).some((k) => k.startsWith('rates.')) && (
        <div role="alert" className="mt-1 text-[11.5px] text-bad-fg">
          {errors.rates}
        </div>
      )}
      {editing && onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="hover-lift mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[13px] font-medium hover:bg-tint-12"
        >
          <Plus className="size-3.5" strokeWidth={1.8} />
          Add rate change
        </button>
      )}
    </section>
  )
}
