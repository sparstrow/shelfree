# Task brief — Production ▸ Bills of Materials and Assembly Orders lists (React app)

Branch `feat/production-lists`. Two list pages; the documents are a later task.

## Read first
1. `CLAUDE.md`.
2. Reference pages to copy: `apps/web/src/features/purchasing/purchase-orders/`
   (`PurchaseOrdersPage.tsx`, `dataset.ts`), its routes, `apps/web/e2e/purchase-orders.spec.ts`.
3. `apps/web/src/components/list-page/ListPage.tsx`, `components/record-drawer/RecordDrawer.tsx`.
4. `apps/web/src/data/schemas/index.ts`, `apps/web/src/data/api/index.ts`,
   `apps/web/src/data/schemas/seed.test.ts`, and in `apps/web/src/data/seed/seed-data.js`
   the functions `seedBOMs` and `seedAssemblyOrders`.
5. `docs/superpowers/plans/tasks/2026-11-17-production-lists.reference.md` — prototype
   columns, values, views, filters, search, `prodVM` (preview data), preview markup, seed shapes.
6. `docs/production/README.md`.

## Build
| File | What |
|---|---|
| `apps/web/src/data/schemas/index.ts` | `bomSchema` (+ line schema) and `assemblyOrderSchema` (+ line schema) matching the seed exactly; statuses as exported `z.enum` constants |
| `apps/web/src/data/api/index.ts` | collections `boms` and `assemblyOrders` (seeded from `seedBOMs` / `seedAssemblyOrders`, id = `no`); `seed.test.ts` must pass |
| `apps/web/src/domain/production.ts` + `.test.ts` | the pure helpers both datasets and previews need (costs, quantities, status text) |
| `apps/web/src/features/production/boms/` and `.../assembly-orders/` | `dataset.ts` + `BomsPage.tsx` / `AssemblyOrdersPage.tsx` on `ListPage` |
| `apps/web/src/routes/production/bills-of-materials/index.tsx` + `$no.tsx`, `apps/web/src/routes/production/assembly-orders/index.tsx` + `$no.tsx` | index routes with the `sel` search param; `$no` routes render `<PlaceholderPage title={`Bill of materials ${no}`} kind="pending" />` / `Assembly order ${no}` |
| `apps/web/e2e/production.spec.ts` | tests for both pages |

## Rules
- Columns, views, filters, search and preview (header, stats, line list, facts) exactly as
  the prototype; the preview's line list uses `RecordDrawer`'s `lines`. Add each record's
  notes thread through `children` (entityType `'bom'` / `'assemblyOrder'`) like VendorsPage.
- Delete: follow the prototype if it has a rule. If it has none: a BOM can be deleted only
  when it is not `active` and no assembly order uses it; an assembly order only in its first
  (planned / draft) status. Record the decision in the doc.
- `recordPath` → `/production/bills-of-materials/<no>` and `/production/assembly-orders/<no>`;
  `create` → `.../new`.
- These pages show stock and cost figures but must NOT change stock or costs.

## Acceptance
typecheck / lint / test pass (including `seed.test.ts`); `e2e/production.spec.ts` covers, for
each page: the seeded count; one view filtering rows (seed-based count); the preview shows
lines; delete blocked on a record the rules protect; double-click opens the record URL.

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
