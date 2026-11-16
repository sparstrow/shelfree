import { Outlet, useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useUi } from '@/app/stores/ui'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Sidebar } from './Sidebar'
import { TabStrip } from './TabStrip'
import { describePath } from './use-active-page'

/** App frame: sidebar · workspace tabs · the routed page. */
export function AppShell() {
  const theme = useUi((s) => s.theme)
  const syncActiveTab = useUi((s) => s.syncActiveTab)
  const pushRecent = useUi((s) => s.pushRecent)
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  // The active workspace tab follows the URL; list pages feed "recent pages".
  useEffect(() => {
    if (pathname === '/') return
    syncActiveTab(pathname)
    const at = describePath(pathname)
    if (at.kind === 'page' && at.rest.length === 0) pushRecent(pathname)
  }, [pathname, syncActiveTab, pushRecent])

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
        <Sidebar />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <TabStrip />
          <Outlet />
        </main>
        <Toaster position="bottom-right" />
      </div>
    </TooltipProvider>
  )
}
