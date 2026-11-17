# Task brief — Purchasing ▸ Vendors list page (React app)

You are working in a git worktree of the Shelfree ERP repo, on branch
`feat/vendors-list`. Do NOT commit, push, switch branches or touch anything
outside this worktree. Only edit/create the files listed below.

## Read first (in this order)
1. `CLAUDE.md` — project rules. Especially: "Frontend stack & rules", "Page
   templates", "Tokens & colour", "Content conventions", "Contacts".
2. `apps/web/src/components/list-page/ListPage.tsx` — the List page template you
   MUST use. Do not build a list page any other way.
3. `apps/web/src/features/purchasing/purchase-orders/PurchaseOrdersPage.tsx` and
   `.../purchase-orders/dataset.ts` — the reference example. Copy their shape.
4. `apps/web/src/components/record-drawer/RecordDrawer.tsx` — the preview drawer.
5. `docs/superpowers/plans/tasks/2026-11-17-vendors-list.reference.md` — the
   exact prototype code for this page (columns, values, views, filters, status,
   drawer data and markup), already extracted for you. Use it instead of
   searching the 2 MB prototype file.

## How to work (tool rules — breaking these stops the run)
- Read and search with your built-in file tools (view/read file, list dir,
  grep search). **Do not use shell commands to read or search files.**
- The only shell commands you may run are these, with the working directory
  set to `apps/web` (use the tool's working-directory parameter, never `cd`,
  `&&`, `|` or redirection): `pnpm typecheck`, `pnpm lint`, `pnpm test`,
  `pnpm exec vite build`.
- Do not run Playwright / e2e tests; the reviewer runs them.

## What to build
The Vendors list at URL `/purchasing/vendors`, with the same columns, default
visibility, widths, views, filters, search and preview content as the
prototype.

### Files
| File | What |
|---|---|
| `apps/web/src/domain/vendor.ts` | pure helpers: `vendorStatus(v)` → `'Active' \| 'Blocked'` (blocked = non-empty `blocked`), `vendorSuppliesLabel(v)` (`goods`→`Goods`, `services`→`Services`, `both`→`Goods + services`), `vendorLocation(v)` (`City, State`, or `''`) |
| `apps/web/src/domain/vendor.test.ts` | Vitest tests for those helpers |
| `apps/web/src/lib/privacy.ts` | `maskPhone(phone)` → `'•••• ' + last 4 digits`, `''` when no digits (same as prototype `cntMask`) |
| `apps/web/src/lib/privacy.test.ts` | tests for `maskPhone` |
| `apps/web/src/features/purchasing/vendors/dataset.ts` | `vendorDataset({ vendors, employees })` returning a `Dataset<Vendor>` — mirror `purchase-orders/dataset.ts` |
| `apps/web/src/features/purchasing/vendors/VendorsPage.tsx` | the page, using `ListPage` |
| `apps/web/src/routes/purchasing/vendors/index.tsx` | route with `validateSearch: z.object({ sel: z.string().optional() })` like the purchase-orders index route |
| `apps/web/src/routes/purchasing/vendors/$no.tsx` | the vendor profile route — for now render `<PlaceholderPage title={`Vendor ${no}`} kind="pending" />` (the profile is a later task) |
| `apps/web/e2e/vendors.spec.ts` | Playwright tests (see Acceptance) |
| `docs/vendor-page/README.md` | append a `## React app — Vendors list (2026-11-17)` section (files, URL, rules, decisions, tests) |
| `docs/superpowers/plans/2026-11-15-react-frontend-migration.md` | page-status table: add a row "Purchasing ▸ Vendors (list)" = ported; profile still pending |
| `apps/web/src/components/record-drawer/RecordDrawer.tsx` | ONLY if needed for the two additions below, as backward-compatible optional props |

### Rules (these differ from a naive port — follow them)
- **Use the template options; never copy the template.** If the drawer needs
  something it can't show, add an *optional* prop to `RecordDrawer` (see below)
  rather than writing your own drawer.
- **Phone is personal data** (CLAUDE.md → Contacts): the **grid column and CSV
  export show the masked phone** (`maskPhone`), the **preview drawer shows the
  full phone**. Quick search may still match the full number.
