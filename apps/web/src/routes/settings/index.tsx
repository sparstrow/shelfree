import { createFileRoute, redirect } from '@tanstack/react-router'
import { useUi } from '@/app/stores/ui'
import { firstSection } from '@/components/settings/registry'

/** `/settings` lands on Business profile, or Profile for a member without workspace access. */
export const Route = createFileRoute('/settings/')({
  beforeLoad: () => {
    const area = useUi.getState().demoRole === 'member' ? 'personal' : 'workspace'
    throw redirect({
      to: '/settings/$section',
      params: { section: firstSection(area).id },
      replace: true,
    })
  },
})
