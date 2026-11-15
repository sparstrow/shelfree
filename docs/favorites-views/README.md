# Favorites, saved views & quick access

Per-user personalisation of navigation: a **Favorites** section pinned above the
module list in the sidebar, **private saved views** (a page plus its filter /
sort / column state), a **default view per page**, and a **recents** group in the
page-search palette.

Implements [`docs/superpowers/specs/2026-08-03-favorites-quick-access.md`](../superpowers/specs/2026-08-03-favorites-quick-access.md)
(approved 2026-08-03). Lives in `designs/erp/Shelfree App.dc.html`.

Tier: **Starter base — always on, ungated.** Shared views, org-level defaults and
admin-pushed sidebar presets are Growth/Enterprise and are *not* built (see Tier
matrix below).

## Overview

Different people work different pages: Finance lives in invoices, a warehouse
lead lives in low-stock items. Before this, every user saw the identical sidebar
and re-applied the same filters on every visit. Now:

- **Favorite (pinned page)** — a shortcut to a page, e.g. *Transfer Orders*.
- **Saved view** — a page + filters + sort + columns + density, e.g. *Items ·
  Low stock*.
- **Default view** — one saved view per page that the page opens with.
- **Recents** — automatic, derived, lives only in the search palette.

Favorites are deliberate; recents are automatic. They are deliberately **not**
merged — a sidebar that reorders itself under the user is the failure mode this
separation avoids.

### Key decision: favorites are live pointers (spec Option C)

A favorite stores a **reference** (`{kind:'page', module, page}` or
`{kind:'view', viewId}`), never a copy. Editing or renaming a view updates every
favorite of it. Favoriting a page whose grid currently has **unsaved ad-hoc
filters** first promotes those filters to a private view, then pins that view —
so a favorite always points at a real, editable object and there is exactly one
place to edit any filter state.

Starring a **system** view (`All items`, `Low stock`) materialises a private copy
of it and pins that, for the same reason (system views have no per-user record).

## Screens & states

### Sidebar — Favorites section
- Sits above `Home`, styled as an uppercase collapsible section head with a star
  icon, a count pill, and a chevron; collapse state persists.
- **Empty state:** one muted line — *Star a page or view to pin it here.*
- **Page row:** file icon + page name.
- **View row:** funnel icon + view name + muted parent-page subtext (*Items*).
- Active row highlights with the same primary tint as any active sidebar page.
- Soft cap (default 10) then a **Show all (n)** row that expands in place.
  Exceeding the cap never refuses the action.
- **Drag to reorder** with a 2px primary drop-line on the hovered row.
- **Inline rename** (views only): the row is replaced by a text input;
  Enter commits, Escape cancels, blur commits.
- Favorites whose target view no longer exists are filtered out silently.
- Collapsed rail: rows show icons only, labels hidden (no subtext, no star).

### Star affordance on page rows
Every sidebar page row reserves a 15px star slot (no layout shift). The star is
invisible until the row is hovered (`navHover` state), and shown filled in the
primary colour when the page is favorited.

### View picker (list-page toolbar)
- Rows grouped by generated headers: **SYSTEM**, then **MY VIEWS** (a `SHARED`
  group is reserved for Growth and is absent today).
- Each row: apply button, ✓ **default** toggle (private views only), ★ **pin**
  toggle, ✕ delete (private views only).
- Footer actions: **Save changes to this view** (only when a private view is
  active) and **Save current as view** (opens the name input).
- Button label shows the active view name, or *Custom view* when filters are
  dirty and unsaved.

### My settings → Favorites & views (`me-favorites`)
Three cards: **Pinned in the sidebar** (reorder ↑↓, remove), **My saved views**
(make default / pin / rename / duplicate / delete), **Show recents in page
search** (toggle + remembered count + Clear).

### Settings → Configuration → Favorites & views (`cfg-favorites`)
Feature on/off (hides the section and all star buttons workspace-wide), the
soft cap number, and **Who can share a view with the team** — a Growth-labelled
select that is specified now and inert until shared views ship.

### Page search — Recent group
With an empty query the dropdown lists the user's last 5 pages then last 5
records under a `RECENT` header with a **Clear** action. These rows are the same
result objects as search hits, so arrow-key navigation and Enter work unchanged.

## Data model

