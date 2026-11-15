# Locations & warehouses — `designs/erp/SFLocationsWarehouses.dc.html`

## Overview

Settings sub-page for managing the physical sites that hold stock, plus a
visual 2D/3D "Structure Designer" for mapping each site's internal layout
(zones → aisles/rows → bays/levels → bins). Reached from Settings ▸ Inventory ▸
**Locations & warehouses** in `designs/erp/Shelfree App.dc.html`.

Implemented as its **own Design Component**, not inlined into the app shell's
Component class: the shell mounts it with
`<dc-import name="SFLocationsWarehouses" theme="{{ vm.theme }}">` inside the
`isLocSettings` settings branch. It receives only the active `theme` from the
shell (so dark/light stays in sync) — everything else (warehouses, layouts,
view routing, the wizard, drag state) is self-contained. It can also be opened
directly as its own page for design-system review; a `unitSystem`
(imperial/metric) and `defaultMode` (2D/3D-on-open) tweak are exposed as props.

Note for future edits: `<dc-import>` resolves sibling DCs by filename **in the
same directory** as the importing file, so this file must stay a direct
sibling of `Shelfree App.dc.html` in `designs/erp/` — it cannot move into a
subfolder without breaking the import.

## Screens & states

- **List view** (`view: 'list'`): card grid, one per warehouse/site.
  - Command row: type-tabs filter (All / Mfg + DC / Distribution / 3PL /
    Retail, each with a live count) and a name/code/city search box.
  - Each card: name, code, type badge, active/setup/inactive status pill,
    "N floors" badge (multi-floor sites), address, 4 stat tiles (sq ft,
    areas, rows, slots), a bin-utilization bar (if the site has any shelving
    built) or an amber "Layout not built yet" notice, and footer actions
    **Open designer / Build layout**, **Edit details**, **Delete**.
  - Empty state when the search/filter combination matches nothing.
  - **New warehouse** button opens the creation wizard.
- **Structure Designer** (`view: 'designer'`, scoped to one `activeWhId` +
  `activeFloorId`):
  - Toolbar: back-to-list, 2D-plan/3D-view segmented toggle, Occupancy
    (heat-map) and Labels toggles, zoom controls, Fit-to-view.
  - Left panel: floor switcher (multi-floor sites), the zone/aisle tree for
    the current floor (expand/collapse, add aisle inline), and an "areas"
    palette of 12 building-block types (Receiving, Bulk storage, Pick area,
    Long-goods, Glass & mirror, Hardware bins, Assembly, Finished goods,
    Shipping, Staging, Returns, Office) — draggable onto the canvas or
    click-to-place.
  - Center: the 2D or isometric-3D floor canvas (zones as boxes, aisles as
    racking runs subdivided into bays, drag to reposition in 2D), plus a
    collapsible **bin matrix** dock (shown when an aisle or bin is selected)
    — a grid of clickable bin cells, one row per level, columns per
    bay×position, split by left/right side.
  - Right panel: contextual inspector — warehouse summary (root selection:
    totals + occupancy + by-area-type breakdown), area/zone editor
    (name, type picker, status, code, colour, width/depth, shelving rows),
    aisle editor (code, orientation, bays/levels/bins-per-bay/sides steppers,
    label-scheme preview), or bin editor (assigned SKU, qty on hand, lot).
  - Empty-floor state overlay prompting drag-and-drop when a floor has no
    zones yet.
- **Creation wizard** (modal, `whModalOpen`): 4 steps for a new site (Basics →
  Building → Areas → Finish) or 3 steps when editing an existing one (Basics →
  Building → Details, skips the Areas quick-start). Steps: name/code + site
  type; single vs multi-level + per-floor code/name; optional area quick-start
  templates or manual area picker with per-type counts (only on create); and
  address/contact/floor-area details with a review summary. Step dots are
  clickable to jump back once visited (or freely in edit mode).
- Canvas scale is **10 px per foot** (`SCALE`) with a default/fit zoom of 0.85
  in 2D and 0.7 in 3D — raised from 4 px/ft when the seed moved to Kanalora's
  small sites, so a 56–104 ft building still fills the canvas.
- **Delete confirm** modal and a **toast** stack (bottom-right, auto-dismiss)
  for create/update/delete/add feedback — same visual pattern as the rest of
  the app.

## Data model

All in component state, persisted as a whole (see Persistence):

- **Warehouse**: `id, name, code, type (mixed|dc|3pl|retail), addr, city,
  state, zip, country, area (sq ft), contact, email, phone, tz, status
  (active|setup|inactive), designed (bool), floors: Floor[]`.
