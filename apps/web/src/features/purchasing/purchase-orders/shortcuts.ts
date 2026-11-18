import type { ShortcutMeta } from '@/lib/shortcuts'

/** Purchase Orders list — also read by the Keyboard shortcuts page. */
export const PO_RECEIVE_SHORTCUT: ShortcutMeta = {
  key: 'r',
  description: 'Start a goods-in receipt against the active order (issued orders with something still outstanding)',
}
