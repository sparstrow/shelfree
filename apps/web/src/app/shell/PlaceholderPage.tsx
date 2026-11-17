import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { PathIcon } from '@/app/icons'
import { ICON_FALLBACK } from '@/app/nav'
import { TopBar } from './TopBar'

export interface PlaceholderPageProps {
  title: string
  icon?: string
  /**
   * `pending` — the screen exists in the prototype and is waiting to be moved.
   * `unbuilt` — the screen was never built in the prototype either.
   */
  kind: 'pending' | 'unbuilt'
}

/** Stand-in for a page that is not in the React app yet. */
export function PlaceholderPage({ title, icon = ICON_FALLBACK, kind }: PlaceholderPageProps) {
  return (
    <>
      <TopBar />
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
        <div className="flex flex-1 animate-sf-fade flex-col items-center justify-center gap-[14px] p-12 text-center">
          <div className="flex size-16 items-center justify-center rounded-[18px] bg-muted text-muted-foreground">
            <PathIcon d={icon} size={28} strokeWidth={1.6} />
          </div>
          <div>
            <div className="text-[17px] font-bold tracking-[-0.01em]">{title}</div>
            <div className="mx-auto mt-1.5 max-w-[340px] text-[13px] text-muted-foreground">
              {kind === 'pending'
                ? 'This screen has not been moved to the new app yet. It still runs in the prototype.'
                : 'This screen is not built yet.'}
            </div>
          </div>
          <Link
            to="/$module/$page"
            params={{ module: 'purchasing', page: 'purchase-orders' }}
            className="hover-lift inline-flex h-[34px] items-center gap-[7px] rounded-lg border border-border bg-card px-[14px] text-[13px] font-medium text-foreground hover:bg-tint-16"
          >
            Go to Purchase Orders
            <ArrowRight className="size-[14px]" strokeWidth={2} />
          </Link>
        </div>
      </section>
    </>
  )
}
