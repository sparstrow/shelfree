/**
 * The body of one Settings section — the template every section uses.
 *
 * A section describes its content; this owns the title row (with quiet help),
 * loading / error states, the mode-stable save bar, the unsaved-changes guard
 * and the keys Ctrl/Cmd+S (save), Esc (discard) and `?` (descriptions on/off).
 * Sections made of plain label | control rows use `SettingsSection`; sections
 * with their own body (a table, a catalogue) pass `children` directly.
 */
import { AlertCircle } from 'lucide-react'
import { type ReactNode, useEffect } from 'react'
import { HelpTarget } from '@/components/help/HelpTarget'
import { HelpInlineContext } from '@/components/help/inline'
import type { HelpEntry } from '@/components/help/types'
import { Skeleton } from '@/components/ui/skeleton'
import { useMe, useUpdateMe } from '@/data/queries/session'
import { isTypingTarget } from '@/lib/keyboard'
import { cn } from '@/lib/utils'
import { SettingsReadOnlyContext } from './read-only'
import { SaveBar } from './SaveBar'
import type { SettingsFormBar } from './use-settings-form'

export interface SettingsPageProps {
  title: string
  /** Help for the page title (the ⓘ beside it). */
  help?: HelpEntry
  /** Pill beside the title, e.g. a record count. */
  count?: ReactNode
  /** Controls at the right of the title row (New unit…). */
  actions?: ReactNode
  isLoading?: boolean
  error?: unknown
  onRetry?: () => void
  /** Present for sections with Save / Discard. Omit for list-style sections. */
  form?: SettingsFormBar
  /** Body width. Rows read best narrow; tables take the room. */
  width?: 'narrow' | 'wide'
  /** Fill the remaining pane height without body padding/scroll (for embedded `ListPage` sections). */
  flush?: boolean
  /** View-only mode: hides the save bar, makes Ctrl+S / Esc discard inert, shows a quiet state line under the title, and exposes `useSettingsReadOnly()`. */
  readOnly?: boolean
  children: ReactNode
}

const OPEN_LAYER = '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [data-slot="popover-content"]'

export function SettingsPage({
  title,
  help,
  count,
  actions,
  isLoading,
  error,
  onRetry,
  form,
  width = 'narrow',
  flush = false,
  readOnly = false,
  children,
}: SettingsPageProps) {
  const me = useMe().data
  const updateMe = useUpdateMe()
  const inline = me?.showSetHelp === true

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && !e.altKey && e.key.toLowerCase() === 's' && form && !readOnly) {
        e.preventDefault()
        void form.save()
        return
      }
      if (e.key === 'Escape' && form?.isDirty && !readOnly && !document.querySelector(OPEN_LAYER)) {
        e.preventDefault()
        form.discard()
        return
      }
      if (e.key === '?' && !mod && !e.altKey && me && !isTypingTarget(e.target) && !document.querySelector(OPEN_LAYER)) {
        e.preventDefault()
        updateMe.mutate({ ...me, showSetHelp: !me.showSetHelp })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const heading = <h1 className="m-0 text-[19px] font-bold tracking-[-0.02em]">{title}</h1>

  return (
    <SettingsReadOnlyContext.Provider value={readOnly}>
      <HelpInlineContext.Provider value={inline}>
        <section data-screen-label={title} aria-label={title} className="flex min-h-0 min-w-0 flex-1 animate-sf-fade flex-col">
          <div className="group/row flex flex-none flex-wrap items-center gap-x-4 gap-y-2 px-[22px] pt-5 pb-3">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                {help ? (
                  <HelpTarget help={help} label={title}>
                    {heading}
                  </HelpTarget>
                ) : (
                  heading
                )}
                {count !== undefined && (
                  <span className="tnum rounded-full bg-muted px-[9px] py-0.5 text-[11.5px] font-medium text-muted-foreground">{count}</span>
                )}
              </div>
              {readOnly && (
                <p role="status" className="m-0 mt-1 text-[12.5px] text-muted-foreground">
                  View only — ask an admin to change these settings.
                </p>
              )}
            </div>
            {actions && <div className="flex flex-none items-center gap-2">{actions}</div>}
          </div>
          {flush ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col border-t border-border">{children}</div>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto px-[22px] pb-6">
              <div className={cn('mx-auto flex flex-col gap-5', width === 'narrow' && 'max-w-[820px]')}>
                {error ? (
                  <div role="alert" className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-[13px]">
                    <AlertCircle className="size-5 flex-none text-bad-fg" strokeWidth={1.8} />
                    <span className="min-w-0 flex-1">Could not load these settings.</span>
                    {onRetry && (
                      <button
                        type="button"
                        onClick={onRetry}
                        className="hover-lift inline-flex h-8 items-center rounded-lg border border-border bg-card px-3 text-[13px] font-medium hover:bg-tint-12"
                      >
                        Try again
                      </button>
                    )}
                  </div>
                ) : isLoading ? (
                  <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-3">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-[220px] w-full rounded-xl" />
                    <Skeleton className="h-[160px] w-full rounded-xl" />
                  </div>
                ) : (
                  children
                )}
              </div>
            </div>
          )}
          {form && !readOnly && <SaveBar form={form} />}
        </section>
      </HelpInlineContext.Provider>
    </SettingsReadOnlyContext.Provider>
  )
}
