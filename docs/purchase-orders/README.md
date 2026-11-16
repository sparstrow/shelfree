# Purchase Orders — `prototype/designs/erp/Shelfree App.dc.html`

Part of the flagship ERP shell. The first **transactional** surface (goods-in) on
top of the master-data layer (Items / Customers / Vendors). Two connected
surfaces: a live **table page** and an in-app full-page **document editor**.

Tier: **Starter base — ungated, always-on.** No plan gating, locked states, or
upgrade prompts yet (per root `CLAUDE.md` build order — gating is layered later).

## Overview

- **Purchasing ▸ Purchase Orders** is now a live table page (previously the shared
  placeholder). It is the 4th dataset (`purchaseOrders`) threaded through the same
  generic grid engine as Items/Customers/Vendors — identical command bar, column
  picker, sort, saved views, search, bulk select, and the 3-tier record-navigation
  drawer.
- Opening/creating a PO routes to the **Purchase Order editor** — a bespoke
  full-page section (`isPOEditor`, `module:'purchasing'`, `page:'Purchase Order'` —
  not in the sidebar page list, reached only via New / Edit / drawer "Open"). Built
  **in-shell** (same Component class), mirroring the existing Vendor Purchase Items
  screen. (The original spec suggested a separate `SFPurchaseOrder.dc.html` DC; we
  built it in-shell to reuse the proven state/save pattern and avoid a cross-DC
  callback round-trip. The main file already hosts Vendor Purchase Items the same
  way.)

## Screens & states

### PO list page (table)
- Default columns: **No.** (mono, frozen) · **Vendor** · **Order date** ·
  **Expected date** · **Status** (pill) · **Lines** (int, right, sum agg) ·
  **Total** (money, right, sum agg) · **Buyer**. Hidden by default: **Location**,
  **Notes**.
- Saved views: *All orders*, *Open* (Issued + Partially received), *Drafts*.
- Filters: no, vendor, status (enum), buyer (enum), location, order/expected date,
  total, lineCount.
- 3-tier record nav: single-click → **drawer**; drawer **Open purchase order** →
  **editor** (full-page); the ribbon **Edit** button also opens the editor. Ribbon
  **View** opens the drawer. Delete uses the shared confirm dialog (single + bulk).
- Drawer preview: header (no + status pill + vendor + order date/location), a
  Total / Lines / Expected stat row, a compact read-only **line list**, a details
  block, and footer actions **Open purchase order** + Delete.

### PO document editor
- **Header block**: Vendor (select, from `vendors`), Buyer (Purchasing-dept
  employee select, `Unassigned` = null), Receiving location (select — MAIN/EASTDC +
  any existing PO locations), Order date + Expected date (native date inputs).
  Title shows *New* vs *Edit*, the PO no (mono pill), and the status pill.
- **Drag handle**: dimmed while a column sort is active (reorder is disabled
  then); clicking it clears the sort so dragging works. Drag ghost is the whole
  row; drag state is cleared on `dragend` if dropped outside the grid.
- **Line number (`#`)**: narrow read-only column after the checkbox showing the
  line's position in stored order (1, 2, 3…). It stays with the line when a
  column sort is active (so sorted views still show original order) and renumbers
  on reorder/insert/remove. Backend: persist as `purchase_order_lines.line_no`
  (int, unique per PO, assigned sequentially on save) — the number printed on the
  PO document and quoted by vendors/receipts.
