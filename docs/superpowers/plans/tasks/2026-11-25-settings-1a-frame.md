# Task brief — Settings redesign, run 1a: registry, routes, frame, sidebar entries

Worktree `D:/Sparstrow/shelfree-set1a`, branch `feat/settings-frame` (from `main`). This is Phase 1,
**tasks 1–4** of `docs/superpowers/plans/2026-11-24-settings-redesign.md`. Another run works in parallel on
tasks 5 and 8 (permissions + number sequences data) in `domain/`, `data/` and `features/people/users/` —
**do not touch those folders**. You own: `components/settings/` (registry, frame, a new
`shortcut-meta.ts`), `routes/settings/`, new `routes/$module/settings/`, `app/shell/Sidebar.tsx`,
`app/shell/TopBar.tsx` (breadcrumb only), `features/settings/sections.ts`, `features/departments/` (only
to list module Settings pages), and e2e files you add.

## Read first
1. `CLAUDE.md` — "Page templates" (Settings section), "Quiet pages", "Interaction / hover states",
   "Keyboard shortcuts", "One URL per page".
2. The spec `docs/superpowers/specs/2026-11-24-settings-redesign.md` (the decisions, the "Where each
   section goes" table, URLs, central navigation) and the plan's tasks 1–4.
3. Today's code: `components/settings/nav.ts`, `SettingsFrame.tsx`, `SettingsPage.tsx`,
   `features/settings/sections.ts`, `routes/settings/index.tsx`, `routes/settings/$section.tsx`,
   `routes/$module/$page.tsx`, `app/nav.ts` (`ModuleId`, `MODULES`), `app/shell/Sidebar.tsx`,
   `app/shell/TopBar.tsx`, `app/stores/ui.ts` (`demoRole`), `components/help/` (help maps — for search),
   `e2e/settings.spec.ts`.

## Build
**Task 1 — registry** (`components/settings/registry.ts`, pure, with `registry.test.ts`): exactly as the
plan. Areas: `workspace`, one per module `purchasing | sales | warehouse | production | finance | people`,
`shared`, `personal`. Section ids: keep today's ids (`ws-profile`, `uom`, `cfg-taxset`, `me-profile` …)
as the canonical ids where the section keeps one place; shared lists get short ids per module
(`sequences`, `statuses`, `fields`, `terms`, `tax-codes`) with `shared: '<list>'` and the old `cfg-*` id
as `legacyIds` on the central Shared lists entry. Each section has `type: 'form' | 'list' | 'custom'`
(from the spec's Templates table). Helpers `findSection`, `sectionPath`, `legacyRedirect`,
`areasForModules`, `firstSection`, `searchSettings` (section labels, plus row labels / help text from an
optional map you pass in; ranking label-prefix > word-prefix > contains). Keep `nav.ts` as thin
re-exports only while callers move; remove callers of the old shape in this run.

**Task 2 — routes**: `routes/$module/settings/index.tsx` (→ first section) and `$section.tsx`
(`beforeLoad`: unknown → `notFound`; module not a settings area → `notFound`). They must take precedence
over `routes/$module/$page.tsx`: `/purchasing/settings` and `/purchasing/purchase-orders` must both
work. `routes/settings/shared/$list.tsx`. `routes/settings/$section.tsx`: workspace + personal; an old
id redirects (`replace: true`) to its new URL. `/settings` keeps landing on Business profile (Profile for
a `member`).

**Task 3 — frame**: `SettingsFrame` takes the area. Central (`/settings/...`): grouped list Workspace ·
Modules (one collapsible entry per module, expands to its sections, links to the module URLs; the module
of the current section starts open) · Shared lists · Personal. A `member` sees Personal only. Module area
(`/<module>/settings/...`): only that module's sections + an "All settings" link. Breadcrumb in the top
bar: `Settings ▸ Workspace ▸ Business profile`, `Purchasing ▸ Settings ▸ Number sequences`.
**Find a setting** input at the top of the central list (`/` focuses it; ↑ ↓ move, Enter opens; Esc
clears then blurs; matches show the area as secondary text; no-match text "No settings match"). When a
match is a row, navigate with `?find=<rowKey>` and the section scrolls to and briefly highlights the
element with `data-setting-row="<rowKey>"` (add that attribute to the rows rendered by
`SettingsRows.tsx`; add a `highlight` animation token if needed in `styles/tokens.css`). Keys `[` / `]`
previous / next section in the current list (not while typing, not with a dialog open). Phones: the list
becomes a select (as today), grouped the same way. Unported sections keep the "not moved yet" state with a
link to the area's first section. Frame keys as data in `components/settings/shortcut-meta.ts` (the
catalogue entry itself is done later by the reviewer — just export the meta).

**Task 4 — entries**: Sidebar — each module section (only modules that have a settings area) ends with a
**Settings** item (gear icon) to `/<module>/settings`, active when the path starts with it; the
collapsed rail shows it in the module flyout. Top-bar / sidebar gear → `/settings`; account menu
"My settings" → `/settings/me-profile`. Departments directory lists each module's Settings page.

## Rules
- Pure helpers stay pure (no React) and tested. Hover / focus / motion states on every new control;
  Tailwind tokens only; quiet page (no descriptions inline).
- Section components (`BusinessProfileSection`, `ShortcutsSection`, `UnitsOfMeasureSection`) are not
  changed in this run beyond the import of where they are registered; `uom` moves to Warehouse in the
  registry (its body stays as today).
- Update `e2e/settings.spec.ts` URLs and add `e2e/settings-frame.spec.ts`: sidebar Purchasing ▸ Settings
  shows only Purchasing sections; central list shows all groups; Find a setting jumps to Business profile's
  GSTIN-or-similar row and highlights it; `[` `]` move; `/settings/uom` redirects to
  `/warehouse/settings/uom`; `/purchasing/purchase-orders` still opens; a member sees Personal only.
- Delete nothing else. No docs rewrite in this run (the reviewer does it) — but list what you changed.


## How to work (tool rules — breaking these stops the run)
- Read and search with your built-in file tools only. No shell commands to read
  or search files.
- Do NOT run any shell commands at all (not even `pnpm typecheck` / `lint` / `test` —
  headless mode denies them and that ends your run). The reviewer runs every check.
  So write code that is correct by reading: strict TypeScript, no unused imports, hook
  dependency arrays complete and stable (memoize derived arrays with `useMemo`).
- Do NOT commit, push or switch branches. Only touch the files this brief lists.

## Always
- Read `CLAUDE.md` first ("Frontend stack & rules", "Page templates", "Edit in
  place", "Quiet pages", "Tokens & colour", "Contacts").
- Use the templates; never copy them. If you need a template option that
  doesn't exist, add it as an OPTIONAL, backward-compatible prop and say so in
  your summary.
- Data only through `@/data/queries` hooks. No seed imports in features, no
  localStorage, no `any`, Tailwind theme tokens only, `money()`/`int()`/
  `fmtDate()` from `@/lib/format`, status as a pill.
- Phone and email are personal data: masked in grids and exports
  (`maskPhone` in `@/lib/privacy`; add `maskEmail` there if you need it, with a
  test), full in the drawer.
- Use `getByLabel('…', { exact: true })` in Playwright tests (labels also have
  "About …" help buttons).
- Update the page's `docs/<page>/README.md` with a `## React app (2026-11-17)`
  section (files, URL, same-as-prototype, deliberate changes, persistence key
  `shelfree.v2.<collection>`, backend rules, tests) and add your page(s) to the
  status table in `docs/superpowers/plans/2026-11-15-react-frontend-migration.md`.

## When you finish
Print a short summary: files changed, template options added, anything you
could not do or verify, open questions.