- **Floor**: `id, name, code, level (int, ground = 1)`.
- **Layout** (one per `warehouseId::floorId`, key `lkey`): `floorW, floorH`
  (in feet), `zones: Zone[]`, `aisles: Aisle[]`, `bins: { [binCode]: BinOverride }`.
- **Zone** ("area"): `id, code, name, type (one of the 12 area-type ids, or
  custom 'storage'), color, status (available|inuse|maintenance), x, y, w, h`
  (feet). `type` drives the icon, default color, and whether it's rackable
  (`storage: 'racked' | 'floor' | 'none'` on the area-type catalog entry).
- **Aisle** ("row"): `id, zoneId, code, dir (v|h), x, y, bays, levels,
  binsPerBay, sides (1|2), aisleWidth`. A rack "run" is generated per side.
- **Bin**: not stored individually unless overridden — `binDefault(code)` is a
  deterministic hash of the bin code, giving stable-but-fake
  occupancy/item/qty/lot for every possible bin until the user actually edits
  one via `setBin()`, at which point a real record is written to
  `layout.bins[code]`. Bin code scheme: `<aisleCode><L|R>-<bay:2><level letter>-<pos:2>`
  (e.g. `LG1L-03-B-01`), levels lettered A upward from the floor.
- **Area-type catalog** (`areaTypes()`, fixed, not user-editable): 12 entries,
  each `{ id, name, desc, color, w, h, storage }` — the "building blocks"
  offered in the palette/wizard. Tuned to Kanalora's ceramic assembly
  operation: Receiving, Bulk storage, Pick area, **Fragile ceramic** (padded
  shelving for unpacked lids/bases — 1 bin per bay, 3 levels), **QC &
  inspection**, **Component bins** (cones, care cards, cartons — 3 bins per
  bay), Assembly, Finished goods, Shipping, Staging, Returns, Office. Default
  area footprints are sized for a small unit (15–26 ft per side), not a
  40,000 sq ft DC.
- **SKU catalog** (`skus()`, fixed): 8 sample items used to populate bin
  "Assigned item" pickers — real Kanalora SKUs (`ASH-*`, `CMB-*`, `SBC-*`,
  `ASH-STAND-WD`, `PKG-FOAM-INS`) copied from `lib/shelfree-data.js`, but
  still a local stand-in: this screen is not wired to the app's item master.

## Interactions & business rules

- Dropping/placing an area from the palette seeds shelving automatically for
  "racked" types (`seedRows`): 1–2 aisles sized to the zone, with per-type
  defaults (e.g. Hardware bins get 3 bins/bay and 4 levels; Glass & mirror
  gets single-bin bays and no double-stacking).
- Dragging a zone also drags its child aisles with it (`onDown`/`onMove`
  tracks original positions and applies the same delta); dragging is
  disabled in 3D mode. Optional 2-ft snap (`state.snap`, always on today —
  no UI toggle exposed for it).
- A click vs. a drag is disambiguated by movement distance (`onUp`): no
  movement → select; movement → persist the new position.
- Deleting a zone cascades to delete its aisles; there's no bin-level delete
  (bins are derived, not owned rows, until overridden).
- Warehouse code must be unique (checked on both the wizard's finish step and
  the edit form); floor codes must be unique within a warehouse.
- The wizard's "Areas" step is create-only — editing an existing warehouse
  skips straight from Building to Details/Finish; its layout is edited only in
  the Structure Designer afterward.
- Occupancy/heat colouring: `<50%` ok, `50–80%` warning, `>80%` bad — same
  3-tier semantic used for the list card's utilization bar, the floor
  switcher, the canvas heat-map toggle, and the bin matrix cell shading.
- Deleting a warehouse removes every layout keyed `warehouseId::*` for it.

## Persistence

`localStorage` key **`shelfree.wh.v7`** (bumped from `v6` when the seed was
re-based on Kanalora data, so existing installs re-seed rather than keep the
old generic sites) — a single JSON blob:
`{ warehouses: Warehouse[], layouts: { [warehouseId::floorId]: Layout } }`.
Written on every mutation (`persist()`), seeded from `baseWarehouses()` /
`baseLayouts()` (3 Kanalora sample sites: Tiruvannamalai — Main `TVM-MAIN`
with a ground floor + carton loft laid out, Assembly unit `TVM-ASSY` laid out,
and Chennai DC `CHN-DC` (3PL) undesigned) on first load,
and migrated (`migrate()`) from an older single-layout-per-warehouse shape if
present.

