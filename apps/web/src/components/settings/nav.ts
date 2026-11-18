/**
 * Settings navigation — the prototype's `settingsGroups()`. Two scopes:
 * `workspace` (Workspace, Configuration, Terminology — owners and admins) and
 * `user` (My settings — everyone). Section ids are the URL segment:
 * `/settings/<id>`. Tiers are parked (CLAUDE.md "current working mode").
 */

export type SettingsScope = 'workspace' | 'user'

export interface SettingsSectionDef {
  /** URL segment and key in the section registry. */
  id: string
  label: string
}

export interface SettingsGroupDef {
  id: string
  label: string
  scope: SettingsScope
  sections: readonly SettingsSectionDef[]
}

export const SETTINGS_GROUPS: readonly SettingsGroupDef[] = [
  {
    id: 'workspace',
    label: 'Workspace',
    scope: 'workspace',
    sections: [
      { id: 'ws-profile', label: 'Business profile' },
      { id: 'ws-gst', label: 'GST registrations' },
      { id: 'ws-plan', label: 'Plan & billing' },
      { id: 'ws-modules', label: 'Modules & capabilities' },
      { id: 'ws-regional', label: 'Regional & format' },
      { id: 'ws-team', label: 'Team & roles' },
      { id: 'shortcuts', label: 'Keyboard shortcuts' },
    ],
  },
  {
    id: 'configuration',
    label: 'Configuration',
    scope: 'workspace',
    sections: [
      { id: 'uom', label: 'Units of measure' },
      { id: 'categories', label: 'Item categories' },
      { id: 'locations', label: 'Locations & warehouses' },
      { id: 'assembly', label: 'Assembly & production' },
      { id: 'carrier-types', label: 'Carrier types' },
      { id: 'cfg-nav', label: 'Navigation' },
      { id: 'cfg-favorites', label: 'Favorites & views' },
      { id: 'cfg-pricing', label: 'Sales pricing' },
      { id: 'cfg-terms', label: 'Payment terms' },
      { id: 'cfg-tax', label: 'Tax codes' },
      { id: 'cfg-taxset', label: 'Tax settings' },
      { id: 'cfg-states', label: 'States & territories' },
      { id: 'cfg-statuses', label: 'Statuses & stages' },
      { id: 'cfg-sequences', label: 'Number sequences' },
      { id: 'cfg-fields', label: 'Custom fields' },
    ],
  },
  {
    id: 'terminology',
    label: 'Terminology',
    scope: 'workspace',
    sections: [{ id: 'terminology', label: 'Rename labels' }],
  },
  {
    id: 'my',
    label: 'My settings',
    scope: 'user',
    sections: [
      { id: 'me-profile', label: 'Profile' },
      { id: 'me-appearance', label: 'Appearance' },
      { id: 'me-notifications', label: 'Notifications' },
      { id: 'me-language', label: 'Language & region' },
      { id: 'me-defaults', label: 'Personal defaults' },
      { id: 'me-favorites', label: 'Favorites & views' },
      { id: 'me-security', label: 'Security' },
    ],
  },
]

export interface FoundSection {
  group: SettingsGroupDef
  section: SettingsSectionDef
}

export function findSection(id: string): FoundSection | null {
  for (const group of SETTINGS_GROUPS) {
    const section = group.sections.find((s) => s.id === id)
    if (section) return { group, section }
  }
  return null
}

/** Where `/settings` lands: Business profile, or Profile for people without workspace access. */
export function firstSection(scope: SettingsScope): string {
  return scope === 'user' ? 'me-profile' : 'ws-profile'
}

export const SETTINGS_SCOPES: readonly { id: SettingsScope; label: string }[] = [
  { id: 'workspace', label: 'Workspace' },
  { id: 'user', label: 'My settings' },
]
