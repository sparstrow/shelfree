# Spec: Departments — the whole-app page directory

The sidebar is good at *returning* to the handful of pages you already know. It
is bad at *discovery*: you must expand one module at a time, and a page you have
never opened is invisible until you guess which module owns it. **Departments**
is one full-screen index that shows every department and every page underneath
it at once — the app's map, on one screen, no clicking around.

Status: **approved with changes, built 2026-08-23** (brainstorm 2026-08-22).
Starter base, ungated. Built implementation: [`docs/departments/README.md`](../../departments/README.md).

Changes made at approval: unbuilt pages are **greyed out** (muted + `COMING SOON`
pill) while staying clickable; the star shortcut is `Shift + S` so plain letters
can type-to-filter; and the breadcrumb-root entry point was replaced by a
grid-icon button in the page header (the breadcrumb keeps its existing
jump-to-module behaviour).

Answers driving this spec: full-page multi-column index (shape A), and *every*
page listed including ones not built out yet, visibly marked. Everything else
was left to my judgement; each such call is flagged **[my call]** below so it is
easy to overrule.

## Decision: a department *is* a module — one list, two views  [my call]

Departments are not a new grouping layer above modules, and not a mirror of the
real org chart. They are exactly today's seven modules — Home, Finance, Sales,
Purchasing, Warehouse, Production, People — presented as a directory instead of
a tree.

Why: a second hierarchy (e.g. *Operations* containing Warehouse + Production)
would mean two names for the same thing, two places to hide/rename it, and a
level of nesting a single-location shop has no use for. The sidebar tree and the
Departments page become two renderings of one source of truth — `modules()` —
so a page can never appear in one and not the other.

Rejected alternatives, recorded so we don't relitigate:
- *Grouping layer above modules* — adds a level that only helps very large
  installs; if that need appears, it becomes an Enterprise "department groups"
  capability layered on the same list, not a reshaping of it.
- *Departments = org teams* — teams are a permissions concept, not a navigation
  one; conflating them would make navigation change when someone's role changes.
- *Departments replace the sidebar* — the sidebar is the fast path for the
  pages you use daily. Departments is the slow, complete path. Both stay.

Consequence: the word "department" is a **label over modules** and must go
through the terminology layer, so a workspace can call them Departments,
Modules, or Areas without any structural change.

## Screens & states

**One page, six-to-seven column-flowing blocks** (shape A). Not cards, not a
drill-down: every department heading and every page link is on screen at once,
laid out with CSS multi-column so it reflows from 3 columns wide down to 1 on a
narrow window. No scroll on a normal desktop window at the current page count.

Anatomy of the page:

- **Header** — title (the terminology label, default *Departments*), one muted
  line of purpose, and a filter box, right-aligned.
- **Jump back in** — a single row of up to 5 recent pages above the grid, from
  the existing `recents` (page kind only). Absent entirely when recents are off
  or empty; never a placeholder.  **[my call]**
- **Department block** — the department name as a section heading in the module's
  own icon + label, then its pages as a flat vertical list of links.
- **Setup rule** — when a department has setup/reference pages (Units of
  Measure, Chart of Accounts, Sales Prices, Purchase Prices, Tax), those sit
  below a hairline rule inside the same block, under a small muted *Setup*
  label. Everything else stays a flat list in the existing `modules()` order —
  no Lists/Tasks/Reports taxonomy.  **[my call: structure only where it earns
  its place; four subheads per department is exactly the feature noise the
  product principle warns about]**
- **Page row states**
  - *Live* — normal link; hover gets the standard row treatment (background
    tint, 1px nudge, 120ms transition) per the interaction rule.
  - *Not built out* — same link, muted label, and a small `Soon` tag at the
    right. Still clickable: it routes to the existing "not built out in this
    prototype" screen, so the map stays honest and complete.
  - *Active* — the page you are currently on is marked (primary dot + weight),
    so Departments doubles as "where am I".
  - *Favorited* — filled ★ at the row's right edge; outline ★ on hover/focus in
    a permanently reserved slot (no layout shift), toggling the existing
    favorite. Reuses the sidebar's star behaviour exactly.  **[my call]**
- **Filter box** — narrows *within* the page: department blocks with no match
  disappear, matching substrings in page names highlight, a match count reads
  out, and an empty result shows one muted line plus a *Clear* action. It filters
  the map; it does not become a second search palette.  **[my call]**
- **Empty-ish workspaces** — a department whose pages are all switched off does
  not render at all (see Scale behaviour). If a filter or configuration leaves
  nothing to show, the page shows a single muted explanatory line, never a
  blank screen.
- **Right-click a page row** → the existing sidebar context menu (`navCtx`):
  *Open*, *Open in new tab*, *Add to / Remove from favorites*.

