import type { ShortcutEntry } from '@/lib/shortcuts'

/** What the line table inside a document does with the keyboard. Keep in step with `LineGrid.tsx`. */
export const LINE_GRID_SHORTCUTS: readonly ShortcutEntry[] = [
  { combo: '↑ / ↓', desc: 'In a line’s input: move to the same input on the line above or below.' },
  { combo: 'Esc', desc: 'Close the line menu first, then the add-line row.' },
  { combo: 'Right-click a line', desc: 'Line menu — duplicate, insert above or below, remove.' },
]
