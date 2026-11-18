import { createFileRoute, notFound } from '@tanstack/react-router'
import { SettingsFrame } from '@/components/settings/SettingsFrame'
import { findSection } from '@/components/settings/nav'
import { SETTINGS_SECTIONS } from '@/features/settings/sections'

export const Route = createFileRoute('/settings/$section')({
  beforeLoad: ({ params }) => {
    if (!findSection(params.section)) throw notFound()
  },
  component: SettingsRoute,
})

function SettingsRoute() {
  const { section } = Route.useParams()
  return <SettingsFrame sectionId={section} sections={SETTINGS_SECTIONS} />
}
