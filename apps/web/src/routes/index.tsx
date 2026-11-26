import { createFileRoute, redirect } from '@tanstack/react-router'
import { DEFAULT_LANDING, findPage } from '@/app/nav'
import { settingsQueryOptions } from '@/data/queries/settings'
import { meQueryOptions } from '@/data/queries/session'
import { landingTarget } from '@/domain/personal-preferences'

/** Where the app opens: the user's landing page (Settings ▸ Personal defaults), else Purchasing ▸ Purchase Orders. */
export const Route = createFileRoute('/')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQueryOptions)
    const target = landingTarget(me.defLanding)
    const settings = await context.queryClient.ensureQueryData(settingsQueryOptions)
    // Departments only opens while that page is on (Settings ▸ Navigation).
    if (target?.kind === 'departments' && settings.navigation.departments) throw redirect({ to: '/departments', replace: true })
    if (target?.kind === 'page' && findPage(target.module, target.slug)) {
      throw redirect({
        to: '/$module/$page',
        params: { module: target.module, page: target.slug },
        replace: true,
      })
    }
    throw redirect({
      to: '/$module/$page',
      params: { module: DEFAULT_LANDING.module, page: DEFAULT_LANDING.slug },
      replace: true,
    })
  },
})