**Seed sites (Kanalora).** Codes match `siteDefs()` in
`designs/erp/Shelfree App.dc.html` so the settings page and the item stock
buckets speak the same language:

| Code | Site | Type | Status | Layout |
| --- | --- | --- | --- | --- |
| `TVM-MAIN` | Tiruvannamalai — Main (6,200 sq ft, 2 floors: ground + carton loft) | Manufacturing + DC | Active | Fully mapped — receiving, QC, fragile ceramic store, assembly & packing, component bins, finished goods, staging, returns, office; loft holds carton/packaging bulk |
| `TVM-ASSY` | Assembly unit, Vengikkal Industrial Estate (1,800 sq ft) | Manufacturing + DC | Active | Mapped — component in, twist-lock assembly, pack & wrap, finished goods |
| `CHN-DC` | Chennai DC, Ambattur (2,400 sq ft) | Third-party (3PL) | Setup | Not built yet |

The app's fourth stock bucket, `TVM-RET` (Returns), is **not** a separate
warehouse record — it is the `RET` Returns area inside `TVM-MAIN`. If returns
ever need their own address/contact, promote it to a warehouse record here.

Site codes now allow hyphens (`/[^A-Z0-9-]/` on the code input, max 9 chars)
so `TVM-MAIN`-style codes can be typed as well as seeded. `MAIN`/`EASTDC` in
the order and purchase-order seed data were renamed to `TVM-MAIN`/`CHN-DC` in
the same pass; vendor `respCenter`/`locationCode` are `TVM-MAIN`. View-only UI state (selection, zoom, expanded tree nodes, which
theme override, modal open/step) is not persisted — reload always returns to
the list view.

## Backend-build notes

- Model as: `warehouse`, `warehouse_floor`, `zone` (fk floor), `aisle` (fk
  zone), and either a `bin` table generated from aisle geometry or bins kept
  virtual server-side too (this prototype treats them as virtual/derived,
  overridable per code — decide if real installs need every bin as a durable
  row for scanning/audit history).
- `Zone.type` should reference a shared area-type/rack-template table rather
  than a client-side constant list, so warehouse ops can add site-specific
  area types.
- The bin "assigned item" picker currently points at the 8-item local `skus()`
  stand-in, not the real item master used elsewhere in the app
  (`lib/shelfree-data.js`) — wire it to the same item source before treating
  qty-on-hand here as authoritative; today it does not affect any other
  screen's stock figures.
- No optimistic-locking/concurrency story: two users editing the same
  layout would clobber each other via the single localStorage blob. A real
  backend needs per-layout versioning or field-level updates.
- `designed` on a warehouse is derived (any floor with ≥1 aisle) and
  recomputed on every layout mutation — keep that as a computed/denormalized
  flag rather than a manually-set one.
- Utilization/occupancy figures are entirely synthetic (hashed from the bin
  code) until a bin is explicitly edited — do not treat pre-edit occupancy as
  real inventory data when wiring this up to actual stock levels.

## Update 2026-09-25 — state on locations (GST task 3)
- `siteDefs()` entries carry `stateCode` (GST state code; all current sites `33` Tamil Nadu).
  A location belongs to the active Normal GST registration of its state; a location in a state with
  no registration raises the gap banner on GST registrations. Editable state + `registrationId` land
  in task 4 (spec §2.7 — single location registry, place-of-business, 3PL operator) (backend: `locations.state_code`, `locations.registration_id` FK, re-link on state change,
  blocked while open documents use the location).

## Update 2026-09-26 — one location registry (GST task 4, spec §2.7)
**Tier:** Starter base, ungated (future hint: multi-state sites + 3PL operator = Growth). On by default.

### What changed
- **This page is the only source of locations.** The ERP app's hard-coded `siteDefs()` list is retired;
  `locDefs()` in `designs/erp/Shelfree App.dc.html` reads the same store (`shelfree.wh.v7`, seed
  `lib/shelfree-data.js → seedWarehouses()`). GST registrations, States & territories, item stock (drawer,
  item page, grid Location column + filter, location scope chip), receipt "Received into", PO receiving
  location, assembly-order location, production settings and My settings › Default location all read it.
- **`TVM-RET` retired.** Returns are the `RET` area inside TVM-MAIN. Item stock is keyed by location id:
  `main→WH-TVM`, `assembly→WH-ASSY`, `east→WH-CHN`, `returns→WH-TVM` (summed). Saved assembly orders,
  BOM WIP locations and production settings are re-keyed on load; saved receipts on `TVM-RET` move to `TVM-MAIN`.
