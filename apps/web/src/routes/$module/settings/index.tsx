import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { firstSection, isSettingsModule } from '@/components/settings/registry'
import { isModuleEnabledNow } from '@/data/queries/workspace-config'

/** `/<module>/settings` opens the module's first settings section (or `/settings` when the module is off). */
export const Route = createFileRoute('/$module/settings/')({
  beforeLoad: async ({ params, context }) => {
    if (!isSettingsModule(params.module)) throw notFound()
    if (!(await isModuleEnabledNow(context.queryClient, params.module))) throw redirect({ to: '/settings', replace: true })
    throw redirect({
      to: '/$module/settings/$section',
      params: { module: params.module, section: firstSection(params.module).id },
      replace: true,
    })
  },
})
