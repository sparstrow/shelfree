import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ItemsPage } from '@/features/warehouse/items/ItemsPage'

export const Route = createFileRoute('/warehouse/items/')({
  validateSearch: z.object({
    /** Item number whose preview drawer is open. */
    sel: z.string().optional(),
  }),
  component: ItemsPage,
})