### Favorite (per user, per workspace)
| Field | Type | Notes |
|---|---|---|
| `id` | string | `f<timestamp><rand>` |
| `kind` | `'page' \| 'view'` | |
| `module`, `page` | string | `kind:'page'` only |
| `viewId` | string | `kind:'view'` only — a live pointer |
| `order` | number | user-controlled sequence |
| `createdAt` | number | epoch ms |

### SavedView (per user, per workspace)
| Field | Type | Notes |
|---|---|---|
| `id` | string | `v<timestamp><rand>` |
| `userId` | string | mock: the current demo role |
| `name` | string | unique per `pageKey` (deduped `name 2`, `name 3`) |
| `module`, `page`, `pageKey` | string | `pageKey = module + '/' + page` |
| `scope` | `'private'` | `'system'` views are seeded, not stored; `'shared'` reserved for Growth |
| `filters` | `{key,op,value}[]` | same shape as the live filter bar |
| `sorts` | `{key,dir}[]` | multi-sort preserved; `sortKey`/`sortDir` mirror `sorts[0]` |
| `columns` | `{key,width,visible,frozen}[]` | re-applied by key onto the page's current column set, so schema changes don't break old views |
| `groupBy`, `collapsed` | string / string[] | grouping state |
| `density` | `'default' \| 'compact'` | |
| `isDefaultFor` | boolean | at most one `true` per (user, `pageKey`) |
| `autoCreated` | boolean | born from a favorited ad-hoc state |
| `createdAt`, `updatedAt`, `deletedAt` | number / null | `deletedAt` reserved for the backend's soft delete |

**Record-level favorites are out of scope** — pinning a single item is already
served by the existing pinned workspace tab (`pinnedNo`).

### Recent
`{ kind:'page'|'item', module, page, no?, at }` — capped ring of 10, newest
first, deduped on `module+page+no`.

## Interactions & business rules

- Favoriting a page with dirty filters → creates a private view named
  `<Page> · my view` (deduped), pins it, and opens the sidebar rename input.
- Removing a favorite never deletes the underlying view; it offers **Undo**.
- Deleting a view removes every favorite pointing at it; **Undo** restores the
  view *and* those favorites.
- Renaming a view renames it everywhere — there is no favorite-local label.
- Setting a default view clears the previous default for that page in the same
  write. Opening the page (sidebar click, favorite, new tab, first load) applies
  it; a dirty state is never auto-promoted to default.
- Navigating to a page always recomputes the visible view list for that page, so
  a private view is available wherever its page is.
- Exceeding the favorites soft cap succeeds; the overflow collapses behind
  *Show all*.
- A favorite pointing at a page the user cannot access is hidden, not broken.

### Keyboard & mouse
| Input | Action |
|---|---|
| `Ctrl/Cmd + D` | Pin/unpin the current page or active view (promotes dirty filters first) |
| `Ctrl/Cmd + 1…9` | Jump to favorite N |
| `Ctrl/Cmd + S` | Save current state back into the active view (no active view → opens Save-as) |
| `Ctrl/Cmd + Shift + S` | Save current state as a new private view |
| `Ctrl/Cmd + Alt + F` | Expand the sidebar and focus the first favorite |
| Right-click a sidebar page | Add/remove favorite, open in new tab |
| Right-click a favorite | Rename (views), open in new tab, move up/down, remove |
| Drag a favorite | Reorder |
| `Esc` | Closes the sidebar context menu, then an open rename input |

All shortcuts are guarded by the existing `typing` check (no firing inside
inputs/selects/textareas) and are catalogued in **Settings → Workspace →
Keyboard shortcuts** under the *Favorites & views* group.

## Persistence

Client-side only, all keyed by the mock current user (the demo role) so
switching "View as" in the avatar menu shows different favorites:

| Key | Shape |
|---|---|
| `shelfree.favorites.v1` | `{ [userId]: Favorite[] }` |
| `shelfree.views.v1` | `{ [userId]: SavedView[] }` (private views only) |
| `shelfree.recents.v1` | `{ [userId]: Recent[] }` |
| `shelfree.fav.collapsed.v1` | `'1'` when the section is collapsed |
| `shelfree.settings.favEnabled.v1` | `'1'` / `'0'` |
| `shelfree.settings.favCap.v1` | integer as string (3–30) |
| `shelfree.settings.recents.v1` | `'1'` / `'0'` |
| `shelfree.settings.sharedViewsRole.v1` | `'owner' \| 'admin' \| 'any'` (inert, Growth) |

