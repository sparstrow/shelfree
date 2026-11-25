import type { ShortcutMeta } from '@/lib/shortcuts'

/** Settings ▸ GST registrations — also read by the Keyboard shortcuts page. */
export const REGISTRATION_PRIMARY_SHORTCUT: ShortcutMeta = {
  key: 'p',
  shift: false,
  description: 'Make the active registration the primary one (it must be active and Normal).',
}

export const REGISTRATION_CANCEL_SHORTCUT: ShortcutMeta = {
  key: 'c',
  shift: false,
  description: 'Cancel the active registration — asks first; blocked for the primary and when a location would be left uncovered.',
}
