# Team & roles (Settings ▸ Workspace)

## Overview
The roles People ▸ Users offers (Admin, Manager, Warehouse, Sales, Purchasing, Finance, Viewer), who holds each, and the
module access (none / read / write) and "Manage settings" right each role **starts a person with**. It reads and edits
the same data as People ▸ Users: the users collection for who holds a role, and one `roleDefs` collection for what the
role starts with. Workspace-level, owner / admin only.

## Screens & states
- `/settings/ws-team` — a list section (`ListPage embedded`) with an `editor`. Columns: Role, People, Members, Module
  access, one Full / View / None column per module (the prototype's matrix), Description. Views: All roles, In use,
  No people. Loading skeleton, error with "Try again".
- **Fixed list:** roles are edited, never added or deleted (no *New role*, no `N`); the prototype's *New role* button was
  Growth-only. Admin cannot be edited at all (always full access).
- Drawer view: stats (People, Module access), the module permission table (read-only), **Members** (each links to the
  person in People ▸ Users). Edit: description + the same permission editor People ▸ Users uses
  (`features/people/users/PermissionsEditor.tsx`, shared), validation messages inline.
- People ▸ Users' **Manage roles** link opens this page (G-005, Team & roles half, closed).

## Data model
`roleDefSchema` (`data/schemas`): `id` (the role name, = `User.role`), `desc` (≤ 140 chars), `perms` (module → `none |
read | write`), `settings` (module → may manage that module's settings), `updatedAt?`. Seeded from the built-in presets
(`ROLE_PRESETS` in `domain/people.ts`, via `defaultRoleDefs()`); the grid adds derived **People** and **Members**
(never stored). Users keep their own `perms` / `settings` (unchanged).

## Interactions & business rules
Pure rules in `domain/roles.ts` (+ tests) and `domain/people.ts`:
- `roleDefaultPerms(role, defs)` / `roleDefaultSettings(role, perms, defs)` / `blankUser(users, role, defs)` — a new user
  and "Apply <role> defaults" use the workspace definition, falling back to the built-in preset.
- **Editing a role changes what it starts new people with; people who already hold it keep their own access.**
- `normalizeRoleDef`: every module present; "manage settings" only where the module has a settings area (not Home /
  Notes) and the role has access to it. `validateRoleDef`: description ≤ 140; **Admin must keep write on every module**.
- `roleHolders(users)`: who holds each role (suspended users count).

## Persistence
`shelfree.v2.roleDefs` (`api.roleDefs`, seeded). People ▸ Users reads it through `useList('roleDefs')`.

## Backend-build notes
- Tables: `roles(workspace_id, name PK, description, updated_at)`, `role_permissions(role, module, level)`,
  `role_settings_rights(role, module, can_manage)`; `users.role` FK to `roles.name`.
- `GET /roles` (with `people_count`), `PUT /roles/{name}` (description + permission matrix). No create / delete while
  roles are fixed. Reject: description > 140, an unknown level, `can_manage` without access or on a module with no
  settings area, any change to the Admin role.
- **Enforcement is the backend's:** a user's effective access is their own stored matrix (role defaults are only the
  starting point); module and settings endpoints check it per request. **Audit:** `role.updated` (field + matrix diff,
  actor). Owner / admin only.

### Decisions & deferred-to-backend
- Role definitions are defaults, not live inheritance: no mass rewrite of people when a role changes. A "re-apply role to
  everyone" action is deferred.
- Custom (named) roles are deferred — they were Growth-only in the prototype and People ▸ Users, its filters and
  validation use the fixed `USER_ROLES` (gap G-035).
- The prototype's Owner / Member role cards were demo roles (`demoRole`); the roles here are the ones users carry.

## React app (2026-11-25)
- **URL:** `/settings/ws-team` (Workspace, **list**). Code: `apps/web/src/features/settings/team-roles/`
  (`TeamRolesSection.tsx`, `dataset.ts`, `help.ts`), rules in `domain/roles.ts` (+ `roles.test.ts`), shared editor
  `features/people/users/PermissionsEditor.tsx`.
- **Template option added:** `ListPage` `noCreate` (a fixed list: edit rows, no New / `N`).
- **Parity:** the role cards and the permissions-by-module matrix are the grid's columns; role descriptions follow the
  prototype's wording for the roles Users has. **Deliberate:** read-only cards became an editable list; counts are
  derived from the real users, not mock numbers.
- **Shortcuts:** group *Settings › Team & roles* (E, Ctrl+S / Ctrl+Enter, Esc, list keys).
- **Security gate (docs/security):** edits access control configuration → audit event above; no PII shown beyond user
  names the viewer can already see in People ▸ Users; owner / admin only; nothing sensitive in localStorage.
- **Tests:** `domain/roles.test.ts`; `e2e/settings-workspace-b.spec.ts` (list, members, edit + validation, new user starts
  from the edited role, Admin locked, Manage roles link).
