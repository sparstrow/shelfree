/**
 * THE shortcut catalogue — the single source for Settings ▸ Keyboard shortcuts.
 *
 * A shortcut that is not listed here does not count as shipped (CLAUDE.md).
 * Templates and pages keep their descriptions as data beside the code that
 * handles the key and this module imports them:
 *   - `ListPage`           → `components/list-page/shortcut-meta.ts`
 *   - `DataGrid`           → `components/data-grid/shortcut-meta.ts`
 *   - `RecordPage`         → `components/record-page/shortcut-meta.ts`
 *   - `LineGrid`           → `components/document/shortcut-meta.ts`
 *   - saved views & favourites → `components/saved-views/shortcut-meta.ts`
 *   - a page's own keys    → `features/<module>/<page>/shortcuts.ts` (`ShortcutMeta`,
 *                            spread into `ListPage`'s `shortcuts` prop)
 * To add a page: give it a `shortcuts.ts` (or list its keys inline below when
 * they live in a bespoke handler), then add one group to `SHORTCUT_GROUPS`.
 */
import { DATA_GRID_SHORTCUTS } from '@/components/data-grid/shortcut-meta'
import { LINE_GRID_SHORTCUTS } from '@/components/document/shortcut-meta'
import { LIST_EDITOR_SHORTCUTS, LIST_PAGE_SHORTCUTS } from '@/components/list-page/shortcut-meta'
import { RECORD_PAGE_SHORTCUTS } from '@/components/record-page/shortcut-meta'
import { FAVORITES_VIEWS_SHORTCUTS } from '@/components/saved-views/shortcut-meta'
import { SETTINGS_FRAME_SHORTCUTS } from '@/components/settings/shortcut-meta'
import { PO_RECEIVE_SHORTCUT } from '@/features/purchasing/purchase-orders/shortcuts'
import { PRICE_CHANGE_SHORTCUT, PRICE_TIER_SHORTCUT } from '@/features/purchasing/purchase-prices/shortcuts'
import { type ShortcutEntry, shortcutEntry } from '@/lib/shortcuts'

export type { ShortcutEntry }

export interface ShortcutGroup {
  /** Stable id (used for keys and tests). */
  id: string
  /** Where the shortcuts apply. */
  title: string
  items: readonly ShortcutEntry[]
}

const group = (id: string, title: string, items: readonly ShortcutEntry[]): ShortcutGroup => ({ id, title, items })

/** Reference lists edited in the drawer: the standard list keys plus a page's own. */
const editorList = (id: string, title: string, noun: string, extra: readonly ShortcutEntry[] = []): ShortcutGroup =>
  group(id, title, [
    ...LIST_EDITOR_SHORTCUTS.map((s) => (s.combo === 'N' ? { ...s, desc: `New ${noun} — the drawer opens with sensible defaults already filled in.` } : s)),
    ...extra,
    ...LIST_PAGE_SHORTCUTS,
  ])

