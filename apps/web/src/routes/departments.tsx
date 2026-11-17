import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '@/app/shell/PlaceholderPage'

export const Route = createFileRoute('/departments')({
  component: () => <PlaceholderPage title="Departments" kind="pending" />,
})
