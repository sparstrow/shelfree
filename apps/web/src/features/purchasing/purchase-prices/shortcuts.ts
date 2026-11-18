import type { ShortcutMeta } from '@/lib/shortcuts'

/** Purchase Prices list — also read by the Keyboard shortcuts page. */
export const PRICE_CHANGE_SHORTCUT: ShortcutMeta = {
  key: 'p',
  shift: true,
  description: 'Change the active price (a new row replaces it from today)',
}

export const PRICE_TIER_SHORTCUT: ShortcutMeta = {
  key: 't',
  shift: false,
  description: 'Add a quantity tier for the active price’s vendor and item',
}
