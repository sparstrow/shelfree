# Departments — the whole-app page directory

Status: built (prototype), **Starter base, ungated**.
Spec: [`../superpowers/specs/2026-08-22-departments-navigation.md`](../superpowers/specs/2026-08-22-departments-navigation.md)
Lives in `prototype/designs/erp/Shelfree App.dc.html` (app shell).

## Overview

**Departments** is a second way to navigate: one full-screen index listing every
department and every page underneath it at once. The sidebar is the fast path to
the pages a person already uses; Departments is the complete map, for finding a
page you have never opened and do not know the owning module of.

A "department" **is** a module — the same seven entries the sidebar renders
(Home, Finance, Sales, Purchasing, Warehouse, Production, People), read from the
same `modules()` source of truth. There is no second hierarchy and no new
entity, so a page can never appear in one surface and be missing from the other.

## Screens & states

One page, laid out as CSS column-flow blocks (`columns: 272px 4`) so it reflows
from four columns down to one without media queries.

- **Header** — the terminology label (default *Departments*), one line of
  purpose, and a filter box on the right.
- **Jump back in** — up to 5 recent *pages* as chips, above the grid. Hidden
  when the filter is active, when the workspace toggle is off, or when the
  person's own recents preference is off. Never a placeholder.
- **Department block** — module icon + name + page count, then its pages as a
  flat vertical list.
- **Setup rule** — reference/setup pages (Units of Measure, Chart of Accounts,
  Tax, Sales Prices, Purchase Prices) sit below a hairline rule under a muted
  *Setup* label inside the same block. No other sub-grouping.
- **Page row states**
  - *Live* — normal row; hover = background tint + 1px lift + shadow (140ms).
  - *Coming soon* — greyed (muted colour, 0.7 opacity) with a `COMING SOON`
    pill. **Still navigable**: clicking opens the existing placeholder screen,
    so the map stays complete and honest about scope.
  - *Active* — the page you are currently on is tinted + weighted, so the
    directory doubles as "where am I".
  - *Focused* (keyboard) — inset 1px primary ring.
  - *Favorite* — filled ★ at the right edge; outline ★ on hover/focus in a
    permanently reserved slot (no layout shift). Same favorite as the sidebar.
- **Filter** — narrows within the page: non-matching pages and empty department
  blocks disappear, a match count reads out (`n pages in m departments`) with a
  *Clear* action. Matches page name **or** department name, case-insensitive
  substring. It never searches records — that stays the header search palette.
- **Empty** — one muted line: no match for the query, or "No departments are
  switched on for this workspace."
- **Motion** — blocks enter with a 6px rise/fade (`sfSlide`, 280ms) staggered
  40ms per block.

**Entry points** (three, plus an optional landing default)
1. **Departments** item pinned at the top of the sidebar, above Favorites, with
   a divider under it. In the collapsed rail it is the grid icon + tooltip.
2. Grid-icon button in the page header, left of the search box.
3. **Ctrl/Cmd + Shift + D** from anywhere — press again (or Esc) to return.
4. Settings → My settings → Personal defaults → **Landing page** now offers
   *Departments*, opening it on sign-in.

Opening Departments does **not** change where you are: it takes over the content
area, the breadcrumb reads `<workspace> › Departments`, and closing it returns
to the page (and grid state) you left. It is per workspace tab.

## Data model

**No new entities.** The directory is fully derived from:

| Source | Used for |
|---|---|
| `modules()` | department ids, terminology-resolved names, page lists |
| `ws.modules` | which departments exist for this workspace |
| `ws.axes` | capability toggles that add/remove individual pages |
| `favorites` | star state per row |
| `recents` | the Jump-back-in row (page entries only) |

New static app metadata (code, not database):

- `deptBuiltPages()` — map of `module → [page]` that have a real screen in this
  prototype. Drives the *Coming soon* tag only. **Prototype-only; delete at
  handoff**, when every page is built.
- `deptSetupPages()` — the page names treated as setup/reference (drives the
  Setup rule inside a block).
- `moduleIconD(id)` — single-path icon per department.