- **Form (Details / Finish step):** State = **required GST state dropdown** for Indian sites (stored as the
  2-digit code; `'TN'` → `'33'` migrated), Country select (default **IN**; non-IN sites get a free-text
  region and no registration), **Status** (Setting up / Active / Inactive), **On the GST certificate as**
  (Principal / Additional / Not on certificate yet), **Site manager** (employee), **Operated by (3PL vendor)**
  when type = 3PL. A read-only **GST registration** line updates live as the state changes (ok / "Choose a
  state" / warn "No GST registration in X" + *Add X registration*).
- **Cards:** GSTIN chip + certificate-status pill (colour + icon + text); manager / operator line; warning
  when the state has no registration (*Add X registration* jumps to GST registrations with the new form
  pre-filled); warning + *Mark as declared* when the site isn't on the certificate.
- **Contacts:** the free-typed Ops contact / email / phone are gone. A site's manager is **internal staff**
  (`managerEmpId` → People › Employees) — not a People › Contacts record, which is for external people
  (refines spec decision 10). A 3PL's people are the operator vendor's contacts. Legacy typed contacts on
  seeded sites are dropped on migration; on user-made sites they stay in storage, unused.
- Keyboard: **N** new warehouse · **/** search · **Ctrl/Cmd+Enter** next/save · **Enter** confirm delete ·
  **Esc** close (captured so Esc doesn't also close Settings). Listed in Settings › Keyboard shortcuts.

### Data model (location)
| Field | Type | Notes |
|---|---|---|
| `state` | string | GST state code (`'33'`) when `country = 'IN'`; free text otherwise. Required for IN. |
| `country` | ISO-2 | Default `IN`. |
| `status` | `setup` \| `active` \| `inactive` | Label "Setting up" for `setup`. |
| `pobStatus` | `principal` \| `additional` \| `undeclared` | Place of business on the GST certificate. Seed: TVM-MAIN principal, TVM-ASSY additional, CHN-DC undeclared. |
| `managerEmpId` | employee id \| '' | Seed: EMP00003, EMP00002, EMP00013. |
| `operatorVendorId` | vendor no \| '' | 3PL only. Seed: CHN-DC → V00006 Ambattur Logistics Park. |
| `createdAt`/`updatedAt` | ISO | Stamped on save. |
| *registration* | derived | Active Normal registration whose GSTIN starts with `state`. Never stored/picked in the UI. |

### Rules
- Can't be **Active** while its state has no active Normal registration (save blocked with the reason).
- **State/country change** blocked while open documents use the site (open POs Draft/Issued/Partially received,
  Draft receipts, draft/released/in-progress assembly orders, Open/Released sales orders).
- **Delete** blocked while it holds stock or has open documents → "Set it to Inactive instead". The
  principal place can't be deleted while other sites exist.
- **One principal per state**: saving a site as Principal moves the previous one to Additional (the form
  says so before you save; toast after).
- Inactive sites drop out of registration cards, gap warnings and pickers; they stay in item stock only
  while they still hold stock.

### Persistence
`localStorage['shelfree.wh.v7']` = `{ warehouses, layouts }`, written by this page and by the app's
registration-card actions (declare / make principal). The page reports every save to the app via its
`onChange` prop so both stay in step in one session.

### Backend-build notes
- `locations(id, code UNIQUE per tenant, name, type, status, addr, city, state_code, zip, country,
  pob_status, manager_employee_id FK, operator_vendor_id FK, created_at, updated_at)`; registration is a
  derived view (or a maintained `registration_id` FK re-linked on state change).
- Constraints: unique principal per (tenant, state_code) among non-inactive rows; `status='active'` requires
  an active Normal registration for `state_code`; state change rejected while open documents reference the
  location; delete rejected while stock/open docs exist.
- Stock tables key on `location_id`. Returns are an area (zone) of a location, not a location.
- Audit: create/edit/delete, status, state, `pob_status`, operator changes.
- `GET/POST/PATCH/DELETE /locations`, `POST /locations/:id/declare`, `POST /locations/:id/make-principal`.

### Decisions & deferred-to-backend
- Manager = employee link (internal), not a Contacts link — Contacts are external people.
- The app never files REG-14; "Mark as declared" only records that it was done on the portal.
- Another-state 3PL needs that state's registration and branch-transfer invoices (task 12).
