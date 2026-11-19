# Task brief — grid: column menu (pin, hide, autofit), resize, reorder, group by, find in view, footer totals

Worktree `D:/Sparstrow/shelfree-grid`, branch `feat/grid-columns-grouping` (based on
`feat/saved-views-favorites`, which adds saved views — build on it). Another run works in parallel on
`features/warehouse/` and `domain/units-of-measure.ts` / `domain/item-profile.ts`; stay out of those.

## Read first
1. `CLAUDE.md` — "Page templates", "Interaction / hover states", "Keyboard shortcuts", "Quiet pages".
2. `apps/web/src/components/data-grid/` (`DataGrid.tsx`, `model.ts`, `shortcut-meta.ts`, `FilterChips.tsx`),
   `components/saved-views/` (what a saved view stores — it already has fields for groupBy, collapsed,
   column widths and frozen state that the grid doesn't use yet), `components/list-page/ListPage.tsx`,
   `src/app/shortcuts.ts`.
3. `docs/superpowers/plans/tasks/2026-11-18-grid-columns-grouping.reference.md` — prototype grid
   markup, the methods, the renderVals grid section and the prototype's grid shortcut lines.
4. `docs/superpowers/plans/2026-11-15-react-frontend-migration.md` "Known gaps".

## Build (template work in `components/data-grid/` — every list page gets it, no page edits)
Exactly as the prototype:
- **Column header menu** (click the menu button or right-click a header): sort asc / desc, pin left /
  pin right / unpin, hide, group by this column / ungroup, autofit, autofit all, reset layout.
- **Resize** by dragging the header edge; double-click autofits.
- **Reorder** columns by dragging headers (keyboard alternative: in the column menu, move left / right).
- **Pinned columns** stay sticky left / right with the prototype's divider; the existing frozen first
  column keeps working.
- **Group by** one column: group header rows with label + count, collapse / expand, collapse all;
  group rows are skipped by row keyboard navigation and selection.
- **Find in view** (the prototype's find bar, its key): highlights matching cells, next / previous,
  match count, Esc closes (follow `handleEsc` order).
- **Footer totals**: per-column aggregate picker (sum / avg / count / min / max / none) using each
  column's default `agg`, override remembered per dataset.
- Layout state (widths, order, pins, group, collapsed groups, footer aggregates) is part of the
  grid state: saved into and applied from saved views (fill the fields the saved view already
  carries), dirty marker included; group-by also in the URL with the other shareable state.
- Pure logic (grouping, aggregates, find matching, column order/pin maths, autofit width from text
  lengths) in `components/data-grid/model.ts` or `src/domain/grid-layout.ts` with Vitest tests.
- Every new key and gesture in `components/data-grid/shortcut-meta.ts` (feeds the Keyboard
  shortcuts page).

## Rules
- Options must be backward compatible; no list page changes needed. A page can turn a feature off
  through an OPTIONAL dataset / column flag if it needs to (e.g. `column.groupable === false`).
- shadcn `DropdownMenu` / `ContextMenu` for menus; hover / focus / motion states; no inline styles
  except measured sizes and sticky offsets.
- Performance: grids may hold thousands of rows — grouping and find must stay memoized; keep
  virtualization working if the grid uses it.

## Checks — run them yourself, all must pass before you finish
In `apps/web`: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm exec vite build`,
`E2E_PORT=5192 pnpm exec playwright test` (whole suite). Add `e2e/grid-layout.spec.ts`: pin a column
and scroll (stays visible), hide one and bring it back, resize and autofit, drag-reorder, group by a
column (counts, collapse), find with next/previous and Esc, change a footer aggregate, save a view
with that layout and reload it.

## Docs
`docs/erp-app/README.md` (grid section): `## React app (2026-11-18)` additions; migration plan
"Known gaps" updated. Delete the `.reference.md` file when done. Do NOT commit, push or switch
branches. Finish with a summary: files changed, template options added, anything not done or not
verified, with exact check results.
