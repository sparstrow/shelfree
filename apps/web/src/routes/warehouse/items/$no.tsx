import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ItemCard } from '@/features/warehouse/items/ItemCard'
import { ItemProfilePage } from '@/features/warehouse/items/ItemProfilePage'

/** Item profile, or full-page Item card when `$no === 'new'`. */
export const Route = createFileRoute('/warehouse/items/$no')({
  validateSearch: z.object({
    tab: z.string().optional(),
  }),
  component: ItemProfileRoute,
})

function ItemProfileRoute() {
  const { no } = Route.useParams()
  if (no === 'new') return <ItemCard mode="new" />
  return <ItemProfilePage no={no} />
}
