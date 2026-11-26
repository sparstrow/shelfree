# Personal settings (Settings ▸ Personal)

Seven sections that belong to the signed-in user, not the workspace: **Profile**, **Appearance**,
**Notifications**, **Language & region**, **Personal defaults**, **Favorites & views** and **Security**.
Prototype reference: `prototype/designs/erp/Shelfree App.dc.html` (`meDefaults()`, `meSet()`, the
`spMe*` blocks, help text `q.meprof.*` … `q.mefav.*`). Part of the Settings redesign
([`../settings/README.md`](../settings/README.md)); tiers are parked (ungated Starter base).

## React app (2026-11-25)

**URLs** (central Settings, Personal area): `/settings/me-profile`, `/settings/me-appearance`,
`/settings/me-notifications`, `/settings/me-language`, `/settings/me-defaults`, `/settings/me-favorites`,
`/settings/me-security`. The account menu's "My settings" opens `me-profile`; `/settings` lands there for a Member.

**Access.** Every user, Member included, can view and edit all seven (`canEditArea(…, 'personal') === true`, so the
frame never passes them a read-only state). A Member sees only Personal and the modules they can read.

### Files
- `apps/web/src/features/settings/personal/` — `ProfileSection`, `AppearanceSection`, `NotificationsSection`,
  `LanguageSection`, `DefaultsSection` (all `SettingsSection` forms), `FavoritesSection` and `SecuritySection`
  (`SettingsPage` with their own body), `help.ts` (the quiet-help maps), `use-me-block.ts`.
- `apps/web/src/domain/personal-preferences.ts` (+ `.test.ts`) — options, validation, and the resolvers
  `resolveTheme`, `resolveRegional`, `resolveAssemblyDefaults`, `landingTarget`.
- `apps/web/src/data/api/session.ts` (`meSchema`, `sessionApi.patchMe`), `data/queries/session.ts`
  (`useMe`, `useUpdateMe`, `meQueryOptions`), `data/api/security.ts` + `data/queries/security.ts` (stubs).
- Template option: `SettingsSection` got an optional `preview(values)` prop (live preview of a draft; reverted on
  discard / unmount). Only Appearance uses it.
- `apps/web/e2e/settings-personal.spec.ts` (8 tests).

### Data model — one per-user record, saved at block level
There is **one** current-user store: `shelfree.v2.me` (zod `meSchema` in `data/api/session.ts`), the record behind
`useMe()` that already held name, avatar, language, `defLocation` and `showSetHelp` (the `?` toggle). It is extended,
not forked. Every section saves **only its own keys**: `sessionApi.patchMe(patch)` reads what is stored at save time,
merges the patch, validates the whole record with zod and writes it, so one section's save never overwrites another's
(`useUpdateMe` takes a `Partial<Me>`). Recents and the pinned sidebar section stay in the `favorites` / `savedViews`
collections and the UI store (`recents`); this record holds the *settings* about them.

| Section | Keys on `me` | Default (Kanalora) |
|---|---|---|
| Profile | `name`, `title`, `email`, `phone` (+ derived `avatar` = initials) | Kavitha Elumalai · Finance Manager · kavitha.elumalai@kanalora.example · +91 90031 44378 |
| Appearance | `theme` `dark \| light \| system`, `defDensity` `compact \| comfortable` | `dark`, `compact` |
| Notifications | `notifyLowStock`, `notifyPO`, `notifyMentions`, `notifyDigest`, `notifyChannel` (`In-app only \| In-app + email \| Email only`) | on, on, on, off, `In-app + email` |
| Language & region | `language`, `locale`, `dateFmt`, `numFmt` (`''` = workspace) | `English (India)`, `en-IN`, `''`, `''` |
| Personal defaults | `defLanding`, `defLocation` (a warehouse **code**), `defAssemblyLoc` (a warehouse id, `''` = workspace), `defAssemblyQty` (int ≥ 1), `showTaxSplit` | `Purchasing · Purchase Orders`, `TVM-MAIN`, `''`, `1`, off |
| Favorites & views | `showRecents` (the pins and views are the `favorites` / `savedViews` collections) | on |
| Security | `twoFA` (a flag only) | on |

