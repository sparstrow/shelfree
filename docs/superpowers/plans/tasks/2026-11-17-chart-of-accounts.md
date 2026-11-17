# Task brief — Finance ▸ Chart of Accounts (React app)

You are working in a git worktree of the Shelfree ERP repo, branch
`feat/chart-of-accounts`. Do NOT commit, push or switch branches. Only
edit/create the files listed below.

## Read first (in this order)
1. `CLAUDE.md` — especially "Page templates" (the `editor` option), "Edit in
   place", "Quiet pages", "Tokens & colour".
2. **The finished reference page — copy its shape exactly:**
   `apps/web/src/features/purchasing/charges/ChargesPage.tsx`,
   `apps/web/src/domain/charges.ts` + `charges.test.ts`,
   `apps/web/src/routes/purchasing/charges/index.tsx`,
   `apps/web/e2e/charges.spec.ts`, and the "React app" section at the end of
   `docs/charges/README.md`.
3. `apps/web/src/components/list-page/ListPage.tsx` (`ListEditor`, `EditorView`)
   and `apps/web/src/components/record-drawer/EditableDrawer.tsx`
   (`EditorField`). Use them as they are — do not change these two files.
4. `apps/web/src/data/schemas/index.ts` → `accountSchema` / `Account` (already
   exists; do not change it) and `chargeSchema` (charges post to accounts).
5. `docs/superpowers/plans/tasks/2026-11-17-chart-of-accounts.reference.md` —
   the prototype's complete definition of this page (`coaReg`) and its keyboard
   shortcuts. Port it faithfully: columns, views, filters, search, field list,
   locks, dependent fields, `blank`, `dupe`/next code, `normalize`,
   `validate` messages, `view` (title, subtitle, tags, notice, facts),
   `cantDelete`.
6. `docs/chart-of-accounts/README.md` — the functional spec.

## How to work (tool rules — breaking these stops the run)
- Read and search with your built-in file tools only. No shell commands to read
  or search files.
- The only shell commands you may run, with the working directory set to
  `apps/web` (use the tool's working-directory parameter; never `cd`, `&&`,
  `|` or redirection): `pnpm typecheck`, `pnpm lint`, `pnpm test`.
- Do not run Playwright / e2e tests or builds; the reviewer does.

## What to build
`/finance/chart-of-accounts`, edited in the drawer via the `editor` option.

| File | What |
|---|---|
| `apps/web/src/domain/chart-of-accounts.ts` + `.test.ts` | all pure rules from `coaReg` (types/groups, next code per type, blank, duplicate, onChange, normalize, validate, status/source text, delete-blocked reason) with tests |
| `apps/web/src/features/finance/chart-of-accounts/ChartOfAccountsPage.tsx` | dataset + `ListEditor<Account>` + `ListPage`, like ChargesPage |
| `apps/web/src/routes/finance/chart-of-accounts/index.tsx` | route with `validateSearch: z.object({ sel: z.string().optional() })` |
| `apps/web/e2e/chart-of-accounts.spec.ts` | Playwright tests (see Acceptance) |
| `docs/chart-of-accounts/README.md` | append `## React app (2026-11-17)` like the Charges doc (files, same-as-prototype list, deliberate changes, shortcuts, persistence `shelfree.v2.accounts`, backend validation, tests) |
| `docs/superpowers/plans/2026-11-15-react-frontend-migration.md` | status table: add "Finance ▸ Chart of Accounts" = ported |

## Rules
- Data only through `useList('accounts')` and `useList('charges')` (the
  delete rule and "used by" facts need charges) and `useUpsert('accounts')`;
  delete via `useCollectionDelete('accounts', …)`. No seed imports, no
  localStorage, no `any`, Tailwind tokens only.
- **Delete is blocked** for system accounts and for accounts a charge posts to
  (`purchaseAcct` or `salesAcct`) — use the prototype's exact messages.
- Stamp `createdAt` (new) and `updatedAt` (every save) like ChargesPage.
- Field help (`hint`) goes in the field's `hint` — the template shows it as a
  tooltip. Never render help text inline.
- If the prototype field schema uses a field type the template doesn't have
  (only `text`, `number`, `area`, `select`, `toggle` exist), use the closest one
  and list it under "open questions" in your summary.

## Acceptance
- `pnpm typecheck`, `pnpm lint`, `pnpm test` pass.
- `e2e/chart-of-accounts.spec.ts` covers: the seeded count
  (`Showing 1–10 of 10 accounts`); a system account shows its notice and Delete
  is disabled; create an account with validation errors first, then valid
  (assert the next code the prototype logic proposes, if it proposes one);
  edit it, duplicate it, delete it; an account used by a charge can't be
  deleted (check the seed: `seedCharges` → `purchaseAcct`); N opens a new
  account. Use `getByLabel('…', { exact: true })` for fields (each label also
  has an "About …" help button).

## When you finish
Print a short summary: files changed, anything you could not do or verify,
open questions. Do not commit.
