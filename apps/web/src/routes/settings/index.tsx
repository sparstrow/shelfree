import { createFileRoute, redirect } from '@tanstack/react-router'
import { firstSection } from '@/components/settings/nav'
import { useUi } from '@/app/stores/ui'

/** `/settings` lands on the first section the signed-in role may open. */
export const Route = createFileRoute('/settings/')({
  beforeLoad: () => {
    const section = firstSection(useUi.getState().demoRole === 'member' ? 'user' : 'workspace')
    throw redirect({ to: '/settings/$section', params: { section }, replace: true })
  },
})
