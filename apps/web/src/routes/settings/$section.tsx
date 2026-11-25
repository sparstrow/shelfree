import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { SettingsFrame } from '@/components/settings/SettingsFrame'
import { findCentralSection, legacyTarget } from '@/components/settings/registry'
import { SETTINGS_HELP_MAPS, SETTINGS_SECTIONS } from '@/features/settings/sections'

export const Route = createFileRoute('/settings/$section')({
  validateSearch: z.object({
    /** Row key to scroll to and highlight when opened from Find a setting. */
    find: z.string().optional(),
  }),
  beforeLoad: ({ params }) => {
    const target = legacyTarget(params.section)
    if (target) {
      if (target.area.kind === 'module') {
        throw redirect({
          to: '/$module/settings/$section',
          params: { module: target.area.id, section: target.section.id },
          replace: true,
        })
      }
      if (target.area.kind === 'shared') {
        throw redirect({
          to: '/settings/shared/$list',
          params: { list: target.section.id },
          replace: true,
        })
      }
      throw redirect({
        to: '/settings/$section',
        params: { section: target.section.id },
        replace: true,
      })
    }
    if (!findCentralSection(params.section)) throw notFound()
  },
  component: SettingsSectionRoute,
})

function SettingsSectionRoute() {
  const { section } = Route.useParams()
  const { find } = Route.useSearch()
  const found = findCentralSection(section)
  if (!found) return null
  return (
    <SettingsFrame
      area={found.area.id}
      sectionId={found.section.id}
      sections={SETTINGS_SECTIONS}
      helpMaps={SETTINGS_HELP_MAPS}
      highlightRow={find}
    />
  )
}
