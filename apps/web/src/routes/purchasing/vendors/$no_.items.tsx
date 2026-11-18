import { createFileRoute } from '@tanstack/react-router'
import { VendorPurchaseItemsPage } from '@/features/purchasing/vendor-purchase-items/VendorPurchaseItemsPage'

/** One vendor's purchase items (rows from Purchase Prices). */
export const Route = createFileRoute('/purchasing/vendors/$no_/items')({
  component: VendorPurchaseItemsRoute,
})

function VendorPurchaseItemsRoute() {
  const { no } = Route.useParams()
  return <VendorPurchaseItemsPage vendorNo={no} />
}
