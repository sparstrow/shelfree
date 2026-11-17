import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '@/app/shell/PlaceholderPage'

/** Customer profile placeholder — the full profile is a later task. */
export const Route = createFileRoute('/sales/customers/$no')({
  component: CustomerProfilePlaceholder,
})

function CustomerProfilePlaceholder() {
  const { no } = Route.useParams()
  return <PlaceholderPage title={`Customer ${no}`} kind="pending" />
}
