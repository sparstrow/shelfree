import { createFileRoute } from '@tanstack/react-router'
import { PurchaseOrdersPage } from '@/features/purchasing/purchase-orders/PurchaseOrdersPage'

export const Route = createFileRoute('/purchasing/purchase-orders/')({
  component: PurchaseOrdersPage,
})
