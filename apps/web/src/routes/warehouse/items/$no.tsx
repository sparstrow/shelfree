import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { PlaceholderPage } from '@/app/shell/PlaceholderPage'
import { ItemProfilePage } from '@/features/warehouse/items/ItemProfilePage'

/** Item profile. `$no` is an item number; `?tab=` is the open tab. */
export const Route = createFileRoute('/warehouse/items/$no')({
  validateSearch: z.object({
    tab: z.string().optional(),
  }),
  component: ItemProfileRoute,
})

function ItemProfileRoute() {
  const { no } = Route.useParams()
  // Full-page item creation is a later task: `new` keeps the placeholder.
  if (no === 'new') return <PlaceholderPage title="New item" kind="pending" />
  return <ItemProfilePage no={no} />
}
