import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { PlaceholderPage } from '@/app/shell/PlaceholderPage'
import { CustomerProfilePage } from '@/features/sales/customers/CustomerProfilePage'

/** The customer profile. `$no` is a customer number; `?tab=` is the open tab. */
export const Route = createFileRoute('/sales/customers/$no')({
  validateSearch: z.object({
    tab: z.string().optional(),
  }),
  component: CustomerProfileRoute,
})

function CustomerProfileRoute() {
  const { no } = Route.useParams()
  // Creating a customer is a later task: `new` keeps the placeholder.
  if (no === 'new') return <PlaceholderPage title="New customer" kind="pending" />
  return <CustomerProfilePage no={no} />
}
