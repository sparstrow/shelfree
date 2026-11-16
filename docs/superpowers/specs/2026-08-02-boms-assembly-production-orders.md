# Spec — BOMs, Assembly Orders & Production Orders

**Date:** 2026-08-02 · **Status:** awaiting approval · **Author:** brainstorm session
**Feeds:** new `docs/production/README.md` (on build) · updates `docs/erp-app/README.md`,
`docs/item-page/README.md`, `docs/settings/README.md`, `docs/security/README.md`

---

## 1. Purpose

Kanalora does not currently have a way to say *"this finished good is made of these
parts"*. Every finished-goods cost in the catalogue is typed in by hand, stock of a
holder and stock of its lid are unrelated numbers, and the question the business
actually asks — **"can I build 40 combos before Pournami, and what am I short?"** —
has no answer in the app.

This spec introduces:

1. **BOM** — a single entity describing what a parent item is made of, with a `kind`
   flag (`assembly` | `production`).
2. **Assembly Order** — the document that consumes components and outputs the parent.
   **Built in this pass.**
3. **Production Order** — the routed/transforming equivalent. **Specified here,
   built in a later pass** (Growth tier).

### Business reality it models

| Flow | Kind | Example |
|---|---|---|
| Lid + base + gasket + foam + kraft box + care card → holder | assembly | `RM-LID-PWH` + `RM-BASE-STD` + `RM-GASKET` + `PKG-FOAM-INS` + `PKG-BOX-STD` + `PKG-CARE-CARD` → `ASH-PWH-18` |
| Holder + 12-cone pack + premium box → combo (**multi-level**) | assembly | `ASH-PWH-18` + `SBC-CONE-12` + `PKG-BOX-PREM` → `CMB-PWH-12` |
| Bulk sambrani resin (KGS) → cone packs, with yield loss | production | `RM-CONE-BULK` → `SBC-CONE-12` |

The third is the only genuine transformation and is the justification for production
BOMs existing at all — it is **specified, not built** in this pass.

---

## 2. Decisions taken (from the 2026-08-02 brainstorm)

| # | Decision | Choice |
|---|---|---|
| 1 | Scope | Assembly BOM + assembly orders built now; production BOM/orders specified here, built later |
| 2 | Placement | New **Production** module in the sidebar; default **off** for new workspaces, **on** for Kanalora |
| 3 | Model | **One** BOM entity with a `kind` flag; production-only fields hidden unless the capability is on |
| 4 | Tiers | Assembly = **Starter base, ungated**. Production = **Growth**. (Work-centre capacity = Enterprise, later.) |
| 5 | Lifecycle | `Draft → Released → In progress → Finished` + `Cancelled`; an optional `Planned` state appears only when the planning capability is on |
| 6 | Consumption | Auto-backflush on finish by default; per-workspace **manual consumption** setting switches to picked/consumed lines |
| 7 | Assemble-to-order | Not now — assemble to stock. The link field (`sourceSalesLine`) is reserved in the model; ATO ships as a Growth capability later |
| 8 | Costing | Read-only rolled-up cost on the BOM + a one-click **Apply as item cost**. No silent writes, no GL variance |
| 9 | Refinements in scope | Scrap/yield % per component · multi-level BOMs · where-used on the item page · BOM versions with effective dates |
| 10 | Planning | Availability-to-build + component shortage list, on both the BOM and the order. No planning worksheet/engine |

Explicitly **out of scope**: routing/work centres, capacity scheduling, phantom BOMs,
by-products/rework, component substitution, planning worksheet, GL/variance postings,
subcontract manufacturing.

---

## 3. Information architecture

### New module — Production

```
Production
  ├─ Bills of Materials      (list; all kinds)
  ├─ Assembly Orders         (list + document)
  └─ Production Orders       (hidden unless the `production` axis is on — Growth)
```

- Added to `modules()` after `warehouse`, before `people`.
- `canOff: true` in Settings → Modules & capabilities. **Default off** for a new
  workspace (a retail-only shop never sees it); the Kanalora seed workspace has it on.
