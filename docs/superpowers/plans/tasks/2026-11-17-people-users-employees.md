# Task brief — People ▸ Users and People ▸ Employees

Branch `feat/people-users-employees`. Other runs work in parallel, so stay inside the files listed here.

## Read first
1. `CLAUDE.md` — "Page templates" (ListPage + `editor`), "Edit in place", "Quiet pages", "Security".
2. Editable list reference to copy: `apps/web/src/features/people/contacts/ContactsPage.tsx`,
   `domain/contacts.ts`, `routes/people/contacts/index.tsx`, `e2e/contacts.spec.ts`; and
   `features/purchasing/charges/ChargesPage.tsx`.
3. `data/schemas/index.ts` (`userSchema`, `employeeSchema`), the `users` / `employees` collections,
   `lib/privacy.ts` (masking).
4. `docs/superpowers/plans/tasks/2026-11-17-people-users-employees.reference.md` — prototype markup
   of People ▸ Users & Employees and every `ppl*` helper (modules/roles/depts, status pill, tenure,
   last-active, filtering, sort, selection, edit, permissions draft, status changes, bulk actions,
   delete rules).
5. `docs/security/README.md` (roles, permissions), any `docs/people*` / `docs/users*` doc.

## Build
Two pages on `ListPage` with `editor`: `/people/users` and `/people/employees`.

| File | What |
|---|---|
| `apps/web/src/domain/people.ts` + `.test.ts` | the `ppl*` rules: roles / modules / permission matrix defaults, status transitions (invite / activate / suspend …), tenure and last-active text, validation (unique email, required fields), delete rules (e.g. can't delete yourself / the last owner — port the prototype's exact rules and messages) |
| `apps/web/src/features/people/users/UsersPage.tsx` (+ `dataset.ts`) | Users: columns, views, filters, drawer editor incl. the per-module permission editor as the prototype shows it |
| `apps/web/src/features/people/employees/EmployeesPage.tsx` (+ `dataset.ts`) | Employees |
| `apps/web/src/routes/people/users/index.tsx`, `routes/people/employees/index.tsx` | routes (`sel`) |
| `apps/web/e2e/people.spec.ts` | tests |

## Rules
- Phone and email are personal data: masked in grids and exports, full in the drawer.
- Bulk actions (status change / delete) through the grid's selection, as the prototype — if the
  ListPage template has no bulk-action option, add an OPTIONAL `bulkActions` prop to ListPage
  (backward compatible) and say so; don't fork the grid.
- Permissions are only *displayed and stored* here; enforcement is the backend's job — write the
  rules the server must enforce in the doc (who may change roles, last-owner protection, audit
  events for role / permission / status changes).

## Acceptance
`e2e/people.spec.ts`: both pages show the seeded counts; email masked in the grid and full in the
drawer; edit a user's role / a module permission and save; suspend then reactivate a user; the
prototype's protected-delete case is refused; create an employee with a validation error first.
Docs: a `docs/people/README.md` (new — add it to `docs/README.md`'s index) with the React section,
and the status table.

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
