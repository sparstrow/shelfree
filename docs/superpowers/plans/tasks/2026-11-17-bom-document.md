# Task brief — Production ▸ Bill of materials document

Branch `feat/bom-document`. Two other runs work in parallel (Assembly order document, Item profile),
so stay inside the files listed here.

## Read first
1. `CLAUDE.md` — "Page templates", "Edit in place", "Quiet pages", "Keyboard shortcuts".
2. The document reference to copy exactly: `apps/web/src/features/purchasing/purchase-orders/`
   (`PurchaseOrderEditor.tsx`, `PurchaseOrderLines.tsx`, `draft-stash.ts`),
   `apps/web/src/routes/purchasing/purchase-orders/$no.tsx`, `apps/web/e2e/purchase-orders.spec.ts`
   (document tests), `apps/web/src/domain/purchase-order-editing.ts`.
3. Templates: `components/document/DocumentPage.tsx`, `DocumentCard`, `TotalsCard`, `parts.tsx`,
   `components/document/LineGrid.tsx`.
4. Production code already ported: `apps/web/src/domain/production.ts` (+ test),
   `features/production/boms/`, `data/schemas/index.ts` (`bomSchema`, `bomLineSchema`,
   `bomOperationSchema`, `BOM_STATUSES`), `routes/production/bills-of-materials/`.
5. `docs/superpowers/plans/tasks/2026-11-17-bom-document.reference.md` — prototype markup of the BOM
   document, `prodVM` (look for `bomEd`), and every `bom*` editing helper.
6. `docs/production/README.md`.

## Build
`/production/bills-of-materials/<no>` and `/production/bills-of-materials/new`.

| File | What |
|---|---|
| `apps/web/src/domain/bom-document.ts` + `.test.ts` | the editing rules: blank BOM, next number, set field, add / remove / move / set line, sub-assembly toggle, cycle check (`bomCycle`), validate (prototype messages), save draft / activate / archive status rules, apply cost. Reuse `production.ts` helpers (`bomRollup`, `bomReqQty`, …) — don't duplicate them, and don't edit `production.ts` |
| `apps/web/src/features/production/boms/BomEditor.tsx` (+ `BomLines.tsx`) | the document on `DocumentPage` + `LineGrid` |
| `apps/web/src/routes/production/bills-of-materials/$no.tsx` | render the editor (replace the placeholder) |
| `apps/web/e2e/bom-document.spec.ts` | tests |

## Rules
- Same header fields, line columns, operations section (if the prototype has one), totals / cost
  roll-up, footer buttons and their enabled states as the prototype.
- Activating a BOM archives the item's previously active BOM only if the prototype does so —
  follow `bomActivate` exactly, and write that rule in the doc.
- A BOM can't include its own parent item, directly or through a sub-assembly (`bomCycle`).
- Unsaved new documents survive navigating away like the PO editor (`draft-stash.ts` pattern) only if
  you can reuse it without changing it; otherwise skip it and say so.
- Saving goes through `useUpsert('boms')`. Costs shown come from items; the page never changes
  item costs except through the prototype's explicit "apply cost" action, if it has one.
- Shortcuts as the prototype (and Ctrl+S / Esc like the PO editor); list them in the doc.

## Acceptance
typecheck / lint / test pass; `e2e/bom-document.spec.ts` covers: open BOM00001 by double-click
from the list; the cost roll-up shows a seed-based total; create a new BOM (validation error first,
then add two lines and save as draft — it appears in the list); edit a line quantity and see the
roll-up change; activate a draft; a cycle (adding the parent item as a component) is refused.

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