**Entry points** — Departments is reachable four ways:  **[my call]**
1. A **Departments** item pinned at the very top of the sidebar, above Favorites
   (grid icon; in the collapsed rail it is the icon alone with a tooltip).
2. The **breadcrumb root** — clicking the workspace/department crumb opens it.
3. **⌘⇧D / Ctrl+Shift+D** from anywhere (⌘D is already favorite-toggle).
4. As an optional **landing page after login** (per-user setting, off by
   default; `defLanding` gains a *Departments* choice).

It opens as a normal workspace page (breadcrumb, tab), not a modal — it is a
place you can sit in, tab away from, and come back to.

**Motion** — the page's blocks fade+rise 6px in a 40ms stagger on open; the
filter animates rows out rather than snapping; the star fills with a small
scale-pop. All ≤180ms, all built with the feature, not later.

## Data model

**No new entities.** Departments is a *derived view* — this is deliberate and is
the main reason the feature is cheap to ship and impossible to desync.

It reads:
- `modules()` — ids, terminology-resolved names, page lists (already axis- and
  toggle-aware).
- `ws.modules` — per-workspace module visibility.
- `ws.axes` — capability toggles that add/remove individual pages.
- `favorites` — for the star state.
- `recents` — for *Jump back in*.
- **New:** a small static registry of page metadata, `pageMeta`, keyed
  `<module>/<page>`, holding two flags per page:
  - `built: boolean` — does this prototype have a real screen for it
    (drives the `Soon` tag; disappears at handoff when everything is built).
  - `kind: 'work' | 'setup'` — drives the Setup rule.
  Both belong next to `modules()` in the app shell, not in a token or data file.

Backend-side, `pageMeta.kind` is static app metadata (ship it in code, not the
database); `built` has no server equivalent.

## Scale-adaptive behaviour  [my call]

The directory must not become a wall of irrelevant links for a one-room shop.

- A department switched off in **Settings → Workspace → Modules** does not
  appear — no trace, no locked shell (it is a deliberate workspace choice, not
  a plan boundary).
- A page whose capability axis is off does not appear, matching the sidebar
  exactly (e.g. *Production Orders* without the production axis).
- **Higher-tier pages** appear **locked with a short upgrade hint** when the
  capability is on the natural growth path, and are **absent** when niche —
  per the existing gate-UX rule. Nothing is pre-built here: the Starter base
  ships ungated, and lock rendering lands in the scale-up pass. The row's right
  edge already reserves a slot (star / `Soon`), so a lock badge drops in without
  reflowing the layout.
- **User-level reordering / hiding of departments is deferred**. The page's
  order is the workspace's module order; a personal reorder is what Favorites
  already does better.
- Because the layout is column-flow, 7 departments × 4 pages and 12 × 20 both
  land as a readable page — the small case gets a short page, not a sparse grid.

| Capability | Tier | Default |
|---|---|---|
| Departments page (full index, filter, stars, recents row) | **Starter base** | On, ungated |
| Open Departments as landing page | **Starter base** | Off per user |
| Locked/upgrade rows for higher-tier pages | Growth (rendering) | n/a at Starter |
| Department groups (a layer above departments) | Enterprise | Not built |
| Per-department landing pages (KPIs, open tasks) | Growth | Not built — see below |
| Admin-pushed department visibility presets by role | Enterprise | Not built |

**Deferred: per-department landing pages.** A *Warehouse* home with KPIs and
open tasks is a genuinely useful thing, but it is a dashboard feature, not a
navigation one, and it would put counts and numbers on the map — data slop on a
screen whose whole job is to be scannable. Departments ships as an index only;
department dashboards get their own spec if we want them.

## Settings surfaces (shipped in the same turn as the feature)

- **Workspace** — Settings → Workspace → *Modules* (exists) is stated in that
  UI as governing both the sidebar and Departments, so the effect of a toggle is
  not a surprise.
- **Configuration** — Settings → General → **Navigation**: *Departments page*
  on/off (this is the toggle any later gating hangs off), *Show "Jump back in"*
  on/off, *Show pages that aren't built yet* on/off (prototype-only; defaults
  on, matching the answer that everything should be listed).
- **Terminology** — new key `object.departments.label` (default *Departments*;
  alternatives *Modules*, *Areas*), resolved through `termGet()` everywhere the
  word renders — sidebar item, page title, breadcrumb, shortcuts page, search
  results. Existing `module.<id>` renames already flow through.
- **User-level** — Settings → My settings: *Open Departments on sign-in*
  (adds a `Departments` option to `defLanding`), and the existing *Show recents*
  preference governs the Jump-back-in row (one preference, not a second one).

