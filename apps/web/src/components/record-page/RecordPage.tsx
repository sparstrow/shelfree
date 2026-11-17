/**
 * THE RECORD PAGE TEMPLATE — a full-page profile for one record, with tabs
 * (Vendor, Customer, Item…). The template owns the frame: top bar, header
 * (back, title, number, status, tags), a mode-stable Edit / Cancel / Save
 * group, the tab bar (URL-synced through `?tab=`), keyboard shortcuts, edit
 * state (draft, errors, form error, review-before-save), and the loading /
 * error / not-found states. A page supplies the record, its tabs and what each
 * tab shows; cards render rows with `FieldRows` so editing happens in place.
 *
 * Edit in place (CLAUDE.md): the view and edit header groups share one grid
 * cell (the inactive one is `invisible` + `inert`), so the header never
 * changes size; the title is the same box in both modes.
 *
 * Keys: `[` `]` previous / next tab · `1`–`9`, `0` jump to tab 1–10 · `E` edit
 * · `Ctrl/Cmd+S` save · `Esc` cancel edit, otherwise back to the list with the
 * row selected. None fire while typing in a field (Esc and Ctrl+S still work
 * from a field while editing).
 */
import { useLocation, useNavigate, useSearch } from '@tanstack/react-router'
import { ChevronLeft, CircleAlert, Info, Pencil } from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { TopBar } from '@/app/shell/TopBar'
import { StatusPill } from '@/components/StatusPill'
import { DocumentSkeleton, Notice, primaryButton, secondaryButton } from '@/components/document/parts'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Tone } from '@/domain/status'
import { isTypingTarget } from '@/lib/keyboard'
import { cn } from '@/lib/utils'

export interface RecordTab {
  id: string
  label: string
  /** Count or short text shown after the label. */
  badge?: string | number
}

export interface RecordTag {
  label: string
  tone: Tone
}

export interface RecordHeaderInfo {
  title: string
  /** Record number, shown as a mono pill. */
  no?: string
  status?: string
  tags?: RecordTag[]
  /** Meta line under the title. */
  subtitle?: string
}

export type RecordPageState =
  | { kind: 'ready' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string; retry?: () => void }

/** What the page's tab renderer receives. */
export interface RecordTabContext<R, D> {
  record: R
  /** The form values: the draft while editing, otherwise the record's own. */
  draft: D
  editing: boolean
  errors: Record<string, string>
  onChange: (key: keyof D & string, value: unknown) => void
  goToTab: (id: string) => void
}

/** What a successful save reports; the template toasts it. */
export interface RecordSaved {
  title: string
  description?: string
}

export interface RecordPageProps<R, D extends object> {
  /** Breadcrumb name, e.g. "Vendor". */
  pageLabel: string
  /** The list this record belongs to, e.g. `/purchasing/vendors`. Esc / Back return here with `?sel=`. */
  backTo: string
  backLabel: string
  /** Record number the list should re-select. */
  recordNo: string
  state?: RecordPageState
  /** The loaded record; `null` when it does not exist. */
  record: R | null | undefined
  notFoundText: string
  header: (record: R, draft: D, editing: boolean) => RecordHeaderInfo
  /** Draft key edited in the title box (same box in both modes). */
  titleField?: keyof D & string
  titleLabel?: string
  tabs: readonly RecordTab[]
  /** Content of the active tab. */
  children: (ctx: RecordTabContext<R, D>, tab: RecordTab) => ReactNode
  /** Extra buttons in the view-mode group, before Edit (New purchase order, Delete…). */
  actions?: ReactNode
  /** The form values for a record. */
  toDraft: (record: R) => D
  /** Tidy typed values before validating and saving. */
  normalize?: (draft: D) => D
  /** Blocking problems by field key; empty = saveable. */
  validate: (draft: D, record: R) => Record<string, string>
  /** Which tab holds a field, so a blocked save can jump to it. */
  tabOfField?: (key: string) => string | undefined
  /** Keeps dependent fields in step after an edit (returns the adjusted draft). */
  onChange?: (draft: D, key: keyof D & string) => D
  /** A warning that needs a deliberate "Save anyway" before saving; '' = none. */
  review?: (draft: D, record: R) => string
  save: (draft: D, record: R) => Promise<RecordSaved | void>
}

