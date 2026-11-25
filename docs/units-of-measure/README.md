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

## React app (2026-11-17) — Settings ▸ Configuration ▸ Units of measure

Route `/settings/uom` (`features/settings/units-of-measure/`), on the Settings template
(`docs/settings` → "React app"). Rules are pure functions in `src/domain/units-of-measure.ts` (Vitest).

- **Screen:** title with count pill, category chips (All + six), search, one table — Code, Name, Category,
  GST UQC, Conversion, Symbol, Source (Default with a lock / Custom). ⓘ on Category, GST UQC, Conversion,
  Source and the title. "New unit" opens a form (Code, Name, Category, GST UQC code, Conversion factor with the
  base unit beside it, Symbol, live "Stored conversion: 1 X = n BASE"). Delete asks first and the toast has
  **Undo**. Loading skeleton / error with retry / "No units match."
- **Data:** the 34 default units are code (`DEFAULT_UNITS`), locked, GST-ready. Units the business adds are the
  `unitsOfMeasure` collection (`uomSchema`: `code, name, cat, uqc, conv, sym, custom: true`), seeded with
  Kanalora's PNL (Panel) and RFT (Running Feet), `localStorage` `shelfree.v2.unitsOfMeasure`.
- **Rules:** code required, letters and numbers, up to 8, unique across defaults and custom (case-insensitive,
  stored upper-case); name required; factor blank (standalone) or a number above zero; symbol up to 6.
  Changing the category resets the UQC to that category's suggestion. Default units cannot be edited or
  deleted. **A unit an item uses cannot be deleted** (the message says how many items) **and its code is
  fixed** (items refer to units by code). Editing a code on an unused unit removes the old record and saves
  the new one.
- **Keys:** N new, `/` search, ↑ / ↓ move, E / Enter / double-click edit, Delete delete, right-click row menu
  (Edit, Delete — disabled with the reason as tooltip), Ctrl/Cmd+Enter or Ctrl/Cmd+S saves the form, Esc closes
  an open description, then the form. Listed in Settings ▸ Keyboard shortcuts.
- **Settings surfaces:** this page *is* the configuration surface for units; workspace/terminology/user-level:
  none needed yet (no per-user preference; unit names are data, not labels).
- **Backend:** `GET/POST /units-of-measure`, `PATCH/DELETE /units-of-measure/{code}`; entity
  `uom(code PK, name, measurement_category, uqc, fixed_factor, symbol, is_system, tenant_id)` (the frontend keeps
  the text form `1 PNL = 12 NOS` for parity — the real API should store `fixed_factor` as a number). Enforce
  server-side: defaults immutable; `DELETE` refused with 409 while any item or document line references the unit
  (deactivate instead); `code` immutable once referenced; `uqc` ∈ the GST UQC list; audit events for create /
  update / delete (actor, old → new). Admin-only. Security checklist: no PII, tenant-scoped master data.
- **Deliberate difference from the prototype:** the unit form is a dialog on a plain table, not the data grid
  (the settings frame already provides the header); delete is blocked for in-use units, which the prototype did
  not check.

## React app (2026-11-18) — Warehouse ▸ Units of Measure

Route `/warehouse/units-of-measure` (`?sel=<itemNo> · <code>` preview deep link), built on `ListPage` with
pure register and unit-set helpers in `apps/web/src/domain/units-of-measure.ts` (reusing `allUnits`,
`sizeInBase`, `categoryName`, `formatFactor` and `domain/item.ts` `itemCategoryParent`).

- **Files:** `apps/web/src/features/warehouse/units-of-measure/ItemUnitsPage.tsx` + `dataset.ts`, route
  `apps/web/src/routes/warehouse/units-of-measure/index.tsx`, schema `itemUnitSetSchema` in
  `apps/web/src/data/schemas/index.ts`, seed `apps/web/src/data/seed/item-units.ts`, collection `itemUnits` in
  `apps/web/src/data/api/index.ts`, atomic commands in `apps/web/src/data/api/commands.ts`, query hooks in
  `apps/web/src/data/queries/index.ts`, domain helpers in `apps/web/src/domain/units-of-measure.ts`
  (+ `units-of-measure.test.ts`), shared Item profile tab
  `apps/web/src/features/warehouse/items/item-tabs/ItemUnitsTab.tsx`, browser spec
  `apps/web/e2e/item-units.spec.ts`.
- **Same as prototype:**
  - Derived register (one row per item × unit, composite key `<itemNo> · <code>`), default sort by key asc,
    built from the stored per-item unit sets (`shelfree.v2.itemUnits`), `items`, and `unitsOfMeasure`.
  - Columns and default visibility: `Item` (frozen), `Description`, `Unit`, `Unit name`, `Measurement`,
    `UQC`, `Qty in base`, `Base unit`, `Role` (`StatusPill`), and hidden-by-default `Item category` + `Source`.
  - Row flag warning dot when `qtyInBase == null` (`Missing conversion`), views (`All item units`, `Pack units`,
    `Missing conversion`), filter columns (including `Base unit`), and quick search blob.
  - Detail drawer (`UNIT DETAILS` 8 facts + explanatory footnote), primary action **Open on item**, row
    double-click / `Enter` opening `/warehouse/items/<itemNo>?tab=units`, and single/bulk remove with
    confirm + **Undo** (restoring exact unit-set snapshots and `item.uom`).
- **Deliberate changes:**
  - **No `New` button on the register:** units are defined in Settings ▸ Units of measure and attached on
    each item's Units of measure tab (`create` omitted on `ListPage`).
  - **No new keyboard shortcuts** beyond `ListPage` and `DataGrid`, so `app/shortcuts.ts` is unchanged.