- **Line items**: a full grid, not a plain table — row checkboxes (bulk
  duplicate/remove), a drag handle for reorder (real order, disabled while a
  column sort is active), sortable columns (view-only — doesn't change stored
  order), resizable columns (persisted to `localStorage`), keyboard Up/Down
  cell navigation between Qty/Unit cost, and a right-click/kebab context menu
  (Duplicate, Insert line above/below, Remove) that acts on the whole checked
  set when the target row is part of a multi-selection. Lines are added via an
  inline autocomplete row (no modal) triggered by right-click Insert or the
  trailing **+ Add line** row — typing filters items by code/description
  (excludes items already on the order), picking one commits the line.
  Duplicate clones qty and unit cost exactly; bulk remove is immediate (no
  confirm — it's a draft, Discard undoes everything). Paste-from-spreadsheet
  is explicitly deferred to a separate import feature.
  **Scope note**: this grid treatment is built for PO lines only so far;
  Purchase Receipt "What arrived" and BOM "Components" still use the plain
  table and are candidates for the same treatment later.
- **Notes** textarea + **Totals** block (Subtotal → Total; derived live).
- **Locking, full-interaction model**: any status other than Draft locks the
  document. Unlike the header fields (vendor/buyer/dates, which render
  `disabled`), the line grid stays fully interactive when locked — rows can
  still be checked, navigated with the keyboard, and right-clicked — but any
  mutating action (qty/cost edit, duplicate, remove, insert, drag-drop) is
  rejected with a toast ("Status is X — it must be in Draft to edit lines.")
  rather than being hidden or disabled. This is a deliberate difference from
  the header fields, per an explicit design decision: grid actions should
  always be attempted and explained, not silently blocked.
- **Reopen for editing** (Issued only): moves the order back to **Draft**
  (component state; persists on next Save) and sets a `reopened` flag that
  shows an amber banner — "previously issued; issuing again will resend it" —
  until it's re-issued. Not offered once any receipt exists against the order
  (Partially received / Received), to avoid orphaning posted receipts.
- **Footer**: Cancel order (Draft/Issued/Partially received only) · Discard
  (back without saving) · Save draft + Issue purchase order (Draft only) ·
  Reopen for editing (Issued only).
- Inline validation error banner (`poErr`).
- Esc closes the item picker first.

## Data model

New entity **PurchaseOrder** (seed: `prototype/lib/shelfree-data.js` `seedPurchaseOrders()`;
line `desc`/`uom`/`unitCost` are resolved from the current Item record at seed time
so nothing is duplicated by hand — totals are always derived, never stored):

```
PurchaseOrder {
  no:           string      // "PO00001", no separator, sequential +1 step
  vendor:       string      // Vendor.no (FK)
  orderDate:    string      // ISO date
  expectedDate: string|''   // ISO date, optional
  location:     string      // receiving site/warehouse code (e.g. MAIN, EASTDC)
  status:       enum         // Draft | Issued | Partially received | Received | Closed | Cancelled
  reopened:     boolean|undef // true once an Issued PO has been sent back to Draft via Reopen
  buyer:        string|null  // Employee.id, Purchasing dept (null = Unassigned)
  notes:        string
  lines: [ {
    item:      string   // Item.no (FK)
    desc:      string   // defaults from Item.desc, editable
    qty:       number
    uom:       string   // defaults from Item.uom
    unitCost:  number   // defaults from Item.cost, editable
  } ]
  // derived (never stored): subtotal/total = Σ(qty × unitCost); lineCount
}
```

Status pill colours reuse tokens via `statusPillSt()`: Draft→neutral, Issued→info,
Partially received→warn, Received/Closed→ok, Cancelled→bad.

- **Tax calculation stamp (2026-09-26, spec `2026-09-26-vendor-tax-matching.md` §A):** picking the vendor
  stamps `taxCalc: 'line'|'rate'`, `roundTotal: boolean`, `taxCalcSrc: 'workspace'|'vendor'` on the PO
  (`poStampTax`; clearing the vendor removes them; legacy POs are stamped on next save). Totals box
  footer shows it, e.g. *Tax on each line · total rounded to the rupee · workspace setting*.

## Interactions & business rules

- **Lock (2026-10-24)** — separate `Lock` column (Open / Locked / Final), spec
  [`2026-10-24-lock-column-bulk-edit.md`](../superpowers/specs/2026-10-24-lock-column-bulk-edit.md).
  New field `locked: boolean` (absent = derived): `poLockState()` Draft→open, Issued→locked unless
  `locked===false`, Partially received/Received/Closed/Cancelled→final. Issue sets `locked:true`. Editor
  *Reopen* sets `locked:false, reopened:true` (status stays Issued); editor then offers *Save, keep open*
  and *Save & lock*. Line edits and header fields check `poEditable()` instead of `status==='Draft'`.
- **Bulk edit** — `beOpen/beApply/beVM`, state `be: { ds, field, value, err }`. Columns: Expected date,
  Order date, Receiving location, Buyer. Locked rows: skip, or *Reopen & apply* in the same popup; final
  rows always skipped. Enter = apply, Ctrl/Cmd+Enter = reopen & apply, Esc = close. Undo toast.
- **Multi-row actions (2026-10-24)** — selection menu / bar on the PO grid (see `erp-app/`):
  - *Duplicate* (single or many, now allowed): new `PO#####` numbers, status Draft, order date today, expected date cleared, lines copied; tax snapshot dropped and re-stamped on issue.
  - *Issue*: Draft + vendor + ≥1 line + passes composition inter-state check (`poCanIssue`); stamps tax + vendor GST snapshot like `poCommit`. Price guard is not run in bulk.
  - *Cancel*: Draft or Issued with no non-cancelled goods receipt.
  - *Close*: Partially received or Received.
  - *Delete*: drafts only; others kept (toast says how many). Bulk PO delete now persists to `shelfree.po.v2`.
  - Ineligible rows are skipped, never blocked as a whole; every op has Undo (10 s).

- **Auto-numbering**: `poNextNo()` = max existing numeric suffix + 1, `PO#####`
  (e.g. `PO00011`) — no hyphen, steps of 1. Client-side only.
- **Number-format migration (2026-10-24)**: older stored data used `PO-00010`
  (+10). `poNoMigrateStore()` rewrites every `PO-#####` in all `shelfree.*`
  localStorage stores once (÷10, hyphen dropped; flag `shelfree.poNoFormat.v1`).
  Backend: PO numbers come from a per-tenant sequence, pattern `PO#####`, step 1,
  allocated atomically on create (gap-free not required but no reuse).
  Lock: `locked` column on `purchase_orders`; reopen/lock/bulk-edit are audited actions (who, when, which
  columns, before/after). Server must re-check lock state per row and reject edits to final orders.
  Bulk status/duplicate/delete/edit must be one server transaction per request, re-validating each PO
  server-side (status machine, receipts, composition rule) and writing one audit event per PO.
  Same rule for every series — see [`../numbering/README.md`](../numbering/README.md).
- **Line autofill**: picking an Item copies its `desc`, `uom`, `cost` into the new
  line; the buyer overrides any of them afterward. Items already on the order are
  excluded from the picker.
- **Totals** are derived every render (`poSubtotal`) with `money()` + tabular-nums;
  never persisted.
- **Status lifecycle (this build)**: Draft → Issued via **Issue purchase order**
  (locks the document). Issued → Draft via **Reopen for editing** (unlocks;
  flags `reopened`). **Cancel order** → Cancelled (Draft/Issued/Partially
  received). **Partially received / Received are no longer set here** — they
  are derived from posted Purchase Receipts (see
  [`../purchase-receipts/`](../purchase-receipts/README.md)) and written back
  by `poStatusAfterReceipts()`, which now resolves to `Issued` (not `Open`)
  once receiving is complete/reset. The editor still does not move stock
  itself.
- **Buyer** = FK to `Employee.id`, filtered to the Purchasing dept via
  `deptEmployeeOptions('Purchasing')` (Terminated excluded from the picker but still
  resolved for display via `empName()`). `Unassigned` clears to `null`.
- **Validation (client-side)**: a PO needs a vendor to Save; a vendor **and** ≥1
  line to Issue; qty and unitCost are coerced to ≥ 0.
- **Attention flag**: `poOverdue()` flags an Issued / Partially-received PO
  whose `expectedDate` has passed (row indicator dot).
- No plan gating / locked states (ungated Starter base).

- **Stale stamp:** a *Draft* whose stamp differs from the vendor's current resolved method (vendor card
  or workspace changed) shows a warning with **Use the new method** (re-stamps, toast). Issued and later
  POs never change. Receipts/bills will inherit the PO stamp (task 8). No tax amounts are computed on
  POs yet — the engine (task 7) will read the stamp.

