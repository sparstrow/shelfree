import type { ShortcutEntry } from '@/lib/shortcuts'

/**
 * Keyboard shortcuts owned by the Settings frame and every Settings page.
 * Keep in step with `SettingsFrame.tsx` and `SettingsPage.tsx`.
 */
export const SETTINGS_FRAME_SHORTCUTS: readonly ShortcutEntry[] = [
  { combo: '[ / ]', desc: 'Move to the previous / next settings section in the current list.' },
  { combo: '/', desc: 'In central Settings: focus Find a setting to jump to any section or row.' },
  { combo: '?', desc: 'Show or hide every description inline. Off by default; remembered per user.' },
  { combo: 'Ctrl/Cmd + S', desc: 'Save the unsaved changes on a settings page.' },
  { combo: 'Esc', desc: 'Close an open description, clear search, or discard unsaved changes.' },
]
