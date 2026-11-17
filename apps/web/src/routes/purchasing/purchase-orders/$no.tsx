import { createFileRoute } from '@tanstack/react-router'
import { PurchaseOrderEditor } from '@/features/purchasing/purchase-orders/PurchaseOrderEditor'

/** The purchase order document. `$no` is an order number, or `new`. */
export const Route = createFileRoute('/purchasing/purchase-orders/$no')({
  component: PurchaseOrderRoute,
})

function PurchaseOrderRoute() {
  const { no } = Route.useParams()
  return <PurchaseOrderEditor routeNo={no} />
}
