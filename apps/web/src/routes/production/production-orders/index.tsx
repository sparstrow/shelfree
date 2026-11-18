import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { AssemblyOrdersPage } from '@/features/production/assembly-orders/AssemblyOrdersPage'

export const Route = createFileRoute('/production/production-orders/')({
  validateSearch: z.object({
    /** Assembly order number whose preview drawer is open. */
    sel: z.string().optional(),
  }),
  component: ProductionOrdersRoute,
})

function ProductionOrdersRoute() {
  const { sel } = Route.useSearch()
  return <AssemblyOrdersPage sel={sel} />
}
