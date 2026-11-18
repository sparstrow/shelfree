# Task brief — user-saved grid views, and sidebar favourites (views, rename, drag reorder, right-click menu)

Worktree `D:/Sparstrow/shelfree-sv`, branch `feat/saved-views-favorites`. Another run works in
parallel on `features/warehouse/units-of-measure` and `routes/production/production-orders`; stay
out of those.

## Read first
1. `CLAUDE.md` — "Page templates", "Quiet pages", "Keyboard shortcuts", "Interaction / hover states",
   data seam rules.
2. `apps/web/src/components/data-grid/` (`DataGrid.tsx`, `model.ts` — `Dataset`, views, URL grid
   state), `components/list-page/ListPage.tsx`, `app/shell/Sidebar.tsx`, the `useUi` store
   (favourites today), `src/app/shortcuts.ts` + each `shortcut-meta.ts`.
3. `docs/superpowers/plans/tasks/2026-11-18-saved-views-favorites.reference.md` — prototype markup
   of the sidebar Favorites section, the sidebar right-click menu and the list Views menu, every
   `view*` / `fav*` method, `openNavCtx`, `handleEsc`, and the renderVals lines.
4. `docs/favorites-views/README.md`, `docs/erp-app/README.md` (sidebar).

## Build (template work — every list page gets it, no page-level code)
- **Saved views** in the grid's Views menu exactly as the prototype: save current state as a new
  view (Shift+the prototype key opens "save as"), update the active view, rename, duplicate, set
  default, delete, dirty marker, name de-duplication. A saved view stores what `viewFromState`
  stores (filters, sorts, columns, density …, mapped onto the React grid state). Built-in dataset
  views stay as they are.
- **Favourites**: pages (exists) plus views (`toggleFavoriteView`, `favoriteCurrentFilters`),
  rename inline, drag reorder (`favDrag*` / `favDrop` / `moveFavorite`), cap + "show all" overflow,
  open (`openFavorite` — opening a view favourite lands on its page with the view applied),
  empty state text as the prototype.
- **Sidebar right-click menu** (`openNavCtx`): on module pages and favourites, the prototype's items.
  Keyboard reachable (Shift+F10 / ContextMenu key), Esc closes (follow `handleEsc` order).
- Persistence: saved views and favourites are per-user data, not UI flags. Add zod schemas +
  collections + query hooks through the data seam (`data/schemas`, `data/api`, `data/queries`);
  move the existing favourites out of the `useUi` store into that collection (keep a one-time
  migration from the old store key so nobody loses favourites). No direct localStorage in
  components.
- Pure rules (name de-dup, ordering, cap/overflow, dirty check) in `src/domain/saved-views.ts` +
  `src/domain/favorites.ts` with Vitest tests.
- Add every new shortcut to the catalogue (`shortcut-meta.ts` / `src/app/shortcuts.ts`).
- NOT in scope: the Settings ▸ Favorites & views page (Settings is being redesigned later).

## Rules
- Template options must be optional and backward compatible; no list page should need edits.
- Quiet pages: no inline explanatory text beyond what the prototype shows as state/empty text.
- Hover/motion/focus states on every new control (shadcn `DropdownMenu` / `ContextMenu` where they fit).

## Checks — run them yourself, all must pass before you finish
In `apps/web`: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm exec vite build`,
`E2E_PORT=5191 pnpm exec playwright test` (the whole suite — other pages use the grid and sidebar).
Add `e2e/saved-views-favorites.spec.ts`: save a view, change a filter (dirty), update, rename,
set default (reload keeps it), delete; favourite a view from the sidebar and open it from another
page; rename and drag-reorder favourites; right-click menu opens with keyboard and closes with Esc.

## Docs
`docs/favorites-views/README.md` and `docs/erp-app/README.md`: `## React app (2026-11-18)` sections
(files, behaviour, persistence keys `shelfree.v2.<collection>`, backend entities/endpoints: saved
views and favourites are per-user, rules the server enforces); migration status table "Known gaps"
lines for user-saved views and sidebar favourites updated.

Do NOT commit, push or switch branches. Delete the `.reference.md` file when done. Finish with a
summary: files changed, template options added, data migration, anything not done or not verified.
