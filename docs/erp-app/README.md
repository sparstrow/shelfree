# ERP app shell — `prototype/designs/erp/Shelfree App.dc.html`

## Overview

The flagship Shelfree ERP surface: a single-page app shell (icon rail → submenu
sidebar → topbar → content) that hosts six modules. It is the "main" prototype
referenced elsewhere in this design system as "the app".

Modules and their pages, as currently implemented (`modules()`):

- **Home** — Dashboard, Activity (placeholder pages)
- **Finance** — Chart of Accounts, General Ledger, Bank Accounts, Tax (placeholders)
- **Sales** — Catalog, Sales Orders, Sales Invoices, Customers (live table page), Sales Prices (placeholder)
- **Purchasing** — Purchase Orders (live table page + document editor), Purchase Receipts (live table page + document editor), Vendors (live table page), Purchase Prices, Purchase Invoices (placeholders)
- **Warehouse** — Items (live table page), Stock by Location, Transfer Orders, Physical Inventory (placeholders)
- **People** — Users, Employees (both live), Time Sheets (placeholder)

Note: the design-system readme's "Manufacturing" module is aspirational — it is
not one of the six modules implemented in this file today. If it's added, update
`modules()` and this doc together.

Catalog, Sales Orders, and Sales Invoices are **not** wired into this app shell
(they hit the shared placeholder page like any other unbuilt page here). Live,
standalone versions of those three exist as separate DCs under
`prototype/designs/erp/Sales - Marketing/` — see that folder's own docs; they are not
reachable by navigating this app.

Three "live" page types exist inside this shell:
1. **Table pages** — Items, Customers, Vendors, Purchase Orders (command bar + data grid + drawer/card/tab record nav)
2. **People pages** — Users, Employees (list/card toggle + filters + detail drawer)
3. **Settings pages** — organized into four setting types across two entry points
   (admin **Settings**: Workspace / Configuration / Terminology; **My settings**:
   avatar menu). Units of measure, Item categories, Locations & warehouses and
   Keyboard shortcuts were re-grouped under this structure (unchanged internally).
   Full spec in `docs/settings/README.md`.

Plus the full-page **Item detail** screen (warehouse page id `Item`), opened in
its own workspace tab from the Items grid — see `docs/item-page/README.md`.

Everything else (Dashboard, Activity, GL, Bank Accounts, Tax, Sales Prices,
Purchase Orders/Prices/Invoices, Stock by Location, Transfer Orders, Warehouse
Receipts/Shipments, Physical Inventory, Time Sheets) renders the shared
**placeholder page** (icon + "not built yet" message) — these are unbuilt, not
broken.

## Screens & states

### App chrome
- **Icon rail** (`navCollapsed` state) — collapsible; hover-expands into a flyout
  showing module pages when collapsed. Persisted (see Persistence). The
  **Settings** flyout lists the settings *groups* (Workspace / Configuration /
  Terminology, or My settings) — clicking one opens its current or first page.
  Flyouts are clamped to the viewport so bottom-rail items never clip.
- **Submenu sidebar** — full page list for the current module when rail is expanded.
- **Workspace tab strip** — a browser-style tab bar above the topbar (`state.tabs`,
  `activeTabId`, `tabSeq`). Each tab is a saved location `{ id, module, page,
  settingsOpen, settingsPage, selNo, pinnedNo }`. The active tab always mirrors the
  live location: `mirrorActiveTab()` runs at the top of `renderVals()` and copies
  `module/page/settings/selNo` into the active tab object in place, so no navigation
  method needs extra wiring. `+` (`newTab()`) opens a Home ▸ Dashboard tab; clicking
  a tab (`selectTab`) restores its location (grid state resets to the target dataset
  defaults via `tabLocationPatch`, mirroring `gotoPage`); the × (`closeTab`) removes
  a tab and activates its left neighbour. The last remaining tab is not closable
  (× hidden). `openTabAt(loc)` opens any location in a fresh active tab — this is the
  generic "open in new tab" primitive; use it for any page/record that needs one.
  A `pinnedNo` tab is dedicated to one item (label shows the item no) and un-pins
  itself when the user navigates it away from Warehouse ▸ Items.
- **Topbar** — breadcrumb (module / page, or Settings / sub-page), theme/search actions.
- **Ribbon tabs** (`ribbonTab`, HOME/etc.) — decorative command-ribbon concept, not wired to real actions beyond styling.
- **Purchasing ribbon group (Vendors only)**: a "Purchasing" group with an **Item** button
  appears in the HOME ribbon only when `isVendors` is true. It follows the same
  enable rule as Edit/View/Delete (`recDis`/`recBtnSt`/`recHover` — active only when a
  vendor is selected via `selNo` or a single checked row). Click (`openVendorItems()`)
  navigates in-app to a dedicated **Vendor Purchase Items** screen (`isVendorItems`,
  `module: 'purchasing'`, `page: 'Vendor Purchase Items'` — not in the sidebar's page
  list, reached only via this button) scoped to that vendor; a back arrow returns to
  the Vendors table.

### Table pages (Items / Customers / Vendors)
Shared machinery keyed by dataset id (`items` / `customers` / `vendors`):
- Command bar: search (`search`), column picker (`colsOpen`, `cols` — per-dataset
  visible/ordered columns, see `defaultCols()`), sort (`sortKey`/`sortDir`), saved views.
- Data grid with row selection (`selNo` / party equivalents), bulk-select + bulk toolbar (`bulkBtnSt`, `bulkDelete`).
- **Row inline edit**: `chipEdit` tracks a single cell being edited in place.
- **3-tier record navigation** (from `prototype/lib/record-nav.js`, shared by every list page):
  1. single-click row → opens the **side drawer** (quick preview card, `selOpen`)
  2. double-click row, drawer **"Open in new tab"**, row-menu **Open in new tab**, or **Enter** → opens the item **full-page in a new workspace tab** (warehouse page `Item`, `pinnedNo`) — see `docs/item-page/README.md`. (The old tier-2 centered card modal, `viewCardVM`/`openView`, was never rendered; `openView` now routes to the full page.)
  - Esc closes the deepest open surface first (tab → drawer), via `handleEsc()`.
- Delete flow: `delNo` holds the pending delete id (or `'__bulk__'` for a bulk delete), confirmed via a dialog.

#### Items grid — scale-adaptive columns (2026-08-01)

The Items dataset renders only the columns its workspace **scale axes** turn on
(Settings › Workspace › Modules & capabilities). `axisOn(key)` is the single
resolver: the workspace toggle must be on **and** the plan tier must reach the
axis's tier (`axisDefs()`); `zones` additionally requires `multiWarehouse`.

