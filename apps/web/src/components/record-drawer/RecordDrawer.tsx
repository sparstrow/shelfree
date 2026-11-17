import { AlertTriangle, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { StatusPill } from '@/components/StatusPill'
import { cn } from '@/lib/utils'

export interface DrawerStat {
  value: string
  label: string
  tone?: 'bad'
}

export interface DrawerLine {
  key: string
  left: ReactNode
  right: string
  rightTone?: 'muted'
}

export interface DrawerFact {
  k: string
  v: string
}

export interface DrawerSection {
  heading: string
  rows: DrawerFact[]
}

export interface RecordDrawerProps {
  ariaLabel: string
  /** Record number (mono). */
  no: string
  status?: string
  title: string
  subtitle?: string
  stats?: DrawerStat[]
  /** Optional warning/notice banner displayed above the lines section. */
  notice?: ReactNode
  /** A compact read-only line list (order lines, what arrived…). */
  linesHeading?: string
  lines?: DrawerLine[]
  linesEmptyText?: string
  /** Named fact sections rendered before DETAILS with the same row styling. */
  sections?: DrawerSection[]
  /** Extra content rendered between sections (or stats/lines) and DETAILS. */
  beforeFacts?: ReactNode
  facts?: DrawerFact[]
  /** Extra content between the facts and the footer. */
  children?: ReactNode
  /** Footer action buttons. */
  footer?: ReactNode
  onClose: () => void
}

export const drawerPrimaryButton =
  'hover-lift inline-flex h-[30px] flex-1 items-center justify-center gap-1.5 rounded-lg border-0 bg-primary text-[12.5px] font-semibold text-primary-foreground hover:bg-primary-hover'
export const drawerSecondaryButton =
  'hover-lift inline-flex h-[30px] flex-none items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground hover:bg-tint-12'
export const drawerDangerIconButton =
  'hover-lift inline-flex h-[30px] w-[34px] flex-none items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:border-bad-fg hover:bg-bad-bg hover:text-bad-fg disabled:pointer-events-none disabled:opacity-40'

function FactSection({ heading, rows, className }: { heading: string; rows: DrawerFact[]; className: string }) {
  return (
    <div className={className}>
      <div className="my-1.5 text-[11px] font-semibold tracking-[0.05em] text-muted-foreground">{heading}</div>
      {rows.map((fact) => (
        <div
          key={fact.k}
          className="flex justify-between gap-[10px] border-b border-dashed border-border py-[5px] text-[12.5px]"
        >
          <span className="text-muted-foreground">{fact.k}</span>
          <span className="tnum min-w-0 text-right font-medium break-words">{fact.v}</span>
        </div>
      ))}
    </div>
  )
}

/** The 336 px preview panel beside a list: tier one of the record navigation. */
export function RecordDrawer({
  ariaLabel,
  no,
  status,
  title,
  subtitle,
  stats,
  notice,
  linesHeading,
  lines,
  linesEmptyText = 'Nothing here yet.',
  sections,
  beforeFacts,
  facts,
  children,
  footer,
  onClose,
}: RecordDrawerProps) {
  return (
    <aside
      aria-label={ariaLabel}
      className="flex w-[336px] flex-none animate-sf-fade flex-col overflow-hidden rounded-[10px] border border-border bg-card"
    >
      <div className="flex items-start gap-2 border-b border-border px-[14px] pt-[13px] pb-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[13px] font-semibold">{no}</span>
            {status && <StatusPill label={status} />}
          </div>
          <div className="mt-1 text-sm leading-[1.3] font-semibold">{title}</div>
          {subtitle && <div className="mt-0.5 text-[12.5px] text-muted-foreground">{subtitle}</div>}
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Close (Esc)"
          aria-label="Close preview"
          className="hover-lift flex size-[26px] flex-none items-center justify-center rounded-[7px] border-0 bg-transparent text-muted-foreground hover:bg-tint-16 hover:text-foreground"
        >
          <X className="size-[14px]" strokeWidth={2} />
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {stats && stats.length > 0 && (
          <div className="flex gap-2 border-b border-border px-[14px] py-3">
            {stats.map((stat, i) => (
              <div key={stat.label} className={cn('flex-1 text-center', i > 0 && 'border-l border-border')}>
                <div className={cn('tnum text-base font-bold', stat.tone === 'bad' && 'text-bad-fg')}>{stat.value}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="mx-[14px] mt-3 flex items-center gap-2 rounded-[8px] bg-warn-bg px-3 py-[9px] text-[12px] font-medium text-warn-fg"
          >
            {typeof notice === 'string' ? (
              <>
                <AlertTriangle className="size-[14px] flex-none" strokeWidth={2} aria-hidden="true" />
                <span>{notice}</span>
              </>
            ) : (
              notice
            )}
          </div>
        )}

        {lines && (
          <div className="px-[14px] pt-[14px] pb-1">
            <div className="mb-[9px] text-[11px] font-semibold tracking-[0.05em] text-muted-foreground">{linesHeading}</div>
            <div className="flex flex-col gap-2">
              {lines.length === 0 && <div className="text-[12.5px] text-muted-foreground">{linesEmptyText}</div>}
              {lines.map((line) => (
                <div
                  key={line.key}
                  className="flex justify-between gap-[10px] border-b border-dashed border-border py-[5px] text-[12.5px]"
                >
                  <span className="min-w-0">{line.left}</span>
                  <span className={cn('tnum flex-none text-right font-medium', line.rightTone === 'muted' && 'text-muted-foreground')}>
                    {line.right}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {sections?.map((section) => (
          <FactSection key={section.heading} heading={section.heading} rows={section.rows} className="px-[14px] pt-2 pb-1" />
        ))}

        {beforeFacts}
        {facts && <FactSection heading="DETAILS" rows={facts} className="px-[14px] pt-2 pb-[14px]" />}
        {children}
      </div>

      {footer && (
        <div className="border-t border-border px-3 py-[10px]">
          <div className="flex gap-2">{footer}</div>
        </div>
      )}
    </aside>
  )
}
