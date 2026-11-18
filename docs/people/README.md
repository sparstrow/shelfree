# People — Users & Employees

## Overview
Two directory screens under **People** (`Users`, `Employees`) governing app access and internal
headcount at Kanalora:

- **People ▸ Users** (`/people/users`): sign-in accounts (`USR00001+`), roles, 2FA state, per-module
  permissions (`none` / `read` / `write` across the 8 app modules), invite lifecycle (`Pending` →
  `Active` ↔ `Suspended`), and optional links to employee records.
- **People ▸ Employees** (`/people/employees`): internal staff directory (`EMP00001+`), job titles,
  departments, employment types (`Full-time`, `Part-time`, `Contractor`), operational statuses
  (`Active`, `On leave`, `Terminated`, plus legacy seed `'Contractor'`), reporting lines
  (`managerId`), work locations, and join dates.

## Screens & states
- **Users grid:** User ID (frozen, mono) · Name · Email (masked `k••••@kanalora.example`) · Role ·
  Status pill (`Active` ok, `Pending` info, `Suspended` bad) · 2FA · Last active (relative timestamp) ·
  Module access (`Full access` / `No access` / `N read-only` / `W write · R read`) · Employee (hidden).
  System views: `All users`, `Active`, `Pending`, `Suspended`, `Admins & managers`. Bulk bar
  supports `Copy`, `Export`, `Activate`, `Suspend`, and `Delete`.
- **Users drawer (view / edit / new):** header with User ID, status pill, name, full email subtitle,
  and KPI strip (`Role`, `2FA`, `Last active`); notice banner when `Suspended` or `Pending`; in-place
  `DETAILS` rows (`User ID`, `Full name`, `Email`, `Role`, `Status`, `Two-factor auth`,
  `Linked employee`) + read-only facts (`Department`, `Last active`, `Module access`); interactive
  `MODULE PERMISSIONS` 8-row `None / Read / Write` segmented radiogroup (read-only in view mode,
  with an `"Apply <role> defaults"` helper while editing/creating). View footer includes `Edit`,
  contextual `Suspend user` / `Reactivate` / `Resend invite`, and `Delete`.
- **Employees grid:** Emp ID (frozen, mono) · Name · Title · Department · Manager · Type pill ·
  Status pill (`Active` ok, `On leave` warn, `Terminated` neutral, `Contractor` info) · Location
  (mono) · Email (masked) · Phone (mono, masked `•••• 0001`) · Joined date.
  System views: `All employees`, `Active`, `On leave`, `Terminated`, `Contractors`. Bulk bar
  supports `Copy`, `Export`, `Activate`, `Set on leave`, and `Delete`.
- **Employees drawer (view / edit / new):** header with Emp ID, status pill, optional `Contractor`
  tag, name, `Title · Location` subtitle, and KPI strip (`Department`, `Tenure`, `Type`); in-place
  `DETAILS` rows (`Employee ID`, `Full name`, `Job title`, `Department`, `Employment type`,
  `Status`, `Reports to`, full `Email`, full `Phone`, `Location`, `Joined`) + read-only facts
  (`Tenure`, `App account`); `DIRECT REPORTS` view section when direct reports exist. View footer
  includes `Edit`, contextual `Set on leave` / `Mark active` / `Reinstate`, and `Delete`.

## Data model
- `User { id: 'USR00001'+, empId: string | null, name, email, role, status, twoFA, lastActive: ISO | null, perms: Record<PeopleModuleKey, 'none' | 'read' | 'write'> }`
- `Employee { id: 'EMP00001'+, name, title, dept, managerId: string | null, status, type, email, phone, location, joinDate: YYYY-MM-DD }`

## Interactions & business rules
- **Role presets & module permissions:** changing `Role` in New mode initializes `perms` to that
  role's preset (`roleDefaultPerms`); editing `Role` on an existing user leaves customized module
  permissions intact unless `"Apply <role> defaults"` is clicked.
- **Validation:**
  - Users: `Full name` required; valid email required and unique (case-insensitive); valid role and
    status. Demoting or suspending the last active `Admin`, or suspending your own signed-in user
    account, is refused on edit/save and status actions.
  - Employees: `Full name`, `Job title`, `Department`, valid unique work `Email`, valid 7–15 digit
    `Phone` (when provided), valid `YYYY-MM-DD` join date, and non-circular `Reports to` reporting
    chain (`managerId !== id` and cycle detection).
