import { createFileRoute, notFound } from '@tanstack/react-router'
import { z } from 'zod'
import { SettingsFrame } from '@/components/settings/SettingsFrame'
import { findSection, isSettingsModule } from '@/components/settings/registry'
import { SETTINGS_HELP_MAPS, SETTINGS_SECTIONS } from '@/features/settings/sections'

export const Route = createFileRoute('/$module/settings/$section')({
  validateSearch: z.object({
    /** Row key to scroll to and highlight when opened from Find a setting. */
    find: z.string().optional(),
  }),
  beforeLoad: ({ params }) => {
    if (!isSettingsModule(params.module)) throw notFound()
    if (!findSection(params.module, params.section)) throw notFound()
  },
  component: ModuleSettingsSectionRoute,
})

function ModuleSettingsSectionRoute() {
  const { module, section } = Route.useParams()
  const { find } = Route.useSearch()
  if (!isSettingsModule(module)) return null
  return (
    <SettingsFrame
      area={module}
      sectionId={section}
      sections={SETTINGS_SECTIONS}
      helpMaps={SETTINGS_HELP_MAPS}
      highlightRow={find}
    />
  )
}
