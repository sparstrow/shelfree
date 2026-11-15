# Purchase Lines report

## Purpose
Users need to answer "how many orders exist for item X, and what's still
outstanding" without opening every PO. Today the only place line items are
visible is inside each PO document — there's no line-level, filterable view
across all orders. (Surfaced as a bug report: navigating away from a PO editor
mis-detected the target dataset and briefly showed PO columns over the Items
grid — see `datasetIdFor` fix, already shipped. This spec is the follow-on
feature the user actually wants: a real cross-PO line report.)

## Approach
Add **Purchase Lines** as a new page (Purchasing ▸ Purchase Lines, between
Purchase Orders and Purchase Receipts in the sidebar), built on the existing
generic grid engine as a 5th purchasing dataset (`purchaseLines`).

- **Derived, not stored.** Rows are computed by flattening every PO's `lines[]`
  (one row per PO line), joined with that PO's vendor/status/buyer/dates and
  the item's received-qty-to-date (reusing `poReceiptProgress(po)`, already
  used by the receipt-draft flow). No new persistence key.
- **Columns**: Item (mono, frozen) · Description · PO No. (link → PO editor) ·
  Vendor · Status (PO status pill) · Qty ordered · Qty received · Qty
  outstanding · UOM · Unit cost · Line total · Order date · Expected date ·
  Buyer. Hidden by default: Expected date, Buyer, UOM.
- **Filters**: item, vendor, status, buyer, qty outstanding (>0), order/expected
  date, line total — same filter-chip UI as other grids.
- **Saved views**: *All lines* (default), *Open lines* (outstanding > 0).
- **Grouping**: groupable by Item (existing groupBy engine) — grouped, the row
  count under each item directly answers "how many orders include this item";
  Qty ordered/received/outstanding sum-aggregate per group.
- **Row actions**: open item (new tab) · open PO (editor) — same drawer/open
  pattern as other grids.
- **Entry point from Items**: the Item detail page gets a small "Purchase
  lines" stat/link (count of open lines for that item) that deep-links here
  pre-filtered to that item — this is the direct fix for the workflow that
  prompted the report ("I want to see this filtered from an item").

## Data model (derived only — no new stored entity)
```
PurchaseLineRow (computed, not persisted) {
  id:            string   // po.no + '-' + line index, for row identity
  po:            string   // PurchaseOrder.no (FK)
  poStatus:      enum     // PurchaseOrder.status
  vendor:        string   // PurchaseOrder.vendor (FK)
  buyer:         string|null
  orderDate:     string
  expectedDate:  string|''
  item:          string   // Item.no (FK)
  desc, uom:     string
  qty:           number   // ordered
  qtyReceived:   number   // from poReceiptProgress(po)
  qtyOutstanding: number  // qty - qtyReceived
  unitCost, lineTotal: number
}
```

## Out of scope (this pass)
- No editing from this grid — it's a report; qty/cost changes happen on the PO.
- No export beyond the existing generic grid Export action (reused as-is).
- No tier gating (Starter base, ungated, per current working mode).

## Success criteria
- Purchase Lines page lists every line from every PO, matches PO totals when
  summed per PO.
- Filtering by item shows exactly the orders containing that item; grouping by
  item gives an order count per item.
- Item detail page links straight into this view pre-filtered.
- `datasetIdFor` singular-page fix (already shipped) prevents this new page
  from inheriting stale columns the same way Items did.
