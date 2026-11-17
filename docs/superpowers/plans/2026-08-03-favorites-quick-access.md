# Plan: Favorites, saved views & quick access

Implements [`specs/2026-08-03-favorites-quick-access.md`](../specs/2026-08-03-favorites-quick-access.md).
All work lands in `prototype/designs/erp/Shelfree App.dc.html` unless noted.

**Live anchors found during exploration (use these, don't re-search):**

| What | Where |
|---|---|
| Saved-view state | `views: this.defaultViews(), activeView: 'all', viewsOpen, savingView, newViewName` — state init ~L4270 |
| View logic | `applyView()` / `saveView()` / `deleteView()` ~L5820–5838; `itemDefaultViews()` ~L5520 |
| View VM | `activeViewName`, `viewList` ~L8732; vm wiring ~L9477–9481 |
| View dropdown markup | template ~L424–455 (`SAVED VIEWS` header, `vm.viewList`, `vm.startSaveView`) |
| Sidebar rail | `navCollapsed` (~L4240), `setNavCollapsed()` (~L4712), `allNavPages()` (~L4322), `navFlyout` |
| Page nav | `gotoPage(module, page)` ~L4727, `openTabAt()` ~L4670 |
| Global page search | `gsearch*` ~L4310–4335, dropdown markup ~L265–290 |
| Settings registry | `settingsPageMeta()` / user-scope list ~L4860–4866 (`me-profile`, `me-defaults`, …) |
| Shortcuts page | `shortcutGroups()` ~L4909, rendered ~L2589 |
| Persistence helpers | `jsonLoad()` / `jsonSave()` / `settingsScalar*` ~L4740–4743 |
| Toast | `this.toast(title, sub)` |

**Known constraint:** `views` today is *per-dataset* — it's re-seeded when the
dataset changes (`defaultViews()` on dataset switch, ~L4650/4727). Task 1 must
move views into a **page-keyed store** so a view survives navigation; this is a
prerequisite for pointing a favorite at one.

---

## Task 1 — Page-keyed SavedView store (replaces per-dataset `views`)

**Files:** `Shelfree App.dc.html` (logic)

- Add `viewStoreKey() { return 'shelfree.views.v1'; }` and a per-user wrapper:
  the stored shape is `{ [userId]: SavedView[] }` so switching the mock user
  shows different views (spec: Persistence).
- `viewsLoad()` / `viewsPersist(list)` using the existing `jsonLoad`/`jsonSave`.
- `savedViews(pageKey)` → system views for that page (from the existing
  `itemDefaultViews()`, generalised to `defaultViewsFor(pageKey)`) concatenated
  with stored `scope:'private'` views for that page.
- New fields per spec: `id, userId, name, module, page, scope, filters, sorts,
  columns, density, isDefaultFor, autoCreated, createdAt, updatedAt, deletedAt`.
- Keep `activeView` in tab-local state; stop wiping `views` on dataset switch —
  instead recompute the *visible* list from `savedViews(curPageKey())`.
- Migrate: if a legacy in-memory view exists it's simply dropped (no persisted
  legacy data exists — `views` was never written to localStorage).

**Verify:** save a view on Items, navigate to Vendors and back — the view is
still listed and still applies. Reload the page — still there.

## Task 2 — Default view per page

- `setDefaultView(id)` — sets `isDefaultFor: true`, clears the previous `true`
  for the same (user, page) in the same write; `clearDefaultView(pageKey)`.
- `gotoPage()` / `openTabAt()` / `newTab()`: after computing the page patch, if a
  default view exists for that page, apply its filters/sorts/columns/density.
  A dirty state is never promoted to default.
- Radio-style *Set as my default* row in the view dropdown (Task 3).

**Verify:** mark *Low stock* default, open Items in a new tab — grid loads
filtered, picker label reads *Low stock*.

## Task 3 — View dropdown: three groups, star, default, save-as

**Files:** `Shelfree App.dc.html` (template ~L424–455 + vm ~L9477)

- Replace the single `SAVED VIEWS` header with grouped sections: `SYSTEM`,
  `MY VIEWS`, (`SHARED` rendered only when the Growth flag is on — absent now).
- Per row: ★ toggle (calls `toggleFavoriteView(id)`), name, *default* radio, and
  the existing delete button for `canDelete` rows.
- `startSaveView` stays; label becomes *Save current view as…* and it's only
  shown when the state is dirty or no view is active.
- Extend `viewList` VM with `fav`, `isDefault`, `star`, `setDefault`.
- Inline styles only, matching the existing dropdown's exact literals.

**Verify:** star a view → filled ★; groups render; delete still works.

## Task 4 — Favorites data layer

- `favStoreKey() { return 'shelfree.favorites.v1'; }`, per-user shape as Task 1.
- `favLoad()`, `favPersist(list)`, `favList()` (sorted by `order`).
- `isFavPage(module, page)`, `isFavView(viewId)`.
- `toggleFavoritePage(module, page)` — **Option C**: if the current page has
  dirty ad-hoc filters, first create a `scope:'private', autoCreated:true` view
  named `<Page> · my view` (deduped `… 2`), open the inline rename prompt, then
  favorite `{kind:'view', viewId}`. Otherwise favorite `{kind:'page'}`.
- `toggleFavoriteView(viewId)`, `removeFavorite(id)`, `reorderFavorites(ids)`.
- `deleteView(id)` — extend: soft-delete (`deletedAt`), hide its favorites,
  `toast('View deleted', name)` with an **Undo** action restoring both.
