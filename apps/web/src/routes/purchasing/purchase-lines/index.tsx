import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { PurchaseLinesPage } from '@/features/purchasing/purchase-lines/PurchaseLinesPage'

export const Route = createFileRoute('/purchasing/purchase-lines/')({
  validateSearch: z.object({
    /** Opens the report filtered to one item (from the Item page). */
    item: z.string().optional(),
  }),
  component: PurchaseLinesPage,
})
