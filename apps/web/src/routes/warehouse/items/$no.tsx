import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '@/app/shell/PlaceholderPage'

/** Item profile placeholder — the full item page is a later task. */
export const Route = createFileRoute('/warehouse/items/$no')({
  component: ItemProfilePlaceholder,
})

function ItemProfilePlaceholder() {
  const { no } = Route.useParams()
  return <PlaceholderPage title={`Item ${no}`} kind="pending" />
}
