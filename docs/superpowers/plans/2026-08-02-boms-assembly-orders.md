# Plan — BOMs & Assembly Orders (phase 1)

**Date:** 2026-08-02 · **Spec:** [`../specs/2026-08-02-boms-assembly-production-orders.md`](../specs/2026-08-02-boms-assembly-production-orders.md)
**Status:** approved 2026-08-02, ready to build

## Open questions — resolved as defaults (say the word to change any)

1. **Labour/overhead** — BOM carries an optional `labourCost` (flat ₹ per build,
   default 0) plus `overheadPct` (default 0). Rolled-up cost = materials + labour +
   overhead%. Seeded so `ASH-PWH-18` reconciles to ~₹145.
2. **`SBC-ASHTRAY` vs `RM-BASE-STD`** — keep them **distinct SKUs**. The spare is
   retail-packed and priced; the component is bulk. A later "alternate/substitute"
   feature can link them. No data change.
3. **Default output location on Finish** — workspace setting, default **`main`**
   (finished goods land in the sellable bucket); `assembly` stays the WIP bucket.

---

## Task 1 — Seed data
**File:** `lib/shelfree-data.js`

- `seedBOMs()` — 7 records:
  - `BOM00001/20/30` — `ASH-{PWH,TER,BLK}-18` ← lid + `RM-BASE-STD` + `RM-GASKET` +
    `PKG-FOAM-INS` + `PKG-BOX-STD` + `PKG-CARE-CARD`. Scrap: lid 3%, base 3%,
    gasket 1%, rest 0. `labourCost` ~18, `overheadPct` 5.
  - `BOM00004/50/60` — `CMB-{PWH,TER,BLK}-12` ← the matching holder +
    `SBC-CONE-12` + `PKG-BOX-PREM` (multi-level).
  - `BOM00007` — `kind:'production'`, `SBC-CONE-12` ← `RM-CONE-BULK` (0.34 KGS),
    `yieldPct: 92`, one `operations[]` entry. Seeded but inert (axis off).
  - One archived `v1` of `BOM00001` with `effectiveTo` set, to exercise versions.
- `seedAssemblyOrders()` — 6 orders across `draft / released / inProgress / finished /
  cancelled`, due dates clustered before the next Pournami, one deliberately short on
  `RM-GASKET` to exercise the shortage banner.
- Header comment updated.

**Verify:** `check_design_system` clean; app boots with the new arrays present.

## Task 2 — App shell wiring
**File:** `designs/erp/Shelfree App.dc.html` (logic)

- `modules()` → `{ id:'production', name:'Production', pages:['Bills of Materials','Assembly Orders','Production Orders'] }` after `warehouse`; Production Orders filtered out unless `axisOn('production')`.
- `axisDefs()` → `{ key:'production', label:'Production orders & routing', desc:'Routed manufacturing with operations and yield.', tier:'growth' }`.
- `wsDefaults().modules.production = true` (Kanalora) — but `false` in the
  new-workspace default map.
- `pplModules()` → production row; `termDefs()` → `module.production` + the four
  object-name pairs; `datasetIdFor` → `boms` / `assemblyOrders`.
- State: `boms`, `assemblyOrders`, load/save at `shelfree.bom.v1` /
  `shelfree.assemblyorder.v1`; `bomNextNo()` / `aoNextNo()` (+1 convention).

**Verify:** module appears in sidebar + module toggle; toggling off hides it; axis row
appears in Modules & capabilities as Growth-locked on Starter.

## Task 3 — Helper layer (pure logic, no UI)
**File:** app shell logic

`activeBomFor(itemNo, date)` · `bomLines(bom)` · `effectiveQty(line, qty)` ·
`rollupCost(bom, depth)` · `explode(bom, qty)` (multi-level, cycle-guarded) ·
`whereUsed(itemNo)` · `buildable(bom, locKey)` · `shortages(bom, qty, locKey)` ·
`bomCycleCheck(bom)`.

**Verify:** temporary console probe — combo rollup ≈ holder rollup + cones + box;
cycle check rejects a self-referencing BOM.

## Task 4 — BOM list page + drawer
Grid page reusing the Items/PO table machinery: columns, 4 default views, drawer with
component summary + cost + availability, footer actions, empty state, row context
menu, `N` / `Enter` shortcuts.

**Verify:** screenshot list + drawer; sort/filter/view switching works.

## Task 5 — BOM document
Header (parent, version, status, effective dates, output qty, notes), components table
(add/remove/reorder, item picker, scrap %), cost card + **Apply as item cost** confirm,
availability card, multi-level expand, version switcher + archived banner.
`kind` selector rendered only when `axisOn('production')`.

**Verify:** create a BOM end-to-end; apply cost updates the item; expand a combo to see
the holder's sub-tree; Starter plan shows no kind/routing/yield anywhere.

## Task 6 — Assembly order list + document
List (columns, views, status pills matching PO colours) and document (header,
components table, shortage banner, status actions Release/Start/Finish/Cancel/Reopen,
finish dialog with editable consumption when manual mode is on, stock effects on
finish).

**Verify:** finish an order → component `locs` down, parent `locs` up, item page KPIs
reflect it; short order warns on release.

## Task 7 — Item page BOM sub-tab
**Made of** (read-only tree, rollup, buildable, Edit BOM → new tab) + **Where used**
table; both with empty states. Tab hidden when the item is neither made nor used.

**Verify:** `ASH-PWH-18` shows Made of; `RM-GASKET` shows Where used only.

## Task 8 — Settings surfaces
- New **Configuration → Assembly & production** page (tier starter): default output
  location, WIP location, numbering series, manual consumption, allow release with
  shortages, default scrap %, allow over-consumption.
- **My settings → Personal defaults**: default output location, default AO view,
  "only my orders".
- **Terminology**: the new rows.

**Verify:** each control persists and visibly changes behaviour (manual consumption
flips the finish dialog).

## Task 9 — Keyboard shortcuts
Wire the §8 table in the app's keydown handler with `onGrid`/`typing` guards; add a
**Production** group to `shortcutGroups()` in the same turn.

**Verify:** each key works on the right surface and does nothing while typing; the
Settings shortcuts page lists all of them.

## Task 10 — Docs
New `docs/production/README.md` (five-section shape + Decisions & deferred-to-backend,
incl. the resolved open questions above). Update `docs/README.md` index,
`docs/erp-app/README.md` (module + axis table), `docs/item-page/README.md` (BOM
sub-tab), `docs/settings/README.md` (new pages), `docs/security/README.md` (BOM cost
sensitivity + new audit events).

**Verify:** `check_design_system` clean; docs index links resolve.

---

**Suggested build order in turns:** T1–T3 together (data + logic, no UI),
then T4–T5, then T6, then T7–T9, then T10. Docs for each surface land with that
surface, not all at the end.
