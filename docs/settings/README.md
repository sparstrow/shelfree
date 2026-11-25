# Settings — `prototype/designs/erp/Shelfree App.dc.html`

## Overview

The settings surface is split into **four setting types across two entry points**
("two doors"), per `docs/superpowers/specs/2026-07-24-settings-architecture.md`:

- **Admin Settings** — the sidebar **gear** (owner + admins only). Three groups:
  - **Workspace** — Business profile · Plan & billing · Modules & capabilities ·
    Regional & format · Team & roles · Keyboard shortcuts.
  - **Configuration** — Units of measure · Item categories · Locations &
    warehouses (Starter base, existing) · **Tax codes** (live since 2026-09-25 —
    `docs/tax-codes/README.md`) · **Tax settings** (id `cfg-taxset`, live since 2026-09-26 —
    `docs/tax-settings/README.md`) + Payment terms · Statuses & stages · Number sequences · Custom fields (later tiers).
  - **Terminology** — Rename labels.
- **My settings** — the **avatar menu** (every user). Profile · Appearance ·
  Notifications · Language & region · Personal defaults · Security.

State: `settingsOpen` (bool), `settingsScope` (`admin` | `user`), `settingsPage`
(page id). Nav is data-driven from `settingsGroups(scope)`; the active page's
group/label drive the breadcrumb (`settingsRootCrumb` / group / page). The
existing `uom` / `categories` / `locations` / `shortcuts` page ids are unchanged
— they were re-grouped, not rewritten.

## Screens & states

- **Business profile** — name, legal name, industry, contact email, address
  block, GSTIN/PAN. Logo upload is a stub.
- **Plan & billing** — three plan cards (Starter/Growth/Enterprise); the current
  plan is highlighted; clicking another calls `setPlan()` (mocked, instant, no
  billing). A business-size/plan switch is the single lever that drives all
  gating. Payment method is a stub.
- **Modules & capabilities** — per-module on/off (Home and Warehouse are
  non-disable-able); scale-axis capability toggles, each mapped to a minimum
  tier. Axes above the current plan render **locked** with an Upgrade button
  that routes to Plan & billing.
- **Regional & format** — base currency, timezone, date/number format, fiscal
  start, week start. Multi-currency shown locked (Growth).
- **Team & roles** — role cards (Owner/Admin/Manager/Member) + a read-only
  role×module permission matrix (Full/View/None). "New role" shown only at
  Growth+. Individual user/employee records live in the People module, not here.
- **Terminology** — searchable list of renameable labels. Each row shows the
  **Original name (always visible)** and an editable field; Records track
  **singular + plural**. Per-row Reset appears once changed; global "Reset all"
  with a confirm dialog. Renames apply **live** across the app (see below).
- **Configuration (later-tier pages)** — `cfg-*` render a seeded read-only
  preview table + a note that full editing lands in the backend build; shown
  locked (upgrade panel) when above the current plan.
- **My settings** — Profile (name/title/email/phone); Appearance (theme toggle,
  default grid density; accent/corners/surface remain in the Tweaks panel);
  Notifications (four toggles + delivery channel); Language & region; Personal
  defaults (landing page, default location); Security (password stub, 2FA
  toggle, sessions stub).
- **Locked / upgrade panel** — shared full-page state shown for any page whose
  tier exceeds the current plan. "View plans" routes to Plan & billing.
- **Saved flash** — a transient "Saved" toast on any settings write.

## Data model

All client-side (localStorage), no backend calls:

- **Plan** — `planTier ∈ starter | growth | enterprise` (`tierRank` / `tierAllows`).
- **Role (demo)** — `userRole ∈ owner | admin | member`; `isAdmin()` = owner|admin.
- **Terminology** — `terms`: flat map of `key → override string`. Keys:
  `module.<id>` (6 modules); `object.<item|customer|vendor|po>.<singular|plural>`.
  `termGet(key, default)` resolves an override or the default. Empty string
  deletes the override.
- **Workspace (`ws`)** — profile fields, regional fields, `modules` (id→bool),
  `axes` (capability→bool). See `wsDefaults()`.
- **User (`me`)** — profile, notification prefs, language/locale, personal
  defaults, `twoFA`. See `meDefaults()`.

## Interactions & business rules

- **Access:** Workspace/Configuration/Terminology are owner/admin only;
  `openSettings()` redirects a **member** to `openUserSettings()`. My settings is
  per-user. Terminology changes apply to **everyone**.
