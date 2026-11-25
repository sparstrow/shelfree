/**
 * Workspace navigation defaults — the Departments page and its rows. Pure rules.
 * Per-person overrides (their own recents) belong to Personal settings. See docs/navigation/README.md.
 */

export interface NavigationSettings {
  /** The Departments page: its sidebar entry and URL (`/departments` goes home when off). */
  departments: boolean
  /** The "Jump back in" row on the Departments page. */
  jumpBackIn: boolean
  /** Pages that are not built yet stay on the map, greyed out and tagged Coming soon. */
  showUnbuilt: boolean
}

export const DEFAULT_NAVIGATION_SETTINGS: NavigationSettings = {
  departments: true,
  jumpBackIn: true,
  showUnbuilt: true,
}
