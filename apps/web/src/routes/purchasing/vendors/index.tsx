import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { VendorsPage } from '@/features/purchasing/vendors/VendorsPage'

export const Route = createFileRoute('/purchasing/vendors/')({
  validateSearch: z.object({
    /** Vendor number whose preview drawer is open. */
    sel: z.string().optional(),
  }),
  component: VendorsPage,
})
