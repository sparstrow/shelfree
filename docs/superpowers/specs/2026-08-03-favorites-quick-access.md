# Spec: Favorites, saved views & quick access

Different people work different pages. Kavitha (Finance Manager) and a warehouse
picker share one identical sidebar today, and neither can shape their day. This
spec makes the sidebar and the view picker **personal**: pin pages and filtered
views to a Favorites section, save your own views, and set a per-page default
view so a page opens already filtered the way you work.

Status: approved (brainstorm 2026-08-03). Starter base, ungated.

## Three concepts, kept separate

1. **Favorite (pinned page)** — a shortcut to a page, e.g. *Warehouse Receipts*.
2. **Saved view** — a page *plus* its filter/sort/column/density state, e.g.
   *Items · Low stock*. Partially exists today (`itemDefaultViews()`).
3. **Recents** — automatic last-visited pages/records. Lives in the search
   palette, **not** the sidebar.

Favorites are deliberate; recents are automatic. Mixing them makes the sidebar
shuffle under the user — the classic failure of this pattern. They stay apart.

## Decision: favorites are live pointers (Option C)

A favorite stores a **reference**, never a copy: `{kind:'page', module, page}` or
`{kind:'view', viewId}`. Edit a view and every favorite of it follows; rename a
view and the sidebar label follows.

Favoriting a page that currently has **ad-hoc, unsaved filters** first
**auto-creates a private saved view** from that state, then favorites the view —
so everything in the sidebar always points at a real, editable, shareable view
and there is only ever one storage shape and one place to edit.

Chosen over a frozen snapshot (two places to edit the same thing — the real
failure mode) and over copy-on-fork (pushes Growth-tier sharing semantics into
the Starter base).

Consequences of the live pointer, specified now:

- Deleting a view removes its favorites, with an **undo toast** restoring both.
- Auto-created views get an **inline rename prompt** at creation (default name
  `<Page> · my view`, deduped `… 2`, `… 3`). Escaping the prompt keeps the
  default name — it never blocks the favorite from being created.
- A **shared** view (Growth) that you favorited and that later gets unpublished
  or deleted by its owner **converts to a private copy of your own at that
  moment** — the single place where a copy is the right answer.
- A shared view edited by someone else stays live; Growth ships a passive
  "Updated by <name>" note on the view, not a fork.

## Screens & states

**Sidebar — Favorites section**, above HOME, same visual grammar as existing
module sections (UPPER section head, collapsible, chevron).

- Empty by default: one muted line — *Star a page or view to pin it here* — no
  illustration, no CTA button.
- Page favorite: module icon + page name.
- View favorite: filter glyph + view name, with parent page as muted subtext
  (*Items · Low stock*).
- Soft cap **10** visible; beyond that a *Show all (n)* row expands in place.
  Not a hard limit — nothing is refused.
- Active favorite highlights like any active sidebar page.
- Drag to reorder within the section, with a real drop indicator line.
- Row enters/leaves with the same motion as existing sidebar expand/collapse.

**Star affordances**
- Sidebar page row: outline ★ appears on hover / keyboard focus at the row's
  right edge; filled ★ when favorited. Never a layout shift — the slot is
  always reserved.
- View picker dropdown (`All items ▾`): ★ per row, plus a *Set as my default*
  radio per row and a *Save current view as…* action at the bottom when the
  current state is dirty.
- Page header: nothing new. The star lives where the thing being starred lives.

