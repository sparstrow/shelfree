# Task brief — Notes page, Departments page, Vendor Purchase Items page

Branch `feat/notes-departments-vpi`. Three small pages. Other runs work in parallel, so stay inside
the files listed here.

## Read first
1. `CLAUDE.md` — "Page templates", "Quiet pages", "Keyboard shortcuts".
2. `apps/web/src/components/list-page/ListPage.tsx`, `components/notes/` (NotesBlock and its data
   rules in `domain/notes.ts`), `app/shell/` (sidebar, TopBar, how module pages and the `/$module/$page`
   placeholder route work), `features/purchasing/purchase-prices/` and `domain/purchase-prices.ts`.
3. `docs/superpowers/plans/tasks/2026-11-17-notes-departments-vpi.reference.md` — prototype markup
   and logic of: DEPARTMENTS (whole-app page directory, `dept*`), NOTES (every note in the workspace,
   `notesPageVM`, note helpers), VENDOR PURCHASE ITEMS (`vItems*`, `openVendorItems`, and the
   `vi*` view-model lines from the render function).
4. `docs/notes/README.md`, `docs/vendor-purchase-items/README.md`, and the departments section in
   `docs/erp-app/README.md`.

## Build
| File | What |
|---|---|
| `apps/web/src/features/notes/NotesPage.tsx` (+ `dataset.ts`) + `routes/notes/index.tsx` | `/notes`: every note (filters by type / entity / author / valid-invalidated as the prototype), each row links to its record; reuse `domain/notes.ts` |
| `apps/web/src/features/departments/DepartmentsPage.tsx` + `domain/departments.ts` (+ test) + `routes/departments/index.tsx` | `/departments`: the page directory grouped by module, keyboard navigation (`deptKeyDown`: arrows / Enter / type-to-filter), recents if the prototype has them. Build the list of pages from ONE place — reuse the sidebar's module/page definition (read `app/shell/`), don't hardcode a second copy |
| `apps/web/src/features/purchasing/vendor-purchase-items/VendorPurchaseItemsPage.tsx` + `routes/purchasing/vendors/$no_.items.tsx` | `/purchasing/vendors/<no>/items`: one vendor's purchase items (from purchase prices) with add item (picker) / remove as the prototype; reuse `domain/purchase-prices.ts` (add helpers there only if needed, with tests) |
| `apps/web/src/features/purchasing/vendors/tabs/VendorItemsTab.tsx` | ONLY: link its "manage"/"open" action to the new page if the prototype does |
| `apps/web/e2e/notes-departments-vpi.spec.ts` | tests |

## Acceptance
Notes: seeded count, a filter, a row opens its record. Departments: groups render, typing filters,
arrow + Enter opens a page. Vendor items: V00001's items listed, add one, remove one, back to the
vendor. Docs: React sections in the three docs; status table.

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
