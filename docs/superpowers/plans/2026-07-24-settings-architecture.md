# Plan — Settings architecture build

**Spec:** `docs/superpowers/specs/2026-07-24-settings-architecture.md` (approved)
**Target:** `prototype/designs/erp/Shelfree App.dc.html` (built in-shell; UoM/categories feed the Items grid and terminology must apply app-wide)

## Tasks

1. **Terminology hook** — `modules()` names + `tableTitle` + count noun resolve
   through `termGet(key, default)` so renames apply live in sidebar, breadcrumb,
   tabs, table titles.
2. **State** — `settingsScope` (admin|user), `planTier`, `userRole`, `terms`,
   `ws` (workspace profile/regional/modules), `me` (user profile/prefs/defaults),
   `userMenuOpen`, `termSearch`, plan/reset dialogs. Loaders + savers (localStorage).
3. **Nav model** — `settingsGroups(scope)` returns Workspace / Configuration /
   Terminology (admin) and My settings (user); each page has `tier` + derived
   `locked`. Data-driven sidebar submenu + flyout + breadcrumb.
4. **Tier gating** — `tierAllows(tier)`; locked pages navigate but render a
   shared **upgrade panel** instead of content.
5. **Routing** — `openSettings` (admin), `openUserSettings` (user, from avatar
   menu), `goSetting(id, scope)`. Keep existing `uom/categories/locations/
   shortcuts` page ids working.
6. **Content pages** — build: ws-profile, ws-plan (3 plan cards + business-size
   demo switch), ws-modules (module + scale-axis toggles), ws-regional,
   ws-team; terminology (rename table, original always shown, singular+plural,
   per-row + global reset, search); My settings (profile, appearance→existing
   tweaks, notifications, language, defaults, security). Migrate existing
   uom/categories/locations/shortcuts under the new groups.
7. **Avatar menu** — footer user row opens a menu → My settings + role switch (demo).
8. **Docs** — new `docs/settings/README.md`; update `docs/erp-app/README.md`,
   `docs/security/README.md`; fold outcome into spec.

## Verify
Load, navigate every settings page in both scopes, toggle plan to see locks,
rename a module + object and confirm live propagation, both themes.
