import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ItemUnitsPage } from '@/features/warehouse/units-of-measure/ItemUnitsPage'

export const Route = createFileRoute('/warehouse/units-of-measure/')({
  validateSearch: z.object({
    /** Composite item-unit key (`<itemNo> · <code>`) whose preview drawer is open. */
    sel: z.string().optional(),
  }),
  component: ItemUnitsRoute,
})

function ItemUnitsRoute() {
  const { sel } = Route.useSearch()
  return <ItemUnitsPage sel={sel} />
}