const bodyControl =
  'input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button[role=switch]:not(:disabled)'

/** A titled card on a record page. The title can carry an ⓘ hint (Quiet pages). */
export function RecordCard({
  title,
  hint,
  className,
  children,
}: {
  title: string
  hint?: string
  className?: string
  children: ReactNode
}) {
  return (
    <section aria-label={title} className={cn('rounded-xl border border-border bg-card px-[18px] py-4', className)}>
      <div className="mb-2.5 flex items-center gap-1.5">
        <h2 className="m-0 text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">{title}</h2>
        {hint && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`About ${title}`}
                className="inline-flex size-4 items-center justify-center rounded-full border-0 bg-transparent p-0 text-muted-foreground opacity-60 transition-opacity duration-[140ms] hover:opacity-100 focus-visible:opacity-100"
              >
                <Info className="size-3" strokeWidth={2} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[280px] text-xs leading-normal">
              {hint}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      {children}
    </section>
  )
}

/** Small empty state used inside a tab body whose content is not built yet. */
export function RecordTabPending({ label }: { label: string }) {
  return (
    <div role="status" className="flex animate-sf-fade flex-col items-center gap-1.5 rounded-xl border border-dashed border-border px-6 py-12 text-center">
      <div className="text-[13.5px] font-semibold">{label}</div>
      <div className="text-[12.5px] text-muted-foreground">This tab has not been moved yet.</div>
    </div>
  )
}

const titleBox =
  'box-border h-[34px] max-w-[520px] min-w-0 rounded-lg border px-[9px] text-[19px] font-bold tracking-[-0.02em]'

