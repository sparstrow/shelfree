/**
 * Quiet help for one titled thing: wraps its label (or title) and adds the ⓘ.
 *
 * - Mouse: hovering the label or ⓘ for ~400 ms opens the popover; leaving
 *   closes it (140 ms grace so the pointer can move into it). Clicking ⓘ pins
 *   it; Esc, ✕ or a click outside closes it. ⓘ fades in on row hover / focus.
 * - Keyboard / screen reader: ⓘ is a real button (`aria-label="About …"`,
 *   `aria-expanded`); focusing it opens the popover, Enter / Space pins it.
 * - Touch (`(hover:none), (pointer:coarse)`): ⓘ is always visible with a 44 px
 *   target and opens a bottom sheet.
 * - `?` on a Settings page turns on inline descriptions (see `inline.tsx`).
 *
 * The popover opens below the label and flips above when there is more room,
 * with its height capped to the space available (it scrolls inside).
 */
import { Info } from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useTouch } from '@/lib/use-media'
import { cn } from '@/lib/utils'
import { HelpContent } from './HelpContent'
import { useHelpInline } from './inline'
import type { HelpEntry } from './types'

const HOVER_DELAY_MS = 400
const LEAVE_GRACE_MS = 140

export interface HelpTargetProps {
  help: HelpEntry
  /** Accessible name of the thing: the button reads "About {label}". Default: the entry title. */
  label?: string
  /** Current / default value of the setting (marks options, enables "Use default"). */
  current?: string
  defaultValue?: string
  defaultText?: string
  onReset?: () => void
  /** `hover` (default): ⓘ fades in on row hover. `always`: a faint ⓘ is always shown. */
  reveal?: 'hover' | 'always'
  /** Skip the inline description even while `?` is on (section titles that say nothing more). */
  noInline?: boolean
  /** The label / title text. */
  children: ReactNode
  className?: string
}

export function HelpTarget({
  help,
  label,
  current,
  defaultValue,
  defaultText,
  onReset,
  reveal = 'hover',
  noInline,
  children,
  className,
}: HelpTargetProps) {
  const touch = useTouch()
  const inline = useHelpInline()
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  const openTimer = useRef<number | undefined>(undefined)
  const closeTimer = useRef<number | undefined>(undefined)
  const anchorRef = useRef<HTMLSpanElement>(null)
  const name = label ?? help.title

  const clearTimers = () => {
    window.clearTimeout(openTimer.current)
    window.clearTimeout(closeTimer.current)
  }
  useEffect(() => clearTimers, [])

  const close = () => {
    clearTimers()
    setOpen(false)
    setPinned(false)
  }

  const onEnter = (e: React.PointerEvent) => {
    if (touch || e.pointerType !== 'mouse') return
    window.clearTimeout(closeTimer.current)
    if (open || pinned) return
    window.clearTimeout(openTimer.current)
    openTimer.current = window.setTimeout(() => setOpen(true), HOVER_DELAY_MS)
  }
  const onLeave = (e: React.PointerEvent) => {
    if (touch || e.pointerType !== 'mouse') return
    window.clearTimeout(openTimer.current)
    if (pinned) return
    closeTimer.current = window.setTimeout(() => setOpen(false), LEAVE_GRACE_MS)
  }

  const toggle = () => {
    if (open && pinned) return close()
    clearTimers()
    setPinned(true)
    setOpen(true)
  }

  const body = (
    <HelpContent
      entry={help}
      current={current}
      defaultValue={defaultValue}
      defaultText={defaultText}
      onReset={onReset}
      onClose={pinned || touch ? close : undefined}
    />
  )

  return (
    <span className={cn('inline-flex min-w-0 flex-col', className)}>
      <span ref={anchorRef} className="group/help inline-flex min-w-0 items-center gap-1" onPointerEnter={onEnter} onPointerLeave={onLeave}>
        <Popover open={open && !touch}>
          <PopoverAnchor asChild>
            <span className="min-w-0">{children}</span>
          </PopoverAnchor>
          <button
            type="button"
            aria-label={`About ${name}`}
            aria-expanded={open}
            data-help-trigger=""
            onClick={toggle}
            onFocus={(e) => {
              if (!touch && e.currentTarget.matches(':focus-visible')) setOpen(true)
            }}
            onBlur={() => {
              if (!pinned) close()
            }}
            className={cn(
              'inline-flex size-[22px] flex-none items-center justify-center rounded-[5px] border-0 bg-transparent p-0 text-muted-foreground transition-[background-color,color,transform,opacity] duration-[140ms] hover:scale-110 hover:bg-muted hover:text-foreground focus-visible:opacity-100 aria-expanded:opacity-100',
              reveal === 'always' ? 'opacity-60 hover:opacity-100' : 'opacity-0 group-hover/help:opacity-100 group-hover/row:opacity-100',
              'pointer-coarse:size-11 pointer-coarse:opacity-100 [@media(hover:none)]:size-11 [@media(hover:none)]:opacity-100',
            )}
          >
            <Info className="size-3.5" strokeWidth={2} />
          </button>
          <PopoverContent
            side="bottom"
            align="start"
            sideOffset={8}
            collisionPadding={12}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
            onEscapeKeyDown={close}
            onInteractOutside={(e) => {
              // The ⓘ and label handle their own clicks.
              if (anchorRef.current?.contains(e.target as Node)) return e.preventDefault()
              close()
            }}
            onPointerEnter={() => window.clearTimeout(closeTimer.current)}
            onPointerLeave={() => {
              if (!pinned) closeTimer.current = window.setTimeout(() => setOpen(false), LEAVE_GRACE_MS)
            }}
            className="max-h-(--radix-popover-content-available-height) w-80 max-w-[calc(100vw-24px)] overflow-y-auto p-3"
          >
            {body}
          </PopoverContent>
        </Popover>
      </span>
      {inline && !noInline && help.body && <span className="mt-0.5 max-w-[46ch] text-[11.5px] leading-snug text-muted-foreground">{help.body}</span>}
      <Sheet open={open && touch} onOpenChange={(next) => !next && close()}>
        <SheetContent side="bottom" showCloseButton={false} className="max-h-[70vh] gap-0 overflow-y-auto rounded-t-xl p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>{help.title}</SheetTitle>
            <SheetDescription>{help.body ?? help.title}</SheetDescription>
          </SheetHeader>
          <div className="p-4">{body}</div>
        </SheetContent>
      </Sheet>
    </span>
  )
}