System views are code-seeded per dataset (`itemDefaultViews()`,
`customerDefaultViews()`, `vendorDefaultViews()`, …) and never stored.

## Terminology

Two new rename keys (Settings → Terminology):
- `object.favorites.label` — default *Favorites* (alternatives *Pinned*,
  *Bookmarks*); drives the section head, menu items and toast copy.
- `object.view.singular` / `object.view.plural` — default *View* / *Views*;
  drives the picker group header, save/update labels and settings copy.

## Tier matrix

| Capability | Tier | Default |
|---|---|---|
| Favorites section (pages + views) | Starter base | On, ungated |
| Private saved views | Starter base | On, ungated |
| Per-user default view per page | Starter base | On, ungated |
| Recents in page search | Starter base | On |
| Shared views (publish to team) | Growth | Not built |
| Org-level default view per page | Growth | Not built |
| Role-based sidebar presets pushed by an admin | Enterprise | Not built |
| Locked views (undeletable by members) | Enterprise | Not built |

## Backend-build notes

Entities: `favorites` and `saved_views`, both scoped by `user_id` **and**
`workspace_id`, ordered, soft-deleted.

- `GET/POST/PATCH/DELETE /favorites` — list is implicitly the session user;
  `PATCH /favorites/reorder` takes an ordered id array.
- `GET/POST/PATCH/DELETE /views` — `scope=private` writes are self-only;
  `scope=shared` requires a `views.publish` permission; `scope=system` is
  read-only seed data.
- `POST /views/:id/default` sets `is_default_for` and clears the prior default
  for that (user, page) in one transaction.
- Delete is **soft** (`deleted_at`) to support the undo toast; cascade-hide
  favorites pointing at a soft-deleted view and restore them on undo.
- Unpublishing/deleting a **shared** view must materialise a private copy for
  every user who favorited it — a background job, not a client responsibility.
- Recents may be computed from an activity log rather than stored; either way
  per-user and never cross-tenant.
- Validation: `name` non-empty and unique per (user, page); `filters` keys must
  exist on the target page's column set — unknown keys are dropped, not errors,
  so old views survive schema changes.

### Decisions & deferred-to-backend

- **Live pointer over snapshot (Option C).** One concept, one storage shape, one
  place to edit. A frozen snapshot was rejected because it creates two editable
  copies of the same filter state; copy-on-fork was rejected because it drags
  Growth-tier sharing semantics into the Starter base.
- **Ad-hoc filters are promoted to a real private view** on favorite rather than
  stored inline on the favorite — this is what keeps favorites pure pointers.
- **Starring a system view materialises a private copy** rather than storing a
  pointer to seed data.
- **Shared views deferred to Growth**; the `scope` field, the `views.publish`
  permission key and the workspace publish-role setting are specified now so the
  model needs no reshaping later. A shared view edited by its owner stays live
  for everyone; the plan is a passive "Updated by <name>" note, never a fork.
- **Record-level favorites deferred** — pinned workspace tabs already cover it.
- **Column state is re-applied by key**, never positionally, so a view saved
  before a column was added or a scale axis toggled still applies cleanly.
- **Enforcement deferred:** per-user scoping, `views.publish`, and tenant
  isolation are specified but not enforced client-side. Nothing in the UI assumes
  cross-user or cross-tenant reads.

### Security & compliance (per `docs/security/README.md`)

- **PII:** none beyond a user-authored view name. Favorites/views hold no
  customer or financial data themselves.
- **Cross-tenant:** every read and write is keyed by user *and* workspace; no
  code path lists another user's favorites or views.
- **Audit:** create/rename/delete of a saved view and publish/unpublish (Growth)
  are audit-relevant — the backend should emit events; the prototype does not.
- **Shared views are a data-exposure surface:** a view's `filters` can name
  customers or vendors, and applying it returns rows. Publishing must respect
  the *reader's* row-level permissions at query time, not the publisher's at
  save time.
- **localStorage:** stores only navigation preferences — no tokens, no secrets,
  no record payloads.