### Profile (PII) and the Users record
The profile is the current user's **People ▸ Users** record seen from their side, not a second copy. `me` holds the
display fields; saving a changed name or email also writes them to the matching `users` row (found by the previous
email), so People ▸ Users, the account menu and notes show one set of details. The Settings actor lookup (Member
module access) matches `me.email` to `users`, so the mirror keeps access working after an email change. Validation:
name required (≤ 80), email required and valid, phone optional and valid. Phone/email are PII — see Backend notes and
`docs/security/README.md`. "Change photo" is not ported (no file storage; the avatar is the initials): gap G-041.

### Appearance replaces the temporary theme switch
The theme left the UI store (`useUi().theme`, removed) and is `me.theme`. `AppShell` applies it to
`<html data-theme>` (what the tokens read); `system` resolves from `prefers-color-scheme` and follows it live;
`index.html` applies the saved value before first paint (it reads `shelfree.v2.me`, falling back once to the old
`shelfree.v2.ui` value so nobody flips back to dark). The picker previews live, Save keeps it; Esc or leaving the page
restores the saved theme. The account menu's "Light theme / Dark theme" entry stays as a **shortcut into this same
setting**: it saves `me.theme` as the opposite of what is on screen.
Density: the data grid starts compact or comfortable from `me.defDensity` (compact is what the grid always did; the
prototype stored its value but never applied it, and its default of `comfortable` would have changed every list, so
the default here is `compact`). A grid's own toolbar toggle and saved views still win for that grid.

### Language & region, and the one resolver
Language and locale are the prototype's two rows (saved; the app is English only). **Date format** and **Number
format** are an addition: a personal choice or *Workspace default (…)*. `resolveRegional(workspaceRegional, me)` in
`domain/personal-preferences.ts` is the single place that decides which applies (currency, time zone, financial year
and week start are never personal). The display helpers in `lib/format.ts` don't read either yet (G-029 / G-039);
when they do, they call this resolver. Likewise `resolveAssemblyDefaults(me, production.outputLoc)` decides the
location and quantity of a new assembly order — it is wired into the assembly order editor now.

### Personal defaults
- **Landing page** — read by the `/` route (`landingTarget`): *Departments* opens only while Settings ▸ Navigation has
  that page on; an unknown or unavailable choice falls back to Purchase Orders. The prototype's default
  (*Warehouse · Items*) was never applied except for Departments, so the default here is the page the app opens on today.
