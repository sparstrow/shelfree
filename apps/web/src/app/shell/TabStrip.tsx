import { useRouter } from '@tanstack/react-router'
import { Plus, X } from 'lucide-react'
import { ModuleIcon } from '@/app/icons'
import { useUi } from '@/app/stores/ui'
import { cn } from '@/lib/utils'
import { describePath, labelForPath } from './use-active-page'

/** Browser-style workspace tabs. Each tab remembers its own URL. */
export function TabStrip() {
  const router = useRouter()
  const tabs = useUi((s) => s.tabs)
  const activeTabId = useUi((s) => s.activeTabId)
  const selectTab = useUi((s) => s.selectTab)
  const closeTab = useUi((s) => s.closeTab)
  const openTab = useUi((s) => s.openTab)
  const closable = tabs.length > 1

  const go = (path: string) => router.history.push(path)

  return (
    <div
      role="tablist"
      aria-label="Workspace tabs"
      className="flex h-10 flex-none items-end gap-[3px] overflow-x-auto overflow-y-hidden border-b border-border bg-sidebar px-[10px]"
    >
      {tabs.map((tab) => {
        const active = tab.id === activeTabId
        const at = describePath(tab.path)
        const iconId = at.kind === 'page' ? at.module.id : at.kind === 'settings' ? 'settings' : at.kind === 'departments' ? 'departments' : 'home'
        const label = labelForPath(tab.path)
        return (
          <div
            key={tab.id}
            role="tab"
            tabIndex={0}
            aria-selected={active}
            title={label}
            onClick={() => {
              if (active) return
              selectTab(tab.id)
              go(tab.path)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                if (!active) {
                  selectTab(tab.id)
                  go(tab.path)
                }
              }
            }}
            className={cn(
              'inline-flex h-[33px] max-w-[210px] flex-none cursor-pointer items-center gap-[7px] rounded-t-lg border py-0 pr-1.5 pl-[11px] text-[12.5px] font-medium whitespace-nowrap transition-colors duration-[140ms]',
              active
                ? '-mb-px border-border border-b-background bg-background text-foreground'
                : 'border-transparent bg-transparent text-muted-foreground hover:bg-tint-7 hover:text-foreground',
            )}
          >
            <span className="flex size-[15px] flex-none items-center justify-center">
              <ModuleIcon id={iconId} size={15} />
            </span>
            <span className="min-w-0 flex-1 truncate">{label}</span>
            {closable && (
              <button
                type="button"
                title="Close tab"
                aria-label={`Close ${label} tab`}
                onClick={(e) => {
                  e.stopPropagation()
                  const next = closeTab(tab.id)
                  if (next) go(next)
                }}
                className="inline-flex size-[18px] flex-none items-center justify-center rounded-[5px] border-0 bg-transparent p-0 text-muted-foreground transition-colors duration-[120ms] hover:bg-[color-mix(in_oklab,var(--foreground)_15%,transparent)] hover:text-foreground"
              >
                <X className="size-3" strokeWidth={2.3} />
              </button>
            )}
          </div>
        )
      })}
      <button
        type="button"
        title="New tab"
        aria-label="New tab"
        onClick={() => {
          openTab('/home/dashboard')
          go('/home/dashboard')
        }}
        className="mb-1 ml-[3px] inline-flex size-7 flex-none items-center justify-center rounded-[7px] border-0 bg-transparent text-muted-foreground transition-[background-color,color,transform] duration-[140ms] hover:-translate-y-px hover:bg-tint-12 hover:text-foreground"
      >
        <Plus className="size-4" strokeWidth={2} />
      </button>
    </div>
  )
}
