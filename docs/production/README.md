# Production — Bills of Materials & Assembly Orders

Part of `prototype/designs/erp/Shelfree App.dc.html`. First manufacturing surface: what an
item is made of (BOM) and the order that turns components into finished goods
(assembly order).

Spec: [`../superpowers/specs/2026-08-02-boms-assembly-production-orders.md`](../superpowers/specs/2026-08-02-boms-assembly-production-orders.md)
Plan: [`../superpowers/plans/2026-08-02-boms-assembly-orders.md`](../superpowers/plans/2026-08-02-boms-assembly-orders.md)

## Overview

Kanalora assembles a 2-piece ceramic sambrani holder from vendor-fired parts
(lid + base), a gasket, and packaging; combos add dhoop cone packs. Two entities
model that:

- **Bill of materials** — the parts list for one item, versioned, with a status
  lifecycle and an effective-date window. Rolls a unit cost up from its
  components (recursively, so sub-assemblies cost their own rollup rather than a
  stale item cost).
- **Assembly order** — a dated instruction to build *n* of an item. Explodes the
  BOM in force on its date into order lines, then on finish consumes the
  components and receives the finished goods.

**Tier:** Assembly BOMs and assembly orders are **Starter base, ungated,
always on** — a single-location shop that assembles anything needs them. The
**Production module is Growth tier and off by default** for the *routed*
production layer only (`axisOn('production')`): BOM `kind`, yield %, operations,
WIP location, and the Production Orders page. Assembly surfaces never consult
that axis.

## Screens & states

| Screen | Where | Notes |
| --- | --- | --- |
| Bills of Materials (list) | Production ▸ Bills of Materials | Full table page: views, filters, columns, ribbon, selection drawer. `Kind` column visible only when `axisOn('production')`. |
| Bill of materials (document) | opens from list / item page | Header fields, Components card, cost-rollup card, availability card, versions, notes, operations (production kind only). |
| Assembly Orders (list) | Production ▸ Assembly Orders | Same table shell; status column drives the ribbon's available actions. |
| Assembly order (document) | opens from list / BOM / item page | Item + qty + location + due date, exploded component lines with shortage flags, availability card, Finish dialog. |
| Item ▸ Bill of materials (sub-tab) | Item detail page | Read-only summary: active components, rolled-up cost breakdown, buildable-now, version list, **Where used**. Actions: Open, New version, New bill of materials, New assembly order. |
| Settings ▸ Configuration ▸ Assembly & production | admin settings | Workspace defaults + three behaviour toggles. |
| My settings ▸ Personal defaults ▸ Assembly orders | user settings | Per-user build location + default quantity. |

**States covered:** empty (item with no BOM — explanatory empty state with a
create action), no active version today, archived-version banner, shortage
warnings, over-consumption on finish, and cycle rejection on save.

## Data model

### `bom`

| Field | Type | Notes |
| --- | --- | --- |
| `no` | string | `BOM-000n0`, sequence `bomNextNo()`. |
| `parentItem` | item no. | The item this makes. |
| `parentDesc` | string | Denormalised for list display. |
| `kind` | `'assembly' \| 'production'` | One entity, two shapes. `production` fields hidden unless `axisOn('production')`. |
| `version` | string | `v1`, `v2`… free text. |
| `status` | `'draft' \| 'active' \| 'archived'` | Only one version should be active for a given date window. |
| `effectiveFrom` / `effectiveTo` | date / null | `activeBomFor(item, date)` resolves the version in force. |
| `outputQty` | number | Parts list makes this many; per-unit cost divides by it. |
| `uom` | string | Output UoM. |
| `labourCost` | number | Flat per run. |
| `overheadPct` | number | % of materials + labour. |
| `yieldPct` | number | Production kind only. |
| `operations` | array | `{ seq, name, setupMin, runMinPerUnit }`. Production kind only. |
| `notes` | string | |
| `lines[]` | array | `{ lineNo, item, desc, qtyPer, uom, scrapPct, note }`. |
| `updatedAt` | ISO date | |

### `assemblyOrder`

| Field | Type | Notes |
| --- | --- | --- |
| `no` | string | `AO-000n0`. |
| `item`, `desc`, `uom` | | Target item. |
| `bomId`, `bomVersion` | | The BOM resolved at creation; kept even if the BOM later changes. |
| `qty`, `qtyFinished` | number | |
| `location` | site key | Where components leave from and finished goods arrive. |
| `orderDate`, `dueDate` | date | `orderDate` selects the effective BOM. |
| `status` | `'draft' \| 'released' \| 'inProgress' \| 'finished' \| 'cancelled'` | |
| `assignee` | user or null | |
| `sourceSalesLine` | ref or null | Set when raised from a sales order line. |
| `lines[]` | array | `{ lineNo, item, desc, uom, qtyPer, scrapPct, qtyRequired, qtyConsumed }` — exploded, then frozen. |

### Workspace config — `ws.production`

