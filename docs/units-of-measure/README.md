# Units of measure — item register + item profile tab

Part of `prototype/designs/erp/Shelfree App.dc.html`. Two surfaces, one data source:

1. **Item profile → Units of measure tab** — per-item management (base unit,
   auto-derived master pack, the item's unit list, conversions, add/remove).
   Replaced the earlier modal.
2. **Warehouse ▸ Units of Measure** — a register listing every unit registered
   against every item, on the same generic data grid as Items/Customers
   (views, filters, search, column picker, density, group/sort, export,
   pagination, row context menu, bulk selection, detail drawer).

Global unit *definitions* stay in **Settings ▸ Configuration ▸ Units of measure**
(code, name, measurement category, GST UQC, fixed conversion factor, symbol).
Tier: **Starter base, ungated, always on.**

## Overview

The register answers "which units does each item transact in, and how do they
convert?" without opening items one at a time. It is derived — never stored —
so it cannot drift from the item records.

## Screens & states

- **Register grid** (`Warehouse ▸ Units of Measure`, dataset id `itemUnits`):
  one row per item × unit. Columns: Item (frozen), Description, Unit, Unit name,
  Measurement, UQC, Qty in base, Base unit, Role (pill), and hidden-by-default
  Item category + Source (System/Custom).
- **Row flag dot**: a row whose conversion is not set (`qtyInBase == null`) is
  flagged, matching the low-stock dot convention on Items.
- **Saved views**: All item units (system), Pack units, Missing conversion.
- **Detail drawer** (row selected): unit + item identity, role pill, unit facts,
  and two actions — *Open on item* (item profile → Units of measure tab) and
  *Remove from item*.
- **Empty/filtered state**: "No item units match your filters."
- **Item profile → Units of measure tab**: base-unit select (only units added to
  the item), read-only auto master pack with its size in base units, the unit
  table with inline conversion entry for non-fixed units, add-unit picker
  (searchable, drawn from the global Settings list), and per-row remove.

## Data model

- Unit definition (`state.uomCustom` + seeded defaults, `shelfree.uom.custom.v1`):
  `code, name, cat, uqc, conv, sym, custom`.
- Item-level UoM (`state.itemUom`, `shelfree.item.uom.v1`): item no →
  `{ list: [code], base, pack, qty: { code: qtyInBase } }`. `pack` is always
  recomputed (`itemUomComputePack`) — never user-set.
- Register row (derived, `itemUnitRows()`): `no` (`"<itemNo> · <code>"` — the row
  key), `itemNo, itemDesc, category, code, name, cat, catName, uqc, base,
  qtyInBase, fixed, role, source`. `role` ∈ Base | Master pack | Pack unit.
  `qtyInBase` is 1 for the base unit, the definition's fixed factor when it has
  one, the item's manual qty otherwise, `null` when unset.

## Interactions & business rules

- Register actions map to the item behind the row: New (with a row selected →
  that item's Units tab with the add picker open; nothing selected → Settings ▸
  Units of measure, new-unit modal), Edit / View / Enter / double-click /
  Open in new tab → item profile Units tab; Delete (single or bulk) → removes
  those units from their items; Duplicate is refused with an explanatory toast.
- Removing a unit that is the base promotes the first remaining unit to base;
  removing the master pack clears it (recomputed on the next update); the unit's
  stored conversion qty is dropped.
- Adding the first unit to an item makes it the base automatically.
- Conversion qty is only editable for units without a fixed factor; fixed
  factors show a lock and are changed in Settings.
- The Items grid's `Base UoM` / `Master Pack UoM` columns and the item profile
  read the same map, so all three surfaces update together.

## Persistence

- `shelfree.item.uom.v1` (localStorage) — the item → units map.
- `shelfree.uom.custom.v1` (localStorage) — user-added unit definitions.
- The register itself persists nothing; grid layout/views follow the generic
  data-grid persistence.

## Backend-build notes

- Entities: `uom(code PK, name, measurement_category, uqc, fixed_factor, symbol,
  is_system, tenant_id)`; `item_uom(item_id, uom_code, qty_in_base, is_base,
  PRIMARY KEY(item_id, uom_code))`. Master pack is derived server-side (the
  non-base unit with the greatest `qty_in_base`) and exposed read-only.
- Endpoints: `GET /items/{id}/units`, `POST /items/{id}/units` (add),
  `PATCH /items/{id}/units/{code}` (qty_in_base, is_base),
  `DELETE /items/{id}/units/{code}`, and `GET /item-units` for the register
  (paged, filterable/sortable by every column above; it is a join view, not a
  table).
- Validation the backend must enforce: exactly one base unit per item; the base
  must be in the item's unit list; `qty_in_base > 0`; a unit with a fixed factor
  ignores a supplied qty; refuse deleting a unit referenced by open documents
  (PO/SO/receipt lines) or historical postings — deactivate instead; refuse
  deleting a global UoM still referenced by any `item_uom` row.
- Stock, costs and prices are held in the base unit; document lines store the
  transacted unit + the conversion used at the time so historical documents stay
  correct when a conversion later changes.

### Decisions & deferred-to-backend

- **Register is a derived view, not a table** — chosen so the item profile stays
  the single write surface; every register action delegates to the item.
- **Row identity is `"<itemNo> · <code>"`** in the prototype because the generic
  grid keys rows by `no`; the real API should return a stable composite id.
- **Bulk delete removes units item by item**; no cross-item transaction yet —
  the backend should apply it as one transaction with per-row failure reporting.
- **Audit**: adding/removing a unit and changing a conversion are
  record-changing events and must emit audit entries (actor, item, unit, old/new
  qty) — not implemented client-side.
- **No new PII**; unit data is tenant-scoped master data. Cross-tenant reads
  must be blocked by `tenant_id` scoping on both `uom` and `item_uom`.
- Deferred: unit-of-measure groups/families, per-vendor purchase units, and
  weight/volume-derived conversions.


## Update 2026-10-15 — Quiet help (Settings ▸ Units of measure)
Settings page `uom` and its New/Edit unit popup now follow the quiet-page rule (CLAUDE.md; reference
build `docs/tax-settings/README.md` → "Quiet help").
- **Removed inline by default:** page description paragraph (removed entirely — the title ⓘ carries it, even with `?` on) and popup
  subtitle (`uomModalSub`, shown again when per-user `me.showSetHelp` is on; `?` toggles it).
- **ⓘ + hover (~400 ms):** page title; grid columns Category, GST UQC, Conversion, Source; popup fields
  Code, Category, GST UQC code, Conversion factor, Symbol. Click ⓘ pins; Esc / ✕ / click-outside closes.
  Touch → bottom sheet.
- **Kept inline (state):** the live "Stored conversion: 1 X = n BASE …" preview and validation errors.
- **Help-text map:** `uomCatHelpText().uom`, VM `uomCatHelpVM()` (exposes `hpUom.<key>`), keys
  `uom.page|cat|uqc|conv|src|fCode|fCat|fUqc|fFactor|fSym`, built on the shared `hp*` helpers.
- **Keyboard:** `?` on the page (guarded while typing / delete confirm open); listed in Settings ▸
  Keyboard shortcuts → "Settings › Units of measure".
- **Backend:** none — copy is static UI text. `showSetHelp` is part of the per-user settings record
  (`shelfree.settings.user.v1` → user-preferences table). Security checklist: no new data, PII or audit events.
