/**
 * The input that replaces a cell while it is edited in place (DataGrid, columns
 * with `edit`). Enter or blur commits, Esc cancels, Tab commits and asks the
 * grid to continue with the next editable cell. It stops clicks and keys so the
 * row underneath is not selected, opened or navigated.
 */
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

export interface CellEditorProps {
  kind: 'text' | 'number' | 'date'
  step?: string
  min?: string
  initial: string
  label: string
  align: 'left' | 'right'
  mono?: boolean
  /** `value` null = cancelled. `move` = Tab / Shift+Tab was pressed (continue with the next / previous editable cell). */
  onFinish: (value: string | null, move: 1 | -1 | 0) => void
}

export function CellEditor({ kind, step, min, initial, label, align, mono, onFinish }: CellEditorProps) {
  const ref = useRef<HTMLInputElement>(null)
  const done = useRef(false)

  useEffect(() => {
    ref.current?.focus()
    ref.current?.select?.()
  }, [])

  const finish = (value: string | null, move: 1 | -1 | 0 = 0) => {
    if (done.current) return
    done.current = true
    onFinish(value, move)
  }

  return (
    <input
      ref={ref}
      type={kind}
      step={kind === 'number' ? step : undefined}
      min={kind === 'number' ? min : undefined}
      defaultValue={initial}
      aria-label={`Edit ${label}`}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onBlur={(e) => finish(e.currentTarget.value)}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter') {
          e.preventDefault()
          finish(e.currentTarget.value)
        } else if (e.key === 'Escape') {
          e.preventDefault()
          finish(null)
        } else if (e.key === 'Tab') {
          e.preventDefault()
          finish(e.currentTarget.value, e.shiftKey ? -1 : 1)
        }
      }}
      className={cn(
        'h-[26px] w-full min-w-0 rounded-md border border-ring bg-background px-2 text-xs text-foreground outline-none',
        'shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_20%,transparent)]',
        align === 'right' && 'text-right tabular-nums',
        mono && 'font-mono',
      )}
    />
  )
}
