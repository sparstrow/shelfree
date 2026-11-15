# Scale-adaptive audit — existing built pages

Audit of every fully-built page against the CLAUDE.md rule: does it hold up
across the full 1-employee/1-vendor/1-location → many-of-everything range, and
does it have matching workspace / configuration / terminology / user settings?

Confirms the standing gap already flagged in `docs/erp-app/README.md`: **the
Settings → Modules & capabilities axis toggles (`multiWarehouse`, `zones`,
`lotBatch`, `expiry`, `barcodes`, `advReporting`, `serial`, `approvals`,
`multiCurrency`, `integrations`) exist but are wired to nothing** — flipping
one on/off changes no page's fields, columns, or copy. That's the single root
cause behind every page below.

## Audit order (build order once approved)

1. **Items** — most axis-dense page: lotBatch, expiry, serial, barcodes,
   multiWarehouse/zones (stock locations) all apply directly.
2. **Item detail** (Overview / Stock & locations / Purchasing) — same axes,
   surfaced per-item.
3. **Purchase Orders** — approvals, multiWarehouse (receiving location),
   multiCurrency.
4. **Vendors** + **Vendor Purchase Items** — multiCurrency, single vs.
   multi-purchasing-person.
5. **Customers** — multiCurrency, single vs. multi-sales-rep.
6. **People (Users & Employees)** — single-owner vs. multi-role team (partially
   covered by Team & roles already).
7. **Locations & warehouses** — already inherently scale-adaptive by structure
   (site list → 2D/3D designer); audit is about wiring it to the
   `multiWarehouse`/`zones` axis toggles rather than always-on.

## Per-page findings

### Items
- **Scale range:** always shows lot/batch, expiry, serial, and multi-location
  stock-split UI regardless of axis state — a 1-location, no-lot-tracking shop
  sees fields it will never use. Fails "no feature noise for small businesses."
- **Workspace:** none — no per-workspace default for which of these fields are
  even relevant (the axis toggle exists in Settings but isn't read here).
- **Configuration:** none — no item-level "does this SKU track lots/serials/
  expiry" flag; it's all-or-nothing today.
- **Terminology:** item categories/UoM are editable, but no scale-shaped label
  (e.g. "Location" vs "Warehouse" depending on multiWarehouse axis).
- **User:** none.

### Item detail
- **Stock & locations sub-tab** always renders a per-location breakdown table
  — for a single-location shop this is a table with one row.
- Same axis gaps as Items (lot/batch/expiry/serial fields always visible).

### Purchase Orders
- **Approvals** axis (enterprise) has no effect — no approval step exists at
  any tier; single-owner shops correctly see none, but Enterprise shops don't
  get one either.
- **multiCurrency** — PO has no currency field at all today.
- **Configuration:** no per-workspace default receiving location/buyer.

### Vendors / Vendor Purchase Items
- `purchasePerson` assumes a Purchasing dept may have 0 people (shows
  "Unassigned") — reasonable already, no gap.
- **multiCurrency** — vendor balance/cost fields are unit-less numbers, no
  currency.
- No workspace-level default payment terms/method applied to new vendors.

### Customers
- Same `salesRep`/multiCurrency gaps as Vendors.

### People (Users & Employees)
- Team & roles (Settings) already gates multi-role at Growth+ — best-covered
  page today. Gap: Users/Employees pages themselves don't reflect a
  single-owner shop differently (e.g. hiding role picker entirely when
  `!multiRoleAllowed`).

### Locations & warehouses
- Structure designer (zones/aisles/bins) is always available regardless of the
  `zones` axis toggle — should hide/lock below Growth.
- Multi-warehouse add-site flow always available regardless of
  `multiWarehouse` axis toggle.

## Next step

Per the brainstorming→spec→plan gate: write the full spec (data model, per-axis
UI behavior, settings surfaces) for **Items** first, get sign-off, then plan +
build. Repeat per page in the order above.
