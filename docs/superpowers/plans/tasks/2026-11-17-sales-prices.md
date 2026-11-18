# Task brief — Sales ▸ Sales Prices, and Customer profile Prices + Contacts tabs

Branch `feat/sales-prices`. Other runs work in parallel, so stay inside the files listed here.

## Read first
1. `CLAUDE.md` — "Page templates", "Contacts", "Quiet pages".
2. The closest finished page to copy: `apps/web/src/features/purchasing/purchase-prices/`
   (`PurchasePricesPage.tsx`, `dataset.ts`), `domain/purchase-prices.ts` (+ test),
   `routes/purchasing/purchase-prices/index.tsx`, `e2e/purchase-prices.spec.ts` — including the
   DataGrid `column.edit` in-grid editing option. Also `components/list-page/ListPage.tsx`.
3. Customer profile: `features/sales/customers/CustomerProfilePage.tsx` + `customer-tabs/`,
   `domain/customer.ts`; the vendor Contacts tab to copy for customers:
   `features/purchasing/vendors/tabs/VendorContactsTab.tsx`, `components/lookup/ContactPicker.tsx`,
   `domain/contacts.ts`.
4. `data/schemas/index.ts`, `data/api/index.ts`, `data/schemas/seed.test.ts`, and in
   `data/seed/seed-data.js` `seedCustomerPrices`.
5. `docs/superpowers/plans/tasks/2026-11-17-sales-prices.reference.md` — prototype Sales Prices
   page markup + `sp*` (grid) + `cp*` (customer pricing rules: mode, fallback, eligibility,
   resolve, list price, rows) + the whole customer page markup (its Prices and Contacts tabs) +
   `customerPageVM` + `custContact*`.
6. `docs/sales-pricing/README.md`, `docs/customer-page/README.md`.

## Build
| File | What |
|---|---|
| `apps/web/src/data/schemas/index.ts` + `data/api/index.ts` | `customerPriceSchema` matching `seedCustomerPrices` exactly + collection `customerPrices`; `seed.test.ts` passes |
| `apps/web/src/domain/sales-prices.ts` + `.test.ts` | `cp*` rules: resolve a customer's price for item + qty + date (agreed price → fallback per the prototype), row state (active / scheduled / expired), eligibility, list-price set, validation |
| `apps/web/src/features/sales/sales-prices/SalesPricesPage.tsx` + `dataset.ts` | `/sales/sales-prices` on `ListPage` (editor and/or in-grid editing exactly as the prototype) |
| `apps/web/src/routes/sales/sales-prices/index.tsx` | route (`sel`, plus `customer` filter param if the prototype links there) |
| `apps/web/src/features/sales/customers/customer-tabs/CustomerPricesTab.tsx` | the profile's Prices tab (replace its pending state) |
| `apps/web/src/features/sales/customers/customer-tabs/CustomerContactsTab.tsx` | the profile's Contacts tab, same behaviour as `VendorContactsTab` (link via `ContactPicker`, primary, unlink ≠ delete, shared-edit warning) — reuse `domain/contacts.ts` helpers |
| `apps/web/src/features/sales/customers/CustomerProfilePage.tsx` | ONLY wire those two tabs |
| `apps/web/src/domain/customer.ts` | ONLY if the order totals rule needs the agreed price now: switch "item price" to the resolved customer price, with a test |
| `apps/web/e2e/sales-prices.spec.ts`, `apps/web/e2e/customer-prices-contacts.spec.ts` | tests |

## Acceptance
Sales Prices: seeded count; a view filters rows; create a price (validation error first); edit a
price in place; status of a scheduled / expired row. Customer profile: Prices tab lists that
customer's agreed prices and its action opens Sales Prices filtered / pre-filled; Contacts tab:
link a contact, set primary, unlink. Docs: `docs/sales-pricing/README.md` and
`docs/customer-page/README.md` React sections; status table.

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
