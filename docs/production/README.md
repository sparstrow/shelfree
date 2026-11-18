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

## React app (2026-11-17)

List pages for **Production ▸ Bills of Materials** and **Production ▸ Assembly Orders**, the **Bill of materials**
document editor (`/production/bills-of-materials/$no`, `new`) and the **Assembly Order document**
(`/production/assembly-orders/$no`, `new`) with its **Finish** dialog are ported in `apps/web/`.

### Files & URLs

- Schemas & API collections: [`bomSchema` / `assemblyOrderSchema`](../../apps/web/src/data/schemas/index.ts),
  `api.boms` / `api.assemblyOrders` / `api.items` in [`apps/web/src/data/api/index.ts`](../../apps/web/src/data/api/index.ts).
- Transactional commands & query hooks: [`finishAssemblyOrder`](../../apps/web/src/data/api/commands.ts) and
  [`useFinishAssemblyOrder`](../../apps/web/src/data/queries/index.ts).
- Domain helpers & unit tests: [`production.ts`](../../apps/web/src/domain/production.ts) (+ test),
  [`bom-document.ts`](../../apps/web/src/domain/bom-document.ts) (+ test),
  [`assembly-order.ts`](../../apps/web/src/domain/assembly-order.ts) (+ test).
- Bills of Materials list & document (`/production/bills-of-materials`, `?sel=<no>` preview; `/production/bills-of-materials/<no>`
  and `/production/bills-of-materials/new`, optional `?item=` parent prefill):
  [`dataset.ts`](../../apps/web/src/features/production/boms/dataset.ts),
  [`BomsPage.tsx`](../../apps/web/src/features/production/boms/BomsPage.tsx),
  [`BomEditor.tsx`](../../apps/web/src/features/production/boms/BomEditor.tsx),
  [`BomLines.tsx`](../../apps/web/src/features/production/boms/BomLines.tsx),
  [`index.tsx`](../../apps/web/src/routes/production/bills-of-materials/index.tsx),
  [`$no.tsx`](../../apps/web/src/routes/production/bills-of-materials/$no.tsx).
- Assembly Orders list (`/production/assembly-orders`, `?sel=<no>` preview) & document
  (`/production/assembly-orders/$no`, `/production/assembly-orders/new`):
  [`dataset.ts`](../../apps/web/src/features/production/assembly-orders/dataset.ts),
  [`AssemblyOrdersPage.tsx`](../../apps/web/src/features/production/assembly-orders/AssemblyOrdersPage.tsx),
  [`AssemblyOrderEditor.tsx`](../../apps/web/src/features/production/assembly-orders/AssemblyOrderEditor.tsx),
  [`FinishDialog.tsx`](../../apps/web/src/features/production/assembly-orders/FinishDialog.tsx),
  [`index.tsx`](../../apps/web/src/routes/production/assembly-orders/index.tsx),
  [`$no.tsx`](../../apps/web/src/routes/production/assembly-orders/$no.tsx).
- Production Orders list (`/production/production-orders`, `?sel=<no>` preview):
  [`index.tsx`](../../apps/web/src/routes/production/production-orders/index.tsx) renders the shared
  `AssemblyOrdersPage` directly (matching prototype `datasetIdFor`, which maps both pages to `assemblyOrders`).
  `AssemblyOrdersPage` accepts optional `sel` and `pageLabel` props and reads `?sel=` via
  `useSearch({ strict: false })` so both routes work without copying the screen. Because `apps/web` does not
  yet expose the `production` capability axis toggle, `Production Orders` stays visible in `app/nav.ts`.
- Template additions (optional, backward-compatible):
  - [`RecordDrawer.tsx`](../../apps/web/src/components/record-drawer/RecordDrawer.tsx): `notice` and `DrawerLine.rightTone`.
  - [`DocumentPage.tsx`](../../apps/web/src/components/document/DocumentPage.tsx) (`TotalsCard`): optional `title` and `ReactNode` row/total `value`.
  - [`LineGrid.tsx`](../../apps/web/src/components/document/LineGrid.tsx): optional `lineNoun`, `addLabel`, `subRows`, `data-line-index`, and modifier-key guard in `onBodyKeyDown`.
  - [`StatusPill.tsx`](../../apps/web/src/components/StatusPill.tsx) `icon` and [`parts.tsx`](../../apps/web/src/components/document/parts.tsx) `statusIcon`.
