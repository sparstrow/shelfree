import type { ShortcutEntry } from '@/lib/shortcuts'

/**
 * What every `ListPage` does with the keyboard, for the Keyboard shortcuts
 * page. Keep in step with the key handlers in `ListPage.tsx`.
 */
export const LIST_PAGE_SHORTCUTS: readonly ShortcutEntry[] = [
  { combo: 'Enter / double-click', desc: 'Open the active row — the record’s own page when it has one, otherwise its drawer.' },
  { combo: 'Right-click a row', desc: 'Row menu — view, edit, duplicate, open, open in new tab, copy number, delete (blocked when the rule says so).' },
]

/** Lists whose records are edited in the drawer (reference lists: charges, carriers, accounts, contacts…). */
export const LIST_EDITOR_SHORTCUTS: readonly ShortcutEntry[] = [
  { combo: 'N', desc: 'New record — the drawer opens with sensible defaults already filled in.' },
  { combo: 'E', desc: 'Edit the active record in the drawer.' },
  { combo: 'Ctrl/Cmd + Enter or Ctrl/Cmd + S', desc: 'Save the record you are editing.' },
  { combo: 'Esc', desc: 'Cancel the edit (a new record is discarded), then close the drawer.' },
]
