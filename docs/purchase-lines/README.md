# Purchase Lines — `prototype/designs/erp/Shelfree App.dc.html`

Tier: **Starter base — ungated, always-on.**
Spec: [`../superpowers/specs/2026-09-20-purchase-lines.md`](../superpowers/specs/2026-09-20-purchase-lines.md)

## Overview

A flattened, filterable report of every line item across every purchase order —
answers "how many orders include item X" and "what's still outstanding" without
opening each PO. Purchasing ▸ Purchase Lines, the 6th dataset (`purchaseLines`)
on the shared grid engine (filter/sort/group/columns/search/export/saved views).

Also fixed the bug that prompted this: `datasetIdFor()` only matched plural page
names ("Purchase Orders"), so navigating away from a singular editor page
("Purchase Order") mis-detected the active dataset and skipped resetting grid
columns — e.g. Items showed PO columns after leaving the PO editor. Fixed by
adding the singular editor page names (Purchase Order/Receipt, Bill of
Materials, Assembly Order) to `datasetIdFor`.

## Screens & states

- **Purchase Lines list page (table)**: columns Item (mono, frozen) ·
  Description · PO No. · Vendor · Status (pill) · Qty ordered/received/
  outstanding (sum agg) · Unit cost · Line total (sum agg) · Order date. Hidden
  by default: UOM, Expected date, Buyer.
- Saved views: *All lines*, *Open lines* (qty outstanding > 0).
- Filters: item, PO no, vendor, status, buyer, qty ordered/received/
  outstanding, line total, order date.
- **Read-only report** — no New/Edit/Duplicate/Delete. Double-click a row (or
  right-click ▸ Open) opens the line's purchase order in the PO editor.
- **Item page entry point**: the item's Purchasing tab ▸ Purchase orders card
  gained a "View all lines" button, deep-linking here pre-filtered to that item.

## Data model (derived only — no new persistence)

```
PurchaseLineRow (computed by plRows(), not persisted) {
  no:            string  // po.no + '-' + lineIndex, synthetic row id
  po, poStatus, vendor, buyer, location, orderDate, expectedDate: from the PurchaseOrder
  item, desc, uom:        from the PO line
  qty:            number  // ordered
  qtyReceived:    number  // from poReceiptProgress(po) — posted receipts only
  qtyOutstanding: number  // qty - qtyReceived
  unitCost, lineTotal:    number
}
```

Built fresh from `state.purchaseOrders` on every read (`plRows()`) — no store key.

## Interactions & business rules

- Every dispatcher the generic grid needs (`curRows`, `filterCols`, `colRaw`,
  `cellText`, `searchBlob`, default cols/views) got a `purchaseLines` branch.
- Delete/Duplicate are explicitly disabled for this dataset with an explanatory
  toast pointing at the source PO — this is a report, not an editable record.
- `plGoToItem(itemNo)` navigates here and applies an `item = <itemNo>` filter;
  used by the Item page link.

## Persistence

None — always recomputed from `purchaseOrders` (`shelfree.po.v2`).

## Backend-build notes

- A real backend can serve this as a `GET /purchase-order-lines` view (join of
  PO header + line + received-qty aggregate from receipts) rather than a stored
  table — mirrors the frontend's derive-don't-store approach.
- Sort/filter/columns are in-memory per browser, same as every other grid here.

### Decisions & deferred-to-backend

- Scoped as read-only by design — editing a line still happens on its PO, to
  keep one source of truth for order quantities/cost.
- No export beyond the existing generic grid Export action.
- No plan gating (Starter base, ungated, per current working mode).

## Current price columns (2026-10-22 · purchase-prices phase 3)
- New columns **Current price** and **vs current price** (both visible by default; filterable as numbers). Current price = `ppResolve(vendor, item, qty, today)`; "No current price" when none is active. vs current price = (current − unit cost) ÷ unit cost, shown as Same / +x% / −x%.
- Derived at read time — no stored field. Backend: compute in the purchase-lines query by joining `purchase_prices` active on today for (vendor, item) at the tier for the line qty; expose `current_price` and `price_drift_pct`.


## Lock + bulk edit (2026-10-24)
- New **Lock** column (from the line's PO: Open / Locked / Final) + filter.
- Bulk edit (selection bar *Edit* / menu *Edit column…*): **Qty ordered** only — description, UoM, unit cost and
  totals are auto-filled. Lines on locked POs can be reopened in the same popup (reopens the whole PO); lines
  on final POs are skipped; a qty below the received qty is skipped. Draft POs re-price the line via quantity
  tiers; issued POs keep the agreed unit cost. Persists to `shelfree.po.v2`.
- Backend: `PATCH /purchase-orders/lines:bulk` with per-line lock + received-qty validation; audit per PO.

## React app (2026-11-16)

Ported to `apps/web`: `/purchasing/purchase-lines`, `?item=RM-LID-PWH` opens it
filtered to one item. Rows are derived by `domain/purchase-lines.ts`
(`purchaseLineRows`) from orders, posted receipts and the price list — still
never stored. Read-only: the row menu offers *Open purchase order* and *View
order in list*; double-click / Enter opens the order. Backend: a read-only
`GET /purchase-lines?item=&po=&status=` view over `purchase_order_lines`.
Tests: `apps/web/e2e/purchase-lines.spec.ts`.
