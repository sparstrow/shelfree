# Settings

Code: `apps/web/src/components/settings/` (frame, templates, registry), `components/help/` (quiet help),
`features/settings/` (the sections), `routes/settings/`, `routes/$module/settings/`,
`domain/settings-permissions.ts`. Spec: `docs/superpowers/specs/2026-11-24-settings-redesign.md`.
Plan: `docs/superpowers/plans/2026-11-24-settings-redesign.md`. The original prototype lives in
`prototype/designs/erp/Shelfree App.dc.html` and is still the reference for sections not moved yet
(see the last part of this file).

## Overview

Settings has four **areas**, by who a setting is for:

| Area | Kind | What it holds | Who can edit |
|---|---|---|---|
| **Workspace** | `workspace` | Company-wide: business profile, GST registrations, plan, modules, regional format, team & roles, terminology, navigation, states | Owner and admin |
| **Module** (Purchasing, Sales, Warehouse, Production, Finance, People) | `module` | Everything that configures one module, plus that module's slice of the shared lists | Owner, admin, or a user with the **Manage settings** right for that module |
| **Shared lists** | `shared` | The whole cross-module lists (number sequences, statuses, custom fields, payment terms, tax codes), all modules in one grid | Owner and admin |
| **Personal** | `personal` | The signed-in user's own preferences | The user |

A module's settings are reachable from two places and are the same page: the **Settings** item at the end
of the module's sidebar section (`/<module>/settings`), and central **Settings** (the gear), which lists
every area. Inside a module the left list shows only that module's sections plus an "All settings" link.

Tiers are parked (CLAUDE.md "current working mode"): nothing here is gated by plan. A section whose
capability is switched off (for example Sales pricing with customer pricing off) stays listed.

Everything is frontend-only today: reads and writes go through `data/api/` to localStorage. The backend
build follows the notes at the end.

## Screens & states

### URLs and sections

One URL per section. `<module>` is one of `purchasing | sales | warehouse | production | finance | people`.
"Ported" means the section body exists in the React app; the rest show "This section has not been moved to
the new app yet" inside the frame, with a link to a ported section.

| Area | URL | Type | Ported |
|---|---|---|---|
| Workspace | `/settings/ws-profile` Business profile | form | yes |
| Workspace | `/settings/ws-gst` GST registrations | list | not moved yet |
| Workspace | `/settings/ws-plan` Plan & billing | custom | not moved yet |
| Workspace | `/settings/ws-modules` Modules & capabilities | custom | not moved yet |
| Workspace | `/settings/ws-regional` Regional & format | form | not moved yet |
| Workspace | `/settings/ws-team` Team & roles | list | not moved yet |
| Workspace | `/settings/terminology` Terminology | list | not moved yet |
| Workspace | `/settings/cfg-nav` Navigation | custom | not moved yet |
| Workspace | `/settings/cfg-favorites` Favorites & views (workspace part) | custom | not moved yet |
| Workspace | `/settings/cfg-states` States & territories | list | not moved yet |
| Purchasing | `/purchasing/settings/carrier-types` Carrier types | list | yes |
| Purchasing | `/purchasing/settings/sequences` Number sequences (slice) | list, shared | yes |
| Purchasing | `/purchasing/settings/statuses` Statuses & stages (slice) | list, shared | yes |
| Purchasing | `/purchasing/settings/fields` Custom fields (slice) | list, shared | yes |
| Purchasing | `/purchasing/settings/terms` Payment terms (slice) | list, shared | yes |
| Sales | `/sales/settings/cfg-pricing` Sales pricing | form | not moved yet |
| Sales | `/sales/settings/sequences`, `statuses`, `fields`, `terms` (slices) | list, shared | yes (all four) |
| Warehouse | `/warehouse/settings/uom` Units of measure | list | yes |
| Warehouse | `/warehouse/settings/categories` Item categories | list | yes |
| Warehouse | `/warehouse/settings/locations` Locations & warehouses | list | yes |
| Warehouse | `/warehouse/settings/sequences`, `fields` (slices) | list, shared | yes |
| Production | `/production/settings/assembly` Assembly & production | form | not moved yet |
| Production | `/production/settings/sequences`, `statuses` (slices) | list, shared | yes (both) |
| Finance | `/finance/settings/cfg-taxset` Tax settings | form | not moved yet |
| Finance | `/finance/settings/tax-codes` Tax codes (slice) | list, shared | not moved yet |
| Finance | `/finance/settings/sequences` Number sequences (slice) | list, shared | yes, but no document type belongs to Finance yet, so it shows an empty read-only list |
| People | `/people/settings/fields`, `sequences` (slices) | list, shared | yes (both) |
| Shared lists | `/settings/shared/sequences` Number sequences | list | yes |
| Shared lists | `/settings/shared/statuses`, `fields`, `terms` | list | yes
| Shared lists | `/settings/shared/tax-codes` | list | not moved yet |
| Personal | `/settings/me-profile`, `me-appearance`, `me-notifications`, `me-language`, `me-defaults`, `me-security` | form | not moved yet |
| Personal | `/settings/me-favorites` Favorites & views | custom | not moved yet |
| Personal | `/settings/shortcuts` Keyboard shortcuts | custom | yes |

