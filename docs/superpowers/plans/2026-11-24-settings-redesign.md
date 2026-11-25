# Plan — Settings redesign (workspace, module and personal settings)

**Spec:** `docs/superpowers/specs/2026-11-24-settings-redesign.md` (approved 2026-11-24)
**App:** `apps/web` · every task ends with `pnpm typecheck && pnpm lint && pnpm test`, `pnpm exec vite build`
(regenerates `routeTree.gen.ts`) and the browser tests named in the task, then a check in the browser.

Two phases. **Phase 1** builds the new frame, navigation, permissions and the three section types, and
moves the three sections already ported. **Phase 2** ports the remaining prototype sections onto it, one
area per run. Nothing in Phase 2 starts before Phase 1 is merged.

## Execution

| Run | Tasks | Who | Files it owns (no overlap between parallel runs) |
|---|---|---|---|
| 1a | 1, 2, 3, 4 | agy `gemini-4-neon-high` | `components/settings/` (registry, frame), `routes/settings/`, `routes/$module/settings/`, `app/shell/Sidebar.tsx`, account menu |
| 1b (parallel with 1a) | 5, 8 | agy `gemini-4-hydrogen-xhigh` | `domain/settings-permissions.ts`, `domain/number-sequences.ts`, `data/schemas`, `data/api`, `data/queries`, `data/seed/`, `features/people/users/` |
| 1c (after 1a + 1b) | 6, 7, 9 | agy `gemini-4-neon-high` | `components/settings/SettingsSection.tsx` / rows, `components/list-page/ListPage.tsx`, `features/settings/`, `domain/purchase-order.ts` numbering |
| 1d | 10, 11 | Claude | docs, shortcuts catalogue, e2e review, PR |
| 2 | Phase 2 areas | agy, two runs at a time | one area each (see the end) |

Claude writes each run's brief (`docs/superpowers/plans/tasks/`), the `.reference.md` prototype extract,
reviews, fixes, runs every check and opens the PR (auto-merge on).

---

## Phase 1

### Task 1 — Settings registry (pure data + helpers) ✅ done 2026-11-25
- **New** `components/settings/registry.ts`: replaces `nav.ts`. Types:
  `SettingsArea = { id: 'workspace' | ModuleId | 'shared' | 'personal'; label; kind: 'workspace' | 'module' | 'shared' | 'personal'; sections: SectionDef[] }`,
  `SectionDef = { id; label; type: 'form' | 'list' | 'custom'; shared?: SharedListId; legacyIds?: string[] }`.
  Fill it from the spec's "Where each section goes" table (all 30 sections + shared lists).
- Helpers: `findSection(areaId, sectionId)`, `sectionPath(area, section)` (module → `/<module>/settings/<id>`,
  workspace / personal → `/settings/<id>`, shared → `/settings/shared/<id>`), `legacyRedirect(oldId)`,
  `areasForModules(enabledModules)`, `firstSection(area)`, `searchSettings(query, helpMaps)` (section
  labels + row labels + help text, ranked: label prefix > word prefix > contains).
- **Tests** `registry.test.ts`: every prototype section id appears exactly once (as id or legacy id);
  every shared list appears in ≥ 1 module and in `shared`; paths are unique; legacy ids resolve; search ranks.
- Keep `nav.ts` exports working as thin re-exports until Task 3 removes the callers.

