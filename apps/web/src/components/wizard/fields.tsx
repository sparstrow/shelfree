import { type ReactNode, useId } from 'react'
import { HelpTarget } from '@/components/help/HelpTarget'
import type { HelpEntry } from '@/components/help/types'
import { cn } from '@/lib/utils'

export interface WizardFieldControlProps {
  id: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

export interface WizardFieldProps {
  label: string
  /** Quiet help for the label (the shared ⓘ). */
  help?: HelpEntry
  /** Shows a quiet asterisk after the label. */
  required?: boolean
  /** Shown under the control, in place. */
  error?: string
  className?: string
  /** Render the control with the ids and aria the field provides. */
  children: (props: WizardFieldControlProps) => ReactNode
}

/** A label, its control and its error message — the one field layout every wizard step uses. */
export function WizardField({ label, help, required, error, className, children }: WizardFieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const text = <label htmlFor={id}>{label}</label>
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)} data-field-error={error ? 'true' : undefined}>
      <span className="flex items-center gap-0.5 text-[12px] font-medium text-muted-foreground">
        {help ? (
          <HelpTarget help={help} label={label} reveal="always" noInline>
            {text}
          </HelpTarget>
        ) : (
          text
        )}
        {required && (
          <span aria-hidden="true" className="text-bad-fg">
            *
          </span>
        )}
      </span>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? errorId : undefined })}
      {error && (
        <p id={errorId} className="m-0 text-[12px] text-bad-fg">
          {error}
        </p>
      )}
    </div>
  )
}

/** Small upper-case heading that groups fields on a step. */
export function WizardSection({ children, help }: { children: string; help?: HelpEntry }) {
  const text = <span className="text-[10px] font-semibold tracking-[0.07em] text-muted-foreground uppercase">{children}</span>
  return (
    <div className="mt-1 flex items-center">
      {help ? (
        <HelpTarget help={help} label={children} reveal="always" noInline>
          {text}
        </HelpTarget>
      ) : (
        text
      )}
    </div>
  )
}