- **Protected delete:**
  - Users: deleting the signed-in user account or the last (or last active) `Admin` is refused.
  - Employees: deleting an employee still linked to user accounts, direct reports, warehouses,
    vendors, customers, purchase orders, purchase receipts, or assembly orders is refused with the
    specific blocking reference counts.
  - Bulk `Delete` skips protected / referenced records (or refuses if none can be deleted) and
    provides an `Undo` action for any deleted records.

## Persistence
Stored under `shelfree.v2.users` and `shelfree.v2.employees` via the versioned query/API layer
(`useList`, `useUpsert`, `useRemove`). Seeded from `seedUsers()` (11 users) and `seedEmployees()`
(21 employees).

## Backend-build notes
- Server must enforce tenant isolation and RBAC (`people.write` / `Admin` required for user role,
  permission, suspension, invite, and employee mutations; non-admins cannot escalate their own role
  or grant themselves module `write` permissions).
- Server enforces uniqueness on `(tenant_id, lower(email))` for users (and optionally employees),
  blocks deleting or suspending/demoting the last active owner/`Admin` in an atomic transaction,
  blocks deleting an employee referenced by operational documents or active links, and blocks
  self-suspension / self-deletion.
- Invite flow generates short-lived single-use verification tokens (`Pending` → `Active` on first
  verified login + optional mandatory 2FA enrollment).

### Security checklist (per-feature)
- **PII masking:** User `email` and Employee `email` and `phone` are masked via `maskEmail` and
  `maskPhone` in grid cells, grid `searchBlob`, filterable raw values, and CSV exports; full
  values are displayed only inside the preview/edit drawer for authorised viewers.
- **Least privilege & lockouts:** Role/permission mutations require admin authorization in
  production; UI protects against accidental lockout by refusing deletion, suspension, or
  demotion of the last active `Admin` or current signed-in user.
- **Audit events (required on backend):** record actor, timestamp, and before/after diffs on user
  invite, resend invite, role change, per-module permission change, status transition
  (`Suspended` / `Reactivate`), user delete, and employee create / edit / status change / delete.

### Decisions & deferred-to-backend
- Prototype stores per-module permissions (`none | read | write`) on the `User` record directly so
  admins can customize individual module access without a separate custom-role builder; backend
  can introduce named permission groups alongside per-user overrides if needed.
- `Resend invite` triggers a confirmation toast in the browser prototype; backend dispatches the
  transactional email and rotates any prior pending token with rate limiting.
- Self-identification in the prototype checks `me.email` (`Kavitha Elumalai`, `USR00007`) because
  there is no server session token; backend derives the actor from verified auth claims.

## React app (2026-11-17)
- Domain rules & tests: [`apps/web/src/domain/people.ts`](../../apps/web/src/domain/people.ts)
  and [`apps/web/src/domain/people.test.ts`](../../apps/web/src/domain/people.test.ts).
- Status tones added in [`apps/web/src/domain/status.ts`](../../apps/web/src/domain/status.ts)
  (`Pending`, `Suspended`, `On leave`, `Terminated`, `Contractor`).
- Template extensions (backward-compatible): optional `bulkActions` on `DataGrid`/`ListPage`,
  `actions` with `inDrawer` rendered in `EditableDrawer` view footer alongside `Edit`/`Delete`,
  and optional `stats` + `extraEdit` on `ListEditor`/`EditableDrawer`.
- Screens & routes:
  - [`UsersPage`](../../apps/web/src/features/people/users/UsersPage.tsx) +
    [`dataset.ts`](../../apps/web/src/features/people/users/dataset.ts) at `/people/users`
  - [`EmployeesPage`](../../apps/web/src/features/people/employees/EmployeesPage.tsx) +
    [`dataset.ts`](../../apps/web/src/features/people/employees/dataset.ts) at `/people/employees`
- End-to-end tests: [`apps/web/e2e/people.spec.ts`](../../apps/web/e2e/people.spec.ts).