export const SHORTCUT_GROUPS: readonly ShortcutGroup[] = [
  group('global', 'Global', [
    { combo: 'Esc', desc: 'Close the topmost panel — context menu, drawer, dialog or description (one layer at a time).' },
    { combo: 'Click, then type in the page search', desc: 'Jump to any page; ↑ / ↓ move, Enter opens, Esc closes.' },
    { combo: '?', desc: 'On a Settings page: show or hide every description inline. Off by default; remembered per user.' },
  ]),
  group('data-grid', 'Data grid — every list page', DATA_GRID_SHORTCUTS),
  group('list-page', 'List pages — open and row menu', LIST_PAGE_SHORTCUTS),
  group('favorites-views', 'Favorites & saved views', FAVORITES_VIEWS_SHORTCUTS),
  group('record-page', 'Record pages — Vendor, Customer profile', RECORD_PAGE_SHORTCUTS),
  group('purchase-orders', 'Purchase orders', [
    shortcutEntry(PO_RECEIVE_SHORTCUT),
    { combo: 'Enter / double-click', desc: 'Open the active order.' },
  ]),
  group('purchase-lines', 'Purchase order lines', [
    { combo: 'Click Add line', desc: 'Search items the order’s vendor has an active price for. A new line starts at the vendor’s minimum qty.' },
    { combo: 'Enter', desc: 'In the item search: add the first match.' },
    { combo: 'Esc', desc: 'In the item search: cancel the new line.' },
    { combo: '↑ / ↓', desc: 'In a qty cell: move to the line above or below. Changing qty re-prices the line from the vendor’s tiers.' },
    ...LINE_GRID_SHORTCUTS.filter((s) => s.combo === 'Right-click a line'),
  ]),
  group('purchase-receipts', 'Purchase receipts', [
    { combo: 'R', desc: 'On the Purchase Orders grid: start a goods-in receipt against the active order.' },
    { combo: 'Enter', desc: 'On the Purchase Receipts grid: open the active receipt.' },
    { combo: 'F', desc: 'On a draft receipt: fill every line with the quantity still outstanding on the order.' },
    { combo: 'O', desc: 'On a receipt: jump to the purchase order it receives against.' },
    { combo: 'Ctrl/Cmd + Enter', desc: 'Post the draft receipt — stock lands at the receiving location and the order’s status follows.' },
    { combo: 'Esc', desc: 'Close the order picker, then leave the receipt.' },
  ]),
  group('purchase-prices', 'Purchase prices', [
    { combo: 'N', desc: 'New purchase price — vendor, item, from-qty tier, price and dates in the drawer.' },
    { combo: 'Click a cell', desc: 'Edit a price cell in place. Enter saves, Esc reverts.' },
    shortcutEntry(PRICE_CHANGE_SHORTCUT),
    shortcutEntry(PRICE_TIER_SHORTCUT),
    { combo: 'E', desc: 'Edit the selected price in the drawer.' },
    { combo: 'Right-click a row', desc: 'Change price, add tier, open vendor or item, delete.' },
  ]),
  editorList('charges', 'Charges', 'charge'),
  editorList('carriers', 'Carriers', 'carrier'),
  editorList('chart-of-accounts', 'Chart of accounts', 'account'),
  editorList('contacts', 'People › Contacts', 'contact'),
  group('contact-picker', 'Contact picker — carrier Contact field, vendor & customer Contacts tabs', [
    { combo: 'Click, ↓ or F4 on the field', desc: 'Open the searchable contact list.' },
    { combo: 'Type', desc: 'Search by name, phone, email, contact no. or the company they’re linked to.' },
    { combo: '↑ / ↓, PgUp / PgDn', desc: 'Move the highlight.' },
    { combo: 'Enter', desc: 'Pick the highlighted contact — on “Create …” it opens the quick-create form.' },
    { combo: 'Esc', desc: 'Back from quick create to the list, then close the picker (focus returns to the field).' },
    { combo: 'Tab / click outside', desc: 'Close without changing anything.' },
  ]),
  group('production', 'Production — BOMs & assembly orders', [
    { combo: 'N', desc: 'New bill of materials (on the BOM list) or new assembly order (on the Assembly Orders list).' },
    { combo: 'Enter / double-click', desc: 'Open the active row’s document.' },
    { combo: 'E', desc: 'On a BOM document: jump to the first component’s quantity field.' },
    { combo: 'Alt + ↑ / ↓', desc: 'On a BOM document: move the focused component line up or down.' },
    { combo: 'Ctrl/Cmd + Enter', desc: 'On an assembly order: advance the status — Release, then Start, then open the Finish dialog.' },
    { combo: 'Esc', desc: 'Close the item picker or dialog; from a document with nothing open, go back to the list.' },
  ]),
  group('item-card', 'Item card — new / edit item', [
    { combo: 'Ctrl/Cmd + S', desc: 'Create the item, or save the changes.' },
    { combo: 'Esc', desc: 'Discard and go back (to the item, or to the Items list).' },
  ]),
  group('document-lines', 'Document lines — purchase orders, receipts, BOMs, assembly orders', LINE_GRID_SHORTCUTS),
  group('notes', 'Notes (on any record)', [
    { combo: 'Ctrl/Cmd + Enter', desc: 'Add the note you’re typing. Notes are append-only — once added, nobody can edit or delete one.' },
  ]),
  group('settings-every-page', 'Settings — every page', [
    { combo: 'Hover a title, section or setting', desc: 'After a moment, shows what it does. Descriptions live only here — pages show names and controls.' },
    { combo: 'Tab to ⓘ, Enter', desc: 'Focus an ⓘ to read its details; Enter or Space keeps them open, with “Use default” where there is one.' },
    ...SETTINGS_FRAME_SHORTCUTS,
    { combo: 'Space (on a switch)', desc: 'Turn the focused switch on or off.' },
  ]),
  group('settings-uom', 'Settings › Units of measure', [
    ...LIST_EDITOR_SHORTCUTS.map((s) => (s.combo === 'N' ? { ...s, desc: 'New unit — the drawer opens with sensible defaults already filled in.' } : s)),
    { combo: 'Delete', desc: 'Delete the active unit — blocked for default units and units an item uses.' },
    ...LIST_PAGE_SHORTCUTS,
  ]),
  group('settings-number-sequences', 'Settings › Number sequences', [
    ...LIST_EDITOR_SHORTCUTS.map((s) => (s.combo === 'N' ? { ...s, desc: 'New series — starts on this module’s first document type, default only if that type has none.' } : s)),
    { combo: 'Delete', desc: 'Delete the active series — blocked once numbers were issued from it.' },
    ...LIST_PAGE_SHORTCUTS,
  ]),
  group('settings-carrier-types', 'Settings › Carrier types', [
    ...LIST_EDITOR_SHORTCUTS.map((s) => (s.combo === 'N' ? { ...s, desc: 'New carrier type.' } : s)),
    { combo: 'Delete', desc: 'Delete the active type — blocked for built-in types and types a carrier uses.' },
    ...LIST_PAGE_SHORTCUTS,
  ]),
  group('settings-statuses', 'Settings › Statuses & stages', [
    ...LIST_EDITOR_SHORTCUTS.map((s) => (s.combo === 'N' ? { ...s, desc: 'New status — starts on this module’s first document.' } : s)),
    { combo: 'Delete', desc: 'Delete the active status — blocked for system statuses.' },
    ...LIST_PAGE_SHORTCUTS,
  ]),
  group('settings-custom-fields', 'Settings › Custom fields', [
    ...LIST_EDITOR_SHORTCUTS.map((s) => (s.combo === 'N' ? { ...s, desc: 'New custom field — starts on this module’s first record type.' } : s)),
    { combo: 'Delete', desc: 'Delete the active field definition.' },
    ...LIST_PAGE_SHORTCUTS,
  ]),
  group('settings-payment-terms', 'Settings › Payment terms', [
    ...LIST_EDITOR_SHORTCUTS.map((s) => (s.combo === 'N' ? { ...s, desc: 'New payment term.' } : s)),
    { combo: 'Delete', desc: 'Delete the active term — blocked while a vendor or customer uses it.' },
    ...LIST_PAGE_SHORTCUTS,
  ]),
  group('settings-item-categories', 'Settings › Item categories', [
    ...LIST_EDITOR_SHORTCUTS.map((s) => (s.combo === 'N' ? { ...s, desc: 'New category — top-level, active, with the first accent colour.' } : s)),
    { combo: 'Delete', desc: 'Delete the active category — blocked while an item uses it; its sub-categories move up.' },
    ...LIST_PAGE_SHORTCUTS,
  ]),
  group('settings-locations', 'Settings › Locations & warehouses', [
    ...LIST_EDITOR_SHORTCUTS.map((s) => (s.combo === 'N' ? { ...s, desc: 'New location — set up as a Distribution site in India, status Setting up.' } : s)),
    { combo: 'Delete', desc: 'Delete the active location — blocked while it holds stock, has open documents or is the principal place.' },
    ...LIST_PAGE_SHORTCUTS,
  ]),
  group('settings-shortcuts', 'Settings › Keyboard shortcuts', [
    { combo: '/', desc: 'Focus the search box.' },
    { combo: 'Esc', desc: 'Clear the search.' },
  ]),
]

/** Groups with only the lines that match every word of `query` (in the group title, combo or description). */
export function filterShortcuts(groups: readonly ShortcutGroup[], query: string): ShortcutGroup[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return [...groups]
  const out: ShortcutGroup[] = []
  for (const g of groups) {
    const title = g.title.toLowerCase()
    const items = g.items.filter((s) => {
      const hay = `${title} ${s.combo} ${s.desc}`.toLowerCase()
      return words.every((w) => hay.includes(w))
    })
    if (items.length) out.push({ ...g, items })
  }
  return out
}
