# Plan — Items page scale-adaptive wiring

**Spec:** `docs/superpowers/specs/2026-08-01-items-scale-adaptive.md` (approved)
**Targets:** `prototype/designs/erp/Shelfree App.dc.html` (logic + template), `prototype/lib/shelfree-data.js` (new item fields), `docs/`

## Tasks

1. **Axis resolver** — `axisTier(key)` + `axisOn(key)` on the app class: reads
   `state.ws.axes` (falls back to `wsLoad()` during construction, before state
   exists) and gates on `planTier` via the existing `tierRank`. `zones` also
   requires `multiWarehouse`. Single source of truth for every conditional below.

2. **Site model** — `siteDefs()` → `[{key,code,name,short}]` for the four `locs`
   buckets, replacing the four hardcoded `[['Main', it.locs.main], …]` arrays in
   the drawer, item page and Stock tab, and the drifted
   `locationOptions: ['BLR-Main',…]` in My settings (default is `TVM-Main`).
   Kanalora sites: Main · Assembly · Chennai DC · Returns.

3. **Data model** — `prototype/lib/shelfree-data.js`: `tracksLot` / `tracksExpiry` /
   `tracksSerial` / `barcode` on every seed item (rule-based: ceramics + cones
   are lot-tracked, cones/raw resin carry expiry, sellable SKUs get a GS1-IN
   `890…` barcode); `createItem()` defaults all four off for new items.

4. **Axis columns** — `itemDefaultCols()` conditionally emits `location`, `lot`,
   `expiry`, `serial`, `barcode` (labels via `termGet`). `itemColRaw` /
   `itemCellText` gain those keys. Axis-off columns are absent from the grid,
   the column picker, filters and sort — no locked state.

5. **Column reconciliation** — `syncAxisCols()` re-derives `state.cols` when an
   axis toggles or a term is renamed: keeps user width/visible/order for columns
   that survive, drops removed ones, inserts new ones at their default index.
   Called from `wsSetIn('axes', …)`, `setTerm`, `resetTerm`, `resetTermPair`,
   `resetAllTerms`, `setPlan`.

6. **Item edit panel — Tracking section** — new block in the item drawer's edit
   state: "Tracks lot/batch" / "Tracks expiry" / "Tracks serial numbers"
   checkboxes + "Barcode" text field, each rendered only when its axis is on;
   whole section hidden when none are. State `nTracksLot` / `nTracksExpiry` /
   `nTracksSerial` / `nBarcode`, loaded in `startPanelEdit`, written in
   `createItem` (both create and edit paths).

7. **Drawer + Item page stock rendering** — `multiWarehouse` off → the
   "Stock by location" block is replaced by a single on-hand figure (drawer) and
   the Stock tab collapses to one on-hand card. On → per-site rows as today.
   `zones` on → each site row expands to its bin allocation (currently a single
   "Unassigned — qty" row + note; bin-level counts arrive with Warehouse
   Receipts). `lotBatch` (+`expiry`) on → "Lots" card, empty state pointing at
   Receipts. `serial` on → "Serial numbers" card, same empty state.

8. **User default location** — `me.defLocation` pre-filters the Items grid on
   load when `multiWarehouse` is on: session state `locScope`, applied in
   `filtered()`, surfaced as a dismissible chip above the grid (Esc / click ×
   clears; cleared state is session-only, the setting is untouched).

9. **Terminology** — add `object.location` (pair) and `field.lotBatch` to
   `termDefs()`; resolve through `termGet` in the column labels, the Stock tab
   heading and the edit-panel labels.

10. **Docs** — update `docs/erp-app/README.md` (Items grid columns, axis
    behaviour, location scope chip, new item fields), `docs/item-page/README.md`
    (Stock & locations under each axis, Tracking section),
    `docs/settings/README.md` (new terminology keys, default-location wiring),
    `docs/security/README.md` if the checklist gains a surface, and fold the
    outcome into the spec.

## Verify

Toggle each axis in Settings → Modules & capabilities with the Items grid open:
columns appear/disappear, picker matches, edit panel section follows, Stock tab
reshapes. Drop the plan to Starter (all axes locked off) and confirm the Items
page is the minimal Starter view. Rename Location → Warehouse and Lot/Batch →
Batch in Terminology and confirm live propagation. Both themes.
