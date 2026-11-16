# Purchase prices — `prototype/designs/erp/Shelfree App.dc.html`

Purchasing ▸ **Purchase Prices**. Spec: [`../superpowers/specs/2026-10-17-purchase-prices.md`](../superpowers/specs/2026-10-17-purchase-prices.md) · Plan: [`../superpowers/plans/2026-10-18-purchase-prices.md`](../superpowers/plans/2026-10-18-purchase-prices.md).
Tier: Starter base, ungated (tiers parked). Phase 1 (register page) and phase 2 (vendor page *Items supplied* + Vendor Purchase Items now read/write this store) shipped 2026-10-18. Phase 3 (PO pricing — vendor-scoped item search, locked cost + tier hint, re-price on qty/vendor/date, below-minimum / no-price line errors blocking Save & Issue, drift pill + Purchase Lines columns) shipped 2026-10-22 — see `../purchase-orders/README.md`. Phase 4 (Configuration ▸ Purchase pricing, terminology, help map, security, existing-PO wrap-up) next.

## Overview
One register of what Kanalora pays each vendor for each item. Many vendors may quote the same item; rows carry a from-quantity tier and validity dates. The PO's vendor decides which price applies (phase 3).

## Screens & states
- **Prices tab** — the standard data grid (registry dataset `purchasePrices`, `ppReg()`): saved views, filters, search, find, column tools, group-by, density, export, selection, row dot (expiring / orphaned rows).
  - Columns: Vendor no. + Vendor (both pinned) · Item no. · Description · Vendor item code* · From qty* · Price ₹* · vs item cost · Lead time (days)* · Starts* · Ends* · Status (Active / Expiring / Scheduled / Expired) · Note* · hidden UoM, Price no. (* = edited in place: Enter saves, Esc reverts, blur saves; invalid values are refused with a toast).
  - Seeded views: All prices · Active · Expiring in 30 days · By vendor (grouped).
  - **New** (N / ribbon) opens the shared reference drawer: vendor + item lookups (shared `lkOpen` picker, sources `vendors`/`items`), code, from qty, price, lead time (defaults to the item's), dates, note.
  - **Change price** (Shift+P / right-click): drawer pre-filled from the row, vendor+item locked, starts today; on save the old row ends the day before the new start. Not allowed on expired rows; scheduled rows are edited instead.
  - **Add quantity tier** (T / right-click) · **Duplicate** (vendor cleared — "duplicate to another vendor") · Open vendor · Open item · Delete.
- **Items with no vendor price tab** — purchasable items (no active BOM) with no current/scheduled price row. Row → open item; *Add price* opens the New drawer with the item (and its preferred vendor) filled.
- Empty: "Every purchased item has a vendor price." Grid empty-filter state is the shared one.

## Data model — `PurchasePrice`
`{ no 'PP00001', vendor (vendor no), item (item no), vendorItemNo, minQty int ≥1, price ≥0, currency 'INR', leadDays int ≥0 | '', effFrom 'YYYY-MM-DD' | '' (always), effTo | '' (open-ended), note, createdAt, updatedAt }`
Status is derived: Scheduled (starts after today) · Expired (ended) · Expiring (ends within the window, 30 days — setting `ppExpiringDays`, UI in phase 4) · Active.

## Interactions & business rules
- No two rows with the same vendor + item + from qty may overlap in dates.
- Ends ≥ Starts. Change price: new start must be after the old row's start.
- Description / UoM always resolve from the live item (never stored).
- Shortcuts (listed in Settings ▸ Keyboard shortcuts → "Purchase prices"): N, click-to-edit cell, Shift+P, T, E, Delete, right-click.

## Persistence
`shelfree.purchasePrices.v1` (array). On first load with no stored list it is seeded: one row per vendor × item found on existing non-cancelled POs (price = latest PO unit cost, starts = earliest PO date, from qty 1, open-ended), plus a one-time import of legacy `shelfree.vendorPurchaseItems.<vendorNo>` rows (INR, real items only).

## Backend-build notes
- Table `purchase_prices` (tenant_id, vendor_id FK, item_id FK, vendor_item_no, min_qty, price numeric(14,2), currency, lead_days, eff_from, eff_to, note, timestamps); index (tenant, vendor, item, eff_from). Exclusion constraint: no overlapping daterange for the same (tenant, vendor, item, min_qty).
- `GET /purchase-prices?vendor=&item=&active_on=`, `POST`, `PATCH /:id`, `DELETE /:id`, `POST /:id/change` (atomic: end old row + insert new).
- `GET /purchase-prices/resolve?vendor&item&qty&date` — server-authoritative tier resolution (phase 3 PO pricing).
- Audit events on create / edit / change / delete; permission `purchasing.prices.edit`. No PII; financial data is tenant-scoped.

### Decisions & deferred-to-backend
- Kept the Vendor Purchase Items screen; both will read this store (phase 2).
- INR only; currency stored for future imports, hidden in UI.
- Price changes close the old row and add a new one (history = rows), rather than an edit log.
- **Deviation from spec:** new rows are created in the shared drawer (vendor/item lookups need room); every value cell is still edited inline in the grid.
- Seed derives only from existing POs so current POs stay valid under phase-3 rules; no other prices invented.
- Phase 3: Save draft is blocked as well as Issue when a line is unpriced or below minimum (spec D7); "Remove unpriced lines" gives a one-click way out with Undo.
- Phase 3: opening a Draft silently re-prices it in the editor (toast reports the count); stored POs are only rewritten when saved. Bulk rewrite of stored drafts is phase 4.
