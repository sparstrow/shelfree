import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { BomsPage } from '@/features/production/boms/BomsPage'

export const Route = createFileRoute('/production/bills-of-materials/')({
  validateSearch: z.object({
    /** BOM number whose preview drawer is open. */
    sel: z.string().optional(),
  }),
  component: BomsPage,
})
