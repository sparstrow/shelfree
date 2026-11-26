import { createFileRoute, redirect } from '@tanstack/react-router'
import { settingsQueryOptions } from '@/data/queries/settings'
import { DEFAULT_LANDING } from '@/app/nav'
import { DepartmentsPage } from '@/features/departments/DepartmentsPage'

export const Route = createFileRoute('/departments/')({
  // Settings ▸ Navigation can switch the Departments page off: its URL then goes to the landing page.
  beforeLoad: async ({ context }) => {
    const settings = await context.queryClient.ensureQueryData(settingsQueryOptions)
    if (!settings.navigation.departments) {
      throw redirect({
        to: '/$module/$page',
        params: { module: DEFAULT_LANDING.module, page: DEFAULT_LANDING.slug },
        replace: true,
      })
    }
  },
  component: DepartmentsPage,
})
