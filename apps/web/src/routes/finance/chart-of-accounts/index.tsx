import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ChartOfAccountsPage } from '@/features/finance/chart-of-accounts/ChartOfAccountsPage'

export const Route = createFileRoute('/finance/chart-of-accounts/')({
  validateSearch: z.object({
    /** Account code whose drawer is open. */
    sel: z.string().optional(),
  }),
  component: ChartOfAccountsPage,
})
