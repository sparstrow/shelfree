# Purchase Receipts — goods-in against a purchase order

Status: built (prototype). Ungated — tiers are parked (see root `CLAUDE.md`).
Lives in `prototype/designs/erp/Shelfree App.dc.html` (app shell).
Sits in **Purchasing**, directly after Purchase Orders. There is deliberately no
"Warehouse Receipts" / "Warehouse Shipments" page: receiving is a *purchasing*
event, and Kanalora has no shipping operation complex enough to justify a
separate warehouse document family.

## Overview

A **purchase receipt** (GRN) records what physically arrived against a purchase
order. It is the step that turns an order into stock:

- A receipt can only exist **against a purchase order** — there is no free-standing
  goods-in document. One order can have many receipts (split deliveries).
- **Nothing moves until it is posted.** A draft receipt is a counting sheet.
- Posting lands `qtyReceived` in the item's stock at the receipt's location and
  re-derives the order's status.
- **`qtyRejected` is recorded but never enters stock.** Ceramics crack in the
  kiln and in transit; the rejected units go back with the driver and become the
  vendor debit note in the purchase-finance stage.
- **Posted receipts are immutable.** A correction is a vendor return, not an edit.

## Screens & states

### Purchase Receipts list (generic data grid, dataset `purchaseReceipts`)
- Columns: **No.** (mono, frozen) · **Purchase order** (mono) · **Vendor** ·
  **Received on** · **Status** (pill) · **Qty received** (sum) · **Rejected**
  (sum) · **Value** (money, sum) · **Received into**. Hidden by default:
  **Received by**, **Vendor challan**, **Notes**.
- Saved views: *All receipts*, *Not posted*, *Posted*.
- Attention dot: any receipt still in Draft.
- **New purchase receipt** opens the **order picker** — a modal listing only
  orders that are `Open` / `Partially received` with something outstanding,
  searchable by order no or vendor, each row showing its outstanding quantity.
  Empty state: "Nothing is waiting to be received right now."
- Detail drawer: received / rejected / value stats, the arrived lines, a details
  block, and *Open receipt* + *Order* + delete actions.

### Receipt document (full-page, `page: 'Purchase Receipt'`)
- **Order strip** (read-only): the PO no with its live status pill, vendor,
  order date, expected date. *Purchase order* button in the header opens it.
- **Header fields**: Received on (date), Received into (site select), Received by
  (Purchasing employee, nullable), Vendor challan no. (mono).
- **Lines table**, one row per PO line: Item · Ordered · **Already in** ·
  **Outstanding** · **Receiving now** (input) · **Rejected** (input) · Value.
  - Entering a rejected quantity reveals an inline **reason** field on that row.
  - Receiving more than the outstanding quantity shows an inline red warning on
    the row and is refused on post.
  - Toolbar: **Receive all outstanding** (fills every line) and **Clear**.
- **Notes** + a totals card (units received, rejected, value received).
- **Footer**: Cancel receipt (drafts only) · Back · Save draft · **Post receipt**.
- A **posted** receipt renders the same screen with every input disabled, the
  toolbar and Save/Post hidden, and the subtitle "Posted — stock has moved.
  Corrections go through a vendor return, never an edit."

### Changes to existing screens
- **Purchase Order document**: a **Receive goods** button in the header (only for
  `Open` / `Partially received`), and a **Receipts against this order** card
  listing every linked receipt with its status and quantities, plus the
  outstanding total. Clicking a row opens that receipt.
- **Purchase Orders drawer**: a **Receive** action next to *Open purchase order*.
- **Warehouse module**: *Warehouse Receipts* and *Warehouse Shipments* removed.

## Data model

New entity `PurchaseReceipt`, seeded in `prototype/lib/shelfree-data.js`
(`seedPurchaseReceipts()`):

```
no:          string      // GRN000NN, +1 sequence
po:          string      // Purchase order no — REQUIRED, the only parent
vendor:      string      // Vendor no, denormalised from the PO at creation
receiptDate: string      // ISO date
location:    string      // site CODE (TVM-MAIN / TVM-ASSY / CHN-DC / TVM-RET)
receivedBy:  string|null // Employee.id (Purchasing dept), null = Unassigned
vendorDocNo: string      // vendor's delivery challan / invoice number
status:      enum        // Draft | Posted | Cancelled
postedAt:    string|null // ISO timestamp, set on post
notes:       string
lines: [{
  item, desc, uom,       // mirrored from the PO line
  qtyOrdered,            // snapshot of the PO line quantity
  qtyReceived,           // enters stock on post
  qtyRejected,           // logged only — never enters stock
  rejectReason,          // free text, shown when qtyRejected > 0
  unitCost,              // from the PO line; drives the receipt's value
}]
```

**Nothing is stored on the purchase order.** How much has landed is always
derived from posted receipts (`poReceivedQty`, `poReceiptProgress`,
`poOutstandingQty`) — the only thing written back to the PO is its `status`
label. `poStatusAfterReceipts()` computes it: every line fully in → `Received`,
any line partly in → `Partially received`, otherwise unchanged.

New client state: `purchaseReceipts` (the dataset), `prEditNo`, `prDraft`,
`prErr`, `prPoPickerOpen`, `prPickerQ`.

## Interactions & business rules

- A receipt **must** reference a purchase order; `newPR()` opens the picker
  rather than creating an orphan document.
- Only `Open` and `Partially received` orders are receivable
  (`poReceivable`). `Draft`, `Received`, `Closed` and `Cancelled` orders never
  appear in the picker and show no Receive button.
- A new receipt **pre-fills every line with its outstanding quantity** — the
  common case is "everything on the challan arrived", so the operator edits the
  exceptions instead of typing every number.