Roots: `/<module>/settings` redirects to the module's first section. `/settings` redirects to Business
profile (owner, admin) or Profile (member). An unknown module, section or list id is "Page not found".
The registry is `components/settings/registry.ts`; the ported sections are the one-line entries in
`features/settings/sections.ts`.

### Section types

Every section is built from one of three types, never from scratch:

| Type | Template | Used by |
|---|---|---|
| **form** — label \| control rows | `SettingsSection` (groups of rows, dirty tracking, Save bar, leave guard, quiet help) | Business profile |
| **list** — records you add, edit, delete | `ListPage` with `embedded` inside `SettingsPage flush` (no top bar of its own, New in the grid toolbar), drawer editor (`editor`) | Units of measure, Number sequences |
| **custom** — own body | `SettingsPage` (title row, quiet help, loading / error) | Keyboard shortcuts |

A **shared list** section is one component with an optional `module` prop. A module area passes its module:
rows of other modules are hidden and New pre-fills the module's first document type. Central Shared lists
passes none and shows a Module column.

### Frame (`SettingsFrame`)

- **Central** (`/settings/...`, `/settings/shared/...`): left list grouped Workspace, Modules (one
  collapsible entry per module, expanding to its sections; links go to the module URLs), Shared lists,
  Personal. Only areas the user can view are listed: a member sees Personal and the modules their
  `perms` allow; Workspace and Shared lists are hidden from a member.
- **Module area** (`/<module>/settings/...`): that module's sections plus "All settings".
- **Breadcrumb:** `Settings ▸ Workspace ▸ Business profile` or `Purchasing ▸ Settings ▸ Number sequences`.
  The tab title reads "<Module> settings".
- **Find a setting** (central only, top of the list): searches section names, row labels and help text
  across the areas the user can view, ranked label prefix, word prefix, contains, help text. Shows the
  best 8; one hit per row label. Row labels come from each section's help map (`SETTINGS_HELP_MAPS`).
  ↑ ↓ move, Enter opens the match, Esc clears. A row hit opens the section with `?find=<rowKey>`; the
  frame scrolls to the element marked `data-setting-row="<rowKey>"` and highlights it for about 2 s. Form
  sections mark every row (key) and group (group id). List sections do not mark rows, so a row hit in a list
  section only opens the section.
- **Phones:** the left list becomes a grouped select (`optgroup` per area) above the section.
- **States:** loading skeleton, error with "Try again", "not moved yet", "no access" (see below), not found.
- **Read-only line:** a quiet "View only — ask an admin to change these settings." under the title.

### Entries elsewhere

- Every module's sidebar section ends with **Settings** (gear). It can be favourited and opened in a new tab.
- The top-bar gear opens `/settings`; the account menu "My settings" opens `/settings/me-profile`.
- Departments (`/departments`) lists each module's Settings page.
- People ▸ Users has a "Manage roles" link to `/settings/ws-team` (Team & roles is Workspace only).

### Legacy ids redirect

Old `/settings/<id>` links, favourites and recents keep working: the route replaces the URL with the new one.

| Old id | New URL |
|---|---|
| `uom`, `categories`, `locations` | `/warehouse/settings/<id>` |
| `carrier-types` | `/purchasing/settings/carrier-types` |
| `cfg-pricing` | `/sales/settings/cfg-pricing` |
| `assembly` | `/production/settings/assembly` |
| `cfg-taxset` | `/finance/settings/cfg-taxset` |
| `cfg-sequences`, `cfg-statuses`, `cfg-fields`, `cfg-terms`, `cfg-tax` | `/settings/shared/sequences`, `statuses`, `fields`, `terms`, `tax-codes` |

Ids that still live at `/settings/<id>` (all `ws-*`, `me-*`, `terminology`, `cfg-nav`, `cfg-favorites`,
`cfg-states`, `shortcuts`) never redirect. The table is `legacyIds` plus a module-section fallback in
`legacyTarget()` in the registry.

### Keys

Data: `components/settings/shortcut-meta.ts` (catalogue: `src/app/shortcuts.ts`, Settings group).

