import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { BomEditor } from '@/features/production/boms/BomEditor'

/** The bill of materials document. `$no` is a BOM number, or `new` (optionally with `?item=`). */
export const Route = createFileRoute('/production/bills-of-materials/$no')({
  validateSearch: z.object({
    /** Optional parent item no. when creating a new BOM from an item profile. */
    item: z.string().optional(),
  }),
  component: BomRoute,
})

function BomRoute() {
  const { no } = Route.useParams()
  const { item } = Route.useSearch()
  return <BomEditor routeNo={no} parentItem={item} />
}
