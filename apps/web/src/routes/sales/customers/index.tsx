import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { CustomersPage } from '@/features/sales/customers/CustomersPage'

export const Route = createFileRoute('/sales/customers/')({
  validateSearch: z.object({
    /** Customer number whose preview drawer is open. */
    sel: z.string().optional(),
  }),
  component: CustomersPage,
})