- Terminology keys: `module.production`, `object.bom.singular/plural`,
  `object.assemblyOrder.singular/plural`, `object.component.singular/plural`
  (so a shop can call them "Recipes" / "Build orders" / "Ingredients").
- Permissions: a `production` row joins the `pplModules()` permission matrix
  (none/read/write), defaulting to `none` for new users.

### Second entry point — the item page

`Warehouse ▸ Items ▸ <item>` gains, per the existing sub-tab pattern
(`overview | stock | purchasing`):

- **BOM** sub-tab — appears only when the item **has** a BOM or the user can create one.
  Shows the active version's component tree + rolled-up cost + availability-to-build.
- **Where used** — a card on that same sub-tab listing every BOM that consumes this
  item (reverse lookup; shown for components like `RM-GASKET`).

Both are views over the same BOM entity — the module owns editing, the item page is
read-first with an "Edit BOM" hand-off, mirroring how the item page already hands off
editing to the Items drawer.

---

## 4. Data model

### 4.1 `BOM`

Seeded in `prototype/lib/shelfree-data.js` → `seedBOMs()`; persisted at `shelfree.bom.v1`.

| Field | Type | Notes |
|---|---|---|
| `id` | string | `BOM00001`, +1 auto-numbering (matches `poNextNo()` convention) |
| `parentItem` | item no | The thing being made. One item may have several BOM **versions**, only one active |
| `kind` | `'assembly' \| 'production'` | Drives which fields/UI appear |
| `version` | string | `'v1'`, `'v2'` … unique per `parentItem` |
| `status` | `'draft' \| 'active' \| 'archived'` | Exactly **one** `active` version per parent item at any date |
| `effectiveFrom` / `effectiveTo` | date \| null | Null `effectiveTo` = open-ended. Orders capture the version in force on their order date |
| `outputQty` | number | Qty of parent produced per BOM run (usually 1; `12` for a cone pack) |
| `uom` | string | Parent UoM, denormalised for display |
| `lines[]` | see below | Components |
| `notes` | string | Free text (e.g. "twist-lock 15°, check vent hole clear") |
| `createdAt` / `updatedAt` / `createdBy` | — | Audit fields |
| **Production-only (reserved, unused this pass)** | | |
| `operations[]` | `{seq, name, workCentre\|null, setupMin, runMinPerUnit, notes}` | Routing. `workCentre` nullable so the Enterprise capacity layer is additive |
| `yieldPct` | number | Expected good output % of a run |
| `wipLocation` | site key | Where in-progress stock sits (defaults to the existing `assembly` bucket) |

### 4.2 `BOMLine`

| Field | Type | Notes |
|---|---|---|
| `lineNo` | int | 10, 20, 30 … |
| `item` | item no | Component; may itself have a BOM (multi-level) |
| `qtyPer` | number | Per **one** unit of `outputQty` |
| `uom` | string | From the component item |
| `scrapPct` | number | Default 0. Expected loss — ceramics break. Effective qty = `qtyPer × (1 + scrapPct/100)` |
| `note` | string | Optional line note |

Derived, never stored: `unitCost` (from the component item), `lineCost`,
`availableQty`, `buildable` (see §6).

### 4.3 `AssemblyOrder`

Seeded via `seedAssemblyOrders()`; persisted at `shelfree.assemblyorder.v1`.

| Field | Type | Notes |
|---|---|---|
| `no` | string | `AO00001`, +1 |
| `item` | item no | Parent being assembled |
| `bomId` / `bomVersion` | string | **Snapshotted** at creation — later BOM edits never mutate a live order |
| `qty` | number | Qty to build |
| `qtyFinished` | number | Posted output so far (supports partial finishes) |
| `location` | site key | Where output lands (default from workspace setting) |
| `dueDate` | date | |
| `status` | `'planned' \| 'draft' \| 'released' \| 'inProgress' \| 'finished' \| 'cancelled'` | `planned` only reachable with the planning capability on |
| `assignee` | employee id \| null | Who is building it |
| `lines[]` | `{lineNo, item, qtyRequired, qtyConsumed, scrapPct, note}` | Exploded from the BOM at creation |
| `sourceSalesLine` | `{orderNo, lineNo} \| null` | **Reserved** for ATO; always null this pass |
| `notes`, audit fields | | |

