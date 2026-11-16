import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext } from '@tanstack/react-router'
import { AppShell } from '@/app/shell/AppShell'
import { PlaceholderPage } from '@/app/shell/PlaceholderPage'

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: AppShell,
  notFoundComponent: () => <PlaceholderPage title="Page not found" kind="unbuilt" />,
})