New client state: `deptOpen` (per workspace tab, mirrored into the tab record
alongside `settingsOpen`), `deptQ` (filter text, transient), `deptFocus`
(keyboard index, transient), `deptHover`.

**Behaviour change shipped with this feature:** `modules()` now honours
`ws.modules` — a department switched off in Settings → Workspace → Modules &
capabilities disappears from **both** the sidebar and Departments (previously
the toggle was inert). `curModule()` falls back to Warehouse, then the first
visible department.

## Interactions & business rules

- Clicking a page calls the existing `gotoPage(module, page)` — same default-view
  application, same recents push, same dataset switching. No second navigation
  path, and `gotoPage` clears `deptOpen`.
- Opening Settings closes the directory; the directory closes without touching
  the grid state of the page you left.
- Starring here and starring in the sidebar are the same action on the same
  favorite; both update immediately.
- Right-click a page row → the existing sidebar page menu (add/remove favorite,
  open in new tab).
- Departments is not itself favoritable and never appears in its own index.
- A department switched off, or a page whose capability axis is off, is absent —
  no locked shell, no trace (deliberate workspace configuration, not a plan
  boundary).
- A page the user has no permission for must be **hidden**, not shown-and-refused
  (same rule as favorites; enforcement is a backend concern).
- Terminology and module renames apply live, with no reload.

## Keyboard shortcuts

| Shortcut | Action | Scope |
|---|---|---|
| `Ctrl/Cmd + Shift + D` | Open / leave the directory | Global |
| any letter or digit | Starts filtering (focuses the filter box) | Departments |
| `↑ / ↓` | Move focus down / up, wrapping into the next department | Departments |
| `← / →` | Jump to the previous / next department block | Departments |
| `Enter` | Open the focused page | Departments |
| `Ctrl/Cmd + Enter` | Open the focused page in a new workspace tab | Departments |
| `Shift + S` | Star / unstar the focused page | Departments |
| `Esc` | Clear the filter if set, otherwise leave the directory | Departments |

All guarded by the shell's `typing` / modifier checks and catalogued in
**Settings → Workspace → Keyboard shortcuts** (group *Departments directory*),
which is the single source of truth for the user.

## Settings surfaces

- **Configuration → Navigation** (new page, `cfg-nav`, Starter): *Departments
  page* on/off (the toggle any later tier gating hangs off), *"Jump back in" row*
  on/off, *List pages that aren't built yet* on/off. Plus shortcuts to Modules &
  capabilities and Terminology.
- **Workspace → Modules & capabilities** (existing): governs which departments
  and pages exist, now for both surfaces.
- **Terminology** (existing, Modules & navigation group): `object.departments.label`
  — default *Departments*, alternatives *Modules*, *Areas*.
- **My settings → Personal defaults** (existing): *Landing page* gains the
  Departments option. The Jump-back-in row also follows the existing per-user
  *Show recents* preference.

## Persistence

Client-side only, following the shell's existing patterns:

| Key | Holds |
|---|---|
| `shelfree.settings.deptPage.v1` | Departments page on/off (`'1'`/`'0'`) |
| `shelfree.settings.deptRecents.v1` | Jump-back-in row on/off |
| `shelfree.settings.deptShowUnbuilt.v1` | list unbuilt pages on/off |
| `shelfree.settings.terms.v1` | `object.departments.label` override |
| existing `me` record | `defLanding: 'Departments'` |

`deptOpen` / `deptQ` / `deptFocus` are in-memory only — the filter query is
deliberately **not** persisted.

## Backend-build notes

- **No new endpoints.** The directory composes `GET /me` (landing page, recents
  preference), `GET /workspace/settings` (module visibility, capability axes,
  terminology, the three navigation flags) and `GET /favorites`.
- If a server-driven navigation manifest is ever wanted, the shape is
  `GET /navigation` → `[{ id, name, order, pages: [{ id, name, kind, minTier,
  enabled }] }]`, already filtered by the caller's permissions and the
  workspace's configuration; the client renders it unchanged.
- Module visibility and capability axes are **workspace-scoped** and must be
  enforced server-side; the client hiding a page is UX, not a control. Every
  page's own endpoints must independently reject unauthorised callers.
