# Locations & warehouses — `prototype/designs/erp/SFLocationsWarehouses.dc.html`

## Overview

Settings sub-page for managing the physical sites that hold stock, plus a
visual 2D/3D "Structure Designer" for mapping each site's internal layout
(zones → aisles/rows → bays/levels → bins). Reached from Settings ▸ Inventory ▸
**Locations & warehouses** in `prototype/designs/erp/Shelfree App.dc.html`.

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
sibling of `Shelfree App.dc.html` in `prototype/designs/erp/` — it cannot move into a
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
  `ASH-STAND-WD`, `PKG-FOAM-INS`) copied from `prototype/lib/shelfree-data.js`, but
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
`prototype/designs/erp/Shelfree App.dc.html` so the settings page and the item stock
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
  (`prototype/lib/shelfree-data.js`) — wire it to the same item source before treating
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
  `locDefs()` in `prototype/designs/erp/Shelfree App.dc.html` reads the same store (`shelfree.wh.v7`, seed
  `prototype/lib/shelfree-data.js → seedWarehouses()`). GST registrations, States & territories, item stock (drawer,
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

## React app (2026-11-25)

**Settings ▸ Locations & warehouses** is ported as a list section (Phase 2 run 2.2): **`/warehouse/settings/locations`**
(area Warehouse, type list). `LocationsSection` in `apps/web/src/features/settings/locations/` is a
`ListPage embedded` with an `editor` inside `SettingsPage flush`: list + drawer, view and edit show the same
rows (N / E / Ctrl+S / Esc, delete with undo). Rules: `apps/web/src/domain/locations.ts`; commands:
`apps/web/src/data/api/warehouse-settings.ts`; hooks: `data/queries/warehouse-settings.ts`. Tier: Starter base,
ungated, on by default (multi-state or 3PL sites would likely be Growth).

### Parity and deliberate changes
- **Ported:** the site list (code, name, type, status, city, state, manager, GST certificate, area, units in
  stock, open documents) with views All / Active / each type; drawer fields name, code, type, status, country,
  state (GST state dropdown for India, free-text region elsewhere), address, city, PIN, area, GST certificate
  status (India only), site manager (employee), 3PL operator vendor (3PL only); the rules below.
- **Not ported (G-016, G-031):** the Structure Designer (zones, aisles, bins, 2D/3D canvas; the 4-step creation wizard and floors
  shipped in run 2.7, see the last update) and the registration extras — *Add registration* from the drawer, the GSTIN chip, *Mark as declared*
  (the *Active needs a registration* rule and the registration line were ported in run 2.5a, see the update below). Creation is the setup
  wizard since run 2.7.
- **Deliberate:** the **code is fixed once any document refers to it** (the prototype let it change, which would
  orphan the purchase orders, receipts and sales orders that carry the code). The site **id never changes**
  (`WH-<CODE>`, numbered when taken). **There is always at least one active location** (new rule: save and
  delete refuse to leave none). `createdAt` / `updatedAt` are optional on the schema (seed rows have none).
- Terminology: the section, drawer and sidebar page read the workspace's `object.location` wording since run 2.5a (see the update below).

### Data model
Collection `warehouses` (`shelfree.v2.warehouses`, key `id`), schema `warehouseSchema`: `id, name, code, type
(mixed|dc|3pl|retail), addr, city, state (GST code for IN), zip, country (ISO-2), area, status
(setup|active|inactive), pobStatus (principal|additional|undeclared), managerEmpId, operatorVendorId,
createdAt?, updatedAt?`. Stock is `item.locs[<warehouse id>]`; assembly orders carry the id; purchase orders,
receipts and sales orders carry the `code`. `LocationUsage` (derived, never stored): `stock`, `openDocs`, `docs`.

### Rules (`domain/locations.ts`, Vitest-tested; the backend enforces the same)
- Name and code required; code unique (letters / digits / hyphen); Indian sites need a state.
- State or country can't change while **open** documents use the site (open POs Draft / Issued / Partially
  received, Draft receipts, draft / released / in-progress assembly orders, Open / Released sales orders).