export function RecordPage<R, D extends object>({
  pageLabel,
  backTo,
  backLabel,
  recordNo,
  state = { kind: 'ready' },
  record,
  notFoundText,
  header,
  titleField,
  titleLabel = 'Name',
  tabs,
  children,
  actions,
  toDraft,
  normalize,
  validate,
  tabOfField,
  onChange,
  review,
  save,
}: RecordPageProps<R, D>) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const search = useSearch({ strict: false }) as { tab?: unknown }
  const bodyRef = useRef<HTMLDivElement>(null)

  const [draft, setDraft] = useState<D | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [reviewText, setReviewText] = useState('')
  const [saving, setSaving] = useState(false)
  const editing = draft !== null

  const tabIndex = Math.max(0, tabs.findIndex((t) => t.id === search.tab))
  const activeTab = tabs[tabIndex]

  const goToTab = (id: string) => {
    void navigate({
      to: pathname,
      search: ((prev: Record<string, unknown>) => ({ ...prev, tab: id === tabs[0]?.id ? undefined : id })) as never,
      replace: true,
    })
  }

  const back = () => void navigate({ to: backTo, search: { sel: recordNo } as never })

  const startEdit = () => {
    if (!record || editing) return
    setDraft(toDraft(record))
    setErrors({})
    setFormError('')
    setReviewText('')
  }

  const cancelEdit = () => {
    setDraft(null)
    setErrors({})
    setFormError('')
    setReviewText('')
  }

  const setField = (key: keyof D & string, value: unknown) => {
    setDraft((current) => {
      if (!current) return current
      const next = { ...current, [key]: value } as D
      return onChange ? onChange(next, key) : next
    })
    setReviewText('')
    if (errors[key]) setErrors(({ [key]: _gone, ...rest }) => rest)
    setFormError('')
  }

  const doSave = async (confirmed: boolean) => {
    if (!record || !draft || saving) return
    const tidy = normalize ? normalize(draft) : draft
    const problems = validate(tidy, record)
    const count = Object.keys(problems).length
    if (count) {
      setDraft(tidy)
      setErrors(problems)
      setFormError(`Fix the highlighted ${count === 1 ? 'field' : 'fields'} to save.`)
      const first = Object.keys(problems)[0]
      const home = tabOfField?.(first)
      if (home && home !== activeTab?.id) goToTab(home)
      return
    }
    if (!confirmed && review) {
      const message = review(tidy, record)
      if (message) {
        setDraft(tidy)
        setReviewText(message)
        return
      }
    }
    setSaving(true)
    try {
      const saved = await save(tidy, record)
      toast(saved?.title ?? 'Saved', saved?.description ? { description: saved.description } : undefined)
      cancelEdit()
    } catch {
      setFormError('Could not save. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  // Entering edit focuses the first control that can be edited.
  useEffect(() => {
    if (editing) bodyRef.current?.querySelector<HTMLElement>(bodyControl)?.focus()
  }, [editing])

  // A blocked save moves focus to the first invalid control.
  useEffect(() => {
    if (Object.keys(errors).length) bodyRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [errors])

  useEffect(() => {
    if (state.kind !== 'ready' || !record) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (editing) void doSave(!!reviewText)
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Escape') {
        if (editing) {
          e.preventDefault()
          cancelEdit()
        } else if (!isTypingTarget(e.target) && !document.querySelector('[role="dialog"], [role="menu"], [role="listbox"]')) {
          e.preventDefault()
          back()
        }
        return
      }
      if (isTypingTarget(e.target)) return
      const key = e.key.toLowerCase()
      if (key === 'e') {
        if (!editing) {
          e.preventDefault()
          startEdit()
        }
      } else if (key === ']' || key === '[') {
        const next = tabs[tabIndex + (key === ']' ? 1 : -1)]
        if (next) {
          e.preventDefault()
          goToTab(next.id)
        }
      } else if (/^[0-9]$/.test(key)) {
        const target = tabs[key === '0' ? 9 : Number(key) - 1]
        if (target) {
          e.preventDefault()
          goToTab(target.id)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (state.kind !== 'ready' || !record) {
    const shown: RecordPageState = state.kind !== 'ready' ? state : { kind: 'error', message: notFoundText }
    return (
      <>
        <TopBar pageLabel={pageLabel} />
        <section data-screen-label={pageLabel} className="flex min-h-0 min-w-0 flex-1 animate-sf-fade flex-col overflow-hidden">
          <div className="flex flex-none items-center gap-3 border-b border-border px-5 py-4">
            <BackButton label={backLabel} onClick={back} />
            <h1 className="m-0 text-base font-bold tracking-[-0.01em]">{pageLabel}</h1>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-auto p-5">
            {shown.kind === 'loading' && <DocumentSkeleton />}
            {shown.kind === 'error' && (
              <Notice tone="bad">
                {shown.message}{' '}
                {shown.kind === 'error' && shown.retry && (
                  <button type="button" className="underline" onClick={shown.retry}>
                    Try again
                  </button>
                )}
              </Notice>
            )}
          </div>
        </section>
      </>
    )
  }

  const values = draft ?? toDraft(record)
  const info = header(record, values, editing)
  const ctx: RecordTabContext<R, D> = { record, draft: values, editing, errors, onChange: setField, goToTab }
  const titleValue = titleField ? String(values[titleField] ?? '') : info.title

  return (
    <>
      <TopBar pageLabel={pageLabel} />
      <section data-screen-label={pageLabel} className="flex min-h-0 min-w-0 flex-1 animate-sf-fade flex-col overflow-hidden">
        <div className="flex flex-none items-start gap-3 px-[22px] pt-4">
          <BackButton label={backLabel} onClick={back} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              {info.no && (
                <span className="flex-none rounded-md bg-muted px-[9px] py-0.5 font-mono text-[13px] font-semibold text-muted-foreground">
                  {info.no}
                </span>
              )}
              {titleField && editing ? (
                <input
                  value={titleValue}
                  onChange={(e) => setField(titleField, e.target.value)}
                  aria-label={titleLabel}
                  aria-invalid={!!errors[titleField]}
                  spellCheck={false}
                  className={cn(
                    titleBox,
                    'field-sizing-content bg-transparent text-foreground outline-none transition-colors duration-[140ms] focus:border-ring',
                    errors[titleField] ? 'border-bad-fg' : 'border-input',
                  )}
                />
              ) : (
                <h1 className={cn(titleBox, 'm-0 overflow-hidden border-transparent leading-8 text-ellipsis whitespace-nowrap')}>
                  {titleValue}
                </h1>
              )}
              {info.status && <StatusPill label={info.status} />}
              {info.tags?.map((t) => (
                <StatusPill key={t.label} label={t.label} tone={t.tone} className="px-2 text-[10.5px] font-bold tracking-[0.04em] uppercase" />
              ))}
            </div>
            {titleField && editing && errors[titleField] && (
              <div role="alert" className="mt-1 animate-sf-slide text-[11.5px] font-medium text-bad-fg">
                {errors[titleField]}
              </div>
            )}
            {info.subtitle && <div className="mt-[5px] text-[12.5px] text-muted-foreground">{info.subtitle}</div>}
          </div>
          {/* One grid cell for both groups: the inactive one is invisible + inert, so the header never changes size. */}
          <div className="grid flex-none justify-items-end">
            <div aria-hidden={editing} inert={editing} className={cn('col-start-1 row-start-1 flex gap-2', editing && 'invisible')}>
              {actions}
              <button type="button" onClick={startEdit} title="Edit (E)" className={primaryButton}>
                <Pencil className="size-[13px]" strokeWidth={2} />
                Edit
              </button>
            </div>
            <div aria-hidden={!editing} inert={!editing} className={cn('col-start-1 row-start-1 flex gap-2', !editing && 'invisible')}>
              <button type="button" onClick={cancelEdit} title="Cancel (Esc)" className={secondaryButton}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void doSave(!!reviewText)}
                disabled={saving}
                aria-busy={saving}
                title="Save changes (Ctrl+S)"
                className={primaryButton}
              >
                Save changes
              </button>
            </div>
          </div>
        </div>

        <div
          role="tablist"
          aria-label={`${pageLabel} sections`}
          className="flex flex-none items-center gap-5 overflow-x-auto border-b border-border px-6 pt-3"
        >
          {tabs.map((t, i) => {
            const active = i === tabIndex
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`rp-tab-${t.id}`}
                aria-selected={active}
                aria-controls="rp-panel"
                tabIndex={active ? 0 : -1}
                onClick={() => goToTab(t.id)}
                title={i < 10 ? `${t.label} (${(i + 1) % 10})` : t.label}
                className={cn(
                  'relative inline-flex h-[38px] flex-none items-center gap-1.5 border-0 bg-transparent px-1 text-[13px] whitespace-nowrap transition-[color,transform] duration-[140ms] hover:-translate-y-px hover:text-foreground',
                  active ? 'font-semibold text-foreground shadow-[inset_0_-2px_0_0_var(--primary)]' : 'font-medium text-muted-foreground',
                )}
              >
                {t.label}
                {t.badge !== undefined && (
                  <span className="tnum rounded-full bg-muted px-[7px] py-px text-[11px] font-medium text-muted-foreground">{t.badge}</span>
                )}
              </button>
            )
          })}
        </div>

        <div ref={bodyRef} id="rp-panel" role="tabpanel" aria-labelledby={`rp-tab-${activeTab.id}`} className="min-h-0 flex-1 overflow-auto px-6 pt-5 pb-7">
          {formError && (
            <div role="alert" className="mb-4 flex items-center gap-2 rounded-lg bg-bad-bg px-[14px] py-2.5 text-[12.5px] font-medium text-bad-fg">
              <CircleAlert className="size-[15px] flex-none" strokeWidth={2} />
              {formError}
            </div>
          )}
          {reviewText && (
            <div role="status" className="mb-4 animate-sf-slide rounded-lg bg-warn-bg px-[14px] py-2.5 text-[12.5px] leading-normal text-warn-fg">
              <div>{reviewText}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void doSave(true)}
                  className="hover-lift h-7 rounded-[7px] border border-current bg-transparent px-3 text-xs font-semibold text-inherit hover:bg-[color-mix(in_oklab,currentColor_14%,transparent)]"
                >
                  Save anyway
                </button>
                <button
                  type="button"
                  onClick={() => setReviewText('')}
                  className="h-7 rounded-[7px] border-0 bg-transparent px-2.5 text-xs font-medium text-inherit underline underline-offset-2 transition-opacity duration-[140ms] hover:opacity-80"
                >
                  Keep editing
                </button>
              </div>
            </div>
          )}
          {children(ctx, activeTab)}
        </div>
      </section>
    </>
  )
}

function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${label} (Esc)`}
      aria-label={label}
      className="hover-lift inline-flex size-8 flex-none items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-tint-12 hover:text-foreground"
    >
      <ChevronLeft className="size-[15px]" strokeWidth={2} />
    </button>
  )
}