- **Persistence:** reads/writes `shelfree.v2.itemUnits` and `shelfree.v2.items`, and reads
  `shelfree.v2.unitsOfMeasure` via `@/data/queries`.
- **Tests:** unit tests in `apps/web/src/domain/units-of-measure.test.ts` (`seed.test.ts` covers `itemUnits`)
  and Playwright tests in `apps/web/e2e/item-units.spec.ts`.

### Item units store & rules (2026-11-18)

- **Collection (`shelfree.v2.itemUnits`):** keyed by `itemNo`; schema `itemUnitSetSchema` =
  `{ itemNo, list: string[], base, pack, qty: Record<string, number> }`. Seeded with one base-only unit set
  per seeded item from `item.uom` (`seedItemUnits()`).
- **Pure domain rules (`domain/units-of-measure.ts`):**
  - `itemUomAdd(set, code, units)` — rejects empty/duplicate codes; promotes to `base` if `set.base` is empty;
    recomputes `pack`.
  - `itemUomRemove(set, code, units)` — removes `code` from `list`, promotes `list[0] ?? ''` to `base` when the
    base unit is removed, clears `pack` and `qty[code]` (and `qty[promotedBase]`), and recomputes `pack`.
  - `itemUomSetBase(set, code, units)` — switches `base` to an attached unit, clears `qty[base]`, recomputes
    `pack`.
  - `itemUomSetQty(set, code, qty, units)` — validates `qty > 0` (or `null` / blank to clear), rejects base or
    fixed-factor units, and recomputes `pack`.
  - `itemUomComputePack(set, units)` — derives `pack` as the non-base unit holding the most base units (`> 1`).
  - `applyItemUnitSet(item, unitSet)` / `syncItemBaseUnit(item, existingSet, units)` — keeps `item.uom` equal to
    `unitSet.base` in one helper returning both aligned records.
- **Atomic commands (`data/api/commands.ts`):** `updateItemUnits`, `bulkRemoveItemUnits`, `restoreItemUnits`,
  and `saveItemWithUnits` validate domain rules and schemas first and write both `itemUnits` and `items` (with
  rollback on partial failure so both change or neither does), wrapped by `useUpdateItemUnits`,
  `useBulkRemoveItemUnits`, `useRestoreItemUnits`, and `useSaveItemWithUnits` in `data/queries/index.ts`.
- **Backend contract & security:**
  - Table `item_units(item_no, unit_code, role, qty_in_base)` (`role` ∈ `base | master_pack | pack`, with
    `master_pack` derived server-side from the largest `qty_in_base > 1`), maintaining the invariant
    `base = items.uom` and exactly one base unit per non-empty item unit set; server enforces all unit rules,
    `qty_in_base > 0`, fixed-factor immutability, and `DELETE` refusal (`409`) when referenced by open
    PO/SO/receipt/assembly lines or posted history.
  - Endpoints `GET /item-units`, `GET/PATCH /items/{no}/units`, `DELETE /item-units/bulk`, and
    `POST /items/{no}/units/restore` enforce tenant scoping (`tenant_id`), `warehouse.items.read` /
    `warehouse.items.write` RBAC, and emit audit events on add, remove, base change, and conversion change.
  - No PII; tenant-scoped master data only.
- **Pending integration:** `features/warehouse/items/ItemCard.tsx` does not exist yet on this branch
  (`/warehouse/items/new` and `/warehouse/items/$no/edit` render placeholders); `syncItemBaseUnit` and
  `saveItemWithUnits` are ready to wire into `ItemCard` when it lands.

**Delete guard (2026-11-18):** Settings ▸ Units of measure blocks deleting a unit used by any item — as its base (`items.uom`) or anywhere in its unit set (`itemUnits.list`); `countByUnit(items, sets)`. The backend enforces the same with a foreign key from `item_units.unit_code`.


## Update 2026-11-25 — Units of measure moved into Warehouse settings

**Settings ▸ Units of measure** now lives at **`/warehouse/settings/uom`** (area Warehouse, type list,
`UnitsOfMeasureSection` in `features/settings/units-of-measure/`). The old `/settings/uom` redirects there
(`replace`), so saved links, favourites and recents keep working. It is also listed in central Settings under
Modules ▸ Warehouse. Spec: `docs/superpowers/specs/2026-11-24-settings-redesign.md`; frame and URLs:
`docs/settings/README.md`.

- **Template:** `ListPage embedded` inside `SettingsPage flush`, replacing the earlier custom table and the
  `UnitDialog`. The grid has no top bar of its own (the frame breadcrumb is the title) and New sits in the
  grid toolbar. Editing is the standard drawer `editor` (view and edit show the same rows, keys N / E /
  Ctrl+S / Esc, delete with undo). Dataset: `units-of-measure/dataset.ts`; help map `help.ts`.
- **Same rules as before:** default units are locked (GST reporting); custom units editable; the code is fixed
  once any item uses the unit; a unit used by any item cannot be deleted (`countByUnit`,
  `deleteBlockReason`); delete has undo; conversion factor and GST UQC validation unchanged
  (`domain/units-of-measure.ts`).
- **Permission:** module settings. Owner and admin edit; a member needs `perms.warehouse` of read or write to
  see it and `settings.warehouse` to edit. Without the right the section is **read-only** (no New, Edit,
  Delete; drawer in view mode). UX only: the backend enforces the same on `POST/PUT/DELETE /units-of-measure`.
- **Find a setting:** the section registers its help map, so its columns and fields are searchable.
- **Backend:** no change to the endpoints or entities above. Every create, edit and delete of a unit
  definition emits an audit event (actor, unit, before/after), and the write permission is the Warehouse
  Manage settings right, not a separate right.