- **Tier gating:** plan = ceiling. A page/axis whose `tier` exceeds `planTier`
  is **locked**: nav shows a lock icon; navigating renders the upgrade panel;
  locked axis toggles route to Plan & billing. Growth-path features are shown
  locked; the intent for niche features is hidden (not yet exercised here).
- **Terminology is a display layer:** `modules()` names, table titles
  (`tableTitle`) and the count noun (`unitNoun`) resolve through `termGet`, so a
  rename propagates live to the sidebar, breadcrumb, tabs, page search and table
  headers. **Data keys/ids are never renamed.**
- **Tier map** (recorded per spec): Starter — business profile, plan switch,
  single-currency regional, modules on/off, single-owner team, UoM/categories/
  locations, all My settings. Growth — multi-warehouse/zones, lot/expiry/
  barcodes, advanced reporting, multi-role, payment terms/tax/statuses,
  **Terminology**, multi-currency. Enterprise — serial, approvals, integrations,
  custom fields, number sequences.

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

## Persistence

localStorage, versioned keys (all written this feature):

- `shelfree.settings.plan.v1` — plan tier.
- `shelfree.settings.role.v1` — demo role.
- `shelfree.settings.terms.v1` — terminology override map (JSON).
- `shelfree.settings.workspace.v1` — workspace profile/regional/modules/axes (JSON).
- `shelfree.settings.user.v1` — per-user settings (JSON).

## Backend-build notes

### Decisions & deferred-to-backend

- **Real RBAC.** The `userRole` switch is a demo affordance; production needs a
  real identity/role model and **server-side enforcement** of the access table
  (owner/admin-only Workspace/Configuration/Terminology; per-user My settings).
  The client redirect for members is UX only.
- **Plan entitlement.** `planTier` + `tierAllows` mirror an authoritative
  server-side tier→capability matrix; the backend must enforce that a
  capability's data is only writable when its tier + toggle are active
  (inherits the scale-adaptive spec). No real billing is implemented.
- **Settings scope.** Workspace settings are workspace-scoped; user settings are
  user-scoped; terminology overrides are workspace-scoped but read by all users.
  Endpoints: `GET/PATCH /workspace/settings`, `GET/PATCH /me/settings`,
  `GET/PUT /workspace/terminology` (map of key→{singular,plural}); plan via
  `GET /workspace/plan` + a billing provider.
- **Terminology contract.** Overrides are a label/i18n layer keyed by stable
  string keys (`module.*`, `object.*.singular|plural`) with room for locale
  variants later. Reports, exports and the API must keep the original keys —
  never rename underlying fields. Validate against collisions (two labels
  resolving to the same string) as a soft warning.
