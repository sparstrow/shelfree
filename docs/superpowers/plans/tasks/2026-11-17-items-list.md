# Task brief — Warehouse ▸ Items list (React app)

Branch `feat/items-list`.

## Read first
1. `CLAUDE.md`.
2. Reference page to copy the shape of: `apps/web/src/features/purchasing/vendors/`
   (`VendorsPage.tsx`, `dataset.ts`), its routes in `apps/web/src/routes/purchasing/vendors/`,
   and `apps/web/e2e/vendors.spec.ts`.
3. `apps/web/src/components/list-page/ListPage.tsx`, `components/record-drawer/RecordDrawer.tsx`,
   `components/data-grid/model.ts` + `DataGrid.tsx`.
4. `apps/web/src/data/schemas/index.ts` → `itemSchema` (exists), `warehouseSchema`.
5. `docs/superpowers/plans/tasks/2026-11-17-items-list.reference.md` — the prototype's item
   columns, values, views, filters, search, stock helpers, drawer data and markup.
6. `docs/item-page/README.md`, `docs/erp-app/README.md` (Items table page).

## Build
`/warehouse/items` on `ListPage`, matching the prototype's columns, default visibility,
widths, views, filters, search and preview.

| File | What |
|---|---|
| `apps/web/src/domain/item.ts` + `.test.ts` | on hand (sum of `locs`), committed (`qtySO`), available, low-stock rule, margin, category path text — as in the reference |
| `apps/web/src/features/warehouse/items/dataset.ts`, `ItemsPage.tsx` | dataset + page |
| `apps/web/src/routes/warehouse/items/index.tsx` (`sel` search param), `$no.tsx` (`<PlaceholderPage title={`Item ${no}`} kind="pending" />`) | routes |
| `apps/web/e2e/items.spec.ts` | tests |

## Rules
- Stock per location comes from `item.locs`, keyed by warehouse **id**; label each site with
  the warehouse's short name (from `useList('warehouses')`).
- Preview: header (no, the prototype's status / low-stock pill, description, category path),
  stats On hand / Committed / Available (Available red `tone` when ≤ 0), a
  "STOCK BY LOCATION" block with horizontal bars rendered through `children` (bar
  `bg-primary`, track `bg-muted`), then the DETAILS facts exactly as the reference
  `sel.facts`, then the item's notes thread (`NotesBlock`, entityType `'item'`) like VendorsPage.
- Low stock: the prototype shows a small warning dot before the item number in the grid. Add
  an OPTIONAL `rowFlag?: (row: T) => string | null` to `Dataset` (model.ts) and render it in
  `DataGrid.tsx` as a 6 px round `bg-warn-fg` dot (the string as its `title`) before the first
  column's text. Datasets that don't set it are unchanged.
- Delete is blocked when the item has stock on hand, or appears on any purchase order line or
  purchase receipt line — message `'This item has stock or is on purchase documents — block it instead'`.
- `recordPath` = `/warehouse/items/${no}`, `openLabel` = `'Open item'`,
  `create` = New item → `/warehouse/items/new`.
- Out of scope: the prototype's Actions-menu shortcuts to pages not built yet (Sales prices,
  Stock by location, Unit of measure), and the item page itself.

## Acceptance
typecheck / lint / test pass; `e2e/items.spec.ts` covers: the seeded count; a view filters
rows (seed-based count); one item's preview shows on hand / available and the per-location
bars; a low-stock item shows the warning dot (pick one from the seed where on hand is below
the reorder point; if none, say so); delete blocked for an item on a PO; double-click opens
`/warehouse/items/<no>`.

## How to work (tool rules — breaking these stops the run)
- Read and search with your built-in file tools only. No shell commands to read
  or search files.
- The only shell commands you may run, with the working directory set to
  `apps/web` (use the tool's working-directory parameter; never `cd`, `&&`,
  `|` or redirection): `pnpm typecheck`, `pnpm lint`, `pnpm test`.
- Do not run Playwright / e2e tests or builds; the reviewer does.
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
