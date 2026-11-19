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
  { combo: 'Esc', desc: 'Close the Filters side panel (returning focus to the Filter button), then the preview drawer, then clear the selection.' },
  { combo: 'Enter / Space (in Filters)', desc: 'Expand or collapse a column section in the Filters side panel; Tab moves through sections and controls.' },
  { combo: 'Esc (in Filters)', desc: 'Close an open operator menu first, otherwise close the Filters side panel and return focus to the toolbar Filter button.' },
  { combo: 'Click a column header', desc: 'Sort by that column; click again to flip direction.' },
  { combo: 'Shift + click a header', desc: 'Add the column as a secondary sort; numbered badges show sort priority.' },
  { combo: 'Alt + ← / Alt + →', desc: 'Previous / next page of rows — same as the arrows in the pagination bar below the table.' },
  { combo: 'Right-click a row', desc: 'Row menu — the page’s row actions.' },
  { combo: 'Right-click a header / header ▾ button', desc: 'Column menu — sort, pin left / right, move left / right, hide, group by, autofit, autofit all, reset layout.' },
  { combo: 'Drag a column header', desc: 'Reorder columns (the column menu’s Move left / Move right does the same from the keyboard).' },
  { combo: 'Drag a column edge', desc: 'Resize the column.' },
  { combo: 'Double-click a column edge', desc: 'Autofit that column to its contents.' },
  { combo: 'Click a group row', desc: 'When the grid is grouped: collapse or expand that group. Arrow keys and selection skip group rows.' },
  { combo: 'Ctrl/Cmd + F', desc: 'Find in view — highlight matching cells in the rows shown and jump between them (the grid keeps every row).' },
  { combo: 'Enter / Shift + Enter (in find)', desc: 'Next / previous match.' },
  { combo: 'Esc (in find)', desc: 'Close find. With find open and focus in the grid, Esc closes the preview drawer first, then find, then clears the selection.' },
  { combo: 'Click a footer cell', desc: 'When the totals row is on (Columns ▸ Totals row): choose that column’s aggregate — None, Count, Sum, Average, Min or Max.' },
]
