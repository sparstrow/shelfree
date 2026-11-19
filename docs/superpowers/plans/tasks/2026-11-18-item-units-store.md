# Task brief — store each item's units (base, pack units, conversions)

Branch `feat/item-units-store` (based on `feat/item-units-production-orders`). Other runs work in
parallel on `components/data-grid/`, `components/saved-views/` and `app/shell/`, so stay inside the
files listed here.

## Problem
The prototype keeps a per-item unit set — `{ list, base, pack, qty }` (`itemUomFor`,
`itemUomUpdate`, `itemUomAdd/Remove/SetBase/SetQty`, `itemUomComputePack`). The React app stores
only `item.uom` (the base unit):
- Item profile ▸ Units of measure (`features/warehouse/items/item-tabs/ItemUnitsTab.tsx`) keeps
  added pack units in component state, so they vanish when you leave the page.
- Warehouse ▸ Units of Measure (`features/warehouse/units-of-measure/`) therefore lists one row per
  item, and its *Pack units* view is always empty.

## Read first
1. `CLAUDE.md` — "Frontend stack & rules" (data seam), "Page templates", "Quiet pages", "Edit in place".
2. `apps/web/src/domain/item-profile.ts` (`ItemUomState`, `defaultItemUomState`, unit rows and
   summary helpers) + test; `domain/units-of-measure.ts` (`allUnits`, size-in-base, item unit rows
   and remove rules) + test.
3. `data/schemas/index.ts`, `data/api/index.ts` (collections), `data/queries/`, `data/schemas/seed.test.ts`,
   `data/seed/` (how collections are seeded).
4. `features/warehouse/items/item-tabs/ItemUnitsTab.tsx`, `ItemProfilePage.tsx`,
   `features/warehouse/units-of-measure/ItemUnitsPage.tsx` + `dataset.ts`, `features/warehouse/items/ItemCard.tsx`
   (creating an item must create its unit set too).
5. `docs/superpowers/plans/tasks/2026-11-18-item-units-store.reference.md` — prototype markup of
   the Units tab and every `itemUom*` / `uomSizeInBase` / `itemUnit*` method.
6. `docs/units-of-measure/README.md` (the "Open (2026-11-18)" note), `docs/item-page/README.md`.

## Build
| File | What |
|---|---|
| `data/schemas/index.ts` | `itemUnitSetSchema` = `{ itemNo, list: string[], base, pack, qty: Record<string, number> }` (match the prototype's shape) |
| `data/api/index.ts`, `data/queries/` | collection `itemUnits` keyed by `itemNo`, through the normal collection helpers; seed: one set per seeded item from `item.uom` (base only, like `itemUomFor`'s default) — reuse the seed folder's pattern, `seed.test.ts` passes |
| `domain/item-profile.ts` and/or `domain/units-of-measure.ts` (+ tests) | the `itemUom*` rules as pure functions: add (dup check), remove (base → next unit, clears pack and qty as `itemUnitRemoveKey`), set base, set qty (validation), compute master pack (`itemUomComputePack`). Keep `item.uom` equal to the set's base — one helper that returns both changes |
| `data/api/commands.ts` | a command that saves the unit set and keeps `item.uom` in step (both or neither) |
| `ItemUnitsTab.tsx` | read and write the stored set (no component-state copy). Keep its layout; move its inline explanatory text (the master-pack hint, the empty-state explainer, the conversion footnote) behind ⓘ with `components/help/HelpTarget` (Quiet pages) — keep only state text |
| `ItemUnitsPage.tsx` + `dataset.ts` | rows from the stored sets (one per item × unit, role Base / Master pack / Pack unit, qty in base); remove + undo + bulk remove go through the same domain rule and command |
| `ItemCard.tsx` | ONLY: creating an item also creates its unit set (base = chosen unit); editing the base unit on the card updates the set through the same helper |
| `e2e/item-units.spec.ts` (extend), `e2e/item-profile*.spec.ts` (only if an assertion breaks) | add a pack unit on the Item profile, set its conversion, leave and come back (still there), see it in Warehouse ▸ Units of Measure (*Pack units* view not empty), remove it there, gone on the profile |

## Docs
`docs/units-of-measure/README.md`: replace the "Open (2026-11-18)" note with the implemented model
(collection `shelfree.v2.itemUnits`, rules, backend table `item_units(item_no, unit_code, role,
qty_in_base)`, the invariant base = `items.uom`, one base per item, server enforces it).
`docs/item-page/README.md`: Units tab now persisted; help text behind ⓘ.


## How to work (tool rules — breaking these stops the run)
- Read and search with your built-in file tools only. No shell commands to read
  or search files.
- Do NOT run any shell commands at all (not even `pnpm typecheck` / `lint` / `test` —
  headless mode denies them and that ends your run). The reviewer runs every check.
  So write code that is correct by reading: strict TypeScript, no unused imports, hook
  dependency arrays complete and stable (memoize derived arrays with `useMemo`).
- Do NOT commit, push or switch branches. Only touch the files this brief lists.

## Always
- Read `CLAUDE.md` first ("Frontend stack & rules", "Page templates", "Edit in
  place", "Quiet pages", "Tokens & colour", "Contacts").
- Use the templates; never copy them. If you need a template option that
  doesn't exist, add it as an OPTIONAL, backward-compatible prop and say so in
  your summary.
- Data only through `@/data/queries` hooks. No seed imports in features, no
  localStorage, no `any`, Tailwind theme tokens only, `money()`/`int()`/
  `fmtDate()` from `@/lib/format`, status as a pill.
- Phone and email are personal data: masked in grids and exports
  (`maskPhone` in `@/lib/privacy`; add `maskEmail` there if you need it, with a
  test), full in the drawer.
- Use `getByLabel('…', { exact: true })` in Playwright tests (labels also have
  "About …" help buttons).
- Update the page's `docs/<page>/README.md` with a `## React app (2026-11-17)`
  section (files, URL, same-as-prototype, deliberate changes, persistence key
  `shelfree.v2.<collection>`, backend rules, tests) and add your page(s) to the
  status table in `docs/superpowers/plans/2026-11-15-react-frontend-migration.md`.

## When you finish
Print a short summary: files changed, template options added, anything you
could not do or verify, open questions.