- **Configuration master data.** Payment terms, tax codes, statuses, number
  sequences and custom fields need real CRUD endpoints + referential integrity
  (can't delete a value still referenced) when promoted out of preview.
- **Logo/photo upload, password change, session revocation** are stubs — wire to
  file storage / auth service.
- **Audit:** changing plan, roles, terminology, and workspace profile are
  audit-relevant (see `docs/security/README.md`) and must emit audit events.


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

## React app (2026-11-17)

Code: `apps/web/src/components/settings/` (template), `components/help/` (quiet help),
`src/app/shortcuts.ts` (shortcut catalogue), `features/settings/` (the sections).
Tiers are parked (CLAUDE.md "current working mode"): nothing is gated.

### URLs and navigation

- `/settings` redirects to `/settings/ws-profile` (a member role: `/settings/me-profile`).
- One URL per section: `/settings/<id>` with the prototype's ids — `ws-profile`, `ws-gst`, `ws-plan`,
  `ws-modules`, `ws-regional`, `ws-team`, `shortcuts`, `uom`, `categories`, `locations`, `assembly`,
  `carrier-types`, `cfg-*`, `terminology`, `me-*`. The list, scopes and groups are `components/settings/nav.ts`.
  An unknown id is "Page not found".
- Scopes: **Workspace** (groups Workspace, Configuration, Terminology) and **My settings**. The frame shows
  a scope switch plus the groups of the active scope; on phones the nav is a select above the section.
  Breadcrumb: Settings ▸ group ▸ section. Sidebar "Settings" → `/settings`; account menu "My settings" →
  `/settings/me-profile`.
- Ported so far: Business profile (`ws-profile`), Units of measure (`uom`), Keyboard shortcuts
  (`shortcuts`). Every other id shows "has not been moved to the new app yet" inside the frame.
- A member (demo role) sees My settings only; workspace ids show "Workspace settings are for owners and
  admins". UX only — the backend enforces it.

### Settings template API

- `SettingsFrame` (route component) — nav + breadcrumb + body; receives the registry
  `features/settings/sections.ts` (`id → component`). **Port a section:** build it, add one line there.
- `SettingsPage` — title row (title ⓘ, optional count pill and `actions`), loading skeleton, error + retry,
  body, and — when given a `form` — the save bar. Owns keys: **Ctrl/Cmd+S** save, **Esc** discard (an open
  layer closes first), **`?`** toggle inline descriptions (per-user `me.showSetHelp`, off by default; ignored
  while typing). `width="wide"` for tables.
- `SettingsSection<V>` — `SettingsPage` + `useSettingsForm` + `SettingsRows` for pages of label | control
  rows. Props: `id` (input-id prefix), `title`, `help` (`HelpMap`: `page`, a key per group id, a key per
  row), `saved` / `isLoading` / `error` / `onRetry`, `onSave(next)` (the whole document), `groups`,
  optional cross-field `validate`.
- A row: `{ key, label, control, help?, default?, defaultText?, validate?, warn?, hidden?, locked? }`;
  controls `text | select | switch | number | area | readonly` (`components/settings/rows.ts`). `default`
  enables "Use default" in the popover while the value differs. `validate` blocks Save with an error under
  the value; `warn` is a non-blocking state note.
- `useSettingsForm` — draft = only the changed keys over the saved value; dirty = keys that differ (editing
  back to the saved value is not a change); one save at a time; success toast `Saved`; the **leave guard**
  (TanStack `useBlocker` + `beforeunload`) offers Keep editing / Discard and leave / Save and leave.
- Save bar is mode-stable (always rendered, buttons just enable): "No unsaved changes" / "N unsaved changes".
- Section settings that fit none of the rows (tables, catalogues) pass `children` to `SettingsPage`.

### Quiet help (`components/help/`)

- `HelpTarget` wraps a label or title and adds the ⓘ button (`aria-label="About …"`, `aria-expanded`).
  Mouse: hover the label or ⓘ ~400 ms opens the popover, leaving closes it (140 ms grace), click pins; Esc,
  ✕ or a click outside closes. ⓘ fades in on row hover/focus (`reveal="always"` keeps a faint one). Keyboard:
  focusing ⓘ opens, Enter/Space pins. Touch (`(hover:none), (pointer:coarse)`): ⓘ always visible, 44 px, opens a
  bottom sheet. The popover flips to the side with room and caps its height to the space available.
- Content (`HelpContent`): title, description, each option (current marked, default tagged), "Default: …"
  with **Use default** when the value differs, and a compliance note. Data type `HelpEntry` / `HelpMap`
  (`types.ts`) — a page's help is one pure map.
- `?` inline mode: `HelpInlineContext` (provided by `SettingsPage`) makes every target print its description
  under the label.
- `FieldRows` (drawer and record cards) now renders its field `hint` through `HelpTarget` — pages still
  pass `hint` as before (hover/pin popover instead of a tooltip; the old `hintSide` prop is ignored).

### Keyboard shortcut catalogue

- One data module, `src/app/shortcuts.ts` (`SHORTCUT_GROUPS`, `filterShortcuts`), renders
  `/settings/shortcuts` (grouped by where the keys apply, searchable by every word across group, key and
  text; `/` focuses the search, Esc clears it).
- Templates expose their keys as data beside the code that handles them: `components/list-page/shortcut-meta.ts`,
  `components/data-grid/shortcut-meta.ts`, `components/record-page/shortcut-meta.ts`,
  `components/document/shortcut-meta.ts`. A page's own keys are a `ShortcutMeta` (`lib/shortcuts.ts`) in its
  `shortcuts.ts`, spread into `ListPage`'s `shortcuts` prop (`ListShortcut extends ShortcutMeta`) and imported
  by the catalogue — see `features/purchasing/purchase-orders/shortcuts.ts`, `purchase-prices/shortcuts.ts`.
- **A page registers shortcuts** by adding its group to `SHORTCUT_GROUPS` in the same turn it adds the key.
  Groups ported from the prototype: only for pages that exist in React; the rest follow their pages.

### Persistence

- Workspace identity (Business profile): `localStorage` `shelfree.v2.workspace` via `sessionApi.updateWorkspace`
  (`data/api/session.ts`); `useWorkspace` feeds the sidebar, so a save shows there at once.
- Per-user settings: `shelfree.v2.me` via `sessionApi.updateMe` (`showSetHelp` today; the rest of
  `meDefaults()` joins as My settings sections are ported).
- Workspace configuration switches (purchasing/tax): `shelfree.v2.settings` (`data/api/settings.ts`, unchanged).
- Units of measure: collection `unitsOfMeasure` → `shelfree.v2.unitsOfMeasure` (see `docs/units-of-measure`).
- Screens never touch storage; they use `useWorkspace / useUpdateWorkspace / useMe / useUpdateMe / useList`.

### Backend-build notes

- Endpoints: `GET/PATCH /workspace` (identity), `GET/PATCH /me/settings`, `GET/PATCH /workspace/settings`
  (configuration switches), `GET/POST/PATCH/DELETE /units-of-measure`.
- **Who may change workspace settings:** owner and admin only, enforced server-side per endpoint;
  `PATCH /me/settings` only for the signed-in user. The frame's role check is UX.
- Business profile validation the backend repeats: name and legal name required; email shape; six-digit PIN;
  PAN `AAAAA9999A`; GSTIN is **not** edited here (managed under GST registrations). State vs GSTIN state code
  and PAN vs GSTIN are warnings in the UI — the backend may log them but must not reject.
- **Audit:** every workspace-setting change is an audit event (actor, setting, old → new, time). Identity
  fields (GSTIN, PAN, legal name) are tax-relevant: keep the change history. `PATCH` should accept only the
  changed keys and respond with the full document; use an `If-Match` / version header so two admins saving
  at once do not overwrite each other (the form holds only changed keys, so a merge is possible).
- No secrets and no PII beyond the business's own contact details are stored client-side; `showSetHelp` is a
  harmless preference.

### Decisions & deferred-to-backend

- **Template over copies:** sections describe rows; layout, dirty tracking, leave guard and save live in the
  template. Exceptions are options on the template.
- **Own nav, not the app sidebar:** the prototype swaps the app sidebar for a settings sidebar; the React
  frame keeps the app sidebar and puts the section navigation inside the page (the app shell stays stable
  and tabs/breadcrumb keep working).
- **Save model:** rows are always editable and held until Save (like Tax settings in the prototype), with a
  count of unsaved changes and a leave guard. The prototype's per-row instant save on Business profile is
  replaced by this.
- **GSTIN is read-only on Business profile** with a link to GST registrations (same as the prototype's
  "manage" button); logo upload is still a stub and is not shown.
- Deferred: the other ~22 sections; the review-before-save dialog of Tax settings (a section can add its own);
  terminology overrides; role-based hiding beyond the demo `member` role.

## Settings redesign — frame and navigation (2026-11-25, Phase 1 run 1a)

Spec `docs/superpowers/specs/2026-11-24-settings-redesign.md`. Full rewrite of this doc follows when
Phase 1 is complete; until then this section records what shipped.

- **Registry** `apps/web/src/components/settings/registry.ts`: areas `workspace`, one per module
  (`purchasing`, `sales`, `warehouse`, `production`, `finance`, `people`), `shared`, `personal`; each section
  has `id`, `label`, `type` (`form | list | custom`), optional `shared` list id and `legacyIds`.
- **URLs:** module sections `/<module>/settings/<section>` (root opens the first section); workspace and
  personal `/settings/<section>`; whole shared lists `/settings/shared/<list>`. Old ids redirect with
  `replace` (`/settings/uom` → `/warehouse/settings/uom`, `/settings/cfg-sequences` → `/settings/shared/sequences`).
  `?find=<rowKey>` scrolls to and highlights a row (`data-setting-row`).
- **Frame:** central list grouped Workspace · Modules (collapsible) · Shared lists · Personal (a member sees
  Personal only); a module area lists only its sections plus "All settings". **Find a setting** searches
  section names, row labels and help text (best 8, one hit per row label). Keys `/`, ↑ ↓ Enter, Esc, `[` `]`
  (data in `components/settings/shortcut-meta.ts`).
- **Entries:** each module's sidebar section ends with **Settings** (favourite-able, open in new tab);
  Departments lists them; tabs read "<Module> settings".
- **Backend:** no change — navigation only. The redirect table (legacy id → new path) is client-side.
