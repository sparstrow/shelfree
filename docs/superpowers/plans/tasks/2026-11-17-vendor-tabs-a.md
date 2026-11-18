# Task brief — Vendor profile: Address & payment, Payables & blocking, Notes & activity, Documents tabs

Branch `feat/vendor-tabs-a`. Three other runs work in parallel on other tabs/pages, so stay inside
the files listed here.

## Read first
1. `CLAUDE.md` — "Page templates", "Edit in place", "Quiet pages", "Contacts".
2. The finished template + first tab — copy their shape exactly:
   `apps/web/src/components/record-page/RecordPage.tsx` (`RecordCard`, `RecordTabPending`),
   `apps/web/src/components/record-fields/FieldRows.tsx` + `model.ts`,
   `apps/web/src/features/purchasing/vendors/VendorProfilePage.tsx`, `VendorOverview.tsx`,
   `apps/web/src/domain/vendor.ts` + test, `apps/web/e2e/vendor-profile.spec.ts`.
3. `apps/web/src/components/notes/` (NotesBlock) and how `VendorsPage.tsx` uses it.
4. `docs/superpowers/plans/tasks/2026-11-17-vendor-tabs-a.reference.md` — prototype markup for
   these four tabs and `vendorPageVM` (look for the rows/values used by `isDetails`,
   `isPayables`, `isNotes`, `isDocs`), plus `vendSetBlocked`, `vendEditSave`, `ipRowFactory`.
5. `docs/vendor-page/README.md`.

## Build
| File | What |
|---|---|
| `apps/web/src/features/purchasing/vendors/tabs/VendorDetailsTab.tsx` | Address & payment: every row the prototype shows, editable in place through `FieldRows` and the template's edit state (same draft as Overview — extend `VendorDraft`/`toDraft`/`validate`/`save` in `domain/vendor.ts` for the new fields) |
| `.../tabs/VendorPayablesTab.tsx` | Payables & blocking: the prototype's figures and the block / unblock control (`vendSetBlocked` — blocked values and their meaning exactly as the prototype; saves through `useUpsert('vendors')`, toast with undo if the prototype has one) |
| `.../tabs/VendorNotesTab.tsx` | Notes & activity: full `NotesBlock` (entityType `'vendor'`) + the activity list the prototype shows |
| `.../tabs/VendorDocsTab.tsx` | Documents: the prototype's view. If the prototype only shows an empty / placeholder state, port exactly that (no file upload — no backend yet) |
| `apps/web/src/domain/vendor.ts` + `vendor.test.ts` | ONLY add: new draft fields, validation, payables figures, blocking helpers — with tests |
| `apps/web/src/features/purchasing/vendors/VendorProfilePage.tsx` | ONLY add the four `case` branches that render these tabs (other runs add other cases) |
| `apps/web/e2e/vendor-tabs-a.spec.ts` | tests |

## Rules
- Edit in place: the Address & payment rows sit at the same position in view and edit;
  read-only rows stay as text; no edit-only rows. Split combined values into the rows the
  editor uses (Address line 1/2, City, State, PIN) as CLAUDE.md says.
- Payables figures come from `useList('purchaseOrders')` / `useList('purchaseReceipts')`
  (no vendor bills exist yet — if the prototype shows bill/payment figures that have no data,
  show them as the prototype does for zero/empty and list it under open questions).
- Every new shortcut listed in `docs/vendor-page/README.md`'s shortcuts table.

## Acceptance
typecheck / lint / test pass; `e2e/vendor-tabs-a.spec.ts` covers: each tab opens by click and by
its number key; Address & payment edit in place (same row y in both modes), a validation error,
a saved change persisting after reload; block then unblock a vendor; add a note on Notes & activity.

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