`outputLoc`, `wipLoc`, `manualConsumption`, `allowShortRelease`,
`defaultScrap`, `allowOverConsume`. Defaults in `prodCfgDefaults()`.

### User config — `me`

`defAssemblyLoc` (empty = use workspace default), `defAssemblyQty`.

## Interactions & business rules

- **Cost rollup** (`bomRollup`): materials = Σ `bomUnitCostOf(line.item) ×
  bomReqQty(line, 1, outputQty)`; a component that is itself an assembled item
  uses *its* rollup, depth-capped at 6. Overhead applies to materials + labour.
  "Apply to item cost" writes the rollup onto `item.cost` behind a confirm.
- **Required qty**: `qtyPer × (1 + scrapPct/100) × qty / outputQty`, rounded to
  3 dp.
- **Cycle guard**: saving a BOM whose component tree reaches its own parent item
  is rejected with the offending chain named.
- **Availability to build** (`bomBuildable`): the min over components of
  `floor(available at location / required per unit)`.
- **Release**: blocked when any component is short *unless*
  `allowShortRelease`. Error names the first shortage.
- **Finish**: default is automatic backflush from the order lines. With
  `manualConsumption` on, a dialog lets each consumed quantity be corrected;
  consuming above plan is refused unless `allowOverConsume`. Posting decrements
  each component and increments the finished item at `location`.
- **Item page ▸ BOM tab**: read-only. **Where used** =
  `whereUsed(item)` — every non-archived BOM containing the item as a component.
- **Terminology**: `object.bom`, `object.assemblyOrder`, `object.component`
  singular/plural are renameable; all labels and count strings read them.
  Plural strings come from the `.plural` key, never singular + `"s"`.

## Persistence

- BOMs and assembly orders: `localStorage` key `shelfree.bom.v1` (seeded from
  `prototype/lib/shelfree-data.js` on first run).
- Workspace config: `shelfree.settings.workspace.v1` under `production`.
- User config: `shelfree.settings.user.v1`.

## Backend-build notes

**Entities/tables:** `boms`, `bom_lines`, `bom_operations`, `assembly_orders`,
`assembly_order_lines`. Line tables cascade from their header. `boms.parent_item`
→ `items`, `bom_lines.item` → `items`.

**Endpoints:** CRUD for `/boms` and `/assembly-orders`; plus
`POST /boms/:id/activate`, `POST /boms/:id/archive`,
`POST /boms/:id/apply-cost`, `GET /items/:no/bom?date=`,
`GET /items/:no/where-used`, `POST /assembly-orders/:id/release`,
`POST /assembly-orders/:id/finish` (idempotency key required),
`POST /assembly-orders/:id/cancel`, `GET /boms/:id/availability?location=`.

**Must be enforced server-side:**

- Cost rollup and required-quantity maths (the client's numbers are advisory).
- Cycle detection across the whole component tree.
- Only one `active` BOM per item per overlapping effective-date window.
- Status transitions: draft → released → inProgress → finished; cancel only
  before finished; no edits to a finished order's lines.
- Shortage / over-consumption policy from `ws.production`, not from the request.
- Finish posts an atomic inventory transaction (component issues + finished
  receipt) against the order's location; partial failure must roll back.
- Tenant scoping on every read; `perms` check on create/edit/delete/finish.

### Decisions & deferred-to-backend

- **One BOM entity with a `kind` flag** rather than separate assembly/production
  tables — the shapes overlap almost entirely, and a shop that graduates to
  routed production shouldn't migrate data. Production-only columns are simply
  null for assembly BOMs.
- **Assembly is Starter base, ungated.** Routed production (operations, yield,
  WIP, Production Orders page) is the Growth capability. Deferred: deciding
  whether *multi-level* assembly should itself be a Growth gate — currently
  ungated.
- **Auto consumption is the default**, manual correction a toggle: the minimal
  path must be "finish and it's done."
- **Production Orders page deferred** — the sidebar page exists behind the axis
  but the screen is not built.
- **No costing-method interaction yet.** The finish posts at the component's
  current item cost; real FIFO/average layering is a backend concern.
- **Audit events required** (not implemented here): BOM activate/archive,
  cost apply, order release, finish (with the posted quantities), cancel.
- **No real inventory ledger** in the prototype — the finish mutates seed stock
  in place. The backend must write immutable transactions instead.

## Notes (2026-09-20)

BOM and assembly-order documents no longer carry a single `notes` string. Both
now use the app-wide append-only notes thread (author + date/time per note,
newest first, no edit or delete — only mark-invalid with a permanent reason),
and their grid `notes` columns became **Latest note**, derived from the notes
collection. See [`../notes/README.md`](../notes/README.md).

## Update 2026-09-26 — location ids (GST task 4)
Assembly-order `location`, BOM `wipLocation` and production settings (`outputLoc`, `wipLoc`) now hold
Locations & warehouses ids (`WH-TVM`, `WH-ASSY`); legacy `main` / `assembly` / `east` / `returns` values are
re-keyed on load. Committed sales stock is netted at the principal location (`locMain()`).
