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

## Known gaps in what is done (fix next)

- Parity nits found in the side-by-side check, not yet fixed: grid header should
  be 34 px and show the default `No. ↑` sort + pin icon; views button icon is a
  bookmark; Notes (single-page module) has no chevron; "Receive" icon.
- Totals row: prototype shows it only when `showTotals` is on — confirm default.
- Grid features still to port: user-saved views, filter side panel, column
  reorder / resize / pin menu, grouping, find-in-view, footer aggregate chooser,
  bulk edit / bulk delete, in-cell editing.
- Sidebar: favourite views, drag-reorder / rename favourites, sidebar right-click menu.
- Theme switch in the account menu is temporary until My settings ▸ Appearance is ported.
- Keyboard shortcuts page not ported yet — the grid shortcuts above must be listed there.
- `docs/purchase-orders/README.md` not yet updated with the React file map.
- No Playwright tests yet (`scripts/shots.mjs` takes side-by-side screenshots).

## Next, in order

1. Fix the parity nits above.
2. Purchase order document editor (`/purchasing/purchase-orders/$no`, incl. `new`).
3. Purchase Receipts (list + document), Purchase Lines.
4. Vendors (list, drawer, profile page — in-place editing, contacts links, notes block).
5. Purchase Prices, Charges, Carriers (reference-dataset registry + drawer).
6. Then: Production → Warehouse/Items → Sales → Finance (CoA) → People → Notes →
   Settings / My settings / Keyboard shortcuts / Departments.

## Page status

| Page | Status |
|---|---|
| Purchasing ▸ Purchase Orders (list) | ported (gaps above) |
| Purchasing ▸ Purchase Orders (document) | pending |
| Every other prototype page | pending |
