import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { PurchasePricesPage } from '@/features/purchasing/purchase-prices/PurchasePricesPage'

export const Route = createFileRoute('/purchasing/purchase-prices/')({
  validateSearch: z.object({
    /** Price no. whose drawer is open. */
    sel: z.string().optional(),
    /** Vendor no. to filter the list to (from the vendor page's "Manage prices"). */
    vendor: z.string().optional(),
  }),
  component: PurchasePricesPage,
})