| Key | Action |
|---|---|
| `[` / `]` | Previous / next section in the current list (central: across the expanded areas; module: within the module) |
| `/` | Focus Find a setting (central only) |
| ↑ ↓ Enter Esc | In Find a setting: move, open, clear |
| `?` | Show / hide every description inline (per user, `me.showSetHelp`, off by default) |
| Ctrl/Cmd+S | Save a form section |
| Esc | Close an open description, or discard unsaved changes |

All are ignored while typing in a field or when a dialog, menu, listbox or popover is open. In read-only
mode Ctrl+S and Esc-discard do nothing, and the list's N / E / Delete keys are off.

### Read-only mode and who sees what

| Viewer | Workspace | Shared lists (whole) | Module `m` | Personal |
|---|---|---|---|---|
| Owner, admin | edit | edit | edit | edit |
| Member, `perms[m]` is `read` or `write`, `settings[m]` true | no access | no access | edit | edit |
| Member, `perms[m]` is `read` or `write`, `settings[m]` not true | no access | no access | view only | edit |
| Member, `perms[m]` is `none` | no access | no access | no access | edit |

- "No access" shows a lock message ("Workspace settings are for owners and admins." or "You don't have
  access to <Module> settings.") with a link to Personal settings.
- The role is the demo role (`useUi().demoRole`); a member's user record is found by the signed-in email
  in the `users` list. The rules are pure functions in `domain/settings-permissions.ts`
  (`canViewArea`, `canEditArea`) behind the `useSettingsAccess(area)` hook. UX only: the backend enforces.
- **View only:** a form section shows each value as text in the same row (edit in place, nothing moves),
  has no Save bar, and Ctrl+S is inert. A list section hides New, Edit, Duplicate, Delete, custom actions
  and bulk actions, ignores the editing keys, and opens the drawer in view mode. The title row shows the
  line above. `SettingsPage readOnly` also provides `useSettingsReadOnly()` to a custom body.
- A module slice with no document types of its own (Finance ▸ Number sequences today) is read-only for
  everyone and shows "No document types use number sequences in this module yet."

### Templates (API)

- `SettingsFrame` — props `area`, `sectionId`, `sections` (id → component), `helpMaps`, `highlightRow`.
  A section component receives `{ module?, readOnly? }`.
- `SettingsPage` — title row (title ⓘ, optional count pill and `actions`), loading skeleton, error + retry,
  body, and (given `form`) the save bar. `width="wide"` for tables; `flush` fills the pane height without
  padding for an embedded `ListPage`; `readOnly`.
- `SettingsSection<V>` — `SettingsPage` + `useSettingsForm` + `SettingsRows`. Props: `id`, `title`, `help`
  (`HelpMap`: `page`, a key per group id, a key per row), `saved`, `isLoading`, `error`, `onRetry`,
  `onSave(next)` (the whole document), `groups`, optional cross-field `validate`, `readOnly`.
- A row: `{ key, label, control, help?, default?, defaultText?, validate?, warn?, hidden?, locked? }`;
  controls `text | select | switch | number | area | readonly`. `default` enables "Use default" in the popover
  while the value differs. `validate` blocks Save with an error under the value; `warn` is a non-blocking note.
- `useSettingsForm` — draft holds only the changed keys over the saved value; dirty = keys that differ;
  one save at a time; toast `Saved`; **leave guard** (`useBlocker` + `beforeunload`): Keep editing /
  Discard and leave / Save and leave. The save bar is mode-stable ("No unsaved changes" / "N unsaved changes").
- `ListPage` gained two opt-in props for settings (other lists unchanged): `embedded` (no top bar and no
  page-level New; New moves into the grid toolbar; keys are scoped to the pane) and `readOnly`. `DataGrid`
  got the matching `embedded` / `readOnly` props.
- Register a ported section with one line in `features/settings/sections.ts` (component) and, for Find a
  setting, one entry in `SETTINGS_HELP_MAPS`.

### Quiet help (`components/help/`)

Settings pages are quiet: no descriptive text inline. `HelpTarget` wraps a label or title and adds the ⓘ
button (`aria-label="About …"`, `aria-expanded`). Mouse: hover the label or ⓘ about 400 ms opens the popover,
click pins, Esc / ✕ / click outside closes; ⓘ fades in on row hover or focus. Keyboard: focusing ⓘ opens it,
Enter or Space pins. Touch (`(hover:none), (pointer:coarse)`): ⓘ always visible, 44 px, opens a bottom sheet.
The popover flips to the side with room and caps its height. `?` prints every description inline.
Content (`HelpContent`): title, body, each option (current marked, default tagged), "Default: …" with
**Use default**, a compliance note. A page's help is one pure `HelpMap` (`types.ts`).

Help maps that exist: Business profile (`features/settings/business-profile/help.ts`), Number sequences
(`number-sequences/help.ts`), Units of measure (`units-of-measure/help.ts`). A new section ships its map in
the same turn; it also feeds Find a setting.

### Ported sections

- **Business profile** (`/settings/ws-profile`, form, workspace, owner / admin). Name, legal name, industry,
  contact, address, PAN. GSTIN is read-only here (primary registration) and is managed under GST
  registrations. Validation: name and legal name required; email shape; six-digit PIN; PAN `AAAAA9999A`.
  State vs GSTIN state code and PAN vs GSTIN are warnings only.
- **Units of measure** (`/warehouse/settings/uom`, list on `ListPage embedded`) — see
  `docs/units-of-measure/README.md`.
- **Item categories** (`/warehouse/settings/categories`, list on `ListPage embedded`) — see
  `docs/item-categories/README.md`.
- **Locations & warehouses** (`/warehouse/settings/locations`, list on `ListPage embedded`) — see
  `docs/locations-warehouses/README.md` ("React app"). Structure Designer and wizard not ported (G-016).
- **Number sequences** (`/<module>/settings/sequences`, `/settings/shared/sequences`) — see
  `docs/number-sequences/README.md`.
- **Keyboard shortcuts** (`/settings/shortcuts`, custom, personal). Renders `SHORTCUT_GROUPS` from
  `src/app/shortcuts.ts`: grouped by where the keys apply, searchable, `/` focuses search, Esc clears.
  Templates expose their keys as data beside their code (`shortcut-meta.ts` in `list-page`, `data-grid`,
  `record-page`, `document`, `settings`); a page's own keys are a `ShortcutMeta` in its `shortcuts.ts`.
  A page adds its group to the catalogue in the same turn it adds a key.

## Data model

Settings has no single settings table. Each area keeps the document it already had.

- **Workspace identity** — `Workspace` (`data/api/session.ts`): name, legal name, industry, contact,
  address, PAN, GSTIN (read mirror of the primary registration).
- **Workspace configuration switches** — one settings document (`data/api/settings.ts`): purchasing / tax
  switches. Unchanged.
- **Per-user settings** — `Me` (`showSetHelp` today; more as Personal sections are ported).
- **User access** — `User.perms: Record<module, 'none' | 'read' | 'write'>` and
  `User.settings: Record<module, boolean>` (the **Manage settings** right; default `{}`). Presets: owner and
  admin all true; manager true where `perms[m] === 'write'`; every other role false. The right needs module
  access (`perms[m] !== 'none'`) and only exists for modules with a settings area: finance, sales,
  purchasing, warehouse, production, people.
- **Units of measure** — collection `unitsOfMeasure` (custom units on top of the default list).
- **Number sequences** — collection `numberSequences`; see its doc.
- **Registry** (code, not stored): `SettingsArea { id, label, kind, sections }`,
  `SectionDef { id, label, type, shared?, legacyIds? }`, `SharedListId = sequences | statuses | fields | terms | tax-codes`.
- Shared lists will carry the owning module on each row (`module` on number sequences today; the spec's
  `modules: string[]` for lists that serve several modules, such as payment terms, comes with those lists).

## Interactions & business rules

- **Access** — table above. Owner and admin: everything. Workspace and whole shared lists: owner and admin
  only. Module: view needs module access, edit needs `settings[module]`. Personal: the user.
- **One save per section.** A form section saves its whole document in one call; list sections save per record.
  This keeps one audit event per save.
- **Edit in place.** View and edit show the same rows in the same positions; read-only is the same layout
  without controls.
- **Unsaved changes** block navigation (guard) in form sections.
- **Terminology** (prototype, not moved yet) is a display layer: renames re-label the UI live, data keys and
  ids are never renamed.

## Persistence

All client-side for now. Screens never touch storage: they use TanStack Query hooks in `data/queries/`, which
call `data/api/`.

| Data | Storage key | Hook / api |
|---|---|---|
| Workspace identity | `shelfree.v2.workspace` | `useWorkspace`, `useUpdateWorkspace` (`sessionApi.updateWorkspace`) |
| Per-user settings | `shelfree.v2.me` | `useMe`, `useUpdateMe` |
| Configuration switches | `shelfree.v2.settings` | `data/api/settings.ts` |
| Users (access, Manage settings) | `shelfree.v2.users` | `useList('users')` |
| Units of measure | `shelfree.v2.unitsOfMeasure` | `useList('unitsOfMeasure')` |
| Number sequences | `shelfree.v2.numberSequences` | `useNumberSequences` and friends |
| Demo role | UI store (`useUi().demoRole`) | demo only |

The prototype's `shelfree.settings.*.v1` keys are not read by the React app.

## Backend-build notes

### Endpoints

One read and one write endpoint per section so an audit event maps to exactly one section:

| Endpoint | Purpose |
|---|---|
| `GET /settings/<area>/<section>` | Read a section document. `area` is `workspace`, a module id, or `personal`. |
| `PUT /settings/<area>/<section>` | Replace a section document. Send `If-Match` (version); `409` on a stale version. |
| `GET/POST/PUT/DELETE /units-of-measure` | Unit definitions. |
| `GET/POST/PUT/DELETE /number-sequences`, `POST /number-sequences/{id}/default`, `POST /number-sequences/{docType}/issue` | See `docs/number-sequences/README.md`. |
| `GET /workspace`, `PATCH /workspace` | Identity (Business profile) while it keeps its own resource. |
| `GET/PATCH /me/settings` | Personal settings, signed-in user only. |

For `PUT`, accept the full document, validate every row server-side, respond with the stored document.
The form sends only changed keys internally; the API may also accept `PATCH` with changed keys.

### Permission checks per area

Enforced server-side on every request. The React checks are UX only.

| Area | Read | Write |
|---|---|---|
| `workspace`, `shared` (whole lists) | owner, admin | owner, admin |
| module `m` | owner, admin, or `perms[m]` is read / write | owner, admin, or `perms[m]` is read / write and `settings[m]` is true |
| `personal` | the user | the user |

A write without the right is `403`. Module slices of shared lists follow their module. Granting or changing
`settings[m]` is itself admin-only and audited (see `docs/people/README.md`).

### Audit

Every settings save emits an audit event: actor, area, section, time, before and after (changed keys),
request id. List sections emit one event per create, edit, delete and, for number sequences, set default.
Tax-relevant identity fields (GSTIN, PAN, legal name) keep their change history.

### Decisions & deferred-to-backend

- **Four areas, one frame.** Spec 2026-11-24. Module settings sit next to the module and in central
  Settings; shared lists show a module slice in a module and the whole list centrally.
- **Registry is the source of truth** for areas, sections, URLs and redirects. The redirect table is
  client-side; the backend serves no navigation.
- **Own nav inside the page.** The React frame keeps the app sidebar and puts section navigation inside the
  page (the prototype swaps the sidebar).
- **Save model.** Form rows are always editable and held until Save, with an unsaved count and a leave guard.
- **Backend rules to enforce:** the permission table above; business profile validation (name and legal name
  required, email, six-digit PIN, PAN shape; GSTIN not edited here); `If-Match` versions; no secrets or
  sensitive data client-side (`showSetHelp` is a harmless preference).
- **Differences from the spec (code wins):**
  - Spec: a module area appears only when the module is on. Code: all six module areas are listed for anyone
    allowed to view them; there is no module on/off check yet (`areasForModules` exists but is not used by
    the frame or routes). Deferred until Modules & capabilities is ported.
  - Spec: module off redirects to `/settings`. Not implemented, same reason.
  - Spec: shared records carry `modules: string[]`. Code (decided in run 2.1, gap G-011): number sequences,
    statuses and custom fields carry a single `module` derived from their document type / flow / entity (each
    belongs to exactly one module); payment terms carry `modules: string[]` (a term serves Purchasing and Sales)
    and a module slice filters by inclusion.
  - Spec: Find a setting highlights the row. Code: only form sections mark rows; list sections only open.
  - Spec: Team & roles lists the Manage settings column. The column ships on People ▸ Users; Team & roles is
    not moved yet.
- **Deferred:** the 20+ sections marked "not moved yet" (Phase 2 of the plan); module on/off checks; review
  before save for Tax settings; terminology overrides; plan and billing (no billing is built); logo upload,
  password change and session revocation (stubs).

## Prototype reference — sections not moved yet

Everything below describes the prototype's behaviour and its old ids and keys. Where a section has been
ported, the part above wins. Use it as the reference when porting; new URLs are in the table above.
Prototype persistence used `shelfree.settings.*.v1` localStorage keys.

### Prototype behaviour that still applies

- **Plan & billing** — three plan cards (Starter / Growth / Enterprise); clicking one calls `setPlan()`
  (mocked, no billing). Payment method is a stub.
- **Modules & capabilities** — per-module on/off (Home and Warehouse cannot be switched off); scale-axis
  capability toggles, each with a minimum tier.
- **Regional & format** — base currency, timezone, date and number format, fiscal start, week start.
- **Team & roles** — role cards (Owner / Admin / Manager / Member) and a role × module permission matrix.
  Individual users live in People ▸ Users.
- **Terminology** — searchable list of renameable labels. Each row shows the original name (always visible)
  and an editable field; records track singular and plural; per-row Reset and a global "Reset all" with a
  confirm. Renames apply live (sidebar, breadcrumb, tabs, page search, table headers). Data keys and ids are
  never renamed. Overrides are workspace-scoped and read by everyone. Keys: `module.<id>`,
  `object.<item|customer|vendor|po>.<singular|plural>`.
- **My settings** — Profile; Appearance (theme, default grid density); Notifications (four toggles and a
  channel); Language & region; Personal defaults (landing page, default location, assembly defaults, tax
  split); Security (password stub, 2FA toggle, sessions stub).
- **Saved flash** — a transient "Saved" toast on any settings write (the React frame shows the `Saved` toast).


### Terminology keys (2026-08-01)

- `object.location.singular` / `.plural` (default Location / Locations) — the
  Items grid column header, the item page's "Stock by …" heading and the drawer
  heading resolve through it, so a business can say Warehouse or Site.
- `field.lotBatch.label` (default `Lot/Batch`) — the grid column, the item
  Details fact and the "Tracks …" checkbox in the item edit panel. This row only
  appears in the Terminology editor while the `lotBatch` axis is on: renaming a
  field the workspace cannot see would be feature noise.

Renaming a term re-labels live via `syncAxisCols()`; underlying field names
(`tracksLot` etc.) never change.

### Personal default location is now wired

**My settings › Personal defaults › Default location** was modelled but unused.
It now pre-scopes the Items grid to that site when `multiWarehouse` is on (see
`docs/erp-app/README.md` → Location scope chip). Its options come from
`siteDefs()` rather than the previous hardcoded (and drifted) list.

## Tax codes (added 2026-09-25)

**Settings ▸ Configuration ▸ Tax codes** (id `cfg-tax`, ungated POC) replaced the static
preview. Persisted to `shelfree.settings.workspace.v1` under `taxCodes`. Full spec:
`docs/tax-codes/README.md`.

**Settings ▸ Configuration ▸ Tax settings** (id `cfg-taxset`, 2026-09-26) — `ws.taxSettings` +
category `taxCode`; user preference `me.showTaxSplit` on My settings ▸ Personal defaults ▸ Documents.
Full spec: `docs/tax-settings/README.md`.

## Carrier types (added 2026-09-24)

**Settings ▸ Configuration ▸ Carrier types** (id `carrier-types`, ungated POC). Editable Type
list for Purchasing ▸ Carriers, persisted to `shelfree.settings.workspace.v1` under
`carrierTypes`. Full spec: `docs/carrier-types/README.md`.

## Assembly & production (added 2026-08-03)

**Settings ▸ Configuration ▸ Assembly & production** (id `assembly`, Starter
tier, ungated). Workspace-level config for the assembly workflow, persisted to
`shelfree.settings.workspace.v1` under `production`:

- *Defaults* — finished goods arrive at (location), default scrap allowance %,
  and work-in-progress location (shown only when `axisOn('production')`).
- *Behaviour* — three switches. *Correct component quantities when finishing*
  (manual consumption) is **off** by default — the minimal path is "finish and
  it's done." *Allow release with shortages* and *Allow consuming more than
  planned* are **on** by default: a small shop starts a build anyway and receives
  the missing part the same day, so Shelfree should not block it. Switching them
  off is the tighter-control choice, not the default. See `prodCfgDefaults()`.

**My settings ▸ Personal defaults** gains an *Assembly orders* card: build-at
location (empty = use the workspace default) and default quantity, stored on the
user record as `defAssemblyLoc` / `defAssemblyQty` and applied by `newAo()`.

Full rules and backend contract: [`../production/README.md`](../production/README.md).


## Favorites & views (added 2026-08-03)

Three surfaces landed with the favorites feature (details in
[`docs/favorites-views/README.md`](../favorites-views/README.md)):

- **My settings ▸ Favorites & views** (`me-favorites`, Starter) — reorder/remove
  pinned rows, manage saved views (make default, pin, rename, duplicate, delete),
  and the *Show recents in page search* toggle with a Clear action.
- **Configuration ▸ Favorites & views** (`cfg-favorites`, Starter) — feature
  on/off (hides the sidebar section and all star buttons workspace-wide) and the
  *pins shown before "Show all"* soft cap (3–30, default 10). This is the toggle
  future Growth/Enterprise gating hangs off.
- **Workspace-level, same page** — *Who can share a view with the team*
  (`sharedViewsRole`: owner / admin / any, default admin). Labelled GROWTH and
  inert: shared views are not built, the rule is recorded for when they ship.

**Terminology** gained `object.favorites.label` (default *Favorites*; also
*Pinned*, *Bookmarks*) and the `object.view` singular/plural pair (*View* /
*Views*), both resolved through `termGet()` in the sidebar head, menus, picker
group headers and toasts.

New keys: `shelfree.settings.favEnabled.v1`, `shelfree.settings.favCap.v1`,
`shelfree.settings.recents.v1`, `shelfree.settings.sharedViewsRole.v1`.


## Sales pricing (added 2026-08-12)

**Settings ▸ Configuration ▸ Sales pricing** (id `cfg-pricing`, **Growth** tier,
locked with the standard upgrade panel below Growth). Workspace policy for
customer-specific pricing:

- *Who can have their own price* — `customerPricingMode`: **No one** (default) /
  Every customer / Selected customers / New customers only. “Selected” reveals a
  per-customer switch list (writes `customer.pricingEligible`); “New customers
  only” stamps `customerPricingNewCutoff` when chosen.
- *When a customer has no agreed price* — `customerPricingFallback` (off: the
  sales line comes through unpriced and is completed manually as price type
  **Manual**; on: silently uses the list price) and
  `customerPricingBlockUnpriced` (off by default; on = the item cannot be sold
  to that customer at all, and it supersedes the fallback).

The page is inert while the **`customerPricing`** capability (Modules &
capabilities, Growth, default off) is off — it shows a card that links there.
**Terminology** gains `field.customerPrice.label` (default *Customer price*),
listed only while the axis is on. Per-customer eligibility is also editable from
the Customer drawer's PRICING block.

New keys: `shelfree.settings.customerPricingMode.v1`,
`shelfree.settings.customerPricingNewCutoff.v1`,
`shelfree.settings.customerPricingFallback.v1`,
`shelfree.settings.customerPricingBlockUnpriced.v1`,
`shelfree.customerPrices.v1`.

Full rules and backend contract: [`../sales-pricing/README.md`](../sales-pricing/README.md).


## Navigation icons (added 2026-08-12)

Every navigable page now carries **one shared glyph**, defined once in
`pageIcons()` / `pageIcon(key)` in `prototype/designs/erp/Shelfree App.dc.html`. The map is
keyed by **module page label** (`'Items'`, `'Sales Prices'`, …), **settings page id**
(`'ws-profile'`, `'cfg-tax'`, …) and **settings group tab** (`'grp-workspace'`,
`'grp-configuration'`, `'grp-terminology'`, `'grp-my'`), plus `__view` (saved view)
and `__fallback` (generic document). Each entry is a single stroke-path `d` string
(multi-subpath) rendered from one `<path>`, so a page looks identical in every
surface it appears in:

- module submenu rows (expanded sidebar accordion),
- collapsed-rail flyout rows (modules, settings, favorites),
- settings sidebar page rows and the Workspace/Configuration/Terminology tabs,
- favorites rows (page favorites use the page glyph; saved views keep the view glyph),
- the placeholder page header (`vm.pageIconD`, keyed off the current page).

No data-model or persistence change — presentation only. When a **new page or
settings page is added, add its glyph to `pageIcons()` in the same turn**; an
unmapped key silently falls back to the document glyph. Document-level pages share
their list page's glyph (`'Purchase Order'` = `'Purchase Orders'`, `'Item'`/`'Item Card'`
= `'Items'`, `'Bill of Materials'` = `'Bills of Materials'`, `'Assembly Order'` =
`'Assembly Orders'`). Icons are decorative: every row keeps its text label, so this
adds no accessibility dependency on colour or glyph alone.