- **Default location** — pre-fills a new employee (already read by People ▸ Employees). Options are warehouse codes.
- **Assembly orders** — *Build at* (`''` = Settings ▸ Assembly & production's output location) and *Default
  quantity* pre-fill a new assembly order.
- **Tax split columns** — stored; no reader yet (G-038).

### Favorites & views
Edits the same collections the sidebar and the grids use — `useFavoriteActions`, `useRenameSavedView`,
`useToggleDefaultSavedView`, `useDuplicateSavedView`, `useDeleteSavedView` (with Undo) — through the data seam; no
second store. Sections: *Pinned in the sidebar* (move up/down, remove), *My saved views* (make/remove default, pin/unpin,
rename in place, duplicate, delete with Undo) and *Recent pages* (`showRecents` switch, Clear). Pin / unpin follows the
workspace rule `favoritesConfig.enabled` (Settings ▸ Favorites & views, run 2.5b): off hides the Pin button. The
workspace cap and share role are owned by that section, not here.

### Security (UI only)
Nothing sensitive is stored in the client. *Change password* opens a dialog (current, new, confirm) validated by
`validatePasswordChange`; on submit `securityApi.changePassword` re-validates and **resolves, storing nothing**, and the
toast says the change was sent to the sign-in service. *Two-factor* is a switch holding a flag; turning it off asks first.
*Active sessions* are two demo rows; *Sign out others* hides the other row for the session (module memory, not storage).
The prototype's "Last changed 3 months ago" and one-line session text are kept as state lines. Real behaviour: G-040.

### Quiet help & shortcuts
Every title, group and row has an ⓘ from `personal/help.ts` (prototype text, plus option explanations for theme,
density and delivery channel). Shortcut groups in `src/app/shortcuts.ts`: *Settings › Personal*, *… › Favorites &
views*, *… › Security* (Ctrl/Cmd+S, Esc, Space on switches, `?`; Enter / Esc while renaming or in the password dialog).
Hover feedback on the new buttons uses the shared `hover-lift` / button variants.

### Tests
Vitest `domain/personal-preferences.test.ts` (theme, regional resolver, assembly defaults, landing, profile, password).
Playwright `e2e/settings-personal.spec.ts`: a **Member edits their own profile** (validation, persistence, account menu,
People ▸ Users mirror); live theme preview / discard / persist / account-menu shortcut / system; density default;
notification keys survive another section's save; personal vs workspace date format; defaults validation, assembly
pre-fill and landing redirect; favorites reorder / remove / recents; password validation + stub + no secret in storage,
2FA confirm, sign out others.

### Audit and permissions (security gate)
PII touched: name, email, phone (profile). Settings changes are audit events: `user.profile.updated`,
`user.preferences.updated` (one per save, keys changed), `auth.password.changed`, `auth.2fa.enabled|disabled`,
`auth.sessions.revoked`. Permission: the user edits only their own record; no admin right is needed or sufficient.
Nothing sensitive in localStorage: preferences hold no secrets; no password, code or token is ever stored.

## Backend-build notes
Entities: `user_settings(user_id PK, theme, density, notify_low_stock, notify_po, notify_mentions, notify_digest,
notify_channel, language, locale, date_fmt, num_fmt, landing, default_location, default_assembly_loc,
default_assembly_qty, show_tax_split, show_recents, updated_at)`; profile fields live on `users`
(`name`, `title`, `email`, `phone`, `avatar_url`) — one person record, with the Employee linked by `emp_id`.
Favorites and saved views already have their tables (`favorites`, `saved_views`, scoped to the session user).

Endpoints (the user is always the session user, never a request field):
- `GET /me` → profile + settings. `PATCH /me/settings` — partial update of the keys above; unknown keys rejected;
  `default_assembly_qty` int ≥ 1; `theme` ∈ dark/light/system; `date_fmt`, `num_fmt` must be one of the workspace
  options or empty.
- `PATCH /me/profile` — name, title, email, phone; email change re-verifies; mirrors to `users` / `employees` in one
  transaction; returns 409 on a duplicate email.
- `POST /me/password` `{ current, next }` — check current hash and policy (min 10, mixed case, digit, not reused); 422
  with field errors; success revokes other sessions. `PUT /me/2fa` (enable → enrolment flow; disable → re-auth).
  `GET /me/sessions`, `DELETE /me/sessions?except=current`.
- Landing page, density and formats are returned with the session so the first paint needs no extra call.

### Decisions & deferred-to-backend
- One current-user record, extended (not a parallel store); block-level `PATCH` so sections never overwrite each other.
- Theme is personal and moved out of UI-store local state; `system` is resolved client-side from the device.
- Personal date / number format overrides the workspace's only through `resolveRegional`; documents, exports and
  e-invoices always use the workspace format (the backend renders them).
- Defaults deliberately differ from the prototype in two places: density `compact` and landing `Purchasing · Purchase
  Orders` (both = today's behaviour; the prototype stored but never applied them).
- Deferred: delivering notifications (G-040), real 2FA / sessions (G-040), translation and applying personal formats
  (G-039), tax-split columns (G-038), profile photo and Employee mirror (G-041).
