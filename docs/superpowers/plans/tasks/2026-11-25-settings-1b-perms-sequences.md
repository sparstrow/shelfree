# Task brief — Settings redesign, run 1b: settings permissions + number sequences data

Worktree `D:/Sparstrow/shelfree-set1b`, branch `feat/settings-perms-seq` (from `main`). This is Phase 1,
**tasks 5 and 8** of `docs/superpowers/plans/2026-11-24-settings-redesign.md`. Another run works in
parallel on the settings registry, routes, frame and sidebar (`components/settings/`, `routes/`,
`app/shell/`) — **do not touch those**. You own: `domain/settings-permissions.ts`,
`domain/number-sequences.ts` (+ tests), `data/schemas/`, `data/api/`, `data/queries/`, `data/seed/`,
`features/people/users/`, and e2e files you add. Do **not** wire numbering into purchase orders /
receipts yet (that is task 9, a later run) and don't build the Number sequences screen.

## Read first
1. `CLAUDE.md` — "The data seam", "Business rules are pure functions", "Edit in place", "Security".
2. The spec `docs/superpowers/specs/2026-11-24-settings-redesign.md` ("Permissions", "Data model
   changes", Open question 2 — the sequence rules) and the plan's tasks 5 and 8.
3. Today's code: `data/schemas/index.ts` (`userSchema`, `perms`), `data/api/` (how a collection is
   declared, seeded and versioned; `commands.ts` transactions), `data/queries/index.ts`,
   `data/seed/` + `seed-data.js` (users, purchase orders, receipts, items, BOMs, assembly orders,
   employees — their existing numbers), `domain/numbering.ts`, `features/people/users/UsersPage.tsx`
   and `dataset.ts` (the permission matrix in the drawer), `app/stores/ui.ts` (`demoRole`).

## Build
**Task 5 — permissions**
- `userSchema`: add `settings: z.record(z.string(), z.boolean()).default({})`. Seed: owner / admin users
  all modules true; a user whose role is a manager: true for the modules where `perms[m] === 'write'`;
  others none. Existing stored data without the field must still parse (default).
- `domain/settings-permissions.ts` + tests: `type SettingsAreaKind = 'workspace' | 'module' | 'shared' | 'personal'`;
  `canViewArea({ role, user }, kind, moduleId?)` and `canEditArea(...)` — workspace / shared: owner or
  admin; module: owner / admin, or `user.settings[module] === true` (view needs
  `user.perms[module]` not `'none'`); personal: always. Role names: reuse the `DemoRole` values
  (`owner | admin | member`) plus the user record; document the mapping in a comment.
- People ▸ Users drawer: the permission matrix gets a **Manage settings** column (a switch per module
  row) that follows edit in place (view: "Yes" / "—" text in the same box; edit: the switch). Saved with
  the user through the existing save path. The Users list page gets a small quiet "Manage roles" link in
  its top bar (`topBarExtra` or the page's actions) to `/settings/ws-team`.
- `useSettingsAccess` is NOT yours (the frame run builds it later from your domain function) — just export
  the domain functions.

**Task 8 — number sequences data**
- `numberSequenceSchema` exactly as the plan (`id, docType, module, name, prefix, digits, suffix?, next,
  resets: 'never' | 'yearly-apr' | 'yearly-jan', isDefault, active, issued, scope?`). `docType` enum:
  `purchase-order | purchase-receipt | sales-order | sales-invoice | item | bom | assembly-order |
  employee`; `moduleOfDocType()` maps them (PO / receipt → purchasing, SO / invoice → sales, item →
  warehouse, BOM / AO → production, employee → people).
- Collection `numberSequences` (`shelfree.v2.numberSequences`), seeded with one default active series per
  docType whose prefix / digits match the existing seed numbers and whose `next` is one past the highest
  existing number (compute from the seed, don't hardcode); `issued` = count of existing documents.
  Kanalora names ("Purchase orders", "Goods receipts" …).
- `domain/number-sequences.ts` + tests: `formatNumber(series, n)`, `previewNext(series)`,
  `validateSeries(series, all)` returning field errors (prefix required unless suffix; digits 1–10;
  next ≥ issued + 1 and never below its saved value; unique output per docType — two active series of the
  same docType can't produce the same string; one default per docType), `canDeleteSeries` (`issued === 0`),
  `setDefault(all, id)` (exactly one default per docType, the default must be active), `takeNext(series)`
  → `{ number, series }`.
- Commands in `data/api/commands.ts`: `saveNumberSequence`, `deleteNumberSequence` (refuses with an error
  when issued > 0), `setDefaultNumberSequence`; query hooks `useNumberSequences`, `useSaveNumberSequence`,
  `useDeleteNumberSequence`, `useSetDefaultNumberSequence` in `data/queries/`.
- `data/schemas/seed.test.ts` (or a new test) checks the seeded series parse and `next` > every existing
  number.

## Rules
- Pure domain, tested. Data only through api / queries. Strict types, no `any`.
- e2e `e2e/users-manage-settings.spec.ts`: open a user, Edit, switch Manage settings on for Purchasing,
  Save, it shows "Yes" in view; the "Manage roles" link goes to `/settings/ws-team`.
- Docs: add a short section to `docs/users/README.md` (Manage settings field, backend enforcement, audit)
  and create `docs/number-sequences/README.md` (five-section shape: data model, rules the backend
  enforces — gaps / duplicates matter for GST audits — persistence key, endpoints
  `GET/POST/PUT/DELETE /number-sequences`, `POST /number-sequences/:id/default`, and that numbers are
  issued server-side in the same transaction as the document).


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
