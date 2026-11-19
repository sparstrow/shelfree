# Task brief — grid multi-row actions: bulk edit, duplicate, status / lock changes, delete, rows menu

Worktree `D:/Sparstrow/shelfree-bulk`, branch `feat/grid-bulk-actions` (based on
`feat/grid-columns-grouping`). Another run works in parallel on the grid's **filter side panel**
(`components/data-grid/FilterPanel.tsx`, the toolbar Filter button and `FilterChips.tsx`); stay out of
those parts. In `DataGrid.tsx` touch only the bulk bar, the row right-click menu and the selection code.

## Read first
1. `CLAUDE.md` — "Page templates" (exceptions are options, never copies), "Interaction / hover states",
   "Keyboard shortcuts", "Quiet pages", "Security & compliance".
2. `apps/web/src/components/data-grid/DataGrid.tsx` (selection, `GridBulkAction`, bulk bar, row context
   menu), `model.ts`, `shortcut-meta.ts`; `components/list-page/ListPage.tsx` (`remove` /
   `useCollectionDelete`, `editor`, `actions`, `bulkActions`); `src/app/shortcuts.ts`.
3. Pages that already pass `bulkActions`: `features/people/users/UsersPage.tsx`,
   `features/people/employees/`. Purchase Orders list: `features/purchasing/purchase-orders/`;
   rules in `src/domain/purchase-order.ts` (status transitions, numbering) — use them, don't re-implement.
4. `docs/superpowers/plans/tasks/2026-11-18-grid-bulk-actions.reference.md` — prototype bulk bar,
   row menu, bulk edit dialog markup and every `ms*` / `be*` / `openRowCtx` / duplicate method.

## Build — template first (`components/data-grid/`, `components/list-page/`), pages only declare
Exactly as the prototype (`msVM`, `beVM`):
- **Bulk bar** (when 1+ rows are checked): "n <noun> selected", Edit, Copy, Duplicate (when the page
  allows), lock ops and status ops (one button per op that applies to 1+ selected rows, dot colour + count,
  title "k of n selected can be …"), Export, the page's `bulkActions`, Delete (count "k of n" when only
  some can be deleted, title says why), Clear. Keep the existing Copy / Export / custom actions working.
- **Rows menu**: right-clicking a row that is part of a 2+ selection shows the multi-row menu
  (Open in tabs when allowed, Copy rows, Copy numbers, Duplicate, Edit column…, status / lock items with
  "k of n" hints, disabled when 0, Export, Delete); a single row keeps today's menu.
- **Bulk edit dialog** ("Edit column…" / bulk bar Edit): pick a field, then a value (select / number /
  date input per field kind), state lines for editable / locked / final rows, Apply to the editable rows,
  "Reopen & apply" when the prototype offers it, Enter applies, Ctrl/Cmd+Enter = reopen & apply, Esc
  closes. Use shadcn `Dialog`. Toast with Undo after apply.
- **Duplicate** selected rows (toast with Undo). **Delete** selected rows with the existing
  delete-with-undo flow, only the eligible ones.
- New OPTIONAL `ListPage` / `DataGrid` props (all off when not passed, so other pages don't change),
  for example `bulkEdit?: { fields: BulkEditField<T>[]; apply(rows, field, value) }`,
  `duplicate?: (rows) => Promise<string[]>`, `statusOps?` / `lockOps?` (label, dot token, `can(row)`,
  `run(rows)`), `canDelete?: (row) => true | string`, `openInTabs?`. Name them well and give each prop
  a JSDoc line.
- Pure rules (which rows an op applies to, the "k of n" text, bulk-edit targets split into editable /
  locked / final, the value applied per field kind, duplicate numbering) in `src/domain/bulk-actions.ts`
  with Vitest tests.

## Wire the pages the prototype wires
- **Purchase Orders**: bulk edit fields, duplicate (new number from the domain rule, status Draft, order
  date today, no expected date, lines copied), status ops and lock ops from `msStatusOps` / `msLockOps`
  through `domain/purchase-order.ts` transitions, delete only Draft ("Only draft purchase orders can be
  deleted"). Changes to several records go through a command in `data/api/commands.ts` + a query hook.
- **Items, Customers, Vendors**: duplicate (`nextDupNo` rule, " (copy)" suffix) and Open in tabs (opens
  each record's page in a new browser tab — the React app has no in-app tabs).
- Any other dataset listed in `beFields` in the reference.

## Shortcuts, docs, tests
- Every key (bulk dialog Enter / Ctrl+Enter / Esc, rows menu keys, Space toggles the active row's
  checkbox if that isn't there yet) in `components/data-grid/shortcut-meta.ts`.
- `docs/erp-app/README.md` grid section: `### Grid: multi-row actions (2026-11-18)` (what, template props,
  backend: bulk endpoints run in one transaction, re-validate each row server-side, audit event per changed
  record). The Purchase Orders doc in `docs/`: bulk status / duplicate / delete rules. Migration plan
  "Known gaps": strike "Grid bulk actions" and "bulk edit / bulk delete".
- Add `e2e/grid-bulk-actions.spec.ts`: on Purchase Orders select 3 rows (mixed status) → bulk bar counts,
  a status op changes only the valid rows, Undo; bulk edit a field and Undo; duplicate 2 rows (new Draft
  numbers); delete shows "k of n" and removes only drafts; right-click a selected row → multi menu; Esc
  closes dialog and menu. On Items duplicate one row.
- Delete the `.reference.md` file when done.


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
