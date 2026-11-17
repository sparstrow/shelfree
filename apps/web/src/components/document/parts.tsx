/** Shared building blocks for full-page document screens (purchase order, receipt, BOM…). */
import { ChevronLeft, CircleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { StatusPill } from '@/components/StatusPill'
import { cn } from '@/lib/utils'

export const fieldClass =
  'h-[34px] w-full rounded-lg border border-input bg-transparent px-[10px] text-[13px] text-foreground outline-none transition-colors duration-[140ms] focus:border-ring disabled:cursor-not-allowed disabled:opacity-60'
export const secondaryButton =
  'hover-lift inline-flex h-[34px] items-center gap-[7px] rounded-lg border border-border bg-card px-4 text-[12.5px] text-foreground hover:bg-tint-12 disabled:pointer-events-none disabled:opacity-50'
export const primaryButton =
  'hover-lift inline-flex h-[34px] items-center gap-[7px] rounded-lg border-0 bg-primary px-[18px] text-[12.5px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:pointer-events-none disabled:opacity-50'
export const numberInputClass =
  'h-8 w-full rounded-[7px] border border-input bg-transparent px-2 text-right text-[13px] text-foreground outline-none tnum focus:border-ring disabled:cursor-not-allowed disabled:opacity-60'

export function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-[5px] block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}

/** Inline banner. `bad` is announced as an alert; the others as status. */
export function Notice({ tone, icon, children }: { tone: 'bad' | 'warn' | 'muted'; icon?: ReactNode; children: ReactNode }) {
  return (
    <div
      role={tone === 'bad' ? 'alert' : 'status'}
      className={cn(
        'flex flex-shrink-0 items-center gap-2 rounded-lg px-[14px] py-[10px] text-[12.5px] font-medium',
        tone === 'bad' && 'bg-bad-bg text-bad-fg',
        tone === 'warn' && 'bg-warn-bg text-warn-fg',
        tone === 'muted' && 'bg-muted text-foreground',
      )}
    >
      {icon ?? (tone === 'bad' ? <CircleAlert className="size-[15px] flex-none" strokeWidth={2} /> : null)}
      <span>{children}</span>
    </div>
  )
}

export interface DocumentHeaderProps {
  title: string
  /** Record number shown as a mono pill. */
  no?: string
  status?: string
  subtitle?: string
  backLabel: string
  onBack: () => void
  /** Buttons at the right of the header. */
  actions?: ReactNode
}

/** The title row of a document: back button, title, number, status, subtitle, actions. */
export function DocumentHeader({ title, no, status, subtitle, backLabel, onBack, actions }: DocumentHeaderProps) {
  return (
    <div className="flex flex-none items-center gap-3 border-b border-border px-5 py-4">
      <button
        type="button"
        onClick={onBack}
        title={backLabel}
        aria-label={backLabel}
        className="hover-lift inline-flex size-8 flex-none items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-tint-12"
      >
        <ChevronLeft className="size-[15px]" strokeWidth={2} />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-[10px]">
          <h1 className="m-0 text-base font-bold tracking-[-0.01em]">{title}</h1>
          {no && (
            <span className="flex-none rounded-full bg-muted px-[10px] py-[3px] font-mono text-[12.5px] font-medium whitespace-nowrap text-muted-foreground">
              {no}
            </span>
          )}
          {status && <StatusPill label={status} />}
        </div>
        {subtitle && <div className="mt-[3px] text-[12.5px] text-muted-foreground">{subtitle}</div>}
      </div>
      {actions}
    </div>
  )
}

/** Loading placeholder for a document body. */
export function DocumentSkeleton() {
  return (
    <div className="flex flex-col gap-[18px]" aria-busy="true" aria-label="Loading">
      {[120, 220, 160].map((h) => (
        <div
          key={h}
          style={{ height: h }}
          className="animate-sf-shimmer rounded-xl bg-[linear-gradient(90deg,var(--muted)_25%,var(--border)_37%,var(--muted)_63%)] bg-[length:400%_100%]"
        />
      ))}
    </div>
  )
}