- Playwright specs: [`production.spec.ts`](../../apps/web/e2e/production.spec.ts) (lists),
  [`item-units.spec.ts`](../../apps/web/e2e/item-units.spec.ts) (`/production/production-orders` list & preview),
  [`bom-document.spec.ts`](../../apps/web/e2e/bom-document.spec.ts) (BOM document),
  [`assembly-order-document.spec.ts`](../../apps/web/e2e/assembly-order-document.spec.ts) (AO document & Finish).

### Behaviour & deliberate differences from prototype

- **Same as prototype (lists)**: columns (widths, alignment, freeze, hidden defaults), sort order (`no` asc), search blobs,
  system/default views (`All` / `Active` / `Drafts` / `Archived` for BOMs; `All orders` / `Open` / `Finished` /
  `Cancelled` for Assembly Orders), filter columns, multi-level rolled-up BOM costs (materials + labour + overhead %,
  depth cap 6), net stock availability netting `qtySO` at the active principal warehouse (`mainLocationId`), preview
  drawer stats/lines/facts, assembly-order shortage warning banner, and append-only `NotesBlock` threads (`bom` and
  `assemblyOrder`). Neither list page mutates stock or item costs.
- **Same as prototype (BOM document)**:
  - Header fields: `Makes` (`parentItem`), `Version`, `Status` (`Draft` / `Active` / `Archived`), `Effective from`,
    `Effective to`, `Output per run` + output `UoM`.
  - Line columns: `Component` (item + description + sub-assembly expand chevron up to depth 6), `UoM`, `Qty per`,
    `Scrap %`, `Unit cost`, `Line cost`.
  - `Operations` card rendered when `operations.length > 0` (`seq`, `name`, setup + run minutes).
  - `Availability` card at principal warehouse (`mainLocationId`), showing buildable count and component shortages.
  - `NotesBlock` (`entityType: 'bom'`) and `Cost rollup` card (`Materials`, editable `Labour` and `Overhead %`, `Unit cost`,
    `Item cost today`, delta vs item cost, and `Apply as item cost` behind a `ConfirmDialog` — the only path that writes
    to `item.cost`).
  - `Archived` notice banner when `status === 'archived'`, `New assembly order` header action when `status === 'active' && !!parentItem`,
    and footer buttons (`Archive version` when active; `Discard`, `Save`, and `Activate` when not active).
  - **Activation rule (`bomActivate`)**: activating a BOM does **not** auto-archive the item's previously active BOM.
    If another `active` BOM for the same `parentItem` has overlapping effective dates, activation is refused with:
    `Another active BOM (<no> · <version>) already covers these dates. Archive it or set an end date first.`
  - **Cycle guard (`bomCycle`)**: a BOM cannot reference its own `parentItem`, directly or through active sub-assemblies
    (max depth 6), refused on Save and Activate with `This would make the item part of itself: <chain>`.
  - **Validation messages**: `Choose the item this BOM makes.`, `Add at least one component.`,
    `Every component needs a quantity greater than zero.`, `Component <item> is listed twice — combine the lines instead.`.
- **Keyboard shortcuts (BOM document)**:
  - `E`: focus and select the first component line's `Qty per` input (`[data-bom-first-qty="1"]`).
  - `Alt+↑` / `Alt+↓`: move the focused component line up or down while keeping focus on that input.
  - `↑` / `↓`: move focus to the same column input on the adjacent top-level component line.
  - `Ctrl/Cmd+S`: save the BOM (works from inside inputs).
  - `Esc`: close an open dialog/menu/add-line row, blur the focused field, or return to the BOM list.
- **Deliberate differences from prototype**:
  - BOM and Assembly Order documents show no header subtitle; the prototype's explanatory line was removed under Quiet pages (2026-11-18).
  - Line actions use shared `LineGrid` controls (drag-to-reorder, `Alt+↑/↓`, selection bar duplicate/remove, `⋯` / context
    menu, inline `+ Add component` search) instead of per-row arrow/delete buttons and a modal component picker.
  - `draft-stash.ts` in `purchase-orders/` is typed strictly to `PurchaseOrder` and was not modified or reused, so
    unsaved new BOM drafts do not persist across route navigation.
  - `newBom` defaults `createdBy` to `''` (or active employee id) rather than `null` to satisfy `bomSchema` (`z.string()`).