## Update 2026-09-25 — GST registrations (Workspace)
- New page **Workspace ▸ GST registrations** (`ws-gst`) — spec in `docs/gst-registrations/README.md`.
- **Business profile ▸ Tax identifiers:** GSTIN is now read-only (primary registration) with a
  "Manage registrations" button; PAN stays editable and warns when it doesn't match an active GSTIN.
  `ws.gstin` is a read mirror of the primary; `ws.gstRegs` holds the list.

## Update 2026-09-26 — Locations ↔ registrations (GST task 4)
- **Configuration ▸ Locations & warehouses** gains state (required GST dropdown), country, status,
  certificate status, site manager and 3PL operator, plus a live derived GST-registration line — see
  `docs/locations-warehouses/README.md`. **My settings ▸ Default location** options now come from that registry.
- **Workspace ▸ GST registrations** cards list their locations with certificate status and declare /
  make-principal actions — see `docs/gst-registrations/README.md`.
- User-level: `locations.manage` covers certificate-status and state edits (enforced by the backend).
- Terminology: existing `object.location.*` labels apply.


## Update 2026-10-15 — Item categories: quiet help
**Settings ▸ Configuration ▸ Item categories** (id `categories`) and its New/Edit category popup now
follow the quiet-page rule (spec: `docs/tax-settings/README.md` → "Quiet help").
- **Removed:** page description — gone entirely, the title ⓘ carries it (not shown even with `?` on).
  Popup subtitle (`catModalSub`) and the Active toggle's explanation (`cActiveHint`) are hidden by
  default and shown when `me.showSetHelp` is on (`?`).
