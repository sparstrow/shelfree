# Modules & capabilities (Settings ▸ Workspace)

## Overview
Which modules the workspace uses and which scale capabilities are on. A module that is off disappears for everyone:
sidebar, Departments page, page search and its Settings area. Capabilities are the prototype's twelve "scale axes"
(multiple warehouses, lot tracking, customer pricing, production orders…). Workspace-level, owner / admin only.
Tiers are parked (CLAUDE.md "CURRENT WORKING MODE"): nothing is locked by plan, there are no upgrade prompts.

## Screens & states
- `/settings/ws-modules` — `SettingsSection` (label | switch rows) with two groups: **Modules** (8 rows) and
  **Capabilities** (12 rows). Save / Discard bar, unsaved-changes guard, Ctrl+S / Esc. Loading skeleton, error with
  "Try again". View-only for non-admins is not reachable (the Workspace area is owner / admin only).
- **Home** and **Warehouse** are always on: shown as locked text, no switch.
- A module that is off shows "Off — its pages and settings are hidden from everyone." (state, not help).
- Quiet help for the page, both groups and every row (`features/settings/modules/help.ts`, prototype `q.mod.*`
  without the plan wording). A capability no screen reads yet carries the note "No screen reads this switch yet".

## Data model
Inside the workspace settings document (`shelfree.v2.settings`, see `data/api/settings.ts`):
- `modules: Record<moduleId, boolean>` — missing = on; `home` and `warehouse` are always on whatever is stored.
- `capabilities: Record<key, boolean>` — the eleven stored capabilities (defaults from the prototype's
  `wsDefaults().axes`: multiWarehouse, zones, expiry, barcodes on; the rest off).
- **Customer pricing is not stored here:** its switch IS `salesPricing.enabled`, so there is one source. The section
  saves both through one block-level call, `settingsApi.updateModulesCapabilities`.

## Interactions & business rules
Pure rules in `domain/modules-capabilities.ts` (+ tests): `isModuleOn` (locked modules always on), `enabledModuleIds`,
`normalizeModules`, `isCapabilityOn`, `toDraft` / `fromDraft` (the form's flat `mod.<id>` / `cap.<key>` draft).
- **Where it is applied (G-001 closed):** `components/settings/SettingsFrame.tsx` lists `areasForModules(enabled)`;
  routes `/$module/settings` and `/$module/settings/$section` redirect to `/settings` when the module is off;
  the sidebar (`app/shell/Sidebar.tsx` via `useNavModules()`), the module Settings entry, the Departments page and
  page search follow. Direct URLs of the module's *pages* are not blocked (data stays reachable by link).
- **Capabilities in use:** `production` shows Production Orders in the sidebar / Departments / search
  (`PAGE_CAPABILITY` in `app/nav.ts`), the BOM *Kind* field, and the *Work-in-progress location* row in Settings ▸
  Assembly & production (G-027). `customerPricing` is `salesPricing.enabled` (read by Sales prices and the customer
  prices tab). The other ten are stored but nothing reads them yet — gap G-034.
- **Work-in-progress site (G-027):** a new BOM starts at `production.wipLoc` (was hard-coded `WH-ASSY`). The row is
  visible only while the production capability is on, as in the prototype; the stored value is always used.

## Persistence
`shelfree.v2.settings` → blocks `modules`, `capabilities` (and `salesPricing.enabled`). Hooks
`data/queries/workspace-config.ts` (`useEnabledModules`, `useCapability`, `useUpdateModulesCapabilities`); readers
fall back to "everything on" until the settings load.

## Backend-build notes
- `GET /workspace/settings` (whole document) and `PUT /workspace/settings/modules-capabilities` taking
  `{ modules, capabilities, customerPricing }` and writing the three values in one transaction.
- Tables: `workspace_settings.modules jsonb`, `.capabilities jsonb`, `.sales_pricing.enabled`. Validation: module ids
  from the fixed list; `home` / `warehouse` cannot be switched off; capability keys from the fixed list.
- Enforce server-side: a request for a module that is off (its settings endpoints at least) returns 404 / 403 — the UI
  hiding is not the control. Owner / admin only. **Audit:** `workspace.modules_changed` / `capabilities_changed`
  with old → new per key.

### Decisions & deferred-to-backend
- Tiers parked: no plan ceiling, no locked rows, no upgrade prompts. When subscriptions start the plan decides which
  capabilities *can* be enabled (record the tier per capability then).
- Turning a module off hides, never deletes: data is kept and returns when it is switched on.
- Users' module permissions (`perms`) are untouched when a module is off; the module is simply not offered.
- Open: ten capabilities are not read by any React screen yet (G-034). Per-module "which page needs which capability"
  lives in `PAGE_CAPABILITY`; extend it as pages gain a capability.

## React app (2026-11-25)
- **URL:** `/settings/ws-modules` (Workspace, **custom** type built on `SettingsSection`). Code:
  `apps/web/src/features/settings/modules/` (`ModulesCapabilitiesSection.tsx`, `help.ts`), rules in
  `domain/modules-capabilities.ts`, readers in `data/queries/workspace-config.ts`, nav filter in `app/nav.ts`
  (`visibleModules`) + `app/shell/use-nav-modules.ts`.
- **Parity:** same module list and order, Home / Warehouse locked, same twelve capabilities with the prototype's
  labels, descriptions and defaults; same save-as-you-go replaced by the shared Save / Discard bar.
- **Deliberate changes:** no plan tier chips, no "Upgrade" button, no locked state; the "Scale capabilities" group is
  titled **Capabilities**; the page and group help drop the plan wording.
- **Shortcuts:** group *Settings › Modules & capabilities* (Ctrl+S, Esc, Space on a switch).
- **Security gate:** touches no PII; workspace configuration (owner / admin). Audit events above. Nothing sensitive in
  localStorage.
- **Tests:** `domain/modules-capabilities.test.ts`, `app/nav.test.ts`; `e2e/settings-workspace-b.spec.ts` (module off →
  sidebar, settings navigation and URLs redirect; customer pricing switch; production capability → Production Orders +
  WIP row; member blocked).
