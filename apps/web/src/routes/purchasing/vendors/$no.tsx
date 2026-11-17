import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { PlaceholderPage } from '@/app/shell/PlaceholderPage'
import { VendorProfilePage } from '@/features/purchasing/vendors/VendorProfilePage'

/** The vendor profile. `$no` is a vendor number; `?tab=` is the open tab. */
export const Route = createFileRoute('/purchasing/vendors/$no')({
  validateSearch: z.object({
    tab: z.string().optional(),
  }),
  component: VendorProfileRoute,
})

function VendorProfileRoute() {
  const { no } = Route.useParams()
  // Creating a vendor is a later task: `new` keeps the placeholder.
  if (no === 'new') return <PlaceholderPage title="New vendor" kind="pending" />
  return <VendorProfilePage no={no} />
}