- Code can't change once **any** document refers to it. A 3PL operator must be an existing vendor.
- One principal place per state: saving a site as Principal moves the state's previous principal to Additional
  (the drawer says so before saving; a toast after).
- **Delete** blocked while the site holds stock or has open documents ("set it to Inactive instead"), while it is
  the principal place and other sites exist, and when it would leave no active location.
- Inactive sites drop out of pickers while holding no stock (`selectableLocations`; pickers aren't wired to it yet, G-019).

### Persistence
`localStorage` key `shelfree.v2.warehouses` (the prototype's `shelfree.wh.v7` blob is not read).

### Backend-build notes
- `GET /locations`, `GET /locations/usage`, `PUT /locations/{id}`, `DELETE /locations/{id}` (409 with the reason
  when blocked). Constraints: unique code per tenant; unique principal per (tenant, state) among non-inactive rows;
  at least one `status='active'` per tenant; code immutable once referenced; state immutable while open documents
  reference the site; delete rejected while stock or open documents exist. Foreign keys: `manager_employee_id`,
  `operator_vendor_id`.
- **Audit:** create, edit and delete of a site; status, state, certificate status, operator and manager changes
  (actor, site, before / after). **Permission:** Warehouse *Manage settings* right to write; Warehouse read access
  to view (read-only mode without the right). No personal data beyond the business address.
- Decisions & deferred-to-backend: registrations (Active needs one), the Structure Designer (G-016) and registrations (G-017, closed),
  filtering inactive sites out of document pickers and counting BOM WIP / production output locations as usage
  (G-019).

### Tests
Vitest `domain/locations.test.ts` (rules, usage, principal, delete, commands). Playwright
`e2e/settings-warehouse.spec.ts` (list and type view, create / edit / delete / undo, validation, principal move,
fixed code, blocked delete, last active location, help, member read-only).

### Update 2026-11-25 (run 2.5a) — GST registrations and Terminology (closes G-017 and G-018)
- **G-017 — registrations.** `validateLocation(draft, others, original, usage, vendorNos, registrations?)`: with the registrations
  passed, a site can't be saved **Active** (or moved to another state while Active) when its state has no active Normal
  registration; the error is on *Status*. `saveWarehouse` passes them; the editor passes them too. The list gains a *GST
  registration* column (GSTIN, hidden by default) and the drawer a *GST registration* fact ("None for this state" when
  uncovered) with the same warning as the notice. Adding the registration is on Settings ▸ GST registrations (its gap banner
  lists the site). See `docs/gst-registrations/README.md`.
- **G-018 — terminology.** The section title (`<plural> & warehouses`), the grid and drawer nouns (*New store*, *Store TVM-MAIN*,
  "No stores match"), the Warehouse sidebar page *Stock by Location*, the item card's *Stock by location* card and the Items
  drawer's *STOCK BY LOCATION* heading read the workspace's `object.location` wording (`useLocationTerm()`); unchanged
  by default. Settings navigation, breadcrumb and Find a setting still use the registry label (G-032).

### Update 2026-11-26 (run 2.7) — New location setup wizard, floors and layouts (narrows G-016)

**What changed.** *New location* (button and `N`) opens a 4-step wizard instead of the drawer. The drawer remains the edit surface
for existing sites (edit in place) and gains a *Floors* block. The list gains *Floors* and *Areas* columns and the drawer *Floors* /
*Areas* facts. The visual Structure Designer is still not ported (G-016, G-042).

**Files.** Template: `apps/web/src/components/wizard/` (`Wizard.tsx`, `fields.tsx`, `control-class.ts`, `shortcut-meta.ts`) — a shadcn
`Dialog` step wizard onboarding will reuse. Feature: `features/settings/locations/` (`LocationWizard.tsx` — the steps,
`FloorsEditor.tsx` — floors in the drawer, `area-icons.ts`). Rules: `domain/location-layouts.ts` (area-type catalogue, placement, floors,
quick starts), `domain/location-wizard.ts` (draft, per-step errors). Commands: `data/api/warehouse-settings.ts`. Seed:
`data/seed/location-layouts.ts`. `ListPage` gained one optional prop, `onNew` (takes over the New button, `N` and `startNew()`).

**The wizard (parity with the prototype's `wizSteps`).**
1. *Basics* — Name, Code (blank = suggested from the name; the suggestion is the placeholder), site type cards (Distribution centre,
   Manufacturing + DC, Third-party (3PL), Retail forward stock). Needs a name; the code must not be another site's.
2. *Building* — Single level / Multi-level; the floors listed ground at the bottom; for a building each floor's code (max 4) and
   name, Add floor, Remove. Floor codes must be unique ("Each floor needs a unique code (e.g. L1, L2, MZ).").
3. *Areas* — quick starts (Small stockroom, Single-floor DC, Multi-floor building; each also sets the site type and floors), a live
   floor preview, and the 12 area types with a 1–6 count each. Never blocks.
4. *Finish* — a review (name, code, type, building, areas, location), street address, city, state (GST dropdown for India, free-text
   region elsewhere), PIN code, floor area (sq ft), country, status, the derived GST registration line, certificate status (India),
   site manager, 3PL operator. These keep the saving rules: state required for India, Active needs a registration for the state,
   a 3PL operator must exist. An error found on Create sends the wizard back to the step that owns it.

Step dots show progress and are clickable back to visited steps (forward only through steps that validate); Back keeps values;
Esc closes, asking first when anything was entered. Keys: Enter in a field, Ctrl/Cmd + Enter, Alt + ←/→ (catalogue: Settings ▸
Keyboard shortcuts ▸ *Wizard*). Focus moves to each step's first field; steps slide in; full-screen sheet on a phone.

**Deliberate differences.** Labels are *Name* / *Code* (as the drawer) not *Warehouse name* / *Short code*; the title, button and
messages follow the workspace's location wording ("New store"). The prototype's static hint lines under selects are the labels'
quiet help (ⓘ). *Contact* is the site manager (an employee link) — the prototype's final model has no contact name / phone / email
on a site, and People ▸ Contacts rule forbids new flat contact columns. The registration line has no *Add registration* button
(G-031). New sites start **Setting up** like the drawer did. The prototype opened the designer after creating; the React app stays
on the list (no designer yet). Aisle ids are deterministic (`a-<zone index>-<run>`) instead of random.

### Data model (additions)
- `warehouse.floors?: Floor[]` — `{ id, name, code, level }`, ground = level 1 (levels follow the order). A site saved before floors
  existed reads as one `{ id: 'l1', name: 'Ground floor', code: 'L1', level: 1 }`. Floor ids never change; names and codes can.
- Collection `locationLayouts` (`shelfree.v2.locationLayouts`, key `id` = `<siteId>::<floorId>`, one per site + floor), schema
  `locationLayoutSchema`: `warehouseId, floorId, floorW, floorH` (feet; 224 × 152 when the wizard placed areas and the floor
  grew as needed, 80 × 56 empty), `zones: Zone[]`, `aisles: Aisle[]`, `bins: { [binCode]: { sku?, qty?, lot? } }` (edited bins only).
  - **Zone ("area")**: `id, code, name, type, color, status (available|inuse|maintenance), x, y, w, h` (feet, origin top-left).
    `type` is one of the 12 catalogue ids (`receiving, bulk, pick, fragile, qc, components, assembly, finished, shipping, staging,
    returns, office`); the catalogue (`AREA_TYPES`: name, description, colour, default footprint, `storage` racked | floor | none) is
    fixed code, not data. Code = first three letters of the name, numbered when taken (`BUL`, `BUL2`).
  - **Aisle ("rack run")**: `id, zoneId, code, dir (v|h), x, y, bays, levels, binsPerBay, sides, aisleWidth`.
- **Placement** (`placeAreas`): areas of the picked types, in the order picked, left to right from an 8 ft margin with an 8 ft gap,
  wrapping to a new row past the right edge (floor 224 ft wide); the floor grows taller when a row runs off the bottom. Racked areas
  (Bulk storage, Pick area, Fragile ceramic, Component bins, Finished goods) get shelving: two runs when the area is ≥ 28 ft wide,
  else one — code `<first letter><zone number, 2 digits><run>`, `bays` = clamp(round((h − 8) / 4), 4, 10), 3 levels for Fragile ceramic
  and 4 otherwise, 1 bin per bay for Fragile ceramic, 3 for Component bins, 2 otherwise, 2 sides, 6 ft aisle. The wizard puts the areas
  on the **ground floor**; every other floor starts empty.

### Rules (additions; `domain/location-layouts.ts`, `domain/location-wizard.ts`, Vitest-tested; the backend enforces the same)
- A site has at least one floor; floor codes (letters and digits, max 4, upper-cased) are unique within the site; a blank name
  becomes *Level n*, a blank code *L<n>*.
- A floor that still has areas can't be removed (the save is refused with "<floor> has N areas — remove them first").
- Saving a site keeps one layout per floor: a new floor gets an empty layout, a removed (empty) floor loses its layout.
- Creating a site stores it and its layouts together (the areas only on creation; saving an existing site ignores them).
- Deleting a site deletes its layouts; Undo restores the site and the layouts it had. The delete rules are unchanged.

### Persistence
`shelfree.v2.warehouses` (now with `floors`) and `shelfree.v2.locationLayouts`. Seed (`data/seed/location-layouts.ts`, mirroring the prototype's
`baseWarehouses()` / `baseLayouts()`): Tiruvannamalai — Main has *Ground floor* (10 areas, 6 rack runs) and *Carton loft* (MZ: 1 area, 2 runs);
Assembly unit has *Ground floor* (4 areas, 2 runs); Chennai DC has one empty ground floor.

### Backend-build notes (additions)
- `POST /locations` accepts `{ ...site, floors, areas: [{ typeId, count }] }` and places the areas server-side with the same
  `placeAreas` algorithm (or accepts explicit zones), in one transaction with the site and its floor rows; `PUT /locations/{id}` accepts
  `floors` (add / rename / remove; 409 while a removed floor has areas or two floors share a code).
  `DELETE /locations/{id}` cascades to floors and layouts (soft-delete so Undo can restore them).
- Tables: `location_floors(id, location_id, name, code, level)` unique `(location_id, code)`; `location_layouts(id, location_id, floor_id,
  floor_w, floor_h)`; `layout_zones(id, layout_id, code, name, type, color, status, x, y, w, h)`; `layout_aisles(id, zone_id, code, dir, x, y,
  bays, levels, bins_per_bay, sides, aisle_width)`; `layout_bins(layout_id, code, sku, qty, lot)`. Everything reaches the tenant through
  `location_id`. `GET /locations/{id}/layouts` for the designer.
- **Audit:** `location.created` (floors, areas placed), `location.floors.updated`, `location.deleted` (layouts removed). **Permission:** the
  same Warehouse *Manage settings* right; the wizard is not shown without it. No personal data.
- Decisions & deferred-to-backend: areas, racks and bins are edited in the Structure Designer (G-016, G-042); filtering inactive sites out
  of pickers and counting BOM WIP / production output locations as usage stays open (G-019 — touches six pickers and two settings
  readers, so it was left for the run that touches them).

### Tests
Vitest `domain/location-layouts.test.ts` (catalogue, picks, codes, placement, shelving, layouts, floors, quick starts, the seam: seed,
create, floor sync, blocked removal, delete + Undo), `domain/location-wizard.test.ts` (draft, per-step errors). Playwright
`e2e/settings-location-wizard.spec.ts`: multi-floor site from a template, validation blocking Next on every step, Back and step dots keep
values, Enter / N / Alt + ←/→ / focus, Esc discard confirm, delete + Undo, floors edited in the drawer, phone sheet, member read-only;
`e2e/settings-warehouse.spec.ts` and `e2e/settings-workspace-a.spec.ts` create sites through the wizard.