## Persistence

- Column widths for the line-items grid: `shelfree.poLineCols.v2` (Description is its own sortable/resizable column, split from Item in v2), `localStorage`,
  read/written by `poLnLoadCols()`/`poLnSaveCols()`. Sort/selection/insert/drag
  state (`poLnSort`, `poLnSel`, `poLnInsertAt`, `poLnMenu`, drag ids) is
  component state only, reset whenever the editor opens/closes/commits.

- `shelfree.po.v2` — the purchase-order list, `localStorage`. Seeded on first load
  via `poLoad(seed)`; every Save/Issue/Cancel rewrites it via `poPersist()`.
- Editor draft (`poDraft`, `poEditNo`, picker UI) is component state only — not
  persisted; discarded on back/reload.

## Backend-build notes

- `PurchaseOrder` is a real transactional entity: needs CRUD endpoints, a
  server-side auto-numbering sequence, and FKs with referential integrity to
  **Vendor** (`vendor`), **Item** (`lines[].item`), and **Employee** (`buyer`).
- **Status transitions must be server-enforced**: can't Issue without vendor + ≥1
  line; `Partially received` / `Received` / `Closed` are set by receipt documents,
  not free edits; `Cancelled` should block further receiving. **Reopen must be
  blocked server-side once any receipt exists** against the order (frontend
  already hides it, but the API must not trust that) — otherwise a reopened,
  re-edited PO could desync from receipts already posted against the old lines.
