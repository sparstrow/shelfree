# Task brief — Warehouse ▸ Units of Measure (item units) and Production ▸ Production Orders

Branch `feat/item-units-production-orders`. Other runs work in parallel, so stay inside the files
listed here.

## Read first
1. `CLAUDE.md` — "Page templates", "Quiet pages", "Keyboard shortcuts".
2. `apps/web/src/components/list-page/ListPage.tsx`, `components/data-grid/model.ts` (Dataset).
3. The Settings ▸ Units of measure section already ported: `features/settings/units-of-measure/`,
   `domain/units-of-measure.ts` (+ test). The Warehouse page is a DIFFERENT screen: one row per
   item × unit (the item's base unit and its conversions). Reuse the domain helpers; add to
   `domain/units-of-measure.ts` only if needed, with tests.
4. `features/warehouse/items/` (list, profile — how an item's units are shown there),
   `data/schemas/index.ts` (`itemSchema` units fields), `app/nav.ts`.
5. Assembly Orders list: `features/production/assembly-orders/`, `routes/production/assembly-orders/`.
6. `docs/superpowers/plans/tasks/2026-11-18-item-units-production-orders.reference.md` — prototype
   markup of the Warehouse ▸ Units of Measure screen, every `itemUnit*` method, `datasetIdFor`,
   `modules`, `axisOn`, and every other line mentioning item units / Production Orders.
7. `docs/units-of-measure/README.md`, `docs/production/README.md`.

## Build
| File | What |
|---|---|
| `apps/web/src/features/warehouse/units-of-measure/ItemUnitsPage.tsx` + `dataset.ts` | `/warehouse/units-of-measure` on `ListPage`: the prototype's columns, views, filters, search, row open (to the item, as `itemUnitOpenRow`), remove (as `itemUnitRemoveKey(s)`, with its rules and messages) |
| `apps/web/src/routes/warehouse/units-of-measure/index.tsx` | route (`sel` like the other lists) |
| `apps/web/src/routes/production/production-orders/index.tsx` | `/production/production-orders`: the prototype shows the SAME Assembly Orders screen here (`datasetIdFor` maps both pages to `assemblyOrders`). Render the existing Assembly Orders page — do not copy it. If the page needs to know which nav page it is under (title / breadcrumb), add an OPTIONAL prop to the Assembly Orders page. Keep the nav rule as the prototype has it (`modules()`: listed only when the production axis is on) if the app has that axis; otherwise leave `app/nav.ts` as it is and say so |
| `apps/web/src/app/shortcuts.ts` | ONLY add the new page's keys if it has any beyond the List template's |
| `apps/web/e2e/item-units.spec.ts` | tests |

## Acceptance
`e2e/item-units.spec.ts`: Warehouse ▸ Units of Measure shows the seeded row count; search narrows
rows; a view changes rows; a row opens its item; remove one conversion row (with the prototype's
rule if a base unit can't be removed). `/production/production-orders` shows the assembly orders.
Docs: React sections in `docs/units-of-measure/README.md` (Warehouse page) and
`docs/production/README.md` (Production Orders); status table rows.


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
