import type { ShortcutEntry } from '@/lib/shortcuts'

/** What the data grid does with keys and mouse, for the Keyboard shortcuts page. Keep in step with `DataGrid.tsx`. */
export const DATA_GRID_SHORTCUTS: readonly ShortcutEntry[] = [
  { combo: '↑ / ↓', desc: 'Move the active row and open its preview drawer, auto-scrolling the grid to keep it in view.' },
  { combo: 'Space', desc: 'Toggle the checkbox on the active row for bulk actions.' },
  { combo: 'Shift + click a row', desc: 'Select every row from the last clicked row to this one (replaces the selection), like Excel.' },
  { combo: 'Ctrl/Cmd + click a row', desc: 'Add or remove one row from the selection.' },
  { combo: 'Shift + click a checkbox', desc: 'Tick every row from the last ticked row to this one.' },
  { combo: 'Enter', desc: 'Open the active row.' },
  { combo: '/', desc: 'Focus the grid’s search-all-columns box.' },
  { combo: 'Esc', desc: 'Close the preview drawer, then clear the selection.' },
  { combo: 'Click a column header', desc: 'Sort by that column; click again to flip direction.' },
  { combo: 'Shift + click a header', desc: 'Add the column as a secondary sort; numbered badges show sort priority.' },
  { combo: 'Alt + ← / Alt + →', desc: 'Previous / next page of rows — same as the arrows in the pagination bar below the table.' },
  { combo: 'Right-click a row', desc: 'Row menu — the page’s row actions.' },
]
