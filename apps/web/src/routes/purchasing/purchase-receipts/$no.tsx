import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { PlaceholderPage } from '@/app/shell/PlaceholderPage'

/** The purchase receipt (goods-in) document. `$no` is a receipt number, or `new` with `?po=`. */
export const Route = createFileRoute('/purchasing/purchase-receipts/$no')({
  validateSearch: z.object({
    /** Purchase order to receive against (new receipts). */
    po: z.string().optional(),
  }),
  component: PurchaseReceiptRoute,
})

function PurchaseReceiptRoute() {
  const { no } = Route.useParams()
  return <PlaceholderPage title={no === 'new' ? 'New purchase receipt' : `Purchase receipt ${no}`} kind="pending" />
}