- **Delete rules (stricter than prototype)**:
  - A BOM can be deleted only when `status !== 'active'` and no assembly order references it (`ao.bomId === bom.no`).
  - An assembly order can be deleted only in its opening status (`planned` or `draft`).
- **Growth `production` axis**: `apps/web` does not yet expose the `production` axis toggle, so `bomDataset({ showKind })`
  and `BomEditor({ showProductionAxis })` default to `false` (hiding `Kind` and `Yield %` while keeping all 9 seeded BOM
  rows, multi-level rollups such as `CMB-PWH-12` → `SBC-CONE-12`, and `Operations` display on `BOM00009`).
- **Same as prototype (Assembly Order document)**:
  - Assembly Order document: item picker restricted to non-blocked items with an active BOM, BOM explosion and line
    rescaling when quantity changes in draft/planned, header card (`Item to assemble`, `Quantity`, `Output location`,
    `Due date`, `Assignee`, `Progress`), read-only exploded `Components` grid linking to item pages, shortage warning
    banner with buildable count, `BOM · version` header link, status workflow (`Draft` → `Release` → `Start` → `Finish`
    with full/partial output and component consumption), `Cancel order`, admin-gated `Reopen` (`owner`/`admin`),
    append-only `NotesBlock`, and `Cmd/Ctrl+Enter` / `Esc` shortcuts.
- **Deliberate differences (Assembly Order document)**:
  - **All-or-nothing Finish & shortage refusal**: Instead of the prototype's silent `Math.max(0, ...)` clamp on
    component stock during Finish, `aoFinish` / `finishAssemblyOrder` validates every Finish input (`qtyFinished > 0`,
    not exceeding remaining quantity, non-negative consumed quantities, `allowOverConsume` guard, and net available
    component stock `availAt` at the order's site) before any persistence occurs, refusing Finish on any shortage so
    on-hand stock never goes negative and no partial writes happen.
  - **Closed records are strictly read-only**: In `finished` and `cancelled` status, header scheduling fields (`Output
    location`, `Due date`, `Assignee`) are disabled and `Save` is hidden (fixing the prototype's omission).
- **Deferred / backend contract notes**:
  - **Growth `production` axis**: `apps/web` does not yet expose the `production` axis toggle, so `bomDataset({ showKind })`
    defaults `showKind` to `false` and `AssemblyOrderEditor` uses `DEFAULT_PRODUCTION_SETTINGS` (`outputLoc: 'WH-TVM'`,
    `manualConsumption: false`, `allowShortRelease: true`, `allowOverConsume: true`).
  - **Costing & WIP journal postings deferred**: Finish adjusts physical item stock (`item.locs[siteId]`), `qtyFinished`,
    `lines[].qtyConsumed`, and order `status`, without posting GL inventory/WIP/variance entries or recalculating item
    unit costs — deferred to the finance-for-production follow-up.
  - **Audit events required on backend**: When wired to the real API, every Assembly Order state transition (`release`,
    `start`, `cancel`, `reopen`) and `POST /assembly-orders/{no}/finish` (partial or full posted output and manual
    consumption overrides) must emit an immutable server-side audit event with actor, timestamp, location, and
    component/output deltas.

### Persistence, backend rules & tests

- Browser `localStorage` collections: `shelfree.v2.boms` (saved via `useUpsert('boms')`), `shelfree.v2.items` (updated
  only via the BOM's explicit `Apply cost` confirmation and the `finishAssemblyOrder` command), `shelfree.v2.assemblyOrders`,
  `shelfree.v2.notes`, `shelfree.v2.warehouses`, `shelfree.v2.employees`.
- Backend rules to enforce server-side: cycle detection across the full component graph, single active BOM per parent item
  per overlapping effective-date range (no silent auto-archiving), server-side rollup and required-quantity recomputation,
  Finish as one transaction reading production settings server-side, RBAC on `production` read/write, and immutable audit
  events for BOM create/edit/activate/archive, `Apply as item cost`, and every assembly-order transition and finish.
- Covered by unit tests (`production.test.ts`, `bom-document.test.ts`, `assembly-order.test.ts`), schema seed validation
  (`seed.test.ts`), and Playwright specs (`production.spec.ts`, `bom-document.spec.ts`, `assembly-order-document.spec.ts`).