- **Totals** must be recomputed/validated server-side, not trusted from the client.
- The unit-cost autofill reads a single `Item.cost` here; a real build should read
  an authoritative vendor-item price / last purchase cost (see the Vendor Purchase
  Items screen, which already models per-vendor item pricing).
- Column config / sort / saved views are in-memory per browser — decide whether PO
  views should be server-side per-user preferences.

- Backend: `purchase_orders.tax_calc`, `round_total`, `tax_calc_src` set server-side from the vendor
  resolution at create / vendor change; immutable once Issued; re-stamp only on an explicit request
  for a Draft. Receipts and bills copy the PO's values.

### Decisions & deferred-to-backend

- **Editor built in-shell**, not as a separate `.dc.html` DC (spec deviation,
  rationale above). If it grows, it can be extracted into a sibling DC mounted via
  `<dc-import>` with `onSave`/`onCancel` callbacks + the shell owning the
  `purchaseOrders` slice.
- **Receiving shipped** as Purchasing ▸ Purchase Receipts — the goods-in→stock
  step that moves `Received`/`Partially received` and increments on-hand. The PO
  editor gained a **Receive goods** button and a **Receipts against this order**
  card; the drawer gained a **Receive** action.
- **Tax / multi-currency / discounts deferred** — Starter shows subtotal = total;
  Growth-tier depth. PO currency is implicitly the vendor's.
- **Approval workflow deferred** (submit-for-approval, spend limits) —
  Growth/Enterprise.
- **Plan gating deferred** — ships ungated; gating layered later during scale-up.
- **Reopen is an audit-relevant action** (it unlocks a document that was
  already sent to a vendor) — the backend should emit an audit event
  (who/when/from-what-status) on Reopen, same as Issue and Cancel, per
  `docs/security/README.md`. Not implemented client-side beyond the `reopened`
  flag.

## Notes (2026-09-22)

Fixed a shell-level bug (not PO-specific, but first noticed here): the app's
constructor computed initial `cols: this.defaultCols()` before `this.state`
was assigned, so `curDatasetId()` always saw an empty state and fell through
to the **item-grid** columns — visible whenever the DC's `startModule` prop
(or a restored/deep-linked landing page) opens directly on a non-Items page.
Since `startModule` currently defaults to `"purchasing"`, every fresh load of
the Purchase Orders list showed item columns (Description/Category/UoM/etc.)
with PO rows underneath. Fixed by deriving the initial dataset id straight
from `startModule`/the module's first page instead of reading `this.state`.

## Notes (2026-09-20)

The single free-text **Notes** textarea on the purchase-order document is gone.
In its place is the app-wide append-only notes thread — multiple people add
notes to the same order, each stamped with author + date/time, newest first,
scrollable, never editable or deletable (only markable invalid, with a
permanent reason). The grid's `notes` column is now **Latest note**, derived
from the notes collection rather than a field on the order. Data model,
permissions and backend contract: [`../notes/README.md`](../notes/README.md).
The seeded `purchaseOrder.notes` string now only supplies the opening note of
each thread and is dropped at backend handoff.

## Update 2026-09-26 — GST task 4
- Receiving-location options now come from Locations & warehouses (non-inactive sites, labelled
  `code · name`) instead of a fixed list.
- Vendor picker offers vendors whose **Supplies** is Goods or Goods + services only. Backend must reject a
  services-only vendor on PO create.