## Interactions & business rules

- Clicking a page navigates via the existing `gotoPage(module, page)` — same
  default-view application, same recents push, same dataset switching. There is
  no second navigation code path.
- The filter matches page name **and** department name, case-insensitive,
  substring; it never searches records (that is the search palette's job) and
  never leaves the page.
- Starring from Departments and starring from the sidebar are the same action on
  the same favorite; both surfaces update immediately.
- Departments itself is **not** favoritable and never appears in its own index.
- A page the user lacks permission for is **hidden**, never shown-and-refused —
  same rule as favorites.
- Opening Departments never clears grid state on the page you left; it is a page
  like any other and the workspace tab keeps its state.
- Terminology and module renames apply live, with no reload.

## Keyboard shortcuts (built with the feature, catalogued the same turn)

| Shortcut | Action | Scope |
|---|---|---|
| `⌘⇧D` / `Ctrl+Shift+D` | Open Departments (and close it back to the previous page) | Global |
| type any letter | Focus the filter box and start filtering | Departments |
| `↑ / ↓` | Move focus down/up the current department's list, wrapping into the next | Departments |
| `← / →` | Jump to the previous / next department block | Departments |
| `Enter` | Open the focused page | Departments |
| `⌘Enter` / `Ctrl+Enter` | Open the focused page in a new workspace tab | Departments |
| `S` | Star / unstar the focused page | Departments |
| `Esc` | Clear the filter if set, otherwise return to the previous page | Departments |

All guarded by the existing `onGrid` / `typing` pattern, and added to
**Settings → General → Keyboard shortcuts** (`shortcutGroups()`, new group
*Departments*) in the same turn — a shortcut absent from that page does not
count as shipped.

## Persistence (prototype)

Nothing new of substance. The three configuration flags follow the existing
scalar pattern (`shelfree.settings.nav.departments.v1`,
`…nav.deptRecents.v1`, `…nav.deptShowUnbuilt.v1`); the terminology key lands in
the existing terminology store; the landing-page choice lands in the existing
`me` record. The filter query is transient state and is deliberately **not**
persisted.

## Backend-build notes

- **No new endpoints.** Departments is composed client-side from
  `GET /me` (landing page, recents preference), `GET /workspace/settings`
  (module visibility, capability axes, terminology, navigation flags), and the
  existing `GET /favorites`.
- If a server-driven navigation manifest is ever wanted, the shape is
  `GET /navigation` → `[{ id, name, order, pages: [{ id, name, kind, minTier,
  enabled }] }]`, already filtered by the caller's permissions and workspace
  configuration — the client would render it unchanged. Until then `modules()`
  is the contract.
- Page-level authorisation is a **server** concern: the client hiding a page is
  a UX nicety, not a control; every page's own endpoints must independently
  reject unauthorised callers.

### Decisions & deferred-to-backend

- **Departments = modules** (one list, two renderings). No new hierarchy, no new
  entity — chosen to make desync structurally impossible.
- **Everything is listed, unbuilt pages tagged `Soon` and still clickable** —
  the user's explicit choice; `pageMeta.built` is prototype-only scaffolding and
  is deleted at handoff.
- **Index only** — per-department dashboards, counts and badges deliberately
  excluded (data noise on a wayfinding screen) and deferred to their own spec.
- **No per-user reorder/hide** — Favorites already serves personalisation;
  duplicating it here would give two ways to shape the same nav.
- **Tier gating not pre-built** — Starter base ships ungated per the build
  order; the lock/upgrade rendering and its slot are specified now so the
  scale-up pass is additive.
- **Business rules for the backend:** module visibility and capability axes are
  workspace-scoped and must be enforced server-side; a navigation manifest, if
  built, must be computed per user (permissions) and per tenant, never cached
  across tenants.
- **Security surface:** Departments displays no PII and no financial figures —
  only page names and the user's own recents/favorites. Recents *are* per-user
  behavioural data: they must stay user-scoped and never be readable by another
  user in the workspace. Nothing new lands in localStorage beyond the flags
  above. No new audit-relevant mutations (starring is already covered).

## Success criteria

- A new employee finds *Physical Inventory* without knowing it lives under
  Warehouse, in one keystroke and one glance.
- Every page in the app appears exactly once on the page; nothing in the sidebar
  is missing from it and nothing on it is missing from the sidebar.
- A single-location shop with three modules off sees a short, dense page — no
  empty columns, no locked rows, no upgrade noise.
- Renaming *Warehouse* to *Store* in terminology changes the heading here
  immediately.
- Filtering to "inv" narrows to the handful of invoice/inventory pages with the
  match visible, and `Enter` opens the first one.
- Every shortcut above appears in Settings → General → Keyboard shortcuts.
