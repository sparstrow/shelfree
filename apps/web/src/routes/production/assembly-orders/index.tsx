import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { AssemblyOrdersPage } from '@/features/production/assembly-orders/AssemblyOrdersPage'

export const Route = createFileRoute('/production/assembly-orders/')({
  validateSearch: z.object({
    /** Assembly order number whose preview drawer is open. */
    sel: z.string().optional(),
  }),
  component: AssemblyOrdersPage,
})
