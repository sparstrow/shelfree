# Plan / status — React frontend migration

Spec: `../specs/2026-11-15-react-frontend-migration.md`. **Update this file in the
same turn a page is ported.**

## Done (2026-11-15, branch `feat/react-frontend`)

- Repo layout: `apps/web` (React), `prototype/` (frozen), pnpm workspace.
- Stack installed: Vite 8, React 19, TypeScript 7 strict, Tailwind v4, shadcn/ui
  (Radix, "nova" preset), TanStack Router + Query + Virtual, React Hook Form, zod,
  Zustand, Vitest, Playwright, oxlint (the Vite template's linter, used instead of Biome).
- Theme tokens carried over 1:1 (`src/styles/tokens.css`), dark default + light.
- Data seam: `data/schemas` (zod) → `data/store` (localStorage `shelfree.v2.*`)
  → `data/api` → `data/queries`. Seed data copied unchanged and proven against
  the schemas by `data/schemas/seed.test.ts`.
- Domain rules + tests: numbering, purchase-order totals / lock / overdue /
  receipt progress, notes, status tones.
- App shell: sidebar (accordion, collapse to rail + flyout, badges, page
  favourites, account menu with demo role + theme switch), workspace tabs,
  top bar (breadcrumb, count, page search with recents, New button).
- Every module page has a URL; unported pages show a placeholder.
- Shared data grid (`components/data-grid`): views, filter chips (text / enum /
  number conditions), quick search, single + multi sort, column show/hide,
  density, selection + copy/export bar, frozen first column, totals row, paging,
  CSV export, row right-click menu, keyboard (↑ ↓ Enter Space Esc, `/`, Alt+←/→).
- **Purchasing ▸ Purchase Orders list** + preview drawer + delete (drafts only, with undo).

## Done (2026-11-16, same branch, PR #1)

- Parity fixes on the list (header, sort/pin indicators, totals off by default, landing page).
- **Purchase order document** — full editor incl. price-list pricing, GST rules, lock/reopen.
- **Purchase Receipts** — list, order picker, goods-in document, posting command
  (stock + PO status). Posted receipts can't be deleted (decision, see its doc).
- **Purchase Lines** report.
- Data: purchase prices (seeded from orders), workspace settings document, GST reference data.
- Shared parts: record drawer, document header/fields, confirm dialog, notes thread.
- Tests: 41 unit, 14 Playwright browser tests (`pnpm test`, `pnpm test:e2e`).

## Known gaps in what is done (fix next)

- Grid features still to port: ~~filter side panel~~, bulk edit / bulk delete. (Ported:
  in-cell editing; user-saved views and sidebar favourites — views, rename, drag
  reorder, right-click menu — 2026-11-18; column menu (sort / pin / move / hide /
  group / autofit / reset), resize, drag reorder, pinned left + right, group by,
  find in view (Ctrl/Cmd+F), footer aggregate picker — 2026-11-18, all in the shared
  `DataGrid`; a saved view now stores and applies that layout; 320 px **Filters side
  panel** with column search, collapsible sections, memoized enum counts, range/date
  editors, and responsive Sheet fallback — 2026-11-18. The favourites cap,
  the "Favorites" label and the Settings ▸ Favorites & views page wait for the
  Settings redesign.)
- Grid parity notes: find opens with Ctrl/Cmd+F only (the prototype also used `/`; here `/`
  already focuses the grid search box). The footer totals row is still off by default; it
  is switched on from Columns ▸ Totals row (remembered per dataset) or a page's
  `showTotals`. Group-by is in the URL (`?group=<column key>`) but, like the other grid
  state, filters / sorts are not yet.
- Theme switch in the account menu is temporary until My settings ▸ Appearance is ported.
- Keyboard shortcuts page ported (`/settings/shortcuts`); a new page adds its keys to `src/app/shortcuts.ts` in the same turn.
- Grid bulk actions (bulk edit, multi-row issue/cancel/close/duplicate/delete) not ported.
- `scripts/shots.mjs` takes side-by-side screenshots against the prototype.

## Next, in order

1. Vendors (list, drawer, profile page — in-place editing, contacts links, notes block).
2. Purchase Prices, Charges, Carriers (reference-dataset registry + drawer).
3. Then: Production → Warehouse/Items → Sales → Finance (CoA) → People → Notes →
   Settings / My settings / Keyboard shortcuts / Departments.

## Page status

| Page | Status |
|---|---|
| Purchasing ▸ Purchase Orders (list + document) | ported |
| Purchasing ▸ Purchase Receipts (list + document) | ported |
| Purchasing ▸ Purchase Lines | ported |
| Purchasing ▸ Vendors (list) | ported |
| Purchasing ▸ Vendor profile | ported — all 10 tabs on the Record page template |
| Sales ▸ Customers (list) | ported |
| Sales ▸ Customer profile | all 10 tabs ported on the Record page template (Overview, Billing & address, Sales prices, Order history, Statement & aging, Shipping addresses, Notes & activity, Documents, Contacts, Credit & risk) |
| Sales ▸ Sales Prices | ported (List prices + Customer prices on ListPage with editor & in-grid cell editing + Price check) |
| Purchasing ▸ Charges | ported |
| Finance ▸ Chart of Accounts | ported |
| People ▸ Contacts | ported |
| People ▸ Users | ported (in-place drawer with module permissions matrix, bulk actions, protected delete) |
| People ▸ Employees | ported (in-place drawer, masked grid & export PII, bulk actions, reference-safe delete) |
| Warehouse ▸ Items (list + item profile + item card) | ported |
| Warehouse ▸ Units of Measure (item units) | ported (`/warehouse/units-of-measure` on `ListPage`, backed by `shelfree.v2.itemUnits`, shared with Item profile ▸ Units of measure) |
| Production ▸ Bills of Materials (list + document) | ported |
| Production ▸ Assembly Orders (list + document) | ported (full/partial Finish command, shortage guard, FinishDialog) |
| Production ▸ Production Orders | ported (`/production/production-orders` renders shared `AssemblyOrdersPage`) |
| Purchasing ▸ Carriers | ported (contact picker shared) |
| Purchasing ▸ Purchase Prices | ported (list on the editor template + in-grid cell editing + "Items with no vendor price" tab) |
| Purchasing ▸ Vendor Purchase Items | ported (`/purchasing/vendors/$no/items`, linked from Vendor profile ▸ Items supplied) |
| Notes ▸ Notes | ported (`/notes` and `/notes/notes` on the List template) |
| Departments | ported (`/departments`, directory from `app/nav.ts` with keyboard navigation and recents) |
| Settings ▸ frame, quiet help, Keyboard shortcuts | ported — Settings template (`components/settings/`), shared help (`components/help/`), catalogue `src/app/shortcuts.ts` |
| Settings ▸ Business profile | ported (first user of `SettingsSection`) |
| Settings ▸ Units of measure | ported (custom units collection, rules in `domain/units-of-measure.ts`) |
| Settings ▸ every other section | frame + navigation live; body shows "not moved yet" until ported (add one line to `features/settings/sections.ts`) |
| Every other prototype page | pending |
