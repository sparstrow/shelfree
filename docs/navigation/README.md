# Navigation (Settings ▸ Workspace)

## Overview
Workspace navigation defaults: whether the Departments page exists, whether it shows the "Jump back in" row, and whether
pages that are not built yet are listed. Which *modules* appear in the sidebar is Modules & capabilities. Per-person
overrides (their own recents) belong to Personal settings (run 2.6). Owner / admin only.

## Screens & states
- `/settings/cfg-nav` — `SettingsSection`: group **Departments page** with three switches (*Departments page*, *“Jump
  back in” row*, *List pages that aren’t built yet*) and two links (Modules & capabilities, Terminology). The last two
  switches are shown as locked text while the Departments page is off. Save / Discard bar.
- Quiet help for the page, group and each row (`features/settings/navigation/help.ts`, prototype `q.nav.*`).

## Data model
Workspace settings document, block `navigation: { departments, jumpBackIn, showUnbuilt }`, all default `true`.

## Interactions & business rules
- `departments` off: no sidebar entry; `/departments` redirects to the landing page. (The prototype also removed a header
  button and Ctrl/Cmd + Shift + D; neither exists in the React app yet.)
- `jumpBackIn` off: no "Jump back in" row on the Departments page (the row also needs the person's own recents on).
- `showUnbuilt` off: `buildDepartmentBlocks(…, showUnbuilt = false)` leaves out pages that are not built; on, they stay
  greyed out with "Coming soon".
- The sidebar order and the visible modules are not settings: order is fixed (`MODULES`), visibility is Modules &
  capabilities. The prototype has no sidebar-order setting; the brief's "order / visibility defaults" maps to these.

## Persistence
`shelfree.v2.settings` → `navigation`. Hooks `useNavigationSettings` / `useUpdateNavigation`
(`data/queries/workspace-config.ts`); the route reads it with `ensureQueryData` in `beforeLoad`.

## Backend-build notes
- Part of `GET /workspace/settings`; `PUT /workspace/settings/navigation` with `{ departments, jumpBackIn, showUnbuilt }`.
  Owner / admin only. **Audit:** `workspace.navigation_changed`. The "unbuilt pages" option is prototype-era and goes away
  when every page is built.

### Decisions & deferred-to-backend
- Departments label comes from Terminology later (`object.departments.label`); the page is called Departments for now.

## React app (2026-11-25)
- **URL:** `/settings/cfg-nav` (Workspace, **custom** built on `SettingsSection`). Code:
  `apps/web/src/features/settings/navigation/`; readers in `data/queries/workspace-config.ts`; Sidebar, Departments page
  and `routes/departments/index.tsx` read the block.
- **Parity:** the three prototype options and the two shortcut links. **Deliberate:** dependent switches lock (text)
  while the Departments page is off instead of staying editable.
- **Shortcuts:** group *Settings › Navigation*. **Security gate:** configuration only, no PII, owner / admin.
- **Tests:** `domain/departments.test.ts` (unbuilt option); `e2e/settings-workspace-b.spec.ts`.