- **ⓘ + hover:** page title; list columns Parent, Items (count includes sub-categories), Status; popup
  fields Code, Parent category, Accent colour, Active. The Active row is now a real `role="switch"`
  button (`aria-checked`) plus a clickable label, so the ⓘ isn't nested inside a button.
- **Help-text map:** `uomCatHelpText().cat` → `hpCat.<key>`, keys `cat.page|parent|items|status|fCode|fParent|fColor|fActive`.
- **Keyboard:** `?` toggles inline help; listed under "Settings › Item categories" in Keyboard shortcuts.
- Units of measure got the same treatment — see `docs/units-of-measure/README.md`.
- **Backend:** none (static copy; `showSetHelp` lives in per-user settings). No new data or audit surface.

## Update 2026-10-17 — Item categories: Description column
- List view: description moved out from under the category name into its own **Description** column
  (after Category, flexes to fill, single-line ellipsis, full text on hover via `title`). Category column
  is now fixed 280px (dot + name + Group badge). Flow view unchanged (diagram cards).
- Same pattern applied to **Item categories ▸ Tree view** (name column width shrinks 24px per depth so
  descriptions line up), **Carrier types** and **Tax codes** — each grid gained a Description column after
  Type/Name; the description no longer renders under the name. Rule going forward: any settings list with a
  description shows it in its own column, never as a second line.