| Axis | Tier | Adds to the Items grid |
| --- | --- | --- |
| `multiWarehouse` | Growth | `location` column (primary site by qty, `+n` when stock sits at more sites) |
| `lotBatch` | Growth | `lot` column (`By lot` / `—`), label renameable via `field.lotBatch.label` |
| `expiry` | Growth | `expiry` column (`Tracked` / `—`) |
| `serial` | Enterprise | `serial` column (`By serial` / `—`) |
| `barcodes` | Growth | `barcode` column (the item's barcode) |

Axis **off = absent**, never locked or greyed: the column is missing from the
grid, the column picker, `itemFilterCols()` and the sort/group menus. The only
upgrade prompt lives in Settings, per the established gating pattern.
`syncAxisCols()` re-derives `state.cols` when an axis, plan tier or terminology
label changes — surviving columns keep the user's width/visibility/order, removed
columns are dropped along with any filter/sort/group that referenced them.

#### Location scope chip
When `multiWarehouse` is on and the user has a **My settings › Personal defaults
› Default location**, the Items grid loads pre-scoped to that site (`locScope`,
seeded from `me.defLocation` via `siteByCode()`), shown as a dismissible chip
above the grid. Clearing it is session-only — the stored preference is untouched.

#### Sites
`siteDefs()` is the single site list backing `item.locs` (`main` / `assembly` /
`east` / `returns` → TVM-Main, TVM-Assembly, CHN-DC, TVM-Returns). It also feeds
the Default-location options in My settings, which previously drifted to a stale
BLR/MUM list.

### Item card — full-page new / edit item (warehouse page `Item Card`)
Creating and editing an item is a **full-page document**, the same pattern as the
purchase-order and BOM editors — the old 500px "New item" modal and the drawer's
inline edit form are gone (a modal could not hold pricing + replenishment +
tracking without becoming a wall of fields).

- **State**: `itemCardMode` (`null | 'new' | 'edit'`) plus `editNo` for the record
  being edited, the `n*` form fields (`nNo`, `nDesc`, `nCat`, `nType`, `nUom`,
  `nVendor`, `nCosting`, `nPrice`, `nCost`, `nLead`, `nRp`, `nRq`, `nSs`,
  `nSellable`, `nBlocked`, `nTracksLot` / `nTracksExpiry` / `nTracksSerial` /
  `nBarcode`) and `icErr` for the single inline validation banner.
- **Entry points** (all route here — one edit surface, no divergence):
  ribbon **New** on the Items page (`itemCardOpenNew`), ribbon **Edit**, drawer
  **Edit**, row-menu **Edit**, view-card **Edit**, and **Edit** on the item
  full-page (`itemCardOpenEdit(no)` via `startPanelEdit` / `openEdit` /
  `itemEditFromPage`). `panelEdit` now only ever means customer/vendor quick-edit.
- **Layout**: header (back, title, item-no chip, Draft/Saved pill) → Identification
  (item no. + "Use next in sequence", description, category tree picker, item type,
  UoM) · Availability (sellable / blocked switches) → Pricing & costing (price,
  cost, costing method, live margin) · Purchasing & replenishment (preferred vendor,
  lead time, reorder point, reorder qty, safety stock) → Tracking (only the axes
  switched on) → footer Discard / Create item · Save changes.
- **Rules**: item no. is required, uppercased, unique on create and locked on edit;
  description and category required; numbers coerced (`icNum`, non-negative whole
  numbers for lead/rp/rq/ss); tracking flags still written only for axes that are on
  (`trackingPatch`); stock quantities are never editable here. `itemNextNo()`
  suggests `ITM#####` from the highest existing numeric suffix.
- **Save/exit**: `itemCardSave()` creates or patches the item, toasts, then returns
  to the Items list with the record selected; `itemCardBack()` discards. Esc closes
  the category picker first, then discards (`handleEsc`). **Ctrl/Cmd + S** and
  **Ctrl/Cmd + Enter** save from any field (listed in Settings › Keyboard shortcuts).
- **Tier**: Starter base, always on and ungated. The tracking block and the
  location terminology in the copy follow existing scale axes / terminology
  settings; no new settings surface is introduced.

### People (Users & Employees)
- `pplView` toggles table/card layout (persisted).
- Filters: `pplRoleFilter`, `pplDeptFilter`, `pplStatusFilter`, plus `pplSearch`.
- Row select opens a detail drawer (`pplSelOpen`) with a view/edit toggle (`pplEdit`).
- Users carry per-module permissions (`perms`: none/read/write per module id) and 2FA status.
- Employees carry dept/title/manager/status/type/join date.

### Settings — Units of measure, Item categories, Locations & warehouses, Keyboard shortcuts
- Reached via `settingsOpen` + `settingsPage` (`'uom' | 'categories' | 'locations' | 'shortcuts'`), with its own breadcrumb (`settingsCrumb`).
- **Units of measure**: seeded list (code/name/measurement category/UQC/conversion/symbol), searchable (`uomSearch`), user can add custom units — persisted.
- **Item categories**: parent/sub-category tree (`catGroups`, `catAll`), used to classify items; editable and persisted. **Not hardcoded in the app** — the tree ships with the catalogue data (`prototype/lib/shelfree-data.js` → `seedItemCategories()`, whose leaf names are exactly the `category` values used by `seedItems()`: Finished Goods › Sambrani Holder / Combo Pack, Consumables › Sambrani Cones, Accessory, Components › Ceramic Component / Raw Material, Packaging). On every load the app runs `reconcileItemCategories(storedOrSeedTree, items)`, which appends any category present on an item but missing from the tree as a root node (auto code + colour), so Settings can never drift from the item table. A user-saved tree in localStorage wins over the seed, and is still reconciled.
- **Item-level UoM**: each item can have a base unit + master-pack override, stored separately from the global UoM list. Managed on the **item profile page → Units of measure tab** (no longer a modal): base-unit picker, auto-derived master pack, the item's unit list with per-unit conversion editing, add-unit picker (from the global Settings list) and remove. The Items ribbon action `Actions ▸ Units of measure` opens the selected item's profile on that tab (`itemTab: 'units'`); `uomTargetNo()` resolves which item the UoM edits apply to (`uomCardNo || selNo`).
- **Keyboard shortcuts**: a reference-only page (`isShortcutsSettings`, `shortcutGroups()`) listing every shortcut/gesture built into the app so far, grouped by scope (Global, Data grid). Pure display — no state, no persistence. This is the living catalogue the CLAUDE.md "keyboard shortcuts" rule requires updating whenever a new shortcut ships.
- **Locations & warehouses**: mounted as a separate sibling Design Component, `SFLocationsWarehouses.dc.html`, via `<dc-import name="SFLocationsWarehouses" theme="{{ vm.theme }}">` inside the `isLocSettings` section — not inlined into this file's Component class. It manages its own warehouses/layouts state, view routing (list ↔ structure designer), and localStorage entirely internally; the only thing the shell passes in is the active `theme` so dark/light stays in sync with the rest of the app. See `docs/locations-warehouses/README.md` for the full spec (site list, 2D/3D structure designer, zones/aisles/bins, creation wizard).

### Theming (Tweaks)
Runtime-switchable via props/state, not user-facing product features:
- `startPage` — prototype-only landing override: "Module default" (uses `startModule`) or any "Module › Page", "Settings › <page>", "My settings › <page>". Resolved by `startPageResolve()`; changing it live navigates via `startPageApply()`. No backend equivalent (real landing page = user's Personal defaults › Landing page).
- `theme` (dark default / light), `corners` (soft/sharp — remaps structural radii only), `brand` (accent hex), `surface` (slate/mono/paper/soft palettes).

## Data model

Seed data lives in `prototype/lib/shelfree-data.js` (`seedAll()` returns the full bundle).

- **Item**: `no, desc, category, type, uom, vendor, cost, price, lead, rp` (reorder point), `rq` (reorder qty), `locs` (stock locations), plus supply/attribute fields. Derived: `onHand`, `available`, `committed`, `margin`, `_status` (Healthy/Low stock/Out of stock).
  - **Tracking depth** (added 2026-08-01, all optional, default off): `tracksLot: boolean`, `tracksExpiry: boolean`, `tracksSerial: boolean`, `barcode: string` (presence = has a barcode). Each is only readable/writable in the UI while its workspace axis is on; `trackingPatch()` refuses to write a flag whose axis is off, so a hidden control can never silently change stored data. Seeded in `prototype/lib/shelfree-data.js` by category (ceramics + cones are lot-tracked, cones/raw resin carry expiry, sellable SKUs get a GS1-IN `890…` barcode, nothing is serialised).
- **Order** (sales): `no, customer, orderDate, shipDate, location, status, lines`.
- **Invoice**: `no, customer, invDate, dueDate, amount, status` (Draft/Open/Overdue/Paid).
- **Product** (catalog): `sku, name, axis, children, msrp, channels, tags, blurb`.
- **Vendor**: flat record — `no, name, category, city, state, phone, paymentTerms, paymentMethod, balance, balanceDue, overdue, outstandingOrders, vendorSince, status` (derived via `vendorStatus()`), `purchasePerson` (Employee `id`, nullable — the responsible Purchasing employee; "unassigned" is `null`).
- **Customer**: `no, name, contact, phone, email, city, state, terms, balance, creditLimit, overdue, status, lastOrder, salesRep, openOrders`. `salesRep` is an Employee `id` (nullable — the responsible Sales employee; "unassigned" is `null`), not a free-text name — resolved to a display name via `empName()`.
- **PurchaseOrder**: `no, vendor` (Vendor `no` FK), `orderDate, expectedDate, location` (receiving site code), `status` (Draft | Open | Partially received | Received | Closed | Cancelled), `buyer` (Employee `id`, Purchasing dept, nullable), `notes`, `lines` (`{item, desc, qty, uom, unitCost}`). Subtotal/total are **derived** (`poSubtotal`), never stored. Live table page + in-shell document editor — see `docs/purchase-orders/README.md`.
- **Employee**: `id, name, title, dept, managerId, status, type, email, phone, location, joinDate`. `dept ∈ Operations | Manufacturing | Warehouse | Sales | Purchasing | Finance`. `status ∈ Active | On leave | Terminated`. `type ∈ Full-time | Part-time | Contractor`.
- **User**: `id, empId, name, email, role, status, twoFA, lastActive, perms`. `perms` = per-module access, one of `none | read | write`, keyed by module id. `status ∈ Active | Pending | Suspended`.
- **Item category** (custom, local): parent/sub tree, id/name/parent.
- **Unit of measure** (custom, local): `code, name, cat` (measurement category), `uqc`, `conv` (conversion string), `sym`, `custom` (user-added flag).
- **Item-level UoM map** (local, `shelfree.item.uom.v1`): item no → `{ list, base, pack, qty }` — the units added to the item, its base unit, the auto-computed master pack, and per-unit conversion quantities in base units. Backend: `item_uom` rows (item_id, uom_code, qty_in_base, is_base) with `master_pack` derived server-side as the unit holding the most base units; validate that the base unit is one of the item's units and that a unit can't be removed while it is the base or referenced by open documents.

## Interactions & business rules

- Record nav is a strict 3-tier funnel (drawer → card → tab); state lives in one `nav` slice per `prototype/lib/record-nav.js` so all list pages behave identically.
- Deep-linking: on load, a `no` query param (`deepLink()`) auto-selects a matching item and routes to Warehouse › Items.
- Column visibility/order and sort are per-dataset (`cols`, `sortKey/sortDir`) and reset via `defaultCols()`.
- Bulk actions (delete) operate on the current row multi-selection; single-row delete reuses the same confirm dialog with `delNo` set to the row id instead of `'__bulk__'`.
- **Row context menu**: right-click any row in the Items/Customers/Vendors grid (`state.rowCtx = {no, x, y, colKey}` — `colKey` is the specific cell right-clicked, via `data-col-key` on each cell) opens a floating menu (View, Edit, Open in new tab, Duplicate, Copy cell, Copy row, Delete) at the cursor position; closes on outside click, Escape, or Delete/Edit navigation. "Copy cell" copies just the right-clicked column's value (menu label names the column); "Copy row" copies every visible column's value for that row as a tab-separated line (paste-into-spreadsheet format). Independent of row selection (`selNo`/`selRows`) — acts on the right-clicked record directly.
- **Range selection (2026-10-24)**: Excel-style. Anchor = last plainly clicked / toggled row (`this._selAnchor`, instance-only). Shift+click row → `selRows` = anchor…row in current filtered+sorted order (replaces); Ctrl/Cmd+click toggles one row; Ctrl/Cmd+Shift+click and Shift+click on a checkbox add the range; Shift+↑/↓ extends from the anchor. Shift-mousedown suppresses text highlighting. Plain ↑/↓ resets the anchor. All grids using the shared row template.
- **Multi-row selection menu (2026-10-24)**: right-clicking a row that is part of a 2+ row selection sets `rowCtx.multi` and shows the selection menu instead (`msVM()`, `ms*` methods): **Open in new tabs** (items/customers/vendors), **Copy rows** (TSV with header = Ctrl/Cmd+C), **Copy numbers** (`PO00001, PO00009`), **Duplicate** (items/customers/vendors/purchase orders), **Change status** (purchase orders only — Issue / Cancel / Close, each showing "n of N" eligible; ineligible rows are skipped with the reason, op disabled at 0), **Export selected** (real CSV download of visible columns, UTF-8 BOM), **Delete** (shared confirm; POs: drafts only). Right-clicking an *unselected* row clears the selection and opens the single-row menu. The selection bar mirrors Copy / Duplicate / eligible status ops / Export / Edit / Delete. Status, duplicate and delete fire a 10 s Undo toast. Bulk **Edit** opens the one-column bulk edit popup on purchase orders / purchase lines (see `purchase-orders/` → Lock), plus **Edit column…** and **Lock** (Reopen / Lock) in the selection menu; other tables keep the old Edit behaviour. Starter base, ungated.
- **Duplicate** (`duplicateRecord`) clones an item/customer/vendor with a new `no` (`<original>-COPY`, `-COPY2`, … on collision) and `" (copy)"` appended to its description/name; not available for purchase orders. Purely client-side, no id-collision check beyond the in-memory list.
- **Grid keyboard navigation**: on the Items/Customers/Vendors/Purchase Orders table (not while typing in a field or with a modal open), ArrowUp/ArrowDown move `selNo` to the previous/next row in filter+sort order (auto-scrolls the grid via manual scrollTop math, not `scrollIntoView`), Space toggles the current row's checkbox, Enter opens the item full-page in a new tab (Items only \u2014 `openView`→`openInNewTab`; Customers/Vendors/Purchase Orders keep the drawer, so Enter is a no-op on those), Cmd/Ctrl+A selects every currently filtered row.
- **Text-input right-click menu** (`state.inputCtx = {el, x, y, hasSelection, isEmpty, readOnly}`): a single document-level `contextmenu` listener (not per-field wiring) intercepts right-click on any enabled `<input type="text|search|email|tel|url|password|number">` or `<textarea>` app-wide and shows a themed Undo / Cut / Copy / Paste / Delete / Select All menu at the cursor, matching the native OS textbox menu this was modeled on. Undo/Cut/Copy use `document.execCommand`; Paste prefers `navigator.clipboard.readText()` with an `execCommand('paste')` fallback; Delete and Paste splice the value directly and dispatch a native `input` event via the prototype value-setter trick so React-controlled fields pick up the change. Items disable correctly (Cut/Copy/Delete need a selection, Cut/Paste/Undo need the field to be editable, Select All needs non-empty content). Closes on outside click or Escape.
- Item categories and units of measure are editable inline in Settings and immediately available to the Items table (category/UoM columns resolve through `catParentName`/`catSubName`/`itemUomFor`).
- **Salesperson / purchase person assignment**: the Customer edit panel has a "Sales rep" dropdown and the Vendor edit panel a "Purchase person" dropdown, each populated from `employees` filtered to the matching dept (`Sales` / `Purchasing`) via `deptEmployeeOptions(dept)` — Terminated employees are excluded from the picker (but a customer/vendor previously assigned to someone since terminated still displays their name via `empName()`, it just can't be re-selected). Storage is the employee `id`, not a name string, so column display, search, and the enum filter all resolve through `empName()`; the enum filter/search options are still derived from names in current use (`customerSalesReps()`/`vendorPurchasePersons()`), which stays consistent because `colRaw`/`searchBlob` resolve the same way. Selecting the blank "Unassigned" option clears the field to `null`.
- **Company name and contact hints are never hardcoded in chrome.** The sidebar brand subtitle (`brandSub`), the Employees page subtitle, the invite/employee email placeholder (`emailPlaceholder`, derived from the workspace email domain) and the new-employee default location all read the workspace record via `wsName()` / `wsCityState()` / `wsEmailPlaceholder()`, so renaming the business in Settings → Workspace → Business profile updates every surface. Backend: these come from the tenant/organisation record; no client-side default should ship a company name.
- Theming/brand/corner/surface are presentation-only tweaks; they do not affect data or business rules.

## Data grid — production-grade roadmap

Brainstormed 2026-07-22 against the Items table (screenshot review). Grid already
has: sort, column resize/drag-reorder/pin/hide, group+collapse, saved views,
filters, global search, find/highlight, density toggle, checkbox multi-select +
bulk toolbar, totals/agg footer, autofit, empty state. Gaps to close, tracked
here and checked off as implemented:

**Interaction**
- [x] Row-level right-click context menu (View / Edit / Open in new tab / Duplicate / Copy No. / Delete) on Items, Customers, Vendors rows.
- [x] Keyboard grid navigation (partial): arrow keys move the active-row cursor + auto-scroll, Space toggles the cursor row's checkbox, Enter opens it, Cmd/Ctrl+A selects all visible rows. Double-click or Enter opens the item full-page in a new tab (Items only). Still open: Shift+arrow/click range-select, Cmd/Ctrl+click toggle-select, per-cell (vs per-row) cursor. Catalogued in Settings → Keyboard shortcuts.
- [ ] Inline cell edit (double-click a cell to edit in place) alongside the side drawer. *(still open — deferred: needs a per-dataset write path / colRaw setters; see Decisions below)*
- [~] Copy/paste: **Cmd+C copies the selected rows (or active row) as TSV with a header line** (`copyGridSelection()`), paste into a spreadsheet. Paste **into** editable cells still open (rides on inline-edit).
- [x] Multi-column sort — click a header to sort; **Shift+click** adds it as a secondary/tertiary sort with numbered **1/2** priority badges; shift-clicking a sorted column cycles asc → desc → off. State is a `sorts: [{key,dir}]` array (with `sortKey`/`sortDir` mirrored to `sorts[0]` for back-compat); saved views persist the full `sorts` array. Catalogued in Settings → Keyboard shortcuts.

**Data at scale**
- [ ] Row virtualization (current DOM renders all rows; needed before this scales past a few hundred SKUs). *(still open — deferred: large rewrite against sticky columns + grouping + max-content layout; pagination/load-more is the lower-risk interim, see below)*
- [x] Per-column footer aggregation picker — when totals are shown (`showTotals` tweak), **click any footer cell** to pick None / Count / Sum / Average / Min / Max. Numeric columns get the full set; non-numeric get None/Count. Overrides stored per-dataset in `footerAggOverride`; column defaults still come from each col def's `agg`.
- [ ] Pagination or "load more" as an alternative to virtualization for slower backends. *(still open)*

**Visual/craft**
- [x] Negative values (e.g. Available going negative) get `--bad-fg` color, bold weight, and a `--bad-bg` cell tint.
- [x] Text-input right-click menu (Undo/Cut/Copy/Paste/Delete/Select All) app-wide, native-style, catalogued in Settings → Keyboard shortcuts.
- [x] Sticky-column scroll shadow on the frozen "No." column — the divider shadow on the header, body and totals cells now only appears once the grid is scrolled horizontally (`scrolledX` state, set from a scroll listener on the grid scroll container).
- [x] Explicit decision on zebra vs. hover-only rows: **decided hover-only** (with row-selection tint + find-match tint). Rationale: zebra striping fights the low-chroma dark surface and the frozen/negative-value cell tints, adding visual noise; hover-only keeps the grid calm and lets the meaningful tints (selected, low-stock, negative) read clearly. Not exposed as a tweak.
- [x] Loading skeleton state for the grid — shimmer rows (`sfShimmer` keyframe) shown for ~460ms whenever the active dataset changes (`gridLoading`, triggered in `componentDidUpdate` on dataset-id change). Backend note: swap the fixed timeout for the real fetch pending state.
- [x] Row-height micro-transition when density toggles — body cells animate their padding (`transition: padding .18s`), so Compact↔Comfortable eases instead of snapping.

**Persistence/robustness**
- [ ] Column widths/order/pin state and last-used view persisted per user (localStorage), not just saved views in memory. *(still open — deferred: hooks into both `changeDataset` reset paths + all column mutators; kept out of this pass to avoid regressions)*
- [x] Undo toast after delete/bulk-delete — delete/bulk-delete now fire a 10s toast with an **Undo** action (`toast(title, desc, {label, fn})`); any toast with an action runs for 10s (no-action toasts stay 3.6s) and shows a live countdown — a ticking `Ns` label on the Undo button plus a shrinking progress bar along the toast's bottom edge, driven by a 250ms interval started lazily in `toast()` — so the user can see the undo window closing; `confirmDelete` stashes the removed records with their original indices and `undoDelete` splices them back in place. The confirm dialog is still the primary guard.

Priority order agreed: row context menu → keyboard cell navigation → inline edit →
copy/paste → negative-value styling → virtualization.

**Implemented 2026-07-23:** multi-column sort, per-column footer aggregation picker,
copy-selection-as-TSV (Cmd+C), sticky-column scroll shadow, loading skeleton,
density row-height transition, undo-toast-after-delete, and the zebra-vs-hover
decision. **Still open:** inline cell edit + paste-into-cells (write path),
row virtualization + pagination/load-more, and per-user column-layout persistence.

## Persistence

All persistence is `localStorage`, scoped with versioned keys (no backend calls):

- `shelfree.nav.collapsed.v1` — icon rail collapsed state (`'1'`/`'0'`).
- `shelfree.ppl.view.v1` — People table/card view choice.
- `shelfree.cats.v2` — item category tree (seeded from `seedItemCategories()` on first load, then reconciled against `items` each load). Key bumped from `v1`, whose stored tree was the previous (door-catalogue) seed.
- `shelfree.uom.custom.v1` — units-of-measure list (seeded on first load).
- `shelfree.item.uom.v1` — per-item base-unit/master-pack override map.
- `shelfree.po.v1` — purchase-order list (seeded on first load, rewritten on every PO save/issue/cancel). See `docs/purchase-orders/README.md`.
- `shelfree.wh.v6` — owned by the sibling `SFLocationsWarehouses.dc.html`, not this file: warehouses, floors, and per-floor layouts (zones/aisles/bin overrides). See `docs/locations-warehouses/README.md`.

Record-nav state (`nav.sel`, `nav.tabs`, `nav.active`) and all table-page UI state
(search, filters, column config, selection) live only in component state — not
persisted across reloads.

Workspace tabs (`tabs`, `activeTabId`) are in-memory only — the session starts with
a single tab at the start location and tabs are not restored across reloads. A real
build could persist the open-tab set per user if desired.

## Backend-build notes

- Table pages, People, and Settings all assume a REST/query layer keyed by the
  same ids used here (`no` for items/orders/invoices/customers/vendors, `id` for
  employees/users/categories) — carry these through unchanged to avoid a remap layer.
- `Customer.salesRep` and `Vendor.purchasePerson` are foreign keys to `Employee.id` — enforce referential integrity (don't allow deleting/deactivating an employee still assigned as someone's rep without reassigning or nulling it first) and expose an actual dept-scoped employee lookup endpoint for the assignment dropdowns rather than the client-side `deptEmployeeOptions()` filter used here.
- `perms` (per-module read/write/none) implies a real authorization model is
  needed per module id (`home/finance/sales/purchasing/warehouse/people`) —
  currently client-side only and not enforced against any of the placeholder pages.
- Units of measure and item categories are user-editable master data in this
  prototype (localStorage); a real build needs CRUD endpoints plus referential
  integrity (e.g. don't allow deleting a UoM/category still referenced by an item).
- **Item categories are a first-class entity, not a string on the item.** Backend: `item_category(id, code UNIQUE per tenant, name UNIQUE per tenant, parent_id FK self, color, description, active)` with `item.category_id FK` (the prototype still stores the leaf *name* on the item — the migration must map name → id). Enforce: no cycles in `parent_id`, max depth 5 (matches `catMaxDepth()`), delete lifts children to the deleted node's parent (current frontend behaviour) and must be blocked or reassigned if items reference the node. Seeding a new tenant should create its category tree at onboarding rather than relying on a client-side reconcile; the reconcile exists here only because the prototype's catalogue is seed data.
- Locations & warehouses is a separate, larger data model (sites, floors, zones,
  aisles, bins) owned entirely by `SFLocationsWarehouses.dc.html` — see that
  doc's own Backend-build notes rather than treating it as covered here.
- Column configuration/sort/saved views are currently per-browser
  (`localStorage`-free, in-memory) — decide if this should be per-user server-side
  preference instead.
- Placeholder pages (Dashboard, GL, Bank Accounts, Tax, Sales Prices, Purchase
  Orders/Prices/Invoices, Stock by Location, Transfer Orders, Warehouse
  Receipts/Shipments, Physical Inventory, Time Sheets) have no data model yet —
  treat as unscoped, not as a spec.

### Decisions & deferred-to-backend

- **Item create/edit is a page, not a dialog** (2026-08-03). Items now use the
  `Item Card` full-page document like POs and BOMs; the modal and the drawer's
  inline edit form were removed so there is exactly one edit surface. Backend:
  `POST /items` and `PATCH /items/:no` behind the same validation the client does
  (unique + immutable `no`, required `desc`/`category`, non-negative numerics),
  plus server-side generation of the `ITM#####` sequence — the client's
  `itemNextNo()` is a max-suffix guess and will collide under concurrency.
  Tracking flags must be ignored for axes disabled on the workspace.

- **Danger/avatar colours are tokenised.** Solid destructive buttons (item /
  UoM / category delete) and the sidebar avatar now use `--danger` /
  `--danger-hover` / `--danger-fg` / `--avatar-bg` (defined per theme in
  `:root` and `[data-theme="light"]`) rather than inline `oklch(...)`/`#fff`.
  No behaviour change; enforces the "never hardcode colours" rule.
- **Scale-adaptive model is NOT yet implemented on any table page.** The
  approved spec (`docs/superpowers/specs/2026-07-21-scale-adaptive-product-model.md`)
  defines plan tiers (Starter/Growth/Enterprise), per-axis capability toggles,
  locked states, and upgrade prompts. None of that machinery exists in this
  file today. The placeholder-page copy references "plan gating" aspirationally;
  it is not built. **Backend implication:** the authoritative tier→feature
  entitlement matrix and enforcement live server-side (see the spec's "Deferred
  to backend"); the frontend will mirror it for UX only.
- **Per-feature tier + default on/off is not yet recorded** for the Items page
  (item-tracking-depth axis: lot/batch, serial, expiry, barcodes). To be filled
  in when gating lands, per the spec's success criteria.
- **Business rules the backend must enforce** (currently client-side only):
  referential integrity on `Customer.salesRep` / `Vendor.purchasePerson`
  (Employee FKs), per-module `perms`, and UoM/category delete-protection when
  still referenced by an item.


## Favorites & quick access (added 2026-08-03)

The sidebar gained a per-user **Favorites** section above `Home`, and every
sidebar page row gained a hover-revealed star plus a right-click menu (add/remove
favorite, open in new tab). The page-search palette now shows a **RECENT** group
of the last pages and records when the query is empty. The list-page view picker
is grouped (SYSTEM / MY VIEWS) with per-row pin and default-view controls, and
saved views persist per user instead of resetting on navigation.

New shortcuts (all in Settings ▸ Workspace ▸ Keyboard shortcuts under
*Favorites & views*): `Cmd/Ctrl+D` pin, `Cmd/Ctrl+1…9` jump to favorite,
`Cmd/Ctrl+S` save the active view, `Cmd/Ctrl+Shift+S` save as new view,
`Cmd/Ctrl+Alt+F` focus favorites.

New localStorage keys: `shelfree.favorites.v1`, `shelfree.views.v1`,
`shelfree.recents.v1`, `shelfree.fav.collapsed.v1` (all keyed by the mock
current user).

Full spec — data model, business rules, tier matrix, backend endpoints — lives in
[`docs/favorites-views/README.md`](../favorites-views/README.md).


## Navigation icons (added 2026-08-12)

Every navigable page now carries **one shared glyph**, defined once in
`pageIcons()` / `pageIcon(key)` in `prototype/designs/erp/Shelfree App.dc.html`. The map is
keyed by **module page label** (`'Items'`, `'Sales Prices'`, …), **settings page id**
(`'ws-profile'`, `'cfg-tax'`, …) and **settings group tab** (`'grp-workspace'`,
`'grp-configuration'`, `'grp-terminology'`, `'grp-my'`), plus `__view` (saved view)
and `__fallback` (generic document). Each entry is a single stroke-path `d` string
(multi-subpath) rendered from one `<path>`, so a page looks identical in every
surface it appears in:

- module submenu rows (expanded sidebar accordion),
- collapsed-rail flyout rows (modules, settings, favorites),
- settings sidebar page rows and the Workspace/Configuration/Terminology tabs,
- favorites rows (page favorites use the page glyph; saved views keep the view glyph),
- the placeholder page header (`vm.pageIconD`, keyed off the current page).

No data-model or persistence change — presentation only. When a **new page or
settings page is added, add its glyph to `pageIcons()` in the same turn**; an
unmapped key silently falls back to the document glyph. Document-level pages share
their list page's glyph (`'Purchase Order'` = `'Purchase Orders'`, `'Item'`/`'Item Card'`
= `'Items'`, `'Bill of Materials'` = `'Bills of Materials'`, `'Assembly Order'` =
`'Assembly Orders'`). Icons are decorative: every row keeps its text label, so this
adds no accessibility dependency on colour or glyph alone.


## List-page toolbar card + pagination (added 2026-08-14)

Ported from the `prototype/templates/customers-shadcn-concept` reference into the shared
table page (Items / Customers / Vendors / Purchase Orders / BOMs / Assembly
Orders), so every list page gets it at once.

### Screens & states
- **Toolbar card** — the controls above the grid now sit in one bordered card
  (`var(--card)` + `--border` + `--shadow`, 12px radius) containing, in order:
  1. **Page header row** — page title (`tableTitle`), record count
     (`itemCountLabel`), and the primary action button on the right
     (`newRecordLabel` = "New " + dataset singular → `rb.newItem`).
  2. **Controls row** (wraps at narrow widths) — saved-views picker, Add filter,
     quick search (flexes), table-control icon cluster (Find, Refresh, Columns,
     Density), **Actions** menu, Export menu.
  3. **Bulk-selection bar** — the existing selection bar (`hasSel`) moved *inside*
     the card, below the controls row: "N selected" + Edit / Adjust inventory
     (items only) / Delete / Clear.
- The ribbon's old **Page** group (Columns / Refresh / Find / Density) was removed
  and the tab strip no longer repeats the title + count — each control now lives
  in exactly one place (the card).
- **Actions menu** (`actionsMenuOpen`) — Edit (`recEdit`), View (`recView`),
  Select all rows (`selectAllVisible`), Delete (`recDelete`). Header line shows
  "N selected" when a multi-selection is active, else "RECORD". Nothing selected →
  a toast instead of a no-op. Closed by Esc (added to the Esc layer chain) or by
  the click-away scrim.
- **Pagination bar** — pinned, non-scrolling, below the grid area with a top
  border on `var(--panel)`: range text on the left, then Rows per page
  (10 / 20 / 50 / 100), "Page X of Y", and first / prev / next / last buttons
  (disabled buttons dim to 40% and drop their hover treatment).
  Range wording: `Showing 1–20 of 22 items` (dataset noun, `tabular-nums`);
  empty result reads `No items`.

### Data model / state
- `pageSize` (number, default **20**) and `gridPage` (0-based page index).
  **Naming caution:** `state.page` is the app's *current page name* — grid
  pagination must never reuse it.
- `actionsMenuOpen` (boolean).
- Derived per render: `pgSize`, `totalRows`, `pgCount`, `pgIdx` (clamped),
  `pgItems` = the filtered set sliced to the current page. The grid body,
  grouping, and the header select-all checkbox all operate on `pgItems`;
  the totals/aggregate row still aggregates the **whole filtered set**.

### Interactions & business rules
- Page is clamped to `0…pgCount-1` on every render; changing search or rows-per-page
  resets to page 1. Filter/sort/dataset changes clamp rather than reset.
- `↑`/`↓` row navigation follows rows across page boundaries: `moveGridCursor`
  sets `gridPage = floor(index / pageSize)` so the active row is always rendered.
- `Ctrl/Cmd + A` still selects every row matching search + filters (all pages);
  the header checkbox selects/clears the **current page** only.
- Keyboard: **Alt + ← / Alt + →** = previous / next page (grid pages only, guarded
  by the existing `onGrid`/`typing` checks). Listed in Settings → General →
  Keyboard shortcuts under the data-grid group.

### Persistence
- Currently session state only — `pageSize` and `gridPage` are not persisted.
  Intended: `pageSize` becomes a **user-level preference** (My settings →
  Personal defaults → "Rows per page"), `gridPage` stays ephemeral.

### Backend-build notes
- Pagination is client-side over the seeded array today. The real API must page
  server-side: `GET /api/{dataset}?view=&filter=&sort=&page=&pageSize=` returning
  `{ rows, total, page, pageSize }`. The footer's range/label text and the
  select-all-on-page semantics are driven by `total` + `page`/`pageSize`, so no
  UI change is needed when it moves server-side.
- Aggregate/total row must be computed over the **whole filtered set**, not the
  returned page — expose it as a separate aggregate response field
  (e.g. `{ aggregates: { balance: 123.45 } }`).
- "Select all rows" across pages needs a select-by-query contract (filter payload
  + count), not a list of ids, so bulk actions can run on large result sets.
- `pageSize` must be validated against an allowed set (10/20/50/100) and capped
  server-side regardless of what the client sends.

#### Decisions & deferred-to-backend
- **Tier:** Starter base, ungated — pagination and the toolbar card are universal.
- **Styling:** kept the app's existing inline `var(--…)` token styling rather than
  loading the Tailwind Play CDN into the 12k-line app shell; the shadcn *geometry*
  (32/36px control heights, 8px radii, muted-foreground labels) is matched by hand.
  Converting the shell to Tailwind/shadcn classes is deferred to the production
  (Claude Code) lift.
- **Deferred:** row virtualization (still renders a whole page of rows), a
  jump-to-page input, and persisting `pageSize` per user.


### Ribbon removed from list pages (2026-08-14)
The Dynamics-style command bar above the grid (tab strip `HOME / ACTIONS / NAVIGATE`
+ the New / Edit / View / Delete "Manage" ribbon) is gone — the shadcn-style toolbar
card replaces it. Its remaining actions moved into the **Actions** menu, scoped by
dataset: Items → Sales prices, Stock by location, Unit of measure; Vendors →
Purchase items (toasts if no vendor row is selected). `state.ribbonTab` and the
`rbTabs`/`rbIsHome`/`rbIsActions`/`rbIsNavigate` view keys are now unused by the
table page.


### Concept A — split header adopted (2026-08-15)
The toolbar card is gone. Prototyped in `prototype/templates/list-page-header-a/ListPageHeaderA.dc.html`, now live on all list pages:
- **Breadcrumb row** carries page identity and the primary action: `module / page` + a
  record-count chip (`recordCount`, tooltip = `itemCountLabel`) on the left; page search,
  notifications, a divider, and the **New <record>** button on the right. Chip and button
  render only when `isTable`.
- **Toolbar** is a single full-bleed band (`var(--panel)`, bottom border, 11px/20px padding)
  sitting flush above the grid — no card border, no radius, no page-title tier. Same
  controls as before: views, Add filter, search, icon cluster, Actions, Export.
- **Bulk-selection bar** stays inside that band, below the controls row, as a full-width strip.
This removes one horizontal band of chrome and stops the toolbar wrapping at common widths.

## Notes module (2026-09-20)

A new top-level sidebar module **Notes** (module id `notes`, single page
`Notes`) lists every note in the workspace in one table, keyed by a
**Reference** column holding each record's own primary key. It is registered in
`modules()`, `deptBuiltPages()`, `moduleIconD()` and `pplModules()` (so module
permissions cover it), and renders from `notesPageVM()`. The Vendors drawer
also gained a notes block. Full spec:
[`../notes/README.md`](../notes/README.md).

## Locations registry (2026-09-26, GST task 4)
`siteDefs()` (four hard-coded sites) is retired. `locDefs()` reads `state.warehouses`, loaded on boot from
`shelfree.wh.v7` (or `seedWarehouses()`), migrated by `whMigrate()` (state → GST code, country IN,
`pobStatus`, `managerEmpId`, `operatorVendorId`). Item stock is keyed by location id; legacy bucket keys map
via `locLegacyKey()`. `locMain()` (principal place, else first active) replaces the old `'main'` key for
committed stock. `locUsage()` feeds delete / state-change guards to the embedded Locations page, which
receives `gstStates`, `gstRegs`, `employees`, `vendors`, `usage`, `openLocId` and `onChange` /
`onAddRegistration` / `onOpened` callbacks (`whPropsVM()`). PO receiving-location options come from the
registry. See `docs/locations-warehouses/README.md`.


## People drawer — edit in place (2026-10-17)

Users / Employees detail drawer no longer swaps to a separate form. `pplSel.rows` (shared `ipRowFactory()`) lists the same rows in view and edit — Users: User ID, Email, Role, Status, Linked employee, Department; Employees: Employee ID, Job title, Department, Type, Status, Reports to, Email, Phone, Location, Joined, App account. Edit swaps editable values for controls in place; read-only rows stay text. Module permissions always render the None/Read/Write segmented control (disabled in view, live in edit) instead of switching from pills. The "Editing …" banner was removed. Stats strip shows in both modes. No data-model change.

## React app — shell, grid and data layer (2026-11-16)

The app now runs as `apps/web` (Vite, React 19, TypeScript, Tailwind v4,
shadcn/ui, TanStack Router + Query). Spec:
[`../superpowers/specs/2026-11-15-react-frontend-migration.md`](../superpowers/specs/2026-11-15-react-frontend-migration.md);
page status: [`../superpowers/plans/2026-11-15-react-frontend-migration.md`](../superpowers/plans/2026-11-15-react-frontend-migration.md).

**Where things are**

| Concern | File |
|---|---|
| Module / page registry, URLs (`/<module>/<page-slug>`) | `apps/web/src/app/nav.ts` |
| Sidebar, workspace tabs, top bar, page search | `apps/web/src/app/shell/` |
| UI state (theme, sidebar, tabs, favourites, recents, column widths, demo role) | `apps/web/src/app/stores/ui.ts` |
| Shared list grid (views, filters, search, sort, columns, density, selection, totals, paging, CSV export, row menu) | `apps/web/src/components/data-grid/` |
| Preview drawer, document header/fields, confirm dialog, notes thread | `apps/web/src/components/` |
| Entity schemas (zod) | `apps/web/src/data/schemas/index.ts` |
| Data seam (one async API per entity) | `apps/web/src/data/api/` |
| Multi-record commands (post receipt…) | `apps/web/src/data/api/commands.ts` |
| Workspace settings document | `apps/web/src/data/api/settings.ts` |
| Business rules (pure, unit-tested) | `apps/web/src/domain/` |

**Screens & states.** Every page in the registry has a URL. Pages not yet
moved show "This screen has not been moved to the new app yet" (or "is not
built yet" for pages the prototype never built). Every list and document has
loading (skeleton), empty and error (retry) states.

**Keyboard (grid).** ↑/↓ move the active row, Enter opens it, Space toggles
its checkbox, Esc closes the preview then clears the selection, `/` focuses
the quick search, Alt+←/→ change page, Shift-click a header adds a sort
column, Shift-click a row selects a range. Right-click a row for its menu.
Not yet ported: the Settings ▸ Keyboard shortcuts page itself (these must be
listed there when it is).

**Persistence (frontend today).** `localStorage` keys `shelfree.v2.<collection>`
(one per entity, seeded from `apps/web/src/data/seed/` on first use),
`shelfree.v2.settings` (workspace settings) and `shelfree.v2.ui` (per-browser
UI preferences). Prototype keys (`shelfree.*.v1`) are not read.

**Backend-build notes.** Each `data/api` collection method maps to one REST
endpoint (`GET /<collection>`, `GET /<collection>/{id}`, `PUT /<collection>/{id}`,
`DELETE /<collection>/{id}`); each command in `commands.ts` is one
transactional endpoint. The zod schemas are the request/response proposal.
`domain/` rules must be re-applied server-side. UI preferences
(`shelfree.v2.ui`) may move to a per-user preferences endpoint; nothing in
them is sensitive.

## Page templates (2026-11-17)

All screens are built from three shared templates so that layout and behaviour
change in one place. Rule and file map: root `CLAUDE.md` → "Page templates".

| Template | File | Used by |
|---|---|---|
| List page | `apps/web/src/components/list-page/ListPage.tsx` | Purchase Orders, Purchase Receipts, Purchase Lines, Vendors |
| List page + `editor` option (records edited in the drawer) | `ListPage.tsx` + `components/record-drawer/EditableDrawer.tsx` | Charges |
| Document page | `apps/web/src/components/document/DocumentPage.tsx` | Purchase order, Purchase receipt |
| Line grid (inside documents) | `apps/web/src/components/document/LineGrid.tsx` | PO lines (all features), receipt lines (quantities only) |
| Record page (profile with tabs) | `apps/web/src/components/record-page/RecordPage.tsx` (+ `components/record-fields/FieldRows.tsx` for in-place rows) | Vendor profile (Overview tab; Customer and Item to follow) |

**List page standard behaviour:** top bar with count and New button; data grid;
preview drawer whose footer is always *Open {record}* + page buttons + Delete;
row menu always *View · Open · Open in new tab · page actions · Copy number ·
Delete*; delete always asks to confirm and offers Undo; page single-key
shortcuts act on the active row. Delete rules per page are declared with
`blockedReason` (drafts-only orders, posted receipts blocked).

**Exceptions in use today:** Purchase Lines has no New, Delete or preview and
opens the parent order; receipt lines can't be added, removed, reordered or
selected; receipts start New from an order picker.

**Changed by the move (deliberate, for consistency):** the receipt drawer's
delete button and the row menu now read "Delete purchase receipt" (the record
name) like every other list; the PO drawer's Receive button and the receipt
drawer's Order button are page actions shown in the standard footer.

**Backend notes:** none — this is a frontend structure change; data, rules and
APIs are unchanged.

**Toasts (2026-11-17, deliberate change):** shown bottom-centre instead of the
prototype's bottom-right, because at bottom-right they covered the preview
drawer's Save / Cancel / Edit buttons for several seconds after every save.


## React app - saved views and sidebar favourites (2026-11-18)

The grid's **Views** menu now keeps the user's own saved views (save, update, rename, duplicate, default,
delete, dirty marker) and the sidebar **Favorites** section holds pages and views (rename, drag reorder, cap +
*Show all*, open, right-click menu). Both live in the shared `DataGrid` and `Sidebar`, so every list page has
them. Full behaviour, files, persistence and backend notes:
[`../favorites-views/README.md`](../favorites-views/README.md#react-app-2026-11-18).

- Files: `apps/web/src/components/saved-views/`, `src/domain/saved-views.ts`, `src/domain/favorites.ts`,
  `src/data/api/{index,commands,favorites}.ts`, `src/data/queries/favorites.ts`, `src/app/shell/Sidebar.tsx`.
- Persistence: `shelfree.v2.savedViews`, `shelfree.v2.favorites` (per-user data). `shelfree.v2.ui` no longer
  holds favourites; the old list is moved once on start.
- Backend: `/me/views` and `/me/favorites` (per user, session-scoped); see the favourites doc.
- `useUi` lost `favorites` / `toggleFavorite` and gained `setFavOpen`. The Departments page uses the same
  favourites hook as the sidebar.

## React app (2026-11-18)

### Grid: column menu, layout, grouping, find in view, footer totals

Template work in `apps/web/src/components/data-grid/` — every list page gets it with no page change. Pure
logic is `src/domain/grid-layout.ts` (tested in `grid-layout.test.ts`); view mapping is
`src/domain/saved-views.ts`.

- **Column menu** (header ▾ button or right-click a header): sort ascending / descending, pin to left / right
  (or unpin), move left / right, hide, group by this column / ungroup, autofit this column, autofit all, reset
  layout. Columns ▸ popover also lists columns in their current order, with a Totals row switch and Reset layout.
- **Resize** by dragging the header's right edge (min 48 px); **double-click** the edge autofits. Autofit width
  comes from the longest cell text and the header label (`fitWidth`, capped at 560 px).
- **Reorder** by dragging a header (the label is the drag handle; the target shows a primary insertion edge) or
  Move left / right in the menu.
- **Pins**: a column pinned left or right stays sticky with a divider (+ scroll shadow); the dataset's own frozen
  first column still works and can be unpinned. Display order is pinned-left, free, pinned-right.
- **Group by one column**: group header rows with label and the group's row count (over the whole filtered set),
  click to collapse / expand, *Collapse all / Expand all / Ungroup* in the strip under the toolbar. Groups are
  ordered by the column's raw value (numeric-aware, empty group last). Collapsed groups' rows leave the paged list
  (paging counts visible rows). Group rows are never the active row, are skipped by arrow keys and are not selected
  by range / select-all. `?group=<column key>` in the URL opens the grid grouped (kept over a default saved view's
  grouping). `column.groupable === false` keeps a column out of Group by; `column.hideable === false` stops it
  being hidden.
- **Find in view**: Ctrl/Cmd+F (or the toolbar button) opens the find bar; matching cells are highlighted and
  the grid keeps every row; Enter / Shift+Enter (or the arrows) step through matching rows and jump to their page;
  count "n of m matches" / "No matches"; Esc in the field closes it. With focus in the grid Esc closes the
  preview drawer first, then find, then clears the selection (the prototype's `handleEsc` order).
- **Footer totals**: the totals row is off by default (`showTotals` or Columns ▸ Totals row, remembered per dataset).
  Click a footer cell to choose None / Count / Sum / Average / Min / Max (numeric columns get all, others None and
  Count); each column starts at its `agg` default. The aggregate runs over every row of the current view.
- **Saved views** now store column order (array order of `columns`), widths, pins, `groupBy`, `collapsed` and the
  new optional `aggregates` map; the dirty marker compares them (a built-in view names no layout, so layout changes
  never make it dirty). Reset layout also restores default column visibility.
- Shortcuts catalogued in `components/data-grid/shortcut-meta.ts` (feeds Settings ▸ Keyboard shortcuts).
- Persistence: layout state is in memory per grid and travels with saved views (`shelfree.v2.savedViews`). Only the
  Totals row switch and footer aggregate overrides are remembered per dataset in `shelfree.v2.grid-prefs`
  (`src/app/stores/grid-prefs.ts`, a per-browser preference).
- Backend notes: `GET/POST/PUT /me/views` already carry `columns[]` (ordered; `width`, `visible`, `frozen`),
  `groupBy`, `collapsed[]`; add `aggregates` (object, column key → one of `none|count|sum|avg|min|max`, validate the
  keys against the page's columns and the values against that enum, ignore unknown keys on read). Grouping, find
  and footer aggregates are computed client-side over the loaded rows today; with server paging the backend
  needs `groupBy` (group headers with counts) and aggregate queries over the whole filtered set. Security
  checklist: no PII or new compliance surface (view state only); nothing sensitive in localStorage.

**Shell layout (2026-11-18):** the app shell and `html`/`body` use `overflow: clip`, so focusing a field or opening a popover can never scroll the document or the shell (it used to shift the whole app by up to 80 px). The top bar is a container: below ~670 px wide the New button shows its icon only (label kept as `title` / `aria-label`) and the page search shrinks to 120 px.