- Post is refused when: no order, no line with a received or rejected quantity,
  or any line where received + rejected exceeds that line's outstanding
  quantity. Over-receipt is a hard block, not a warning.
- Posting: `qtyReceived` is added to `item.locs[<site key>]` for the receipt's
  location; `qtyRejected` is not. The PO status is recomputed and persisted.
  The receipt becomes `Posted` and read-only.
- `Cancelled` receipts (drafts only) keep the record but move no stock.
- Deleting a receipt from the grid uses the shared delete/undo machinery.
  Deleting a *posted* receipt does not currently reverse stock — see below.

## Keyboard shortcuts

| Shortcut | Action | Scope |
|---|---|---|
| `R` | Start a receipt against the active order | Purchase Orders grid |
| `Enter` | Open the active receipt | Purchase Receipts grid |
| `F` | Fill every line with the outstanding quantity | Draft receipt |
| `O` | Open the purchase order this receipt is against | Receipt document |
| `Ctrl/Cmd + Enter` | Post the draft receipt | Draft receipt |
| `Esc` | Close the order picker, then leave the receipt | Receipts |

All guarded by the shell's `typing` / modifier checks and catalogued in
**Settings → Workspace → Keyboard shortcuts** (group *Purchase receipts*), which
is the single source of truth for the user. The receipts grid inherits every
standard data-grid shortcut.

## Persistence

| Key | Holds |
|---|---|
| `shelfree.purchasereceipt.v1` | the receipts array |
| `shelfree.po.v2` | purchase orders (**bumped from v1**) |

**Why `shelfree.po.v1` was retired:** it held pre-Kanalora demo orders whose
lines reference door-hardware items (`HW-RAIL-72`, `GL-FRST-2480`, …) that no
longer exist in the catalogue, so every receipt would have matched nothing. The
old key is left in browser storage rather than cleared; `poLoad` simply reads
the new one and falls back to the current seed.

Item stock (`item.locs`) is in-memory only and re-seeds on reload, so posting a
receipt in the prototype moves stock for the session, not forever.

## Backend-build notes

- `GET /purchase-receipts` (list, filterable by po / vendor / status / date
  range), `GET /purchase-receipts/:no`, `POST /purchase-receipts` (draft),
  `PATCH /purchase-receipts/:no` (drafts only),
  `POST /purchase-receipts/:no/post`, `POST /purchase-receipts/:no/cancel`.
- `GET /purchase-orders/:no/receipt-progress` → per line
  `{ item, ordered, received, outstanding }`, computed server-side from posted
  receipts. The client must never be the authority on outstanding quantities.
- **Posting is a transaction** and must be idempotent (accept a client token):
  write the receipt, write the stock movements, recompute and write the PO
  status — all or nothing. Two operators posting the same challan twice is the
  realistic failure mode.
- **Over-receipt must be enforced server-side.** Consider making the tolerance
  configurable (a workspace setting: block / warn / allow up to n%) — small
  manufacturers often accept a 2–3% overage rather than send stock back.
- Foreign keys: `po` → PurchaseOrder, `vendor` → Vendor, `receivedBy` →
  Employee, `lines[].item` → Item, `location` → Site.
- Stock movements should be their own append-only ledger
  (`stock_movement { item, site, qty, source_type: 'purchase_receipt',
  source_no, posted_at, posted_by }`) rather than a mutated on-hand column, so
  valuation and audit have something to read.
- **Audit**: posting and cancelling a receipt are audit-relevant mutations
  (who, when, what quantities, which order). Editing a draft is not.
- Lot / batch / expiry capture belongs here — this is where those values are
  physically known. Not built yet; the line model has room for
  `lots: [{ lot, expiry, qty }]` per line when the tracking axes are wired up.
- Receipts are tenant-scoped; every endpoint must reject cross-tenant order and
  item references, not just filter them out of lists.

### Decisions & deferred-to-backend

- **Receiving is a purchasing document, not a warehouse one** (user's call).
  Warehouse Receipts / Warehouse Shipments were removed from the Warehouse
  module rather than built. The sales-side counterpart, when it lands, should be
  a **delivery note / delivery challan** under Sales — not a "shipment".
- **A receipt cannot exist without a purchase order.** Free-standing goods-in
  (stock found, donations, opening balances) is deliberately out — that is a
  stock adjustment, a different document.
- **Posted receipts are immutable.** No edit, no un-post. Corrections go through
  a vendor return / debit note, which lands in the purchase-finance stage. This
  keeps the stock ledger append-only from day one.
- **Rejected quantity is captured now, acted on later.** It moves no stock and
  posts nothing financial in this build; the purchase-finance slice turns it
  into a debit note against the vendor bill.
- **Deleting a posted receipt does not reverse stock** in the prototype. The
  backend should either forbid deleting posted receipts outright (preferred) or
  post a compensating reversal.
- **No tax on the receipt.** GST is a document-value concern and belongs on the
  vendor bill, which is the next build. The receipt carries quantities and the
  PO's unit cost only.
- **No landed cost / freight apportionment** — deferred to the vendor bill.
- **Tiers not assigned** — per the current working mode, this ships ungated for
  Kanalora. When the subscription pass happens, the likely split is: single-line
  receiving = Starter; rejection tracking + over-receipt tolerance = Growth;
  lot/serial capture and put-away by bin = Enterprise.

## Notes (2026-09-20)

The receipt's free-text **Notes** textarea is replaced by the app-wide
append-only notes thread (author + date/time per note, newest first, no edit or
delete — only mark-invalid with a permanent reason). Posting a receipt does not
close its thread: a posted receipt can still be annotated. The grid's `notes`
column is now **Latest note**, derived from the notes collection. See
[`../notes/README.md`](../notes/README.md).
