import type { HelpMap } from '@/components/help/types'
import type { SettingsSectionComponent } from '@/components/settings/SettingsFrame'
import { BusinessProfileSection } from './business-profile/BusinessProfileSection'
import { BUSINESS_PROFILE_HELP } from './business-profile/help'
import { ShortcutsSection } from './shortcuts/ShortcutsSection'
import { UnitsOfMeasureSection } from './units-of-measure/UnitsOfMeasureSection'
import { UOM_HELP } from './units-of-measure/help'

/**
 * Sections already moved to the React app, by id (see `components/settings/registry.ts`
 * for the ids and areas). Port a section: build it from `SettingsSection` / `SettingsPage`
 * and add one line here. Anything missing shows "not moved yet" in the frame.
 */
export const SETTINGS_SECTIONS: Readonly<Record<string, SettingsSectionComponent>> = {
  'ws-profile': BusinessProfileSection,
  shortcuts: ShortcutsSection,
  uom: UnitsOfMeasureSection,
}

/** Quiet-help maps keyed by section id, used by central Settings "Find a setting". */
export const SETTINGS_HELP_MAPS: Readonly<Record<string, HelpMap>> = {
  'ws-profile': BUSINESS_PROFILE_HELP,
  uom: UOM_HELP,
}