- **Delete:** a vendor that is referenced by any purchase order or purchase
  receipt can't be deleted. Use `useCollectionDelete('vendors', …)` with
  `blockedReason` returning `'This vendor has purchase orders or receipts — block it instead'`
  when referenced, else `null`. `describe` = `V00001 · Kailash Ceramics Works`.
  (Decision: the prototype allowed it; the backend must enforce referential
  integrity, so the UI blocks it too. Record this in the doc.)
- `recordPath` = `/purchasing/vendors/${v.no}`, `openLabel` = `'Open full profile'`.
- `create` = `{ label: 'New vendor', run: … }` → navigate to `/purchasing/vendors/new`
  (the placeholder route handles `new`).
- Column details from the prototype: `category` text is muted; `balanceDue`
  and `outstandingOrders` figures are muted; money via `money()`, `overdue`
  shows `—` when 0; `purchasePerson` shows the employee name (from `employees`)
  or `—`; `gstReg` = the GST type short label (use `vendorGstType` +
  `vendorGstTypeInfo(...).short` from `src/domain/gst.ts`); `status` is a `pill`.
- Filter options: `category` enum = distinct categories of the vendors;
  `purchasePerson` enum = distinct names in use; `gstReg` enum =
  `Regular, Composition, Unregistered, SEZ, Overseas`; `status` enum =
  `Active, Blocked`; `supplies` enum = `Goods, Services, Goods + services`.
  `city`, `state` are filter-only keys (also add them to `raw`/`text`).
- Views exactly as prototype `vendorDefaultViews` (note numeric filter values
  are strings in our model: `{ key: 'overdue', op: '>', value: '0' }`).
- Preview (`ListPreview`), matching the prototype drawer view mode:
  - header: `no`, status pill, title = name, subtitle = `Category · City, State`
  - stats: Balance, Balance due, Overdue (Overdue shows `—`-free money; when
    overdue > 0 it is red → add optional `tone?: 'bad'` to `DrawerStat` in
    RecordDrawer and render `text-bad-fg` for it)
  - a **CONTACT** section with rows Contact / Phone (full) / Email, then the
    **DETAILS** facts exactly as prototype `vendSel.facts` (Supplies adds
    ` · billed without a PO` for services-only vendors; GST registration adds
    ` · <gstin>` when present). For the CONTACT section add an optional
    `sections?: { heading: string; rows: DrawerFact[] }[]` prop to
    `RecordDrawer`, rendered before DETAILS, same styling as the facts.
- Empty text: `No vendors yet. Use New vendor to add the first one.`
- Data comes ONLY through `useList('vendors')`, `useList('employees')`,
  `useList('purchaseOrders')`, `useList('purchaseReceipts')` from
  `@/data/queries`. Never import seed data or touch localStorage.
- Types: `Vendor` from `@/data/schemas`. TypeScript strict, no `any`.
- Styling: Tailwind theme tokens only. No inline colours.

### Out of scope (do not build)
- The drawer's **Edit** mode (`panelEdit`) — editing moves to the vendor
  profile page, a later task.
- The vendor profile page itself, Purchase items, new-PO-for-vendor.

## Acceptance (what will be checked)
- `pnpm --filter web typecheck`, `pnpm --filter web lint`, `pnpm --filter web test`
  pass with no new warnings.
- `apps/web/e2e/vendors.spec.ts` covers, and passes:
  1. `/purchasing/vendors` shows `Showing 1–6 of 6 vendors`.
  2. Phone column shows a masked value (`•••• 0287` for V00001) while the
     preview drawer of V00001 shows `+91 94421 10287`.
  3. The *Overdue balance* view and the *Service providers* view filter rows
     (assert the resulting counts from the seed data).
  4. V00001's Delete is disabled (it has orders); a vendor with no orders or
     receipts can be deleted and restored with Undo (pick one from the seed:
     check `apps/web/src/data/seed/seed-data.js` → `seedPurchaseOrders`,
     `seedPurchaseReceipts`).
  5. Double-click on a row opens `/purchasing/vendors/V0000x`.
- Existing e2e tests still pass (`pnpm --filter web test:e2e`).
- The page looks like the prototype's Vendors page at 1440×900 (same columns,
  order, alignment, pills, drawer sections).

## When you finish
Print a short summary: files created/changed, any template options you added,
anything you could not do or verify (e.g. if you could not run commands), and
any open questions. Do not commit.
