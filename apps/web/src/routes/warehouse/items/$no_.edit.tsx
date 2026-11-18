import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '@/app/shell/PlaceholderPage'

/** Full-page Item card placeholder — editing fields on an item is a later task. */
export const Route = createFileRoute('/warehouse/items/$no_/edit')({
  component: ItemEditPlaceholder,
})

function ItemEditPlaceholder() {
  const { no } = Route.useParams()
  return <PlaceholderPage title={`Edit item ${no}`} kind="pending" />
}
