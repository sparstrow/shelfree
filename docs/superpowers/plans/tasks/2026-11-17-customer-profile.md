# Task brief — Customer profile page on the Record page template

Branch `feat/customer-profile`. Three other runs work in parallel, so stay inside the files listed here.

## Read first
1. `CLAUDE.md` — "Page templates", "Edit in place", "Quiet pages", "Contacts".
2. The template and its first user — copy their shape exactly:
   `apps/web/src/components/record-page/RecordPage.tsx`, `components/record-fields/FieldRows.tsx`,
   `apps/web/src/features/purchasing/vendors/VendorProfilePage.tsx`, `VendorOverview.tsx`,
   `apps/web/src/routes/purchasing/vendors/$no.tsx`, `apps/web/e2e/vendor-profile.spec.ts`.
3. `apps/web/src/features/sales/customers/` (the list), `apps/web/src/domain/customer.ts`,
   `apps/web/src/data/schemas/index.ts` (`customerSchema`), `apps/web/src/data/api/index.ts`,
   `apps/web/src/data/schemas/seed.test.ts`, and in `apps/web/src/data/seed/seed-data.js`
   `seedOrders` and `seedInvoices`.
4. `docs/superpowers/plans/tasks/2026-11-17-customer-profile.reference.md` — prototype markup of the
   whole customer page and `customerPageVM` + its `cust*` helpers.
5. `docs/customer-page/README.md` (or the closest customer doc in `docs/`).

## Build
`/sales/customers/<no>` with the prototype's tabs, in its order.

| File | What |
|---|---|
| `apps/web/src/data/schemas/index.ts` | `salesOrderSchema`, `salesInvoiceSchema` matching `seedOrders` / `seedInvoices` exactly (statuses as exported enum constants) |
| `apps/web/src/data/api/index.ts` | collections `salesOrders`, `salesInvoices` (read for this page only; the Sales lists come later); `seed.test.ts` must pass |
| `apps/web/src/domain/customer.ts` + test | ONLY add: draft/validate/normalize/save rules, KPIs, aging buckets, document rows, ship-to rules, credit hold — with tests |
| `apps/web/src/features/sales/customers/CustomerProfilePage.tsx` + `customer-tabs/*.tsx` | the page and one file per built tab |
| `apps/web/src/routes/sales/customers/$no.tsx` | render the profile (keep `/new` as it is); `validateSearch` with `tab` |
| `apps/web/e2e/customer-profile.spec.ts` | tests; update `e2e/customers.spec.ts` only if its double-click test checks the old placeholder |

## Tabs
- Build: Overview, Details (edit in place), Orders (orders + invoices list, rows not linked yet —
  the sales pages don't exist; show them as plain rows), Statement / aging, Shipping (ship-to
  addresses: add / edit / delete / set default as the prototype), Notes (NotesBlock, entityType
  `'customer'`), Documents (the prototype's view, no upload), Credit (credit hold toggle, limit).
- Pending (`RecordTabPending`): Prices (sales prices come later) and Contacts (another run builds
  the contact picker).

## Rules
- Header: name (editable in place via `titleField`), number, status, credit-hold tag.
- Order totals: use the prototype's rule (agreed price if any, else item price) — the agreed
  prices aren't in React yet, so use the item price and note it in the doc as a deferred rule.
- Phone / email full on this page (it's the record itself), masked nowhere else new.

## Acceptance
typecheck / lint / test pass; `e2e/customer-profile.spec.ts` covers: double-click in the
Customers list opens the profile; tabs by click and number keys; Details edit in place with a
validation error then a saved change persisting after reload; add then delete a ship-to address;
toggle credit hold (header tag appears); aging shows a seed-based overdue amount; Esc returns to
the list with the row selected.

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