Order lines are a **copy** of the BOM at creation time (like PO lines copy item data),
so the document is a historical record.

### 4.4 Item changes

No new stored field on `Item`. Two derived flags for the UI:

- `hasBOM(itemNo)` — an active BOM exists → the item page shows the BOM sub-tab, and
  the Items grid can offer a **Has BOM** column/filter.
- `whereUsed(itemNo)` — BOMs whose lines reference it.

---

## 5. Screens & states

### 5.1 Bills of Materials — list

Standard grid page (same table/drawer/views machinery as Items and POs).

- Columns: **BOM no.** (mono, frozen) · **Parent item** · **Description** · **Kind**
  (pill; hidden entirely when the production capability is off — everything is
  assembly) · **Version** · **Status** (pill: Draft / Active / Archived) ·
  **Components** (int, right) · **Rolled-up cost** (`tabular-nums`) · **Updated**.
- Default views: *All*, *Active*, *Drafts*, *Archived*.
- Drawer on row select: parent item summary, component list, rolled-up cost,
  availability-to-build, footer actions **Open BOM** · Duplicate · Delete.
- Empty state: "No bills of materials yet — a BOM lists the parts that go into a
  finished item." + **New BOM** CTA + a one-line explainer of what it unlocks.

### 5.2 BOM document

- **Header**: Parent item (select, non-sellable items allowed), Version (text,
  auto-suggested), Status, Effective from / to, Output qty + UoM, Notes.
  `Kind` selector only rendered when the production capability is on.
- **Components table**: line no · item picker · description · qty per · UoM ·
  scrap % · unit cost · line cost. Add/remove/reorder lines; drag to reorder;
  keyboard row navigation consistent with the PO editor.
- **Cost card**: component cost subtotal → **Rolled-up unit cost**, compared against
  the item's current `cost`, with an **Apply as item cost** button (confirm dialog,
  toast on apply). Read-only otherwise.
- **Availability card**: "You can build **N**" + shortage rows (component, required
  for 1, available, short by) — see §6.
- **Multi-level**: components that themselves have an active BOM show an expand
  chevron rendering the sub-tree inline (indented, one level at a time, no
  infinite recursion — cycle detection required, see §7).
