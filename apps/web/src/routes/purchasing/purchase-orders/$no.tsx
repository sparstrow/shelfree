import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '@/app/shell/PlaceholderPage'

/** The purchase order document editor — next page to be moved from the prototype. */
export const Route = createFileRoute('/purchasing/purchase-orders/$no')({
  component: PurchaseOrderDocument,
})

function PurchaseOrderDocument() {
  const { no } = Route.useParams()
  return <PlaceholderPage title={no === 'new' ? 'New purchase order' : `Purchase order ${no}`} kind="pending" />
}
