import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { PurchaseReceiptsPage } from '@/features/purchasing/purchase-receipts/PurchaseReceiptsPage'

export const Route = createFileRoute('/purchasing/purchase-receipts/')({
  validateSearch: z.object({
    /** Receipt number whose preview drawer is open. */
    sel: z.string().optional(),
  }),
  component: PurchaseReceiptsPage,
})