- **Version banner** when viewing a non-active version ("Archived version — viewing
  history") and a version switcher in the header.

### 5.3 Assembly Orders — list

- Columns: **Order no.** · **Item** · **Description** · **Qty** · **Finished** ·
  **Location** · **Due date** · **Status** (pill) · **Assignee**.
- Views: *Open* (default — draft/released/in progress), *All*, *Finished*, *Cancelled*.
- Status pill colours reuse the PO mapping: Draft → neutral, Released → info,
  In progress → warn, Finished → ok, Cancelled → bad, Planned → neutral (outlined).

### 5.4 Assembly Order document

- **Header**: Item (select — only items with an active BOM), Qty, BOM version
  (read-only, snapshotted), Output location, Due date, Assignee, Status pill.
- **Components table**: item · required · available · consumed · scrap % · status dot.
  Editable only in Draft; read-only once Released (except the consumption column
  when manual consumption is on).
- **Shortage banner** when any component is short: "Short 12 × Silicone Gasket Ring —
  you can build 28 of 40." with a link to the component item.
- **Actions by status**:
  - Draft → **Release** (validates BOM exists, qty > 0), Delete, Cancel
  - Released → **Start** (→ In progress), Cancel
  - In progress → **Finish** (opens the finish dialog), Cancel
  - Finished → read-only, with a **Reopen** action gated to admins (audit event)
- **Finish dialog**: qty finished (defaults to remaining), output location, and —
  when manual consumption is on — an editable consumption table pre-filled with the
  backflush quantities, so breakage can be recorded honestly.
- **Effects of Finish** (frontend simulation; backend owns the real posting):
  component `locs[loc]` decremented by consumed qty, parent `locs[loc]` incremented
  by qty finished, `qtyFinished` updated, order set to `finished` when complete.

### 5.5 Item page — BOM sub-tab

- **Made of** — the active BOM's component tree (read-only), rolled-up cost,
  availability-to-build, "Edit BOM" → opens the BOM document in a new tab.
- **Where used** — table of BOMs consuming this item (BOM no, parent item, qty per).
- Empty states for both ("This item isn't assembled" / "Not used in any BOM").

### 5.6 States to build (all of them, per the craft rule)

Loading skeletons, empty states (list, document with no lines, no shortages),
error state (BOM references a deleted item), hover/focus states on every row and
action, enter/exit transitions on the drawer and dialogs, and full keyboard support.

---

## 6. Business rules

### Availability-to-build

For each component line: `required = ceil(qtyPer × (1 + scrapPct/100) × orderQty)`.
`available` = the component's available qty (on hand − committed) at the order's
location; for a component that is itself assembled, availability is **its own stock
only** — we do not recursively assume sub-assemblies will be built (that is a planning
engine, explicitly out of scope). `buildable = min over lines of floor(available / perUnit)`.

### Version resolution

An order resolves the BOM version whose `effectiveFrom ≤ orderDate` and
(`effectiveTo` is null or `≥ orderDate`) and `status === 'active'`. Exactly one must
match; the UI must prevent overlapping active ranges for the same parent item.

### Consumption

- **Auto (default)**: on Finish, consumed = required for the finished qty.
- **Manual (workspace setting)**: the finish dialog's consumption table is editable;
  consumed may differ from required (over-consumption is allowed but flagged in a
  variance note on the order).

### Guards

- A BOM cannot contain its parent item, directly or transitively (**cycle
  detection** on save, with a clear error naming the loop).
- An item with an active BOM cannot be deleted without confirming the BOMs that
  reference it (reuse the existing delete-confirm pattern, extended with a
  where-used list).
- Releasing an order with shortages is **allowed but warned** (a small shop often
  starts anyway and receives the missing part same day).
- Qty must be > 0; finishing more than `qty` requires confirmation.

---

## 7. Settings surfaces (shipped in the same turn as the feature)

| Level | Where | What |
|---|---|---|
| **Workspace** | Settings → Modules & capabilities | `production` module toggle (default off). New scale axis **`production`** — *"Production orders & routing"*, tier **growth** — off by default; when off, the Production Orders page and the BOM `kind` selector are absent entirely |
| **Configuration** | Settings → Configuration → **Assembly & production** (new page, tier starter) | Default output location · Default WIP location · Auto-numbering series for BOM/AO · **Manual component consumption** toggle (default off) · Allow release with shortages (default on, warn) · Default scrap % for new lines (default 0) · Allow over-consumption (default on) |
| **Terminology** | Settings → Terminology | `module.production`, `object.bom.*`, `object.assemblyOrder.*`, `object.component.*` |
| **User** | Settings → My settings → Personal defaults | Default output location for new assembly orders · Default assembly-orders view (Open / All) · "Only show orders assigned to me" |

---

## 8. Keyboard shortcuts (built + catalogued in the same turn)

Added to `shortcutGroups()` in the app shell under a new **Production** group:

| Key | Context | Action |
|---|---|---|
| `N` | BOM list | New BOM |
| `N` | Assembly orders list | New assembly order |
| `Enter` | Either grid | Open the active row in a new tab |
| `E` | BOM document | Focus the first component line |
| `Alt+↑ / Alt+↓` | BOM lines | Move line up / down |
| `Cmd/Ctrl+Enter` | Assembly order | Advance status (Release → Start → Finish) |
| `Esc` | Any document/dialog | Close the topmost overlay |
| Right-click | Grid rows | Open in new tab · Duplicate · Archive · Delete |

All scoped by the existing `onGrid` / `typing` guards.

---

## 9. Security & compliance checklist (per `docs/security/README.md`)

1. **PII / financial / cross-tenant data?** No PII. BOMs expose **unit costs and
   margins** — commercially sensitive; the `production` permission row must gate read
   access, and the item-cost rollup must never leak to a `none`-permission user.
2. **Audit events needed?** Yes — BOM create/edit/delete/activate/archive, version
   change, **Apply as item cost** (it mutates a financial field), assembly order
   create/release/start/finish/cancel/**reopen**, and any manual-consumption override
   (before/after quantities).
3. **New personal-data field?** No. `assignee` references an existing employee id.
4. **Bypassing `perms`?** No — the module is in the permission matrix from day one,
   defaulting to `none`.
5. **Sensitive data in localStorage?** BOM cost data lands in `shelfree.bom.v1`, same
   class as the existing item-cost data already stored client-side. No secrets. Flagged
   for the backend as tenant-scoped, permission-checked reads.
6. **Axis-off must soft-hide, never delete** — turning the `production` axis off keeps
   stored production fields intact.

---

## 10. Production BOMs & orders — specified, deferred

Recorded now so phase 2 is additive rather than a rewrite. Tier **Growth**, behind the
`production` axis, off by default.

- `kind: 'production'` reveals: **Operations** (ordered list — seq, name, station,
  setup min, run min/unit), **yield %**, **WIP location**.
- **Production Order** = the same document plus an operations progress strip
  (per-operation start/complete, actual vs estimated minutes), WIP stock in the
  `assembly`/WIP bucket between consume and output, and scrap output recording.
- Lifecycle is the same status set; `Planned` becomes meaningful once the planning
  capability exists.
- **Enterprise, later**: `workCentre` becomes a real entity with calendars, capacity
  and load — which is why `operations[].workCentre` is a nullable string from day one.
- Also deferred: subcontract production (ceramics vendor fires against a
  supplied-material PO), by-products, phantom BOMs, component substitution.

---

## 11. Build plan (for the plan doc, once approved)

1. Seed data — `seedBOMs()` (6 assembly BOMs: 3 holders, 3 combos; 1 production BOM
   for cones, seeded but inert) + `seedAssemblyOrders()` (~5 orders across statuses,
   dated around Pournami build-ahead).
2. App shell — `modules()` entry, permissions row, terminology keys, module toggle
   default, `production` axis def, routing/page ids, tab labels.
3. BOM list + drawer.
4. BOM document (components, cost rollup, availability, multi-level, versions).
5. Assembly order list + document + finish dialog + stock effects.
6. Item page BOM sub-tab (made-of + where-used).
7. Settings → Configuration → Assembly & production; user defaults; terminology rows.
8. Keyboard shortcuts + the Settings shortcuts page entries.
9. Docs — new `docs/production/README.md`; updates to `docs/erp-app/`,
   `docs/item-page/`, `docs/settings/`, `docs/security/`, `docs/README.md` index.

---

## 12. Success criteria

- A user can create a BOM for `ASH-PWH-18`, see its rolled-up cost differ from the
  typed-in ₹145, and apply it.
- A combo BOM shows the holder expanding into its own components (multi-level).
- Creating an assembly order for 40 combos states how many are actually buildable and
  what is short.
- Finishing an order moves stock: components down, finished goods up.
- Turning the Production module off removes every trace of it from the UI; turning it
  back on restores the data untouched.
- A Starter-plan workspace never sees the word "routing", "yield", "operation" or
  "work centre" anywhere.

---

## 13. Open questions

1. **Assembly labour cost** — should an assembly BOM carry a flat labour/overhead
   amount per build, so the rolled-up cost isn't materials-only? (Cheap to add now;
   otherwise the ₹145 seed cost will never reconcile.)
2. **Sellable components** — `SBC-ASHTRAY` (spare tray) is sold *and* is effectively
   the base component. Do we model it as the same item as `RM-BASE-STD` or keep them
   distinct SKUs? Affects where-used and stock accuracy.
3. **Non-stock output location** — should Finished output default to `main` or to the
   `assembly` bucket for a pack-out step? Proposed: workspace setting, default `main`.
