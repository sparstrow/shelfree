# Task brief — Production ▸ Assembly order document (with Finish)

Branch `feat/assembly-order-document`. Two other runs work in parallel (BOM document, Item
profile), so stay inside the files listed here.

## Read first
1. `CLAUDE.md` — "Page templates", "Edit in place", "Quiet pages", "Keyboard shortcuts".
2. The document references to copy exactly: `apps/web/src/features/purchasing/purchase-orders/`
   and `features/purchasing/purchase-receipts/PurchaseReceiptEditor.tsx`, their `$no.tsx` routes,
   `apps/web/e2e/purchase-receipts.spec.ts`.
3. Templates: `components/document/DocumentPage.tsx`, `DocumentCard`, `TotalsCard`, `parts.tsx`,
   `LineGrid.tsx`.
4. **Stock command to copy:** `apps/web/src/data/api/commands.ts` (`postPurchaseReceipt`) and its
   query hook in `src/data/queries/` — multi-record changes live there, never in a page.
5. Production code already ported: `domain/production.ts` (+ test), `features/production/assembly-orders/`,
   `data/schemas/index.ts` (`assemblyOrderSchema`, `AO_STATUSES`), `routes/production/assembly-orders/`.
6. `docs/superpowers/plans/tasks/2026-11-17-assembly-order-document.reference.md` — prototype markup,
   `prodVM` (look for `aoEd` and the finish dialog), every `ao*` helper.
7. `docs/production/README.md`.

## Build
`/production/assembly-orders/<no>` and `/production/assembly-orders/new`.

| File | What |
|---|---|
| `apps/web/src/domain/assembly-order.ts` + `.test.ts` | editing + status rules: blank order, next number, set item (explode the active BOM into lines — `aoExplode` / `aoApplyItem`), set quantity (rescale lines), validate, save draft / release / start / cancel / reopen transitions exactly as the prototype, and the pure finish calculation (`aoFinish`: consumed component quantities per site, output quantity, partial finish, resulting status). Reuse `production.ts` helpers; don't edit `production.ts` |
| `apps/web/src/data/api/commands.ts` | ADD `finishAssemblyOrder(no, input)` next to `postPurchaseReceipt`: validates with the domain rule, takes components out of `item.locs[siteId]`, adds output to the finished item at the order's site, updates the order (finished qty / status). One function, all-or-nothing (validate everything before writing anything). Don't change `postPurchaseReceipt` |
| `apps/web/src/data/queries/…` | ADD a `useFinishAssemblyOrder` hook like the receipt one (invalidate items + assemblyOrders) |
| `apps/web/src/features/production/assembly-orders/AssemblyOrderEditor.tsx` (+ `FinishDialog.tsx`) | the document + the finish dialog (shadcn Dialog) |
| `apps/web/src/routes/production/assembly-orders/$no.tsx` | render the editor (replace the placeholder) |
| `apps/web/e2e/assembly-order-document.spec.ts` | tests |

## Rules
- Header fields, line columns (required / available / shortage per site), footer buttons and their
  enabled states per status exactly as the prototype; status pill with icon + text.
- Finish is refused while components are short at the order's site, unless the prototype allows it
  — port its exact rule and message.
- A finished or cancelled order is read-only; Reopen only where the prototype offers it.
- Stock changes happen ONLY in `finishAssemblyOrder`. Costing / WIP postings are out of scope
  (finance-for-production is a later stage) — note it in the doc as deferred.
- Add a `CLAUDE.md`-style audit note in the doc: finishing must emit an event server-side.

## Acceptance
typecheck / lint / test pass (domain tests cover the finish maths: full, partial, shortage
refused); `e2e/assembly-order-document.spec.ts` covers: open an order from the list; create one
by picking an item (lines come from its active BOM) and changing quantity (lines rescale);
release it; finish it where stock allows and see the item's on-hand change on the Items list;
finish blocked on an order with a shortage (pick one from the seed).

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