**View picker — three groups**
1. **System views** — `All items`, `Low stock` (today's defaults; undeletable).
2. **My views** — private, mine, editable/deletable/renameable.
3. **Shared views** — Growth; absent entirely at Starter.

The picker button label already resolves to the active view name (`Custom view`
when filters are dirty and unsaved) — unchanged.

**Default view.** One view per page may be marked *my default*. Opening that
page (fresh tab, sidebar click, favorite) applies it. System `All items` is the
implicit default when none is set. A dirty state is never auto-saved as default.

**Recents.** Search palette gains a *Recent* group above results when the query
is empty: last 5 pages and last 5 records, most-recent-first, deduped. Purely
derived; never editable; user-togglable off.

## Data model

New per-user entities. Both are tenant- **and** user-scoped.

**Favorite**
- `id: string`
- `userId`, `workspaceId`
- `kind: 'page' | 'view'`
- `module: string`, `page: string` — for `kind:'page'`
- `viewId: string` — for `kind:'view'`
- `order: number` — user-controlled sequence within the section
- `createdAt`

**SavedView** (formalises today's inline `views` array)
- `id`, `userId`, `workspaceId`
- `name: string`
- `page: string`, `module: string`
- `scope: 'system' | 'private' | 'shared'` — `system` is seeded, not user data
- `filters: Filter[]` (existing `{key, op, value}` shape)
- `sorts: Sort[]`, `columns: ColumnState[]` (order/width/frozen/hidden),
  `density: 'default' | 'compact'`
- `isDefaultFor: boolean` — at most one `true` per (user, page); enforced by
  clearing the previous one in the same write
- `autoCreated: boolean` — set when born from a favorited ad-hoc state; drives
  the future "clean up unused views" affordance
- `createdAt`, `updatedAt`, `deletedAt` (soft delete, for undo)

**Item/record favorites are out of scope.** Pinning an individual item is
already served by the existing pinned tab (`pinnedNo`); revisit separately.

## Scale-adaptive tiering

| Capability | Tier | Default |
|---|---|---|
| Favorites section (pages + views) | **Starter base** | On, ungated |
| Private saved views (`My views`) | **Starter base** | On, ungated |
| Per-user default view per page | **Starter base** | On, ungated |
| Recents in search palette | **Starter base** | On, ungated |
| **Shared** views (publish to team) | Growth | Off until enabled |
| Org-level default view per page | Growth | Off |
| Role-based sidebar presets pushed by an admin | Enterprise | Off |
| Locked views (undeletable by members) | Enterprise | Off |

Per the build order, the Starter base ships with **no gating logic**; the Growth
and Enterprise rows above are recorded here for the later scale-up pass and are
not pre-built.

## Settings surfaces (shipped in the same turn as the feature)

- **User-level** — Settings → My settings → **Favorites & views**: reorder and
  remove favorites; list of My views (rename, delete, duplicate); per-page
  default view; *Show recents in search* toggle.
- **Configuration** — the feature's own on/off + favorites soft cap. This is the
  toggle Growth/Enterprise gating will hang off later.
- **Workspace** — who may publish shared views (Growth, specified now, inert at
  Starter); default favorites seeded onto new users' sidebars.
- **Terminology** — new key `object.favorites.label` (default *Favorites*;
  alternatives *Pinned*, *Bookmarks*) and `object.view.singular/.plural`
  (default *View*/*Views*), resolved through the existing `termGet()` wherever
  those words render — section head, menu items, toasts.

## Interactions & business rules

- **Right-click** a sidebar page → *Add to favorites* / *Remove from favorites*,
  *Open in new tab*. Right-click a favorite → *Rename* (views only), *Remove*,
  *Open in new tab*, *Move up/down*.
- Renaming a favorited view renames it everywhere (live pointer) — there is no
  favorite-local label.
- Removing a favorite never deletes the underlying view.
- Reorder persists immediately; no save button.
- A favorite pointing at a page a user has lost permission to is **hidden**, not
  broken — no error row.
- Cap behaviour: favoriting past the soft cap succeeds and the section
  auto-collapses the overflow rather than refusing the action.

## Keyboard shortcuts (built with the feature, catalogued the same turn)

| Shortcut | Action | Scope |
|---|---|---|
| `⌘D` / `Ctrl+D` | Favorite / unfavorite current page or view | Any page |
| `⌘1` … `⌘9` | Jump to favorite N | Global |
| `⌘S` | Save changes to the active view | Grid with dirty view |
| `⌘⇧S` | Save current state as a new view | Grid |
| `⌘⌥F` | Focus the Favorites section | Global |

All guarded by the existing `onGrid` / `typing` pattern so they don't fire while
typing or with an unrelated modal open, and **added to Settings → General →
Keyboard shortcuts (`shortcutGroups()`) in the same turn** — a shortcut absent
from that page does not count as shipped.

## Persistence (prototype)

localStorage, per existing app pattern: `shelfree.favorites.v1` (array of
Favorite), `shelfree.views.v1` (array of SavedView), `shelfree.recents.v1`
(capped ring of `{kind, module, page, no, at}`). Keyed by the mock current user
so switching users in the prototype shows different favorites — the whole point
of the feature is visible without a backend.

## Backend-build notes

- `GET/POST/PATCH/DELETE /favorites` — list is implicitly `userId` from session;
  `PATCH /favorites/reorder` takes an ordered id array.
- `GET/POST/PATCH/DELETE /views` — `scope=private` writes are self-only;
  `scope=shared` requires a `views.publish` permission; `scope=system` is
  read-only seed data.
- `POST /views/:id/default` sets `isDefaultFor` and clears the prior default for
  that (user, page) in one transaction.
- Delete is **soft** (`deletedAt`) to support the undo toast; cascade-hide
  favorites pointing at a soft-deleted view, and restore them on undo.
- Unpublishing/deleting a shared view must **materialise a private copy** for
  every user who favorited it (the one copy case above) — a background job, not
  a client responsibility.
- Recents may be computed server-side from an activity log instead of stored;
  either way it is per-user and never cross-tenant.

### Decisions & deferred-to-backend

- **Live pointer over snapshot** (Option C) — one concept, one storage shape,
  one place to edit. Snapshot rejected for creating two editable copies of the
  same filter state.
- **Ad-hoc filters get promoted to a real private view** on favorite rather than
  being stored inline on the favorite — this is what lets favorites stay pure
  pointers.
- **Shared views deferred to Growth**; the `scope` field and `views.publish`
  permission key are specified now so the model doesn't need reshaping later.
- **Record-level favorites deferred** — pinned tabs already cover it.
- **Enforcement deferred:** per-user scoping, `views.publish` permission, and
  tenant isolation are specified but not enforced client-side; the backend owns
  them. Nothing in the UI assumes cross-user or cross-tenant read access.
- **Security surface:** favorites/views contain no PII beyond a user-authored
  name; filter values may reference customer/vendor names, so shared views are
  a data-exposure surface — publishing must respect the publisher's *and*
  reader's row-level permissions at query time, not at save time.

## Success criteria

- A warehouse lead opens Items and lands on *Low stock* without touching a
  filter.
- Kavitha's sidebar shows her four pages; the picker's sidebar shows different
  ones; neither affects the other.
- Editing a favorited view updates the sidebar label and behaviour immediately.
- Deleting a view removes its favorite and can be undone from the toast.
- Every shortcut above appears in Settings → General → Keyboard shortcuts.
