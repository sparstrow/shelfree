import type { ShortcutEntry } from '@/lib/shortcuts'

/**
 * Saved views and sidebar favourites, for the Keyboard shortcuts page. Keep in
 * step with `DataGrid.tsx` (view keys), `ViewsMenu.tsx` and `app/shell/Sidebar.tsx`.
 */
export const FAVORITES_VIEWS_SHORTCUTS: readonly ShortcutEntry[] = [
  { combo: 'Ctrl/Cmd + S', desc: 'On a list: save the current filters, sorts, columns and row density into the active saved view. With no saved view active, opens “Save as new view”.' },
  { combo: 'Ctrl/Cmd + Shift + S', desc: 'On a list: open the Views menu on the name box to save the current state as a new view.' },
  { combo: 'Ctrl/Cmd + D', desc: 'On a list: pin or unpin the page, or the saved view you are on. Filters you have not saved are saved as “<Page> · my view” first, ready to rename in the sidebar.' },
  { combo: 'Ctrl/Cmd + 1 … 9', desc: 'Open favorite number 1 … 9 (a view favorite opens its page with the view applied).' },
  { combo: 'Ctrl/Cmd + Alt + F', desc: 'Expand the sidebar and focus the first favorite.' },
  { combo: '↑ / ↓ in the Views menu', desc: 'Move between views and their buttons (default, pin, rename, duplicate, delete). Esc backs out of naming, then closes the menu.' },
  { combo: 'Right-click a sidebar page', desc: 'Add to or remove from favorites, open in a new tab. Shift + F10 or the Menu key does the same from the keyboard.' },
  { combo: 'Right-click a favorite', desc: 'Rename (views), open in a new tab, move up, move down, remove. Shift + F10 or the Menu key opens it from the keyboard.' },
  { combo: 'Drag a favorite', desc: 'Drop it on another favorite to reorder.' },
  { combo: 'Enter / Esc in a rename box', desc: 'Save or cancel the new name of a view favorite (clicking away saves).' },
]