- Unpublish/deletion→private-copy conversion is backend-only; leave a comment
  pointing at the spec, don't fake it client-side.

**Verify:** in console-free terms — star from the dropdown, reload, favorite
persists; delete the view, undo from the toast, favorite returns.

## Task 5 — Sidebar Favorites section

**Files:** `Shelfree App.dc.html` (sidebar template + vm)

- New section above HOME: UPPER section head using
  `termGet('object.favorites.label', 'Favorites')`, collapsible with the same
  chevron/motion as module sections, collapse state in
  `shelfree.fav.collapsed.v1`.
- Empty state: one muted line *Star a page or view to pin it here.*
- Page rows: module icon + page name. View rows: filter glyph + view name +
  muted parent-page subtext.
- Soft cap 10 visible, then a *Show all (n)* row expanding in place.
- Active-row highlight reuses the existing sidebar active style.
- Collapsed-rail mode: icons only, name in the existing `navFlyout` tooltip.
- Outline ★ on hover/focus of every normal sidebar page row, in a
  permanently-reserved slot (no layout shift); filled when favorited.
- Drag-reorder with a 2px drop-indicator line; `reorderFavorites` on drop.
- Hidden rows: a favorite whose page fails `perms` is filtered out silently.

**Verify:** star 3 pages + 1 view, reorder by drag, collapse/expand, collapse
the rail — all four render and navigate correctly.

## Task 6 — Context menus

- Right-click a sidebar page row → *Add to / Remove from favorites*, *Open in
  new tab*.
- Right-click a favorite row → *Rename* (views only, inline), *Remove*, *Open in
  new tab*, *Move up*, *Move down*.
- Reuse the existing context-menu primitive used by column headers
  (`colMenu` pattern) rather than a new one; close on Escape via the existing
  `escHandler` chain (~L4583).

**Verify:** both menus open at the cursor, Escape closes, actions fire.

## Task 7 — Recents in the global search palette

- `recentsPush({kind, module, page, no})` called from `gotoPage()` and
  `openItem()`; capped ring of 10, stored at `shelfree.recents.v1` per user.
- `gsearch` dropdown: when the query is empty, render a `RECENT` group (5 pages,
  5 records) above results; existing keyboard nav (`gsearchIdx`, Arrow/Enter)
  must include these rows.
- Respect the user toggle from Task 8; when off, `recentsPush` is a no-op and
  the group is absent.

**Verify:** visit 3 pages, focus search with an empty query — they're listed,
arrow-down + Enter navigates.

## Task 8 — Settings surfaces (same turn, per CLAUDE.md)

- **User:** new page `me-favorites` — *Favorites & views* — added to the
  user-scope registry (~L4864, after `me-defaults`). Contains: favorites list
  (reorder ↑↓, remove), My views list (rename, delete, duplicate), per-page
  default-view table, *Show recents in search* toggle.
- **Configuration:** *Favorites & views* block — feature on/off + favorites soft
  cap (number input, default 10). This is the toggle later gating hangs off.
- **Workspace:** *Who can publish shared views* (role select, inert at Starter,
  visibly labelled Growth) + *Default favorites for new users* (page picker).
- **Terminology:** register `object.favorites.label` (default *Favorites*) and
  `object.view.singular` / `.plural`; resolve through `termGet()` in the section
  head, menus, and toasts.

**Verify:** all four pages render, the terminology rename changes the sidebar
section head live.

## Task 9 — Keyboard shortcuts + catalogue

- Wire in the existing global keydown handler, guarded by the current
  `onGrid` / `typing` pattern:
  `⌘D` toggle favorite · `⌘1`–`⌘9` jump to favorite N · `⌘S` save active view ·
  `⌘⇧S` save as new view · `⌘⌥F` focus Favorites section.
- Add a **Favorites & views** group to `shortcutGroups()` (~L4909) with all five
  — a shortcut absent from that page does not count as shipped.

**Verify:** each fires from a grid page and does nothing while typing in a
filter input; all five appear in Settings → General → Keyboard shortcuts.

## Task 10 — Docs

- New `docs/favorites-views/README.md` in the standard five-section shape
  (Overview / Screens & states / Data model / Interactions & business rules /
  Persistence / Backend-build notes + Decisions & deferred-to-backend), carrying
  the spec's endpoints and the Option C rationale.
- Index it in `docs/README.md` under Pages.
- Append to `docs/erp-app/README.md`: sidebar Favorites section, ★ affordance,
  recents in search, new shortcuts.
- Append to `docs/settings/README.md`: the four new settings surfaces + two new
  terminology keys.
- Run the `docs/security/README.md` per-feature checklist and record the outcome
  (shared views = a row-level-permission exposure surface; nothing sensitive
  beyond user-authored names in localStorage).

## Task 11 — Verify & close

- `check_design_system` until clean.
- `ready_for_verification` on `prototype/designs/erp/Shelfree App.dc.html`.
- Success criteria from the spec, walked manually: warehouse-lead default view,
  two users with different sidebars, live-pointer rename propagation, delete +
  undo, shortcuts catalogued.

---

**Sequencing note:** Tasks 1–2 are the foundation (nothing else works without a
persistent, page-keyed view store). 3–6 are the visible surface. 7–9 are
independent and can be reordered. 10 must land in the same turn as whichever
task changes behaviour, not deferred to the end.

**Not in scope:** shared views, org defaults, admin-pushed sidebar presets,
record-level favorites, any billing or real gating (see spec's tier table).
