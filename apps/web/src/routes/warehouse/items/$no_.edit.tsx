import { createFileRoute } from '@tanstack/react-router'
import { ItemCard } from '@/features/warehouse/items/ItemCard'

/** Full-page Item card (`/warehouse/items/$no/edit`). */
export const Route = createFileRoute('/warehouse/items/$no_/edit')({
  component: ItemEditRoute,
})

function ItemEditRoute() {
  const { no } = Route.useParams()
  return <ItemCard mode="edit" routeNo={no} />
}
