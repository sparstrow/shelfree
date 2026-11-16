/**
 * Fallback for every `/module/page` URL that does not have its own route file
 * yet. Ported pages get an explicit route (e.g. `routes/purchasing/purchase-orders/`)
 * which takes precedence over this one.
 */
import { createFileRoute, notFound } from '@tanstack/react-router'
import { findPage } from '@/app/nav'
import { PlaceholderPage } from '@/app/shell/PlaceholderPage'

/** Screens that exist in the prototype and are waiting to be moved. */
const BUILT_IN_PROTOTYPE = new Set([
  'finance/chart-of-accounts',
  'sales/customers',
  'sales/sales-prices',
  'purchasing/purchase-orders',
  'purchasing/purchase-lines',
  'purchasing/purchase-receipts',
  'purchasing/vendors',
  'purchasing/purchase-prices',
  'purchasing/charges',
  'purchasing/carriers',
  'warehouse/items',
  'warehouse/units-of-measure',
  'production/bills-of-materials',
  'production/assembly-orders',
  'people/users',
  'people/employees',
  'people/contacts',
  'notes/notes',
])

export const Route = createFileRoute('/$module/$page')({
  loader: ({ params }) => {
    const hit = findPage(params.module, params.page)
    if (!hit) throw notFound()
    return hit
  },
  component: FallbackPage,
})

function FallbackPage() {
  const { module, page } = Route.useLoaderData()
  return (
    <PlaceholderPage
      title={page.label}
      icon={page.icon}
      kind={BUILT_IN_PROTOTYPE.has(module.id + '/' + page.slug) ? 'pending' : 'unbuilt'}
    />
  )
}
