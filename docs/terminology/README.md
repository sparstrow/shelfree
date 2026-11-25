# Terminology — Settings ▸ Workspace ▸ Terminology

## Overview
A rename layer: a workspace can call a Location a "Store", a Vendor a "Supplier", the Favorites section "Pinned". Screens
read a label through `termGet(terms, key, fallback)` (or the `useTerm(key, fallback)` / `useLocationTerm()` hooks) and keep
their own wording when nothing is overridden. Renames change labels only, never data keys. Prototype:
`prototype/designs/erp/Shelfree App.dc.html` → `termGet`, `termDefs()`, `locLabel()`, the *Terminology* page
(`terminology`). Tier: Growth in the prototype's page list; parked (POC), so ungated.

## Screens & states
- **Page** `/settings/terminology` (area Workspace, owners and admins only; type list) — a `ListPage embedded` with an
  `editor` over the fixed set of renamable labels. Columns: Original · Singular · Plural · Group · Status (Renamed /
  Original; *Original plural* hidden). Views: All labels · Renamed · one per group. Search over original and current wording.
- **Drawer** (view and edit in place): Original (locked) · Singular · Original plural (locked) · Plural · Group (locked). Pairs
  (records) have both names; single labels (modules, Departments, Favorites, fields) have one. Blank = use the original. Footer:
  Edit, **Restore original** (when renamed).
- **Header:** pill "n overrides" (a singular + plural pair counts once) and **Reset all** (confirm dialog) while any override
  exists. **No New / N:** the labels are fixed by the app (`ListEditor.fixedRows`, a new optional template flag).
- Loading, error and empty states from the templates; read-only mode shows the drawer view-only without Restore / Reset all.

## Data model
`settings.terms: Record<string, string>` in the workspace settings document (`shelfree.v2.settings`). Keys:
`module.<id>` (home, finance, sales, purchasing, warehouse, production, people), `object.departments.label`,
`object.favorites.label`, `field.<name>.label`, and for records the pair `object.<name>.singular` + `.plural` (item, customer,
vendor, po, location, bom, assemblyOrder, component, view). Only keys with text are stored; unknown keys are dropped on read
(`knownTermKeys`). `domain/terminology.ts` holds the groups (`TERM_GROUPS`), `termGet`, `termRows`, `termPatch` (stores only
what differs from the original, tidied), `termResetPatch`, `applyTermPatch`, `validateTermRow` (≤ 40 characters, no `<` `>`).

## Interactions & business rules
- Saving a row patches **only its keys** on top of the latest stored map (`settingsApi.patchTerms`; `null` deletes); *Reset all*
  stores `{}`.
- *Fields* rows follow their capability: **Customer price** appears while Sales pricing's customer-pricing switch is on;
  **Lot/Batch** stays hidden until Modules & capabilities exists (G-031).
- Read by screens today (closes G-018): the Locations section, the Warehouse sidebar page *Stock by Location*, the item card's
  *Stock by location* card and the Items drawer heading. Everything else reads its own fixed wording (G-031).

## Persistence
`localStorage['shelfree.v2.settings'].terms`.

## Backend-build notes
- `GET /workspace/terminology` → `{ key: text }`, `PUT /workspace/terminology/{key}` (text) and `DELETE …/{key}`,
  `DELETE /workspace/terminology` (reset all). Table `workspace_terms (workspace_id, key, text)` with the key checked against
  the registry above; text trimmed, ≤ 40 characters, no markup. Return the map with the session so every screen can read it
  without a request.
- **Audit event:** `workspace.terminology.updated | reset` (key, before, after). **Permission:** workspace settings (owner /
  admin). Labels are rendered as text, never as HTML.

### Decisions & deferred-to-backend
- The renamable set is app-defined (fixed rows); adding a label means adding it to `TERM_GROUPS` and reading it where it shows.
- Language packs / translation are out of scope: this is a per-workspace wording layer, not i18n.

## React app (2026-11-25)
Files: `features/settings/terminology/{TerminologySection.tsx,dataset.ts,help.ts}`, `domain/terminology.ts` (+ test),
`data/api/settings.ts` (`terms` block, `patchTerms`, `resetTerms`), `data/queries/regional-terminology.ts` (`useTerms`,
`useTerm`, `useLocationTerm`, `usePatchTerms`, `useResetTerms`). Template option added: `ListEditor.fixedRows`. Keyboard: E,
Ctrl/Cmd+S or +Enter, Esc, Enter / double-click (Settings › Terminology in the shortcut catalogue; no N). Tests: Vitest
`domain/terminology.test.ts`, `data/api/settings-workspace.test.ts`; Playwright `e2e/settings-workspace-a.spec.ts` (list, no
New, rename Location → Locations section / sidebar / item headings follow, restore, Reset all, help).
