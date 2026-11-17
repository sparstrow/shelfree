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
