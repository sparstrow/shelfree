import type { ComponentType } from 'react'
import { BusinessProfileSection } from './business-profile/BusinessProfileSection'
import { ShortcutsSection } from './shortcuts/ShortcutsSection'
import { UnitsOfMeasureSection } from './units-of-measure/UnitsOfMeasureSection'

/**
 * Sections already moved to the React app, by id (see `components/settings/nav.ts`
 * for the ids). Port a section: build it from `SettingsSection` / `SettingsPage`
 * and add one line here. Anything missing shows "not moved yet" in the frame.
 */
export const SETTINGS_SECTIONS: Readonly<Record<string, ComponentType>> = {
  'ws-profile': BusinessProfileSection,
  shortcuts: ShortcutsSection,
  uom: UnitsOfMeasureSection,
}
