# Task brief — Warehouse ▸ Item profile page on the Record page template

Branch `feat/item-profile`. Two other runs work in parallel (BOM and Assembly order documents),
so stay inside the files listed here.

## Read first
1. `CLAUDE.md` — "Page templates", "Edit in place", "Quiet pages".
2. The template and its users — copy their shape exactly:
   `apps/web/src/components/record-page/RecordPage.tsx`, `components/record-fields/FieldRows.tsx`,
   `features/purchasing/vendors/VendorProfilePage.tsx` + `VendorOverview.tsx` + `tabs/`,
   `features/sales/customers/CustomerProfilePage.tsx` + `customer-tabs/`,
   `routes/sales/customers/$no.tsx`, `e2e/customer-profile.spec.ts`.
3. `features/warehouse/items/` (list + preview), `domain/item.ts` (+ test), `domain/production.ts`
   (BOM helpers), `data/schemas/index.ts` (`itemSchema`, `warehouseSchema`, `bomSchema`).
4. `docs/superpowers/plans/tasks/2026-11-17-item-profile.reference.md` — prototype markup of the
   item detail page, `itemPageVM`, `itemBomVM`, `itemSiteRows`, units of measure helpers.
5. `docs/item-page/README.md`.

## Build
`/warehouse/items/<no>` with the prototype's tabs, in its order.

| File | What |
|---|---|
| `apps/web/src/domain/item-profile.ts` + `.test.ts` | the pure figures the page shows (stock by site, valuation, BOM where-used / made-from, open POs / AOs for the item, unit-of-measure rows). Reuse `item.ts` / `production.ts`; don't edit them |
| `apps/web/src/features/warehouse/items/ItemProfilePage.tsx` + `item-tabs/*.tsx` | the page, one file per tab |
| `apps/web/src/routes/warehouse/items/$no.tsx` | render the profile (keep `/new` as the placeholder); `validateSearch` with `tab` |
| `apps/web/e2e/item-profile.spec.ts` | tests; update `e2e/items.spec.ts` only if its double-click test checks the old placeholder |

## Rules
- In the prototype, Edit on this page opens the full-page Item card (create / edit item). The Item
  card is a later task: make the header's Edit button navigate to `/warehouse/items/<no>/edit` and
  add that route as the NON-nested file route `apps/web/src/routes/warehouse/items/$no_.edit.tsx` (TanStack Router `_` suffix, so `$no.tsx` needs no `<Outlet>`) rendering `<PlaceholderPage title={`Edit item ${no}`} kind="pending" />`. So this page has
  no in-place edit — pass the RecordPage props so Edit / E navigate there (add an OPTIONAL
  `onEdit?: () => void` to RecordPage if it has none — when set, Edit calls it instead of entering
  edit mode; say so in your summary). This is the only template change allowed.
- Rows linking to other records navigate: BOMs → `/production/bills-of-materials/<no>`,
  assembly orders → `/production/assembly-orders/<no>`, POs → `/purchasing/purchase-orders/<no>`,
  vendors → `/purchasing/vendors/<no>`.
- Tabs whose data doesn't exist in React yet (e.g. sales prices, ledger entries) → `RecordTabPending`.
- Stock per site labelled with the warehouse short name; money via `money()`, quantities `int()`.

## Acceptance
typecheck / lint / test pass; `e2e/item-profile.spec.ts` covers: double-click in the Items list
opens the profile; tabs by click and number keys; stock-by-site figures match the seed for one
item; a BOM row opens the BOM page; Edit (button and E) goes to `/warehouse/items/<no>/edit`;
Esc returns to the list with the row selected.

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
