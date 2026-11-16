import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { PurchaseOrdersPage } from '@/features/purchasing/purchase-orders/PurchaseOrdersPage'

export const Route = createFileRoute('/purchasing/purchase-orders/')({
  validateSearch: z.object({
    /** Order number whose preview drawer is open. */
    sel: z.string().optional(),
  }),
  component: PurchaseOrdersPage,
})
