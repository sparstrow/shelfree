import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { SalesPricesPage } from '@/features/sales/sales-prices/SalesPricesPage'

export const Route = createFileRoute('/sales/sales-prices/')({
  validateSearch: z.object({
    /** Customer price id whose drawer is open. */
    sel: z.string().optional(),
    /** Customer no. to filter the customer prices tab to (from Customer profile). */
    customer: z.string().optional(),
    /** Item no. to filter the customer prices tab to. */
    item: z.string().optional(),
    /** Active tab (`list` | `customer` | `check`). */
    tab: z.enum(['list', 'customer', 'check']).optional(),
    /** When `'1'`, open the New customer price drawer pre-filled with `?customer=` / `?item=`. */
    new: z.string().optional(),
  }),
  component: SalesPricesPage,
})
