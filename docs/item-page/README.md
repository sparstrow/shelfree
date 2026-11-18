# Item detail page — `prototype/designs/erp/Shelfree App.dc.html`

In-app full-page screen inside the ERP shell (not a separate file). It is the
tier-3 surface of the item record-navigation funnel: **grid drawer → full-page
item tab**. (The old tier-2 centered "card" modal — `viewCardVM`/`openView` — was
computed but never rendered; `openView` now routes to this page, so the funnel is
two real tiers: quick-preview drawer, then full page.)

Tier: **Starter base** (ungated). Every store needs to inspect an item; no plan
gate. Default on.

## Overview

A dedicated, read-first page for one inventory item, opened in its own workspace
tab so users can keep several items (and the list) open side by side. Shows stock
position, pricing/margin, replenishment settings, item attributes, and the
purchase orders that reference the item.

## Screens & states

- **Entry points** (all resolve to `openInNewTab(no)` → a new workspace tab at
  `module:'warehouse', page:'Item', selNo:no, pinnedNo:no`):
  - **Double-click** an Items grid row (`r.open`, items dataset only).
  - Items drawer **"Open in new tab"** button (`selTab`).
  - Row **context menu → Open in new tab** (`rowCtxOpenTab`).
  - **Enter** on the active grid row (`openView` → `openInNewTab`, Items only).