- **Backend:** none — same `item_category.description` field, display only.


## Update 2026-10-15 — Quiet help on every remaining settings page
All settings pages now follow the quiet-page rule (CLAUDE.md): **no description text on the page** —
only names, labels, controls and live state. Descriptions moved into ⓘ + hover popovers (shared `hp*`
helpers; Esc / ✕ / click-outside closes; touch → bottom sheet). No `?` inline mode on these pages.

Pages and ⓘ placements:
- **Keyboard shortcuts, Profile, Language & region, Configuration previews** — page title.
- **Business profile** — title, Upload logo (file rules), Registered address, Tax identifiers.
- **Plan & billing** — title, Payment method. **Regional & format** — title, Multi-currency.
- **Modules & capabilities** — title, Modules, Scale capabilities, each capability (text from `axisDefs()`).
- **Team & roles** — title, Permissions by module. **Terminology** — title, each group (its hint).
- **Assembly & production** — title, Defaults, Behaviour, each behaviour toggle.
- **Carrier types** — title; "Behaves as" column lists every behaviour + the fixed-behaviour rule
  (the "What each behaviour does" card is removed).
- **GST registrations** — title (footnote about pickers/cancelled registrations folded in).
- **States & territories** — title, Check a GSTIN (empty-state hint moved in), Same-state tax and
  Status columns (UT/retired footnote moved in).
- **Appearance** — title (Tweaks-panel note folded in), Theme, Default grid density.
- **Notifications** — title + each alert. **Personal defaults** — title, Assembly orders, tax split.
- **Security** — title, Two-factor authentication. Password / sessions lines stay (state).
- **Favorites & views (My settings)** — title, Show recents (inline keeps only "N remembered").
- **Favorites & views (Configuration)** — title, Pinned sidebar section, Pins shown, Who can share.
- **Navigation** — title, directory page, Jump back in, unbuilt pages.

Implementation: help-text map `qhText()` (keys `q.<page>.<item>`, exposed as `vm.hpQ.q_<page>_<item>`;
entries whose wording depends on Terminology are lazy functions). Per-row items in loops register via
`qhReg(ns, list, …)` (keys `qd.ax.*`, `qd.term.*`, `qd.prod.*`, each row gets `.hp`); config previews via
`qhOne('qd.cfg.page', …)`. VM `qhVM()` is merged for any settings page without its own help VM.
Shortcuts: "Settings — every other page" group in Keyboard shortcuts.

Not covered: **Locations & warehouses** is its own component (`SFLocationsWarehouses`) and keeps its
current copy until it's converted separately.

Backend: none — static UI copy. No new data, PII or audit surface.
