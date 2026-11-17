import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ChargesPage } from '@/features/purchasing/charges/ChargesPage'

export const Route = createFileRoute('/purchasing/charges/')({
  validateSearch: z.object({
    /** Charge code whose drawer is open. */
    sel: z.string().optional(),
  }),
  component: ChargesPage,
})
