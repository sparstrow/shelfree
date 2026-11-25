import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { firstSection, isSettingsModule } from '@/components/settings/registry'

/** `/<module>/settings` opens the module's first settings section. */
export const Route = createFileRoute('/$module/settings/')({
  beforeLoad: ({ params }) => {
    if (!isSettingsModule(params.module)) throw notFound()
    throw redirect({
      to: '/$module/settings/$section',
      params: { module: params.module, section: firstSection(params.module).id },
      replace: true,
    })
  },
})
