import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '@/app/shell/PlaceholderPage'

export const Route = createFileRoute('/settings')({
  component: () => <PlaceholderPage title="Settings" kind="pending" />,
})
