import type { ShortcutEntry } from '@/lib/shortcuts'

/** What every `RecordPage` (Vendor, Customer…) does with the keyboard. Keep in step with `RecordPage.tsx`. */
export const RECORD_PAGE_SHORTCUTS: readonly ShortcutEntry[] = [
  { combo: '[ / ]', desc: 'Move to the previous / next tab on the profile.' },
  { combo: '1…9, 0', desc: 'Jump straight to a tab — 1 is the first tab, 0 the tenth.' },
  { combo: 'E', desc: 'Edit the record inline on this page — the same rows, their controls swapped in place.' },
  { combo: 'Ctrl/Cmd + S', desc: 'Save the edit in progress.' },
  { combo: 'Esc', desc: 'Cancel an in-progress edit; otherwise go back to the list with the row still selected.' },
]
