# Spec — Purchasing: Purchase Orders (goods-in)

**Date:** 2026-07-21
**Status:** Approved
**Topic:** First transactional page after master data (Items / Customers / Vendors)

## Problem

We have the master-data layer built (Items, Customers, Vendors). The Starter base
still has no way to *transact* — nothing moves goods. Following the natural
inventory loop **goods-in → stock → goods-out**, the first transactional surface
every store needs is **Purchasing: Purchase Orders** — the document that records
what you're buying, from which vendor, at what cost. It reuses both master-data
sets we just built (a PO picks a Vendor and adds Item lines) and the
Purchasing-dept employee picker, so it's the highest-continuity next step.

Today `Purchasing ▸ Purchase Orders` renders the shared placeholder page.

## Decision

Build Purchase Orders as **two connected surfaces**, matching the requested
"list page AND document editor" depth:

1. **PO list page** — a 4th live *table page* inside `Shelfree App.dc.html`,
   reusing the existing shared table machinery verbatim (command bar, search,
   column picker, sort, saved views, bulk select, 3-tier record navigation:
   drawer → card → tab). Keyed by a new dataset id `purchaseOrders`. Wires
   `Purchasing ▸ Purchase Orders` from placeholder → live.

2. **PO document editor** — **built in-shell** as a bespoke full-page section
   (`isPOEditor`) rather than the separate `SFPurchaseOrder.dc.html` DC originally
   proposed: reuses the shell's proven state/save pattern (as Vendor Purchase Items
   does) and avoids a cross-DC callback round-trip. It opens **full-page in a
   workspace tab** from the list's New button (blank PO) or Edit/double-click
   (existing PO). It owns its own draft/edit state and hands the saved record
   back to the shell.

Scope is **ungated Starter base** — no plan gating, no locked states. Every
field/action is always-on; tier assignment happens later during scale-up.

## Screens & states

### PO list page (in `Shelfree App.dc.html`)
- Same command-bar + grid + drawer/card/tab as Items/Customers/Vendors.
- Default columns: **PO no** (mono) · **Vendor** · **Order date** · **Expected
  date** · **Status** (pill) · **Lines** (count, right) · **Total** (money,
  right, tabular-nums) · **Buyer**. A few more available but hidden by default
  (Location, Notes).
- New button → opens a blank PO editor tab. Edit / double-click → opens that PO
  in an editor tab. Delete → existing confirm dialog (single + bulk).
- Drawer / card preview shows header summary + a compact read-only line list +
  totals.

### PO document editor (`SFPurchaseOrder.dc.html`)
- **Header block**: Vendor picker (from `vendors`), Order date, Expected date,
  Receiving location (site/warehouse name — free/enum for now), Buyer
  (Purchasing-dept employee via the same `deptEmployeeOptions('Purchasing')`
  pattern), Status pill, PO no (auto, read-only).
- **Line grid**: rows of `{ item, desc, qty, uom, unitCost, lineTotal }`.
  - Item picker (from `items`) → on select, autofills `desc`, `uom`, and
    `unitCost` from the Item record (last/standard cost), all editable after.
  - qty × unitCost = lineTotal (derived, tabular-nums, `money()` formatting).
  - Add-line / remove-line controls.
- **Totals block**: Subtotal → Total (no tax line in Starter; see deferred).
- **Actions**: Save draft · Issue PO (Draft → Open) · Cancel PO · Back to list.
- **States**: new (blank, status Draft), editing existing, empty-lines guard
  (can't issue a PO with no lines / no vendor).

## Data model

New entity **PurchaseOrder** (seeded in `prototype/lib/shelfree-data.js`, persisted under
`shelfree.po.v1`):

```
PurchaseOrder {
  no:           string   // "PO00001", sequential
  vendor:       string   // Vendor.no (FK)
  orderDate:    string   // ISO date
  expectedDate: string   // ISO date, nullable
  location:     string   // receiving site/warehouse name
  status:       enum      // Draft | Open | Partially received | Received | Closed | Cancelled
  buyer:        string|null // Employee.id, Purchasing dept (nullable = Unassigned)
  notes:        string
  lines: [ {
    item:      string   // Item.no (FK)
    desc:      string   // defaults from Item.desc, editable
    qty:       number
    uom:       string   // defaults from Item.uom
    unitCost:  number   // defaults from Item.cost, editable
    lineTotal: number   // derived qty * unitCost
  } ]
  // derived (not stored): subtotal, total, lineCount
}
```

Status pill colours reuse existing tokens (Draft→neutral, Open→info,
Partially received→warn, Received/Closed→ok, Cancelled→bad).

## Interactions & business rules

- **PO number** auto-generated sequential on new (`PO00001`, no hyphen,
  `+1` step — changed 2026-10-24 from `PO-00010` / +10).
- **Line autofill**: selecting an Item copies its `desc`, `uom`, `cost` into the
  line; the buyer can override cost/desc/qty. Changing the item re-suggests.
- **Totals** derived every render — never stored; `money()` + `tabular-nums`.
- **Status lifecycle** (this build): Draft → Open (via *Issue PO*). Cancel from
  Draft/Open → Cancelled. **Partially received / Received / Closed are display-
  only here** — they're driven by the *next* build (Warehouse Receipts); the PO
  editor does not receive stock or change on-hand in this pass.
- **Buyer** = FK to `Employee.id` filtered to the Purchasing dept, Terminated
  excluded from the picker (same rule as Vendor purchase-person). Unassigned =
  `null`.
- **Validation** (client-side now): a PO needs a vendor and ≥1 line to be issued;
  qty and unitCost must be ≥ 0.
- No plan gating, locked states, or upgrade prompts (ungated Starter base).

## Persistence

- `shelfree.po.v1` — the purchase-order list (seeded on first load), same
  localStorage pattern as categories/UoM.
- Editor draft state lives in the `SFPurchaseOrder` component; committed records
  flow back to the shell's `purchaseOrders` slice.

## Success criteria

- `Purchasing ▸ Purchase Orders` shows a live table indistinguishable in feel
  from Items/Customers/Vendors (same nav funnel, column picker, sort, saved
  views).
- New/Edit opens a full-page PO editor tab; adding an Item line autofills from
  the Item; totals compute live; Save/Issue round-trips to the list.
- No console errors; dark + light both legible; figures tabular-nums; IDs mono.
- `docs/erp-app/README.md` + a new `docs/purchase-orders/README.md` updated in
  the same turn as the build.

## Deferred (not in this build)

- **Warehouse Receipts / receiving** — the stock-landing step (Partially
  received → Received, on-hand increments). Next build in the goods-in→stock loop.
- **Tax / multi-currency / discounts** — Starter shows subtotal = total; these
  are Growth-tier depth.
- **Approval workflow** (submit-for-approval, spend limits) — Growth/Enterprise.
- **Plan gating / locked states** — added later during scale-up per the
  scale-adaptive spec; this page ships ungated.

## Deferred to backend

- `PurchaseOrder` is a real transactional entity: needs CRUD endpoints, an
  auto-numbering sequence, and FKs to Vendor (`vendor`), Item (`lines[].item`),
  and Employee (`buyer`) with referential integrity.
- Status transitions must be server-enforced (can't issue without vendor+lines;
  received quantities come from receipt documents, not free edits).
- Totals should be recomputed/validated server-side, not trusted from the client.
- The item-cost autofill should read an authoritative vendor-item price / last
  cost, not the single `Item.cost` used here.