- A navigation manifest, if built, must be computed per user and per tenant and
  never cached across tenants.

### Decisions & deferred-to-backend

- **A department is a module** — one list, two renderings (tree + map). A
  grouping layer above departments was rejected: it adds a level only very large
  installs need and gives every module two names. If it ever ships it becomes an
  Enterprise "department groups" capability over the same list.
- **Index only.** Per-department landing pages (KPIs, open tasks, counts) were
  deliberately excluded — counts are data noise on a wayfinding screen, and a
  department dashboard is a reporting feature. Deferred to its own spec.
- **Unbuilt pages are listed, greyed out, tagged Coming soon, and still
  navigable** (user's call). `deptBuiltPages()` is prototype scaffolding with no
  backend equivalent.
- **No per-user reorder / hide of departments** — Favorites already covers
  personalisation; two ways to shape the same navigation would compete.
- **Tier gating not pre-built.** Starter base ships ungated per the build order.
  When the scale-up pass lands, growth-path pages render **locked with an upgrade
  hint** and niche ones stay absent; the row's right edge already reserves a slot
  (star / tag), so a lock badge drops in without reflowing the layout. Recorded
  tiers: directory + filter + stars + recents = Starter; locked/upgrade rows =
  Growth rendering; department groups and admin-pushed visibility presets =
  Enterprise.
- **Security surface:** the directory displays no PII and no financial figures —
  page names plus the user's own favorites/recents. Recents are per-user
  behavioural data: keep them user-scoped and never readable by another user in
  the workspace. No new audit-relevant mutations (starring is already covered by
  the favorites doc). Nothing new lands in localStorage beyond the three flags
  above.

## React app (2026-11-17)

Ported to `apps/web` at `/departments`.

- **Files:** `apps/web/src/features/departments/DepartmentsPage.tsx`,
  `apps/web/src/domain/departments.ts`, `apps/web/src/domain/departments.test.ts`,
  `apps/web/src/routes/departments/index.tsx` (with layout `<Outlet />` in
  `apps/web/src/routes/departments.tsx`).
- **URL:** `/departments`.
- **Same as prototype:** CSS multi-column blocks (`columns: 272px 4`) built from the sidebar's single
  module registry (`MODULES` in `apps/web/src/app/nav.ts`), Setup pages grouped below a hairline
  rule (`SETUP_PAGE_LABELS`), *Coming soon* badge on pages not yet ported to React (still navigable),
  *Jump back in* row of up to 5 recent list pages from `useUi().recents` (hidden while filtering),
  per-row favorite stars synced with the sidebar (`useUi().favorites`), right-click context menu
  (*Open*, *Open in new tab*, *Add/Remove from favorites*), and keyboard navigation (`ArrowUp`/`ArrowDown`
  wrapping through rows, `ArrowLeft`/`ArrowRight` jumping between blocks, `Enter` opening the focused
  page, `Ctrl/Cmd+Enter` opening in a new workspace tab, `Shift+S` toggling favorite, typing any letter
  or digit anywhere to focus and filter, `Esc` clearing the filter).
- **Deliberate changes:** `BUILT_REACT_PAGES` reflects pages ported to React rather than the prototype's
  The header description ("Every page in …") moved behind an ⓘ on the title (Quiet pages, 2026-11-18).
  `deptBuiltPages()`; Settings toggles (`deptPage`, `deptRecents`, `deptShowUnbuilt`) and the global
  `Ctrl/Cmd+Shift+D` shortcut are deferred until Settings ▸ Configuration ▸ Navigation and Keyboard
  shortcuts are ported.
- **Persistence:** `shelfree.v2.ui` (`favorites`, `recents`, `tabs` via `useUi`); filter query and
  focus index remain in-memory only.
- **Backend rules:** no new endpoints; composes `GET /me`, `GET /workspace/settings`, and `GET /favorites`
  (or a tenant- and permission-filtered `GET /navigation` manifest).
- **Tests:** `apps/web/src/domain/departments.test.ts`, `apps/web/e2e/notes-departments-vpi.spec.ts`.
