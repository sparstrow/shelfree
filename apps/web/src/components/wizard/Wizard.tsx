/**
 * Step wizard template: a dialog with step dots, Back / Next / Finish and per-step validation.
 * A page describes its steps; the template owns the frame and the behaviour.
 *
 * - Step dots show where you are; a dot is clickable once its step has been visited (going forward through
 *   dots validates the steps in between).
 * - Next validates the current step. Errors stay in place on the step (the page renders them with
 *   `WizardField`) and the first invalid control takes focus.
 * - Keys: Enter in a field = next (not in a textarea or on a button), Ctrl/Cmd + Enter = next from
 *   anywhere, Alt + ←/→ = back / next, Esc = close (asks first when anything was entered). Catalogue:
 *   `shortcut-meta.ts`.
 * - Focus moves to each step's first field. Steps slide in from the side you are travelling to (no
 *   motion for reduced-motion users). On a phone the dialog is a full-screen sheet.
 *
 * Reference use: `features/settings/locations/LocationWizard.tsx`. Onboarding reuses it.
 */
import { Check, ChevronLeft, ChevronRight, CircleAlert } from 'lucide-react'
import { type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export type WizardErrors = Record<string, string>

export interface WizardStepContext<D> {
  draft: D
  /** Errors of this step, by field key. */
  errors: WizardErrors
  /** Change the draft (a patch or a function). A patch also clears the errors of the keys it changes. */
  update: (change: Partial<D> | ((draft: D) => D)) => void
  /** Jump to a step by id (only to steps already visited). */
  goTo: (stepId: string) => void
}

export interface WizardStep<D> {
  id: string
  /** Step dot label. */
  label: string
  /** One line under the title while this step is showing. */
  subtitle: string
  /** Errors that block Next, by field key; empty (or omitted) = may continue. */
  validate?: (draft: D) => WizardErrors
  render: (ctx: WizardStepContext<D>) => ReactNode
  /** CSS selector of the control to focus on arrival. Default: `[data-autofocus]`, else the first field. */
  focus?: string
}

/** What `onFinish` returns to send the user back with a message; nothing = done. */
export interface WizardFinishResult {
  /** Step to return to (the one that owns the errors). */
  step?: string
  errors?: WizardErrors
  formError?: string
}

export interface WizardProps<D> {
  open: boolean
  /** Close the wizard (called after the discard confirm, or straight away when nothing was entered). */
  onClose: () => void
  title: string
  steps: readonly WizardStep<D>[]
  /** A fresh draft; called each time the wizard opens. */
  createDraft: () => D
  finishLabel: string
  /** Create the thing. Throw an `Error` or return a `WizardFinishResult` to stay open. */
  onFinish: (draft: D) => Promise<WizardFinishResult | undefined | void>
  /** Wording of the discard confirm. */
  discard?: { title: string; description: string }
}

const buttonBase =
  'hover-lift inline-flex h-[34px] items-center gap-1.5 rounded-lg px-[14px] text-[13px] font-medium disabled:pointer-events-none disabled:opacity-50'
const secondaryButton = `${buttonBase} border border-border bg-card text-foreground hover:bg-tint-12`
const primaryButton = `${buttonBase} border-0 bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary-hover`

const FIELD_SELECTOR = 'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])'

interface Session<D> {
  draft: D
  initial: string
  index: number
  visited: number
  direction: 1 | -1
  errors: WizardErrors
  formError: string
  pending: boolean
  confirmDiscard: boolean
}

export function Wizard<D>({ open, onClose, title, steps, createDraft, finishLabel, onFinish, discard }: WizardProps<D>) {
  const [wasOpen, setWasOpen] = useState(false)
  const fresh = (): Session<D> => {
    const draft = createDraft()
    return { draft, initial: JSON.stringify(draft), index: 0, visited: 0, direction: 1, errors: {}, formError: '', pending: false, confirmDiscard: false }
  }
  const [s, setS] = useState<Session<D>>(fresh)
  // Each time the wizard opens it starts from a fresh draft on the first step (adjusted during render, so
  // the first paint of a new session never shows the last one).
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setS(fresh())
  }

  const bodyRef = useRef<HTMLDivElement>(null)
  const step = steps[s.index]
  const last = s.index === steps.length - 1
  const dirty = JSON.stringify(s.draft) !== s.initial

  const focusFirst = () => {
    const root = bodyRef.current
    if (!root) return
    const target =
      (step?.focus ? root.querySelector<HTMLElement>(step.focus) : null) ??
      root.querySelector<HTMLElement>('[data-autofocus]') ??
      root.querySelector<HTMLElement>(FIELD_SELECTOR) ??
      root.querySelector<HTMLElement>('button:not([disabled])')
    target?.focus()
  }
  const focusFirstInvalid = () => {
    requestAnimationFrame(() => bodyRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
  }

  // Focus moves to the first field of each step as it appears.
  const shownStep = useRef(s.index)
  useEffect(() => {
    if (!open || shownStep.current === s.index) return
    shownStep.current = s.index
    const frame = requestAnimationFrame(focusFirst)
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- focus on arrival at a step only
  }, [s.index, open])

  const update: WizardStepContext<D>['update'] = (change) =>
    setS((cur) => {
      const draft = typeof change === 'function' ? change(cur.draft) : { ...cur.draft, ...change }
      const errors = { ...cur.errors }
      if (typeof change !== 'function') for (const key of Object.keys(change)) delete errors[key]
      return { ...cur, draft, errors, formError: Object.keys(errors).length === 0 ? '' : cur.formError }
    })

  const requestClose = () => {
    if (s.pending) return
    if (dirty) setS((cur) => ({ ...cur, confirmDiscard: true }))
    else onClose()
  }

  /** Move to `target`, validating each step passed on the way forward. */
  const goToIndex = (target: number) => {
    if (s.pending || target === s.index || target < 0 || target >= steps.length) return
    if (target < s.index) {
      setS((cur) => ({ ...cur, index: target, direction: -1, errors: {}, formError: '' }))
      return
    }
    if (target > s.visited) return
    for (let i = s.index; i < target; i++) {
      const errors = steps[i].validate?.(s.draft) ?? {}
      const first = Object.values(errors)[0]
      if (first) {
        setS((cur) => ({ ...cur, index: i, direction: i > cur.index ? 1 : -1, errors, formError: first }))
        focusFirstInvalid()
        return
      }
    }
    setS((cur) => ({ ...cur, index: target, direction: 1, errors: {}, formError: '' }))
  }

  const finish = async () => {
    setS((cur) => ({ ...cur, pending: true, formError: '' }))
    try {
      const result = await onFinish(s.draft)
      if (result && (result.errors || result.formError || result.step)) {
        const target = result.step ? Math.max(0, steps.findIndex((x) => x.id === result.step)) : s.index
        const errors = result.errors ?? {}
        setS((cur) => ({
          ...cur,
          pending: false,
          index: target,
          direction: target < cur.index ? -1 : 1,
          errors,
          formError: result.formError ?? Object.values(errors)[0] ?? '',
        }))
        focusFirstInvalid()
        return
      }
      setS((cur) => ({ ...cur, pending: false }))
      onClose()
    } catch (e) {
      setS((cur) => ({ ...cur, pending: false, formError: e instanceof Error ? e.message : 'Could not finish — try again.' }))
    }
  }

  const next = () => {
    if (s.pending || !step) return
    const errors = step.validate?.(s.draft) ?? {}
    const first = Object.values(errors)[0]
    if (first) {
      setS((cur) => ({ ...cur, errors, formError: first }))
      focusFirstInvalid()
      return
    }
    if (last) {
      void finish()
      return
    }
    setS((cur) => ({ ...cur, index: cur.index + 1, visited: Math.max(cur.visited, cur.index + 1), direction: 1, errors: {}, formError: '' }))
  }

  const back = () => goToIndex(s.index - 1)

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      e.preventDefault()
      if (e.key === 'ArrowRight') next()
      else back()
      return
    }
    if (e.key !== 'Enter' || e.shiftKey || e.altKey || e.nativeEvent.isComposing) return
    const el = e.target as HTMLElement
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      next()
      return
    }
    // A textarea keeps its line breaks; a button, link or switch does what Enter normally does there.
    if (el.tagName === 'TEXTAREA' || el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'SELECT' || el.getAttribute('role') === 'switch') return
    if (el.tagName === 'INPUT') {
      e.preventDefault()
      next()
    }
  }

  const stepContext: WizardStepContext<D> = {
    draft: s.draft,
    errors: s.errors,
    update,
    goTo: (id) => goToIndex(steps.findIndex((x) => x.id === id)),
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && requestClose()}>
        <DialogContent
          showCloseButton
          onKeyDown={onKeyDown}
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            requestAnimationFrame(focusFirst)
          }}
          className={cn(
            'flex flex-col gap-0 overflow-hidden p-0 sm:max-w-[780px]',
            'max-h-[min(720px,calc(100dvh-2rem))]',
            // Phone width: a full-screen sheet.
            'max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-h-none max-sm:w-screen max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none',
          )}
        >
          <header className="flex flex-col gap-1 border-b border-border px-5 pt-4 pb-3 pr-12">
            <DialogTitle className="text-[16px] font-semibold">{title}</DialogTitle>
            <DialogDescription className="m-0 text-[12.5px]">{step?.subtitle}</DialogDescription>
            <nav aria-label="Steps" className="mt-2">
              <ol className="m-0 flex list-none items-center gap-0.5 p-0">
                {steps.map((st, i) => {
                  const active = i === s.index
                  const done = i < s.index
                  const reachable = i <= s.visited
                  return (
                    <li key={st.id} className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => goToIndex(i)}
                        disabled={!reachable}
                        aria-current={active ? 'step' : undefined}
                        title={reachable && !active ? `Back to ${st.label}` : undefined}
                        className={cn(
                          'inline-flex items-center gap-2 rounded-md border-0 bg-transparent p-0.5 pr-1.5 text-[12px] transition-colors duration-[140ms]',
                          reachable && !active ? 'cursor-pointer hover:bg-tint-12' : 'cursor-default',
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            'inline-flex size-[23px] flex-none items-center justify-center rounded-full text-[11px] font-bold tabular-nums transition-all duration-[140ms]',
                            active
                              ? 'bg-primary text-primary-foreground'
                              : done
                                ? 'border border-border bg-ok-bg text-ok-fg'
                                : 'border border-border bg-muted text-muted-foreground',
                          )}
                        >
                          {done ? <Check className="size-3" strokeWidth={3} /> : i + 1}
                        </span>
                        <span className={cn('whitespace-nowrap', active ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground', !active && 'max-sm:hidden')}>
                          {st.label}
                        </span>
                      </button>
                      {i < steps.length - 1 && (
                        <span aria-hidden="true" className={cn('mx-0.5 h-0.5 w-[18px] flex-none rounded-sm', i < s.index ? 'bg-ok-fg/30' : 'bg-border')} />
                      )}
                    </li>
                  )
                })}
              </ol>
            </nav>
            <span className="sr-only" aria-live="polite">
              {`Step ${s.index + 1} of ${steps.length}: ${step?.label ?? ''}`}
            </span>
          </header>

          <div ref={bodyRef} className="min-h-[300px] flex-1 overflow-y-auto px-5 py-4">
            <div
              key={s.index}
              className={cn(
                'animate-in fade-in-0 duration-200 motion-reduce:animate-none',
                s.direction === 1 ? 'slide-in-from-right-3' : 'slide-in-from-left-3',
              )}
            >
              {step?.render(stepContext)}
            </div>
          </div>

          {s.formError && (
            <div
              role="alert"
              className="flex items-center gap-2 border-t border-border bg-bad-bg px-5 py-2 text-[12.5px] text-bad-fg animate-in fade-in-0 motion-reduce:animate-none"
            >
              <CircleAlert className="size-[14px] flex-none" strokeWidth={2} />
              {s.formError}
            </div>
          )}

          <footer className="flex items-center gap-2 border-t border-border bg-muted/50 px-5 py-3">
            {s.index > 0 && (
              <button type="button" onClick={back} disabled={s.pending} className={secondaryButton} title="Back (Alt + ←)">
                <ChevronLeft className="size-[14px]" strokeWidth={2.2} />
                Back
              </button>
            )}
            <div className="flex-1" />
            <button type="button" onClick={requestClose} disabled={s.pending} className={secondaryButton} title="Cancel (Esc)">
              Cancel
            </button>
            <button type="button" onClick={next} disabled={s.pending} className={primaryButton} title={last ? `${finishLabel} (Enter)` : 'Continue (Enter)'}>
              {last ? finishLabel : 'Continue'}
              {!last && <ChevronRight className="size-[14px]" strokeWidth={2.4} />}
            </button>
          </footer>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={s.confirmDiscard}
        danger
        title={discard?.title ?? 'Discard this setup?'}
        description={discard?.description ?? 'What you entered will be lost.'}
        confirmLabel="Discard"
        onConfirm={() => {
          setS((cur) => ({ ...cur, confirmDiscard: false }))
          onClose()
        }}
        onCancel={() => setS((cur) => ({ ...cur, confirmDiscard: false }))}
      />
    </>
  )
}
