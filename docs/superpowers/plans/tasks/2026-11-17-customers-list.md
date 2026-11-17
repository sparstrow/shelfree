# Task brief — Sales ▸ Customers list page (React app)

You are working in a git worktree of the Shelfree ERP repo, on branch
`feat/customers-list`. Do NOT commit, push or switch branches. Only edit/create
the files listed below.

## Read first (in this order)
1. `CLAUDE.md` — project rules ("Frontend stack & rules", "Page templates",
   "Tokens & colour", "Content conventions", "Contacts").
2. **The finished reference page — copy its shape exactly:**
   `apps/web/src/features/purchasing/vendors/VendorsPage.tsx`,
   `apps/web/src/features/purchasing/vendors/dataset.ts`,
   `apps/web/src/routes/purchasing/vendors/index.tsx` and `$no.tsx`,
   `apps/web/e2e/vendors.spec.ts`, `apps/web/src/domain/vendor.ts`.
3. `apps/web/src/components/list-page/ListPage.tsx` and
   `apps/web/src/components/record-drawer/RecordDrawer.tsx` (it has `sections`,
   stat `tone` and `children` options — use them, do not add new ones).
4. `apps/web/src/data/schemas/index.ts` — see how `vendorSchema` is written.
5. `docs/superpowers/plans/tasks/2026-11-17-customers-list.reference.md` — the
   exact prototype code for this page and one seed customer. Use it instead of
   searching the prototype.

## How to work (tool rules — breaking these stops the run)
- Read and search with your built-in file tools only. **No shell commands to
  read or search files.**
- The only shell commands you may run, with the working directory set to
  `apps/web` (use the tool's working-directory parameter; never `cd`, `&&`,
  `|` or redirection): `pnpm typecheck`, `pnpm lint`, `pnpm test`.
- Do not run Playwright / e2e tests or builds; the reviewer does.

## What to build
The Customers list at `/sales/customers`, matching the prototype's columns,
default visibility, widths, views, filters, search and preview.

| File | What |
|---|---|
| `apps/web/src/data/schemas/index.ts` | replace the placeholder `customerSchema` (`z.looseObject`) with a full `z.object` matching the seed (see the reference's seed customer): include `shipTo` (`{ id, label, address, isDefault }[]`), `contacts` (use the existing `contactLinkSchema`), `notes` (`{ id, at, by, text }[]`), and every scalar field. Fields that some seed rows lack must be `.optional()`. `apps/web/src/data/schemas/seed.test.ts` must still pass (it parses every seed customer). |
| `apps/web/src/domain/customer.ts` + `customer.test.ts` | pure helpers the dataset needs (e.g. status, location text), with tests |
| `apps/web/src/features/sales/customers/dataset.ts` | `customerDataset({ customers, employees })` → `Dataset<Customer>` |
| `apps/web/src/features/sales/customers/CustomersPage.tsx` | the page on `ListPage` |
| `apps/web/src/routes/sales/customers/index.tsx` | route with `validateSearch: z.object({ sel: z.string().optional() })` |
| `apps/web/src/routes/sales/customers/$no.tsx` | placeholder: `<PlaceholderPage title={`Customer ${no}`} kind="pending" />` |
| `apps/web/e2e/customers.spec.ts` | Playwright tests (see Acceptance) |
| `docs/customer-page/README.md` | append `## React app — Customers list (2026-11-17)` (files, URL, rules, decisions, tests) |
| `docs/superpowers/plans/2026-11-15-react-frontend-migration.md` | page-status table: add "Sales ▸ Customers (list)" = ported (profile pending) |

## Rules
- Use `ListPage`; never copy it. Same conventions as the Vendors page.
- **Phone is personal data:** grid and CSV show `maskPhone(phone)` from
  `@/lib/privacy`; the preview shows the full phone; quick search may match it.
- `recordPath` = `/sales/customers/${c.no}`, `openLabel` = `'Open full profile'`,
  `create` = `{ label: 'New customer', … }` → `/sales/customers/new`.
- **Delete:** a customer can't be deleted when it has `openOrders > 0` or a
  non-zero `balance` — `blockedReason`: `'This customer has open orders or a balance — put it on hold instead'`. Record this decision in the doc (prototype allowed it).
- `salesRep` holds an employee id — show the employee's name (from
  `useList('employees')`), `—` when none.
- Money via `money()`, counts via `int()` from `@/lib/format`; status is a pill.
- Preview content mirrors the prototype `custSel`: header (no, status, name,
  location subtitle), stats (Balance, Credit limit, Overdue — red `tone` when
  > 0), a CONTACT section (Contact, Phone full, Email) via `sections`, the
  DETAILS facts exactly as in `custSel.facts`, then the customer's notes thread
  via `children` exactly like VendorsPage does (entityType `'customer'`).
- Data only through `useList(...)` from `@/data/queries`. No seed imports, no
  localStorage. TypeScript strict, no `any`. Tailwind tokens only.

## Out of scope
The drawer's Edit mode, the customer profile page, sales prices, orders.

## Acceptance
- `pnpm typecheck`, `pnpm lint`, `pnpm test` pass (incl. `seed.test.ts`).
- `e2e/customers.spec.ts` covers: the full count (`Showing 1–16 of 16 customers`);
  masked phone in the grid vs full phone in the preview for CUS00001
  (`•••• 1562` / `+91 94420 11562`); one view from `customerDefaultViews`
  filtering rows (assert the seed-based count); delete disabled for CUS00001
  (balance) and delete + Undo for a customer with no open orders and zero
  balance (find one in `apps/web/src/data/seed/seed-data.js` → `customersRaw`;
  if none exists, assert only the disabled case and say so); double-click opens
  `/sales/customers/CUS0000x`; the preview shows its NOTES thread.

## When you finish
Print a short summary: files changed, anything you could not do or verify,
open questions. Do not commit.