## Vendor GST registration on POs (2026-09-28 · spec `2026-09-28-vendor-gst-registration.md`)
- Vendor select labels non-regular vendors ("Sri Annamalai Packaging Co. · Composition"); under it a neutral tag — "Composition · no GST", "Unregistered · no GST", "Import · tax at customs".
- Summary tax note: non-regular vendors read "No GST charged — … nothing to calculate and no input tax credit" (or the import note); the tax-method stale banner doesn't apply.
- **Composition + inter-state:** vendor tax state ≠ ship-to location's state → warning "Composition dealers can't make inter-state supplies…". With Tax settings ▸ *Composition vendor in another state* = Block, the order can be saved as a draft but **not issued** (`poCanIssue` + `poIssue` guard).
- **Snapshot fields** on the PO: `vendorGstRegType`, `vendorGstin`, `vendorTaxStateCode` — stamped when the vendor is picked and refreshed on every save while open (lazy recalc); frozen once receipts/bills post.
- Backend: same snapshot columns on `purchase_orders`, `purchase_receipts`, `vendor_bills`; server enforces the composition inter-state rule per setting; ITC never booked on bills from composition/unregistered vendors; those purchases report in GSTR-3B "inward supplies from composition / exempt / nil / non-GST".

## Purchase prices on PO lines (2026-10-22 · purchase-prices phase 3)
Spec: [`../superpowers/specs/2026-10-17-purchase-prices.md`](../superpowers/specs/2026-10-17-purchase-prices.md). Starter base, ungated. Rules apply to **Draft** orders only.

**Screens & states**
- *Add line / Insert line* item search lists only items the PO's vendor has an **active price** for on the order date, each with its base price, `min N` and tier count. States: no vendor ("pick the vendor above first"), vendor has no prices ("No prices for {vendor}. Add them in Purchase Prices." + **Open Purchase Prices**), no match. Enter adds the first match; Esc cancels.
- New line starts at the vendor's lowest from-qty (the MOQ) at that tier's price.
- **Unit cost is read-only** (lock icon, tooltip) when *Lock PO cost to price list* is on (default). Under the item: tier hint — "Base price" / "Tier from 50" + next break ("₹52.00 each from 100").
- Line errors (red row tint, inline alert under the item): *Below minimum qty (min N)* with a **Set to N** fix button (qty cell border turns red); *No active price from this vendor*.
- Unpriced banner above the lines when any line has no price: **Open Purchase Prices** · **Remove unpriced lines** (Undo toast).
- Issued / received / closed lines: amber pill under the item "Cost ≠ current price · now ₹X" when today's resolved price differs. Informational; the saved cost never changes.
- Opening a Draft re-prices its lines; a toast reports how many costs changed ("save to keep them").

**Rules**
- `ppResolve(vendor, item, qty, orderDate)`: active rows (effFrom ≤ date ≤ effTo, blanks open) → tier with the largest minQty ≤ qty; none active → *noPrice*; all tiers above qty → *belowMoq* (min = lowest minQty).
- Every qty change, vendor change and order-date change re-resolves every line's cost.
- Save draft and Issue are both **blocked** while any line has an error; the error banner counts them ("2 lines have no active price from X and 1 line is below the vendor's minimum qty"). Save/Issue re-price once more before writing.
- Settings read now, UI in phase 4: `shelfree.settings.ppLockCost.v1` ('on'|'off', default on — off makes unit cost editable again and disables re-pricing), `shelfree.settings.ppBlockBelowMin.v1` (default on — off drops the below-minimum error).
- **Open Purchase Prices** leaves the editor; the unsaved draft is kept in a toast action **Back to order** (re-priced on return).

**Data model** — no new PO fields. Line `unitCost` stays the stored, authoritative cost; on Drafts it always equals the resolved price.

**Backend-build notes**
- PO create/update on Draft: server re-resolves each line via `GET /purchase-prices/resolve` logic and **rejects** (422, per-line codes `NO_PRICE`, `BELOW_MOQ`) or **overwrites** any client `unit_cost` that differs while lock is on (tamper guard). Issue = same check, then freeze costs.
- Non-Draft orders: never re-priced. Drift is a read-time comparison (`current_price` on the line DTO), not stored.
- Audit: line cost changes on Draft are part of the PO update event (old/new cost, price row id). Permission `purchasing.orders.edit`; changing a price requires `purchasing.prices.edit`.
- Decisions: drift is informational (no re-cost of released orders); open question for phase 4 — whether "Back to order" should become a persisted auto-saved draft.
