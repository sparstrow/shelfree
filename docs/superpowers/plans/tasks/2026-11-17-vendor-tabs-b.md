# Task brief — Vendor profile: Items supplied, Purchase orders, Purchase receipts, Performance tabs

Branch `feat/vendor-tabs-b`. Three other runs work in parallel on other tabs/pages, so stay inside
the files listed here.

## Read first
1. `CLAUDE.md` — "Page templates", "Quiet pages".
2. The finished template + first tab — copy their shape exactly:
   `apps/web/src/components/record-page/RecordPage.tsx` (`RecordCard`, `RecordTabPending`),
   `apps/web/src/features/purchasing/vendors/VendorProfilePage.tsx`, `VendorOverview.tsx`,
   `apps/web/src/domain/vendor.ts` + test, `apps/web/e2e/vendor-profile.spec.ts`.
3. `apps/web/src/domain/purchase-order.ts`, `purchase-receipt.ts`, `purchase-prices.ts`, `status.ts`.
4. `docs/superpowers/plans/tasks/2026-11-17-vendor-tabs-b.reference.md` — prototype markup for
   these four tabs and `vendorPageVM` (look for what `isItems`, `isOrders`, `isReceipts`,
   `isPerformance` render), `vendStats`, `vendReceive`, `vendNewPO`.
5. `docs/vendor-page/README.md`.

## Build
| File | What |
|---|---|
| `apps/web/src/features/purchasing/vendors/tabs/VendorItemsTab.tsx` | Items supplied (from purchase prices / PO lines as the prototype does) |
| `.../tabs/VendorOrdersTab.tsx` | Purchase orders: the prototype's list; each row opens `/purchasing/purchase-orders/<no>` |
| `.../tabs/VendorReceiptsTab.tsx` | Purchase receipts: the prototype's list; rows open `/purchasing/purchase-receipts/<no>` |
| `.../tabs/VendorPerformanceTab.tsx` | Performance: the prototype's figures (on-time %, lead time, …) |
| `apps/web/src/domain/vendor-activity.ts` + `.test.ts` | pure helpers for these four tabs (filtering by vendor, sorting, figures) |
| `apps/web/src/features/purchasing/vendors/VendorProfilePage.tsx` | ONLY add the four `case` branches and the tab `badge` counts the prototype shows (other runs add other cases) |
| `apps/web/e2e/vendor-tabs-b.spec.ts` | tests |

## Rules
- These tabs are read-only lists. Keyboard: rows are focusable buttons/links, Enter opens,
  hover feedback like the grid rows.
- Don't change `domain/vendor.ts` (another run edits it) — put your helpers in `vendor-activity.ts`.
- Each list has an empty state with the prototype's copy.
- Figures with `tabular-nums`, money through `money()`, dates through `fmtDate()`.

## Acceptance
typecheck / lint / test pass; `e2e/vendor-tabs-b.spec.ts` covers: each tab opens by click and number
key and shows seed-based rows/counts for V00001; a PO row opens the PO page; a receipt row opens the
receipt page; a vendor with no orders shows the empty state.

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
