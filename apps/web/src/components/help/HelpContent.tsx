import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { HelpEntry } from './types'

export interface HelpContentProps {
  entry: HelpEntry
  /** Current value of the setting — marks the matching option. */
  current?: string
  /** Default value — tags the matching option. */
  defaultValue?: string
  /** How the default reads, e.g. `Line by line`. Shown with "Use default". */
  defaultText?: string
  /** Puts the setting back to its default. Offered only while it differs. */
  onReset?: () => void
  /** Show a ✕ (pinned popovers). */
  onClose?: () => void
}

/** The body shared by the popover and the touch sheet. */
export function HelpContent({ entry, current, defaultValue, defaultText, onReset, onClose }: HelpContentProps) {
  const canReset = !!onReset && current !== undefined && defaultValue !== undefined && current !== defaultValue
  return (
    <div className="flex flex-col gap-2 text-[12.5px] leading-normal">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 text-[13px] font-semibold">{entry.title}</div>
        {onClose && (
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="-mt-0.5 -mr-1 inline-flex size-6 flex-none items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground transition-[background-color,color,transform] duration-[140ms] hover:scale-105 hover:bg-tint-16 hover:text-foreground"
          >
            <X className="size-3.5" strokeWidth={2} />
          </button>
        )}
      </div>
      {entry.body && <p className="m-0 text-muted-foreground">{entry.body}</p>}
      {entry.options && entry.options.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {entry.options.map((o) => {
            const isCurrent = o.value === current
            return (
              <li key={o.value} className="flex items-start gap-2" aria-current={isCurrent || undefined}>
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-1.5 size-[7px] flex-none rounded-full border-[1.5px]',
                    isCurrent ? 'border-primary bg-primary' : 'border-input bg-transparent',
                  )}
                />
                <span className="min-w-0">
                  <span className="font-medium">{o.label}</span>
                  {isCurrent && <span className="ml-1.5 text-[11px] text-muted-foreground">Current</span>}
                  {o.value === defaultValue && (
                    <span className="ml-1.5 rounded-full bg-muted px-1.5 py-px text-[10.5px] font-medium text-muted-foreground">
                      Default
                    </span>
                  )}
                  <span className="block text-muted-foreground">{o.desc}</span>
                </span>
              </li>
            )
          })}
        </ul>
      )}
      {defaultText && (
        <div className="flex items-center gap-2 border-t border-border pt-2 text-muted-foreground">
          <span className="min-w-0 flex-1">
            Default: <span className="font-medium text-foreground">{defaultText}</span>
          </span>
          {canReset && (
            <button
              type="button"
              onClick={onReset}
              className="hover-lift inline-flex h-7 flex-none items-center rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground hover:bg-tint-12"
            >
              Use default
            </button>
          )}
        </div>
      )}
      {entry.note && (
        <p className="m-0 rounded-md bg-info-bg px-2 py-1.5 text-[11.5px] text-info-fg">
          <span className="font-semibold">Compliance: </span>
          {entry.note}
        </p>
      )}
    </div>
  )
}
