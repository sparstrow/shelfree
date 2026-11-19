# Task brief — grid filter side panel

Worktree `D:/Sparstrow/shelfree-filter`, branch `feat/grid-filter-panel` (based on
`feat/grid-columns-grouping`). Another run works in parallel on the grid's **multi-row actions** (bulk bar,
row right-click menu, bulk edit dialog, `domain/bulk-actions.ts`, Purchase Orders / Items / Customers /
Vendors pages); stay out of those. In `DataGrid.tsx` touch only the toolbar Filter button, the layout next
to the grid (where the panel sits) and filter state.

## Read first
1. `CLAUDE.md` — "Page templates", "Interaction / hover states", "Keyboard shortcuts", "Quiet pages".
2. `apps/web/src/components/data-grid/DataGrid.tsx` (filters state, `changeFilters`, toolbar, how the
   preview drawer sits beside the grid), `model.ts` (`FilterColumn`, `GridFilter`, `OPS_BY_KIND`,
   `opLabel`, `defaultFilter`), `FilterChips.tsx` (the chip editor — reuse its value editors instead of
   writing new ones; move shared pieces into a small file if needed), `shortcut-meta.ts`,
   `src/app/shortcuts.ts`.
3. `docs/superpowers/plans/tasks/2026-11-18-grid-filter-panel.reference.md` — prototype toolbar Filter
   button, the panel markup, the filter methods (`filterCols`, `addFilter`, `toggleFMulti`, `removeFilter`,
   `clearFilters` …), `handleEsc` and the renderVals filter lines.

## Build (template work in `components/data-grid/` — every list page gets it, no page edits)
Exactly as the prototype:
- Toolbar **Filter** button (with the active-filter count) toggles a 320 px **Filters side panel** beside
  the grid (it closes the Columns / Views popovers like the prototype; the preview drawer and the panel must
  not overlap — follow the prototype's rule for which wins).
- Panel: header (icon, "Filters", the panel label / count), a column search box (no-match text as the
  prototype), one collapsible section per filterable column (`fOpen`: columns with an active filter are
  open when the panel opens), the value editor per kind (enum multi-select checkboxes, with counts if the
  prototype shows them; text; number / money range; date range), per-section Clear, footer Clear all + Done.
- Changes apply live to the grid and the chips row (one source of truth: the grid's `filters`); the saved
  views dirty marker keeps working; switching views resets filters as today.
- Keyboard: the prototype's panel key if it has one, Esc closes the panel (follow the `handleEsc` order),
  Tab moves through sections, Enter / Space toggles a section, focus returns to the Filter button on close.
  Responsive: where 320 px beside the grid doesn't fit, the panel opens as a right-side `Sheet`.
- Pure logic (which sections start open, column search match, enum value counts over the current rows) in
  `components/data-grid/model.ts` or `src/domain/grid-filters.ts` with Vitest tests.
- Every new key in `components/data-grid/shortcut-meta.ts`.

## Rules
- Optional and backward compatible; no list page edits. A page can switch the panel off with an optional
  dataset flag (e.g. `filterPanel: false`) if it needs to.
- shadcn primitives from `src/components/ui/` (`Collapsible`, `Checkbox`, `Sheet`, `Input` …). You can't
  run the shadcn CLI: if one you need is missing, say so in your summary and build with what exists.
- Hover / focus / motion states; no inline styles except measured sizes.
- Performance: thousands of rows — enum counts memoized.

## Docs & tests
- `docs/erp-app/README.md` grid section: `### Grid: filter side panel (2026-11-18)`; migration plan
  "Known gaps": strike "filter side panel".
- Add `e2e/grid-filter-panel.spec.ts`: open the panel from the toolbar (count badge), search columns,
  pick two enum values (grid + chips update), set a number range, clear one section, Clear all, Esc
  closes and focus returns to the button, a saved view shows dirty after a panel change.
- Delete the `.reference.md` file when done.


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
