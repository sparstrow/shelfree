/**
 * THE DOCUMENT PAGE TEMPLATE — purchase orders, receipts, BOMs, assembly
 * orders… The template owns the frame: breadcrumb top bar, title row with
 * back button, scrolling body, sticky footer, and the loading / error /
 * not-found states. A document supplies its sections and footer buttons.
 */
import { useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { TopBar } from '@/app/shell/TopBar'
import { DocumentHeader, type DocumentHeaderProps, DocumentSkeleton, Notice } from './parts'

export type DocumentState =
  | { kind: 'ready' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string; retry?: () => void }

export interface DocumentPageProps {
  /** Breadcrumb name, e.g. "Purchase Order". */
  pageLabel: string
  /** Where Back goes, e.g. `/purchasing/purchase-orders`. */
  backTo: string
  header: Omit<DocumentHeaderProps, 'onBack'>
  state?: DocumentState
  /** Left side of the footer (destructive or secondary, e.g. Cancel order). */
  footerStart?: ReactNode
  /** Right side of the footer (Discard / Save / Issue…). Omit for no footer. */
  footerEnd?: ReactNode
  /** The document's sections. */
  children?: ReactNode
}

export function DocumentPage({
  pageLabel,
  backTo,
  header,
  state = { kind: 'ready' },
  footerStart,
  footerEnd,
  children,
}: DocumentPageProps) {
  const navigate = useNavigate()
  const ready = state.kind === 'ready'
  return (
    <>
      <TopBar pageLabel={pageLabel} />
      <section
        data-screen-label={pageLabel}
        className="flex min-h-0 min-w-0 flex-1 animate-sf-fade flex-col overflow-hidden"
      >
        <DocumentHeader {...header} onBack={() => void navigate({ to: backTo })} />
        <div className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-auto p-5">
          {state.kind === 'loading' && <DocumentSkeleton />}
          {state.kind === 'error' && (
            <Notice tone="bad">
              {state.message}{' '}
              {state.retry && (
                <button type="button" className="underline" onClick={state.retry}>
                  Try again
                </button>
              )}
            </Notice>
          )}
          {ready && children}
        </div>
        {ready && (footerStart || footerEnd) && (
          <div className="flex flex-none items-center justify-between gap-3 border-t border-border bg-panel px-5 py-3">
            {footerStart}
            <div className="ml-auto flex items-center gap-2">{footerEnd}</div>
          </div>
        )}
      </section>
    </>
  )
}

/** A card section inside a document body. */
export function DocumentCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={'flex-shrink-0 rounded-xl border border-border bg-card ' + (className ?? 'px-[18px] py-4')}>{children}</div>
}

/** The totals card: rows of label/value, the last one emphasised. */
export function TotalsCard({
  rows,
  total,
  children,
}: {
  rows: { label: string; value: string; tone?: 'bad' }[]
  total: { label: string; value: string }
  children?: ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-[14px]">
      {rows.map((row) => (
        <div
          key={row.label}
          className={
            'flex items-center justify-between py-[5px] text-[13px] ' + (row.tone === 'bad' ? 'text-bad-fg' : 'text-muted-foreground')
          }
        >
          <span>{row.label}</span>
          <span className={'tnum ' + (row.tone === 'bad' ? '' : 'text-foreground')}>{row.value}</span>
        </div>
      ))}
      <div className="mt-1.5 flex items-center justify-between border-t border-border pt-[10px] pb-1 text-[15px] font-bold">
        <span>{total.label}</span>
        <span className="tnum">{total.value}</span>
      </div>
      {children}
    </div>
  )
}