### Task 2 — Routes and redirects ✅ done 2026-11-25
- **New** `routes/$module/settings/index.tsx` (redirect to the area's first section) and
  `routes/$module/settings/$section.tsx` (`beforeLoad`: unknown module / section → `notFound`; module off →
  redirect to `/settings`). They must win over the fallback `routes/$module/$page.tsx` — verify with
  `/purchasing/settings` and `/purchasing/purchase-orders` both still working.
- **New** `routes/settings/shared/$list.tsx`.
- `routes/settings/$section.tsx`: workspace / personal sections; an old id (`uom`, `cfg-taxset`, …)
  redirects (`replace: true`) to its new URL via `legacyRedirect`. `routes/settings/index.tsx` unchanged
  behaviour (Business profile, or Profile for a member).
- Saved favourites / recents that point at old settings URLs keep working through the redirect.

### Task 3 — Frame and navigation ✅ done 2026-11-25
- Rework `components/settings/SettingsFrame.tsx` → props `{ area, sectionId, sections }`.
  - **Central** (`/settings/...`): left list grouped Workspace · Modules (one collapsible entry per enabled
    module, expanding to its sections; links go to the module URLs) · Shared lists · Personal. Member role
    sees Personal only (+ read-only module areas they can use).
  - **Module area** (`/<module>/settings/...`): left list = that module's sections + "All settings" link.
  - Breadcrumb in the top bar: `Settings ▸ Workspace ▸ Business profile` / `Purchasing ▸ Settings ▸ Number sequences`.
  - **Find a setting** box at the top of the central list: `searchSettings`; ↑ ↓ Enter opens the match and
    scrolls to / highlights the row (`data-setting-row` attribute on rows); `/` focuses it.
  - Keys: `[` / `]` previous / next section in the current list, `?` toggles inline help (existing).
  - Phones: the list becomes a select (as today).
- Unported sections keep the "not moved yet" state.
- Hover / focus / motion per CLAUDE.md; quiet page (no descriptions inline).

### Task 4 — Sidebar and account menu entries ✅ done 2026-11-25
- `app/shell/Sidebar.tsx`: each module section ends with a **Settings** item (gear icon) linking to
  `/<module>/settings`, generated from the registry; active state when the path starts with it; collapsed
  rail shows it in the module flyout. Not in Favorites' "add page" list twice (it is a page like others).
- Top-bar gear → central `/settings`. Account menu → "My settings" → `/settings/<first personal section>`.
- Departments directory (`/departments`) lists module Settings pages too.

### Task 5 — Permissions ✅ done 2026-11-25
- `userSchema`: add `settings: z.record(z.string(), z.boolean()).default({})`; seed from role presets
  (Owner / Admin: all true; Manager: their modules; Viewer: none).
- **New** `domain/settings-permissions.ts` + tests: `canEditArea(user, role, area)` — workspace: owner /
  admin; module: owner / admin or `user.settings[module]`; personal: always; shared lists: owner / admin
  (each module slice follows its module). `canViewArea` — module needs `perms[module] !== 'none'`.
- People ▸ Users drawer: permission matrix gets a **Manage settings** column (switch per module, in place,
  edit-in-place rules); Users page gets a small "Manage roles" link → `/settings/ws-team`.
- A `useSettingsAccess(area)` hook (in `components/settings/`) returning `{ canView, canEdit }` from the
  signed-in demo user (`useUi().demoRole` + current user record). UX only; backend enforces (doc it).

### Task 6 — Read-only mode in the section types ✅ done 2026-11-25
- `SettingsSection` (form): `readOnly` → every row renders its view text in the same box (edit in place:
  nothing moves), no Save bar, Ctrl+S inert; a quiet state line "View only — ask an admin" under the title.
- `SettingsPage` (custom): passes `readOnly` to its body via context.
- The frame sets `readOnly` from `useSettingsAccess`.

### Task 7 — ListPage embedded mode + Units of measure moved ✅ done 2026-11-25
- `ListPage` gets optional `embedded?: boolean` (no `TopBar`, no page-level New button in the top bar — the
  grid toolbar shows New instead, height fits the settings pane, keys scoped to the pane) and
  `readOnly?: boolean` (hides New / Edit / Duplicate / Delete, drawer view-only). Other pages unchanged.
- Move `features/settings/units-of-measure/UnitsOfMeasureSection.tsx` onto `ListPage embedded` with the
  `editor` (same fields, validation and delete rules as today); register it under Warehouse ▸ Settings.
- Business profile → Workspace, Keyboard shortcuts → Personal (registry only).

### Task 8 — Number sequences data and rules (first shared list) ✅ done 2026-11-25
- `numberSequenceSchema`: `{ id, docType, module, name, prefix, digits, suffix?, next, resets: 'never' | 'yearly-apr' | 'yearly-jan', isDefault, active, issued: number, scope?: { warehouseId?; gstin? } }`.
  `modules` derives from `docType` (PO / receipt → purchasing, SO / invoice → sales, item → warehouse,
  BOM / AO → production, employee → people); store `module` on the row.
- Collection `numberSequences` (`shelfree.v2.numberSequences`), seed one default series per existing
  document type, `next` = one past the highest existing number (PO00011, PR00007 …).
- **New** `domain/number-sequences.ts` + tests: `formatNumber(series, n)`, `preview(series)`,
  `validateSeries(series, all)` (one default per docType, next ≥ issued + 1 and only up, unique output per
  docType, digits 1–10), `canDelete(series)` (`issued === 0`), `setDefault(all, id)`, `takeNext(series)`.
- Commands: `saveSeries`, `deleteSeries` (refuses when issued), `setDefaultSeries`.

### Task 9 — Number sequences section + numbering wired ✅ done 2026-11-25
- `features/settings/number-sequences/NumberSequencesSection.tsx`: `ListPage embedded`, grouped by
  document type (group-by on `docType`, from the grid template), columns Series · Format · Next number
  (preview, Geist Mono) · Resets · Status pill; drawer editor; `module` filter when opened in a module area
  (New pre-fills the module's first docType), Module column in `/settings/shared/sequences`.
- Purchase orders and receipts take their next number from the default active series via a command
  (`issueNumber(docType)` increments `next` and `issued` in the same transaction as the document save),
  replacing `poNextNo` / receipt numbering. Existing tests for numbering keep passing.

### Task 10 — Shortcuts, docs, security ✅ done 2026-11-25
- `src/app/shortcuts.ts`: Settings group updated (`[` `]`, `/` find, `?`, Ctrl+S, Esc) — the frame's keys
  as data in `components/settings/shortcut-meta.ts`.
- `docs/settings/README.md` rewritten for the new structure (areas, URLs, section types, permissions,
  redirects, backend endpoints `GET/PUT /settings/<area>/<section>`, `/number-sequences`).
- `docs/units-of-measure/README.md`, `docs/users/README.md` (Manage settings), new
  `docs/number-sequences/README.md`; `docs/security/README.md` (settings write permission + audit event per save);
  migration plan status table; spec status → Shipped (Phase 1).

### Task 11 — Browser tests ✅ done 2026-11-25
- `e2e/settings-redesign.spec.ts`: sidebar Purchasing ▸ Settings opens `/purchasing/settings/...` with only
  Purchasing sections; central Settings lists all areas and Find a setting jumps to a row; `[` `]` move
  between sections; `/settings/uom` redirects to `/warehouse/settings/uom`; a Viewer sees Purchasing
  settings read-only (no Save / New), an Admin can edit; Number sequences: add a second PO series, set it
  default, the next new PO uses it, deleting an issued series is refused.
- Update `e2e/settings.spec.ts` URLs.

---

## Phase 2 — port the remaining sections (one area per run, after Phase 1 merges)

Same behaviour and copy as the prototype; only the location and section type change. Each run: brief +
`.reference.md`, the area's sections, their docs, e2e, shortcuts.

| Run | Area | Sections (type) |
|---|---|---|
| 2.1 | Purchasing | Carrier types (list), Statuses ¹ (list), Custom fields ¹ (list), Payment terms ¹ (list) — first users of `module`-filtered shared lists beyond sequences |
| 2.2 | Warehouse | Item categories (list), Locations & warehouses (list) |
| 2.3 | Finance | Tax settings (form — prototype `tsHelpText` help map), Tax codes ¹ (list), States & territories (list, workspace) |
| 2.4 | Sales + Production | Sales pricing (form), Assembly & production (form) |
| 2.5 | Workspace | GST registrations (list), Regional & format (form), Team & roles (list), Terminology (list), Navigation + favourites defaults (custom), Modules & capabilities (custom), Plan & billing (custom, no billing) |
| 2.6 | Personal | Profile, Appearance (replaces the temporary theme switch), Notifications, Language & region, Personal defaults (forms), Favorites & views (custom), Security (form) |

¹ shared list: module slice + whole list under Shared lists.

Each Phase 2 run updates the registry entry from "not moved yet" to its component (one line in
`features/settings/sections.ts`) and the migration plan's status table.
