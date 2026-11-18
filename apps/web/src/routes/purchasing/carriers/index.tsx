import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { CarriersPage } from '@/features/purchasing/carriers/CarriersPage'

export const Route = createFileRoute('/purchasing/carriers/')({
  validateSearch: z.object({
    /** Carrier code whose drawer is open. */
    sel: z.string().optional(),
  }),
  component: CarriersPage,
})
