import { ChevronDown, ChevronUp, Search, X } from 'lucide-react'
import type { RefObject } from 'react'
import { cn } from '@/lib/utils'

const stepButton =
  'hover-lift inline-flex size-7 flex-none items-center justify-center rounded-[7px] border border-input bg-transparent text-muted-foreground hover:bg-tint-16 hover:text-foreground disabled:pointer-events-none disabled:opacity-40'

/**
 * "Find in view": highlights matching cells in the rows shown, without removing
 * any rows. Enter / Shift+Enter step through the matches, Esc closes.
 */
export function FindBar({
  query,
  onQuery,
  index,
  count,
  onStep,
  onClose,
  inputRef,
}: {
  query: string
  onQuery: (value: string) => void
  /** Zero-based current match. */
  index: number
  count: number
  onStep: (dir: -1 | 1) => void
  onClose: () => void
  inputRef: RefObject<HTMLInputElement | null>
}) {
  const searching = query.trim() !== ''
  return (
    <div
      role="search"
      aria-label="Find in view"
      className="mx-5 mb-3 flex animate-sf-fade items-center gap-2.5 rounded-[10px] border border-border bg-card py-2 pr-2.5 pl-3 shadow-[var(--shadow)]"
    >
      <Search className="size-[15px] flex-none text-muted-foreground" strokeWidth={2} />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onStep(e.shiftKey ? -1 : 1)
          } else if (e.key === 'Escape') {
            e.preventDefault()
            e.stopPropagation()
            onClose()
          }
        }}
        placeholder="Find in this view…"
        aria-label="Find in this view"
        className="h-7 min-w-0 flex-1 border-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
      />
      <span
        aria-live="polite"
        className={cn('tnum flex-none text-xs', searching && count === 0 ? 'text-bad-fg' : 'text-muted-foreground')}
      >
        {!searching ? '' : count === 0 ? 'No matches' : `${index + 1} of ${count} ${count === 1 ? 'match' : 'matches'}`}
      </span>
      <button
        type="button"
        title="Previous match (Shift+Enter)"
        aria-label="Previous match"
        disabled={count === 0}
        onClick={() => onStep(-1)}
        className={stepButton}
      >
        <ChevronUp className="size-[14px]" strokeWidth={2} />
      </button>
      <button
        type="button"
        title="Next match (Enter)"
        aria-label="Next match"
        disabled={count === 0}
        onClick={() => onStep(1)}
        className={stepButton}
      >
        <ChevronDown className="size-[14px]" strokeWidth={2} />
      </button>
      <button type="button" title="Close (Esc)" aria-label="Close find" onClick={onClose} className={stepButton}>
        <X className="size-[14px]" strokeWidth={2} />
      </button>
    </div>
  )
}