- **Header**: back button (→ Items list, keeps the item selected in the drawer),
  item no (mono chip), description (title), status pill (In stock / Low stock /
  Out of stock / Blocked), and a meta line `type · category path · UoM`. Actions:
  **Duplicate**, **Delete**, **Edit** (primary → returns to the Items list and
  opens the item's edit panel in the drawer).
- **Sub-tabs** (`itemTab` state: `overview | stock | purchasing`, default
  `overview`; underline style, content cross-fades):
  - **Overview** — 4 KPI cards (On hand / Available / Committed / Incoming) +
    Details fact grid + Attributes (empty state when the item has none).
  - **Stock & locations** — same KPI row + stock-by-location bars (Main /
    Assembly / East DC / Returns) with a total-on-hand row, a reorder callout
    (shown only when Available ≤ reorder point, with a suggested order qty), and
    a Replenishment card (reorder point / reorder qty / safety stock).
  - **Purchasing** — Sourcing card (preferred vendor, unit cost, lead time,
    reorder point/qty) + a **Purchase Orders** table cross-referencing every PO
    whose lines include this item (PO no, vendor, status pill, qty, order date;
    row click opens that PO in a new tab). Empty state when no PO references it.
- **Missing state** (`ipMissing`): if the pinned item no longer exists (e.g. it
  was deleted), the page shows a "no longer available" panel with a Back button.

## Scale-adaptive behaviour (2026-08-01)

The **Stock & locations** tab reshapes with the workspace scale axes (see
`docs/erp-app/README.md` for the axis→tier table and `axisOn()`):

- `multiWarehouse` **off** → no per-site table; the card names the single location
  the stock sits at (the KPI strip above already carries on hand / available /
  committed, so it is not repeated).
- `multiWarehouse` **on** → per-site rows (bar + qty) and a total, as before.
- `zones` **on** → each site row expands to its bin allocation. Bin-level counts
  are not captured yet (Purchase Receipts is still a placeholder), so every
  site currently shows a single `Unassigned · no bin` row plus a note saying
  where bin counts will come from.
- `lotBatch` / `expiry` / `serial` **on** *and* the item flagged for that kind of
  tracking → a card per tracking kind (lot + expiry merge into one) rendering its
  **empty state**. Actual lot numbers, expiry dates and serials are captured on
  receipt/shipment — deliberately out of scope for this pass.
- The Overview **Details** list gains one fact per on-axis tracking field
  (`Tracked` / `Not tracked`, and the barcode value) via `trackingFacts()`.

The item's tracking flags are edited in the Items drawer edit panel's
**Tracking** section, not on this page (the page stays read-first).

## Data model

No new persisted fields. The page is a read view over the existing **Item**
record (`prototype/lib/shelfree-data.js` → `seedItems()`): `no, desc, category, type, uom,
vendor, cost, price, lead, rp, rq, ss, costing, locs{main,assembly,east,returns},
qtySO, qtySupply, attrs, blocked`. Derived via existing helpers: `onHand`,
`available`, `committed`, margin, `_status`. The Purchasing tab reads
`state.purchaseOrders` and matches `po.lines[].item === item.no`.

New app state: `itemTab` (active sub-tab). Routing is a new warehouse page id
`'Item'` (not in the sidebar page list — reachable only via the entry points
above, like `Vendor Purchase Items` / `Purchase Order`). `datasetIdFor` maps page
`'Item'` to the `items` dataset, so grid/drawer state stays consistent. A tab
`pinnedNo` stays pinned while its page is `Items` **or** `Item`; navigating
elsewhere un-pins it (`mirrorActiveTab`). The tab label shows the item no.

## Interactions & business rules

- Opening an item always opens (or reuses) a **new tab**; the list tab is left
  intact. `openInNewTab` toasts "Opened item".
- Back / **Esc** (`handleEsc`, when on the Item page and no overlay is open)
  returns to Warehouse ▸ Items with the item still selected in the drawer.
- Edit is not inline here — it hands off to the existing drawer edit panel
  (`startPanelEdit`) on the Items list, the single item-edit code path.
- Duplicate / Delete reuse the shared `duplicateRecord` / `delNo`-confirm flows.
- Stock-by-location is still the fixed 4-bucket `locs` model (Main / Assembly /
  East DC / Returns); it is **not** yet wired to the real Locations & Warehouses
  structure (see Backend-build notes).

## Persistence

None new. `itemTab` and tab pinning are in-memory component state (tabs are not
restored across reloads, per the app shell's tab model). The item data itself
follows the existing Items persistence (seed/in-memory).

## Backend-build notes

- The page is a pure read/aggregate over the Item entity + Purchase Order lines —
  no new entity. A real build should expose an **item detail** endpoint returning
  the item plus computed stock (on-hand/available/committed/incoming) and a
  **related purchase orders** query (`GET /items/{no}/purchase-orders`) rather
  than scanning all POs client-side.
- **Stock by location must become real.** The hardcoded 4-bucket `locs`
  (Main/Assembly/East DC/Returns) is a stand-in; on-hand-by-location should be an
  aggregation over the Locations & Warehouses model (sites → zones/aisles/bins,
  owned by `SFLocationsWarehouses.dc.html`), keyed by the same location ids used
  there. Incoming/committed should derive from open PO receipts and open sales
  orders, not the seed `qtySupply`/`qtySO` numbers.
- **Reorder suggestion** (Available ≤ reorder point → suggest reorder qty) is a
  display-only heuristic here; the backend replenishment engine owns the real
  suggestion (considering incoming POs, lead time, safety stock, and per-location
  min/max).

### Decisions & deferred-to-backend

- **Read-first by design.** Editing stays in the one drawer edit panel to avoid a
  second, divergent item-edit form. If a future spec wants in-page editing,
  reconcile the two paths rather than duplicating.
- **Item-tracking-depth axis not built.** Lot/batch, serial numbers, expiry, and
  barcodes (the item's scale-adaptive axis) would surface as additional sub-tabs
  or panels on this page when that tiered capability lands; none exist yet, and
  no tier/default has been assigned (still open, per the scale-adaptive spec).


## Bill of materials sub-tab (added 2026-08-03)

A fourth sub-tab, **Bill of materials**, sits after Purchasing. It is read-only
and always present (assembly BOMs are ungated Starter base).

- **No BOM yet** → explanatory empty state with a *New bill of materials* action.
- **Has versions** → three regions: *Active components* (the lines of the version
  in force today, with per-unit needs and line cost; a sub-assembly component is
  badged and its row opens that item in a new tab), a *Rolled-up cost* card
  (materials / labour / overhead, buildable-from-stock, and how the rollup
  compares with the item cost on file), and a *Versions* list (each opens the BOM
  document; plus *New version*).
- **Where used** → every non-archived BOM that consumes this item, with the
  parent it goes into and qty per. Rows open that BOM.
- Header actions: *Open* (active BOM) and *New assembly order* for this item.

Data comes from `itemBomVM(item)`; see
[`../production/README.md`](../production/README.md) for the entities, rollup
rules, and backend contract.

## Notes tab (2026-09-20)

The item page gained a **Notes** sub-tab carrying the app-wide append-only
notes thread for that item (author + date/time per note, newest first, no edit
or delete — only mark-invalid with a permanent reason). Keyed by
`{entityType:'item', entityNo:<item.no>}`. See
[`../notes/README.md`](../notes/README.md).

## React app (2026-11-17)

Warehouse ▸ Items list, Item profile, and full-page Item card ported to
`apps/web`. URLs: list `/warehouse/items` (`?sel=<no>` opens that item's
preview drawer); new item `/warehouse/items/new` (`$no.tsx` when `$no === 'new'`);
Item profile `/warehouse/items/$no`
(`?tab=overview|stock|purchasing|bom|units|notes`); edit item
`/warehouse/items/$no/edit` (`$no_.edit.tsx`).

- **Files:** list `features/warehouse/items/ItemsPage.tsx` + `dataset.ts`;
  profile `features/warehouse/items/ItemProfilePage.tsx` + `item-tabs/*.tsx`
  (`ItemOverviewTab`, `ItemStockTab`, `ItemPurchasingTab`, `ItemBomTab`,
  `ItemUnitsTab`, `ItemNotesTab`); item card
  `features/warehouse/items/ItemCard.tsx`; routes
  `routes/warehouse/items/index.tsx`, `$no.tsx` + `$no_.edit.tsx`; rules
  `domain/item.ts` + `item.test.ts`, `domain/item-profile.ts` +
  `item-profile.test.ts`, `domain/item-card.ts` + `item-card.test.ts`,
  `domain/units-of-measure.ts` + `units-of-measure.test.ts`; shared
  template additions `rowFlag` on `components/data-grid/model.ts` +
  `DataGrid.tsx`, `beforeFacts` on `components/record-drawer/RecordDrawer.tsx`,
  and optional `onEdit` on `components/record-page/RecordPage.tsx`.
- **Same as prototype:**
  - *List + drawer:* columns, widths, default visibility (`committed`, `cost`,
    `margin`, `vendor`, `lead` hidden by default; `location`, `expiry`, `barcode`
    visible per default axes), *All items* / *Low stock* views, filters, quick
    search, 6 px `bg-warn-fg` low-stock dot before `no` (`onHand <= rp`), stats
    (`On hand`, `Committed`, `Available` red when `<= 0`), reorder banner +
    `STOCK BY LOCATION` horizontal bars (`bg-primary` on `bg-muted`), `DETAILS`
    facts, and the `NotesBlock` (`entityType: 'item'`).
  - *Item profile:* `RecordPage` shell (`Esc` returns to `/warehouse/items?sel=<no>`,
    `1`–`6` and `[` `]` switch tabs synced with `?tab=`); 4 KPI cards (`On hand`,
    `Available`, `Committed`, `Incoming`); **Overview** (details, clickable preferred
    vendor link, tracking flags, attributes); **Stock & locations** (site bars
    labelled by warehouse short name, tracking empty-state cards, reorder callout,
    replenishment & valuation); **Purchasing** (sourcing, PO table linking to
    `/purchasing/purchase-orders/<no>` and `/purchasing/vendors/<no>`, *View all
    lines* → `/purchasing/purchase-lines?item=<no>`); **Bill of materials**
    (active components linking to component items and BOM `/production/bills-of-materials/<no>`,
    rolled-up cost & cost delta, versions list, where-used table, and assembly
    orders linking to `/production/assembly-orders/<no>`); **Units of measure**
    (persisted in `shelfree.v2.itemUnits`, reading global defaults + custom units from
    `shelfree.v2.unitsOfMeasure`: base UoM selector synced with `item.uom`, auto-derived
    master pack, fixed/manual conversions, inline unit picker & removal with undo, and
    explanatory copy moved behind ⓘ via `HelpTarget` per Quiet pages); **Notes**
    (`NotesBlock` for `entityType: 'item'`).
  - *Item card:* `DocumentPage` full-page layout with sections in prototype order
    (**IDENTIFICATION**: Item no. locked on edit + *Use next in sequence* via
    `itemNextNo`, Description, Category, Item type `Inventory`/`Non-inventory`/`Service`,
    Unit of measure defaulting to `NOS`; **AVAILABILITY**: `Sellable` & `Blocked`
    switches plus read-only *Stock by Location* note; **PRICING & COSTING**: Unit
    price, Unit cost, Costing method defaulting to `FIFO`, live `Margin` % and per-unit
    readout; **PURCHASING & REPLENISHMENT**: Preferred vendor, Lead time, Reorder point,
    Reorder qty, Safety stock + live reorder suggestion hint; **TRACKING**: `Tracks
    lot / batch`, `Tracks expiry dates`, `Tracks serial numbers`, `Barcode`). Required-field
    and duplicate-number validation errors match prototype strings, stock `locs` are
    never editable here, `Ctrl/Cmd+S` (`Ctrl/Cmd+Enter`) saves via `useUpsert('items')`,
    and `Esc` / *Discard* returns without saving (blurring an active text input first).
- **Deliberate differences:**
  - *Quiet help (2026-11-18):* the card's descriptive text sits behind ⓘ (shared
    `components/help/HelpTarget`, help map `HELP` in `ItemCard.tsx`): Item no.,
    Description, Availability (the stock note), Sellable, Blocked and Reorder point (its
    text follows the current value, `itemCardReorderHint`). The header subtitle and the
    footer keyboard hint are gone; Ctrl/Cmd+S and Esc are in Keyboard shortcuts. The
    document `Field` part gained an optional `help` prop for this.
  - *Category, UoM, and Vendor inputs:* Category uses a native grouped `<select>`
    backed by `itemCardCategoryGroups` + `itemCategoryPathNames` instead of the
    prototype's custom searchable category-tree dropdown (no `itemCategories` store
    in `apps/web` yet); Unit of measure reads `SYSTEM_UOMS` from `domain/item-profile.ts`;
    Preferred vendor reads `useList('vendors')`.
  - *Item card numbering, return navigation & validation:* `/warehouse/items/new`
    prefills `itemNextNo(items)` on open (keeping *Use next in sequence* to re-suggest)
    and initializes `locs: {}` (instead of legacy `{ main, assembly, east, returns }` keys);
    validation also blocks negative numeric inputs (`price`, `cost`, `lead`, `rp`, `rq`,
    `ss`); creating navigates to `/warehouse/items?sel=<no>` (*Discard* / `Esc` returns
    to `/warehouse/items`), and editing returns to `/warehouse/items/$no`. Header status
    badge shows `Draft` / `Saved record` using `DocumentHeader`'s default pill styling.
  - *Status pill:* profile header shows `Blocked` / `Out of stock` / `Low stock` /
    `Healthy` to match `ItemsPage` and `domain/status.ts` (prototype used `In stock`
    for healthy stock).
  - *Edit handoff:* no in-place edit on the profile — clicking *Edit* or pressing
    `E` invokes optional `RecordPageProps.onEdit` to open the full-page Item card at
    `/warehouse/items/$no/edit`.
  - *Duplicate:* header *Duplicate* is not wired yet; *Delete* uses
    `itemDeleteBlockedReason` and `ConfirmDialog`.
  - *Units persistence:* the Units of measure tab reads and writes the item's stored
    unit set (`shelfree.v2.itemUnits`); `syncItemBaseUnit` / `saveItemWithUnits` keep
    `item.uom` equal to the set's base.
  - *Units tab quiet help (2026-11-18):* inline explanatory text on the Units of measure
    tab (base unit note, master-pack hint, empty-state explainer, conversion footnote)
    now lives behind ⓘ (`components/help/HelpTarget`), leaving only state and validation
    text inline.
  - *List minor gaps:* *Unit price / Unit cost* omit footer averages (`GridColumn.agg`
    supports `'sum' | null` only); *Base UoM* reads `item.uom` and *Master Pack UoM*
    shows `—` in the list grid; *Category* hierarchy uses a default parent table in
    `domain/item.ts`; *STOCK BY LOCATION* renders through `RecordDrawerProps.beforeFacts`;
    Actions-menu shortcuts for unported pages are omitted.
- **Persistence (`localStorage` today):** collections `shelfree.v2.items`,
  `shelfree.v2.itemUnits`, `shelfree.v2.unitsOfMeasure`,
  `shelfree.v2.warehouses`, `shelfree.v2.vendors`, `shelfree.v2.purchaseOrders`,
  `shelfree.v2.purchaseReceipts`, `shelfree.v2.boms`, `shelfree.v2.assemblyOrders`,
  `shelfree.v2.notes`; grid column widths / UI state in `shelfree.v2.ui`.
- **Backend & security rules:** server enforces tenant scoping and
  `warehouse.items.read` / `warehouse.items.write` RBAC; item creates normalize unique
  uppercase `no` and treat `no` as immutable on updates; `price`/`cost` and
  replenishment integers (`lead`/`rp`/`rq`/`ss`) must be `>= 0` and `locs` /
  `qtySO` / `qtySupply` must be server-managed (ignored/rejected on item-master
  writes); item deletes must be rejected server-side (`409`) whenever stock on hand `> 0`
  or the item appears on any purchase order or purchase receipt line (`'This item has
  stock or is on purchase documents — block it instead'`) and must emit an
  audit event; axis-off tracking fields (`tracksLot`, `tracksExpiry`,
  `tracksSerial`, `barcode`) are soft-hidden only and preserved/validated on write per
  `docs/security/README.md`; per-item UoM conversions (`qty_in_base > 0`, one
  base in list, `base = items.uom`) and Master pack derivation belong server-side
  in `item_units(item_no, unit_code, role, qty_in_base)` (see `docs/units-of-measure/README.md`).
- **Tests:** `apps/web/src/domain/item.test.ts` + `item-profile.test.ts` +
  `item-card.test.ts` + `units-of-measure.test.ts` (unit), `apps/web/e2e/items.spec.ts` +
  `item-profile.spec.ts` + `item-card.spec.ts` + `item-units.spec.ts` (Playwright).
