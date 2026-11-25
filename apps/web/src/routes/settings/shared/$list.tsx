import { createFileRoute, notFound } from '@tanstack/react-router'
import { z } from 'zod'
import { SettingsFrame } from '@/components/settings/SettingsFrame'
import { findSection } from '@/components/settings/registry'
import { SETTINGS_HELP_MAPS, SETTINGS_SECTIONS } from '@/features/settings/sections'

export const Route = createFileRoute('/settings/shared/$list')({
  validateSearch: z.object({
    /** Row key to scroll to and highlight when opened from Find a setting. */
    find: z.string().optional(),
  }),
  beforeLoad: ({ params }) => {
    if (!findSection('shared', params.list)) throw notFound()
  },
  component: SharedListSettingsRoute,
})

function SharedListSettingsRoute() {
  const { list } = Route.useParams()
  const { find } = Route.useSearch()
  return (
    <SettingsFrame
      area="shared"
      sectionId={list}
      sections={SETTINGS_SECTIONS}
      helpMaps={SETTINGS_HELP_MAPS}
      highlightRow={find}
    />
  )
}
