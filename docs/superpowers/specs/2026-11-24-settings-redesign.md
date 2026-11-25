# Spec — Settings redesign: workspace, module and personal settings

**Date:** 2026-11-24
**Status:** Approved (2026-11-24) — plan: `docs/superpowers/plans/2026-11-24-settings-redesign.md`
**Supersedes:** `2026-07-24-settings-architecture.md` (its "Configuration" group and the
gear-only entry). Terminology, the access model for workspace settings and quiet help carry over.
**Related:** `docs/settings/README.md`, `components/settings/` (today's template),
`docs/superpowers/plans/2026-11-15-react-frontend-migration.md`, CLAUDE.md "Page templates",
"Quiet pages", "Edit in place", "Scale-adaptive by design".

## Problem

Settings today is one area with four groups (Workspace, Configuration, Terminology, My settings) and
30 sections. Configuration mixes everything module-specific (units, carrier types, pricing, tax,
number sequences, statuses…) in one long list, far from where people use it. As modules grow
(purchase finance, sales, production) that list only gets longer, and a purchasing manager has to
dig through warehouse and tax settings to find purchase-order numbering.

## Decisions (agreed 2026-11-24)

1. **Three types of settings, by who they are for:**
   - **Workspace** — company-wide: business profile, GST registrations, plan, modules, regional
     format, team & roles, terminology, navigation.
   - **Module** — one settings area per module (Purchasing, Sales, Warehouse, Production, Finance,
     People): everything that configures how that module works.
   - **Personal** — the signed-in user's own preferences.
2. **Module settings live next to their module and in central Settings.** Each module's sidebar
   section ends with a **Settings** item (e.g. Purchasing ▸ Settings). Central Settings lists every
   module area too, so all settings can be found and searched in one place.
3. **Shared lists are split per module.** Number sequences, statuses & stages, custom fields, payment
   terms and tax codes show only the module's slice inside a module area; central Settings shows the
   whole list across modules.
4. **Layout: section list + one pane** (option A). A narrow list of sections on the left, one section
   open on the right, each section with its own URL. On phones the list becomes a select (as today).
5. **Permissions: a per-module "Manage settings" right** in Team & roles. Owners and admins edit
   everything; people without the right see module settings read-only; workspace settings stay
   owner / admin only; personal settings are everyone's.

## Information architecture

### Where each section goes

| Area | Sections (current id → new home) |
|---|---|
| **Workspace** (central only) | Business profile (`ws-profile`), GST registrations (`ws-gst`), Plan & billing (`ws-plan`), Modules & capabilities (`ws-modules`), Regional & format (`ws-regional`), Team & roles (`ws-team`), Terminology (`terminology`), Navigation (`cfg-nav`) + the workspace part of Favorites & views (`cfg-favorites`: cap, defaults), States & territories (`cfg-states`) |
| **Purchasing ▸ Settings** | Carrier types, Number sequences ¹, Statuses ¹, Custom fields ¹, Payment terms ¹ |
| **Sales ▸ Settings** | Sales pricing (`cfg-pricing`), Number sequences ¹, Statuses ¹, Custom fields ¹, Payment terms ¹ |
| **Warehouse ▸ Settings** | Units of measure (`uom`), Item categories, Locations & warehouses, Number sequences ¹, Custom fields ¹ |
| **Production ▸ Settings** | Assembly & production (`assembly`), Number sequences ¹, Statuses ¹ |
| **Finance ▸ Settings** | Tax settings (`cfg-taxset`), Tax codes ¹, Number sequences ¹ (grows with purchase finance) |
| **People ▸ Settings** | Custom fields ¹, Number sequences ¹ |
| **Personal** (central + avatar menu) | Profile, Appearance, Notifications, Language & region, Personal defaults, Favorites & views (`me-favorites`), Security, Keyboard shortcuts (`shortcuts`, moved from Workspace) |

¹ Shared list — the module shows its slice; central Settings ▸ **Shared lists** shows the whole list
with a Module column / filter.

A module area appears only when the module is on (Modules & capabilities). Sections of a module
capability that is off (e.g. Sales pricing when customer pricing is off) stay listed — tiers are
parked, nothing is locked or hidden by plan.

### URLs (one URL per page)

- Module section: `/<module>/settings/<section>` — e.g. `/purchasing/settings/sequences`. This is the
  canonical page; central Settings links to it.
- Module area root `/<module>/settings` opens its first section.
- Workspace / personal: `/settings/<section>` (as today); `/settings` opens Business profile, or
  Profile for someone without workspace access.
- Whole shared list: `/settings/shared/<list>` (e.g. `/settings/shared/sequences`).
- Old ids redirect to their new URL (e.g. `/settings/uom` → `/warehouse/settings/uom`) so saved links
  and favourites keep working.

### Central Settings navigation

Left list, grouped: **Workspace** · **Modules** (one collapsible entry per module, expanding to its
sections — same pages as the module area) · **Shared lists** · **Personal**. A **Find a setting** box at
the top searches section names, row labels and help text across all areas (keyboard: `/` focuses it,
↑ ↓ Enter opens the match and highlights the row).

Inside a module area the left list shows only that module's sections, with a small "All settings" link
back to central Settings. Both use the same frame.

## Templates

One **settings frame**, three **section types** — every section is built from one of them, never from
scratch (CLAUDE.md "Exceptions are options, never copies"):

| Section type | Template | Used by |
|---|---|---|
| **Form** (label \| control rows) | `SettingsSection` (exists: groups of rows, dirty tracking, Save / Discard, unsaved guard, quiet help) | Business profile, Regional, Tax settings, Assembly, Sales pricing, Notifications, Appearance… |
| **List** (records you add / edit / delete) | `ListPage` in a new **embedded** mode inside the settings pane (no top bar of its own; the frame's breadcrumb is the title) with the drawer editor (`editor`) — the same grid, drawer, keys and undo as every list | Units of measure, Item categories, Locations, Carrier types, Tax codes, Payment terms, Statuses, Number sequences, Custom fields, GST registrations, Team & roles, Terminology |
| **Custom** | `SettingsPage` (title row, quiet help, loading / error) with its own body | Keyboard shortcuts, Modules & capabilities, Plan & billing, Navigation |

**Shared-list slices** are one list section with an optional `module` filter: the module area passes
its module (rows of other modules hidden, New pre-fills the module); central Shared lists passes none
and shows a Module column. Each shared record carries `modules: string[]` (payment terms can serve
Purchasing and Sales).

**Frame** (`SettingsFrame`, reworked): breadcrumb (`Settings ▸ Purchasing ▸ Number sequences` or
`Purchasing ▸ Settings ▸ Number sequences` inside a module), section list, the pane, read-only banner
when the user lacks the right, keys `[` `]` previous / next section, `/` find, `?` toggle help.

**Read-only mode:** without the right, a Form section shows values as text in the same rows (edit in
place: nothing moves) with no Save bar; a List section hides New / Edit / Delete and the drawer opens
in view mode. A quiet "View only — ask an admin" state line sits under the title.

## Permissions

- `users.perms[<module>]` today is `none | read | write`. Add a separate per-module flag
  `settings: Record<module, boolean>` on the user (Team & roles matrix gets a "Manage settings"
  column). Owners and admins: always true.
- Workspace sections: owner / admin only (as today). Personal: the user themself.
- UX only in the frontend; the backend enforces every write (`403` without the right).
- Audit: every settings save writes an audit event (who, section, before → after) — already required
  by `docs/security/README.md`; the redesign keeps one save endpoint per section so events stay clear.

## Data model changes

- Shared lists (`numberSequences`, `statuses`, `customFields`, `paymentTerms`, `taxCodes`): add
  `modules: string[]` (seed fills it from the document type: PO / receipt → purchasing, SO / invoice →
  sales, item → warehouse, BOM / AO → production, employee → people).
- `User`: add `settings: Record<string, boolean>` (default from role preset).
- No change to existing per-section settings documents.

## Migration of what is already ported

- Business profile → Workspace (no change). Units of measure → Warehouse ▸ Settings (List type, on
  `ListPage` embedded, replacing its custom table). Keyboard shortcuts → Personal.
- `components/settings/nav.ts` becomes a registry of areas → sections with `type`, `module?`,
  `scope`; the sidebar's module Settings items and central navigation are generated from it.
- Remaining prototype sections are ported onto the three types after the template lands (same
  behaviour and copy as the prototype; only their location changes).

## Out of scope

- Plan / tier gating (parked). Billing. Per-user overrides of module settings.
- New settings that don't exist in the prototype (purchase finance settings come with that spec).

## Success criteria

- Every one of the 30 prototype sections has exactly one canonical URL in the table above; old URLs
  redirect.
- A module area shows only its own sections and its slice of shared lists; central Settings shows all,
  and Find a setting reaches any row in ≤ 3 keystrokes + Enter.
- Every section is built on one of the three section types; no section ships its own layout.
- A user without "Manage settings" for Purchasing sees Purchasing ▸ Settings read-only, with nothing
  moving between view and (absent) edit.
- Keyboard: `[` `]`, `/`, `?`, Ctrl+S, Esc work in every section and are listed in Keyboard shortcuts.
- Docs: `docs/settings/README.md` rewritten for the new structure; each ported section's page doc names
  its URL, type, module and permission.

## Open questions

1. ~~Should Team & roles also appear inside People ▸ Settings?~~ **Decided 2026-11-24:** no — Team &
   roles stays Workspace-only (roles and the "Manage settings" right are company-wide access control,
   owner / admin only). People ▸ Users gets a small "Manage roles" link to Workspace ▸ Team & roles.
2. ~~Number sequences: list or one form row per document type?~~ **Decided 2026-11-24: a list grouped
   by document type** (List section type, same grid / drawer / keys / undo as every list). Columns:
   Series, Format, Next number (live preview), Resets, Status. A small business sees one row per
   document type; a second series (per financial year, per branch / GSTIN, per warehouse) is another
   row under its type. Rules (backend enforces; gaps and duplicates matter for GST audits):
   - exactly one default series per document type;
   - a series that has issued a number can't be deleted — deactivate it instead;
   - the next number can only go up;
   - the format must produce unique numbers within the document type.
