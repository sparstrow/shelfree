# Task brief — Settings redesign, run 1c: read-only mode, embedded lists, Number sequences

Worktree `D:/Sparstrow/shelfree-set1c`, branch `feat/settings-1c`. This is Phase 1, **tasks 6, 7 and 9** of
`docs/superpowers/plans/2026-11-24-settings-redesign.md`. Runs 1a (registry, routes, frame, sidebar) and 1b
(settings permissions, number sequences data) are already in this branch — build on them, don't redo them.
You are the only run working now. You own: `components/settings/`, `components/list-page/` (optional props
only), `features/settings/`, `features/purchasing/purchase-orders/` and `purchase-receipts/` (numbering only),
`domain/purchase-order.ts`, `domain/purchase-receipt.ts`, `domain/number-sequences.ts`, `data/api/commands.ts`,
`data/queries/`, and e2e files you add. Docs, the shortcuts catalogue and the final e2e spec are done later by
the reviewer (run 1d) — only list what you changed.

## Read first
1. `CLAUDE.md` — "The data seam", "Page templates" (List page, Settings section, "Exceptions are options,
   never copies"), "Edit in place", "Quiet pages", "Keyboard shortcuts".
2. The spec `docs/superpowers/specs/2026-11-24-settings-redesign.md` (Permissions, Templates table, Number
   sequences, open question 2) and the plan's tasks 6, 7, 9.
3. Today's code:
   - Settings: `components/settings/` (`registry.ts`, `SettingsFrame.tsx`, `SettingsPage.tsx`,
     `SettingsSection.tsx`, `SettingsRows.tsx`, `SaveBar.tsx`, `use-settings-form.ts`), `features/settings/sections.ts`,
     `features/settings/units-of-measure/` (section + `UnitDialog.tsx` + `help.ts`).
   - Permissions: `domain/settings-permissions.ts` (`canViewArea` / `canEditArea`, `SettingsActor`),
     `app/stores/ui.ts` (`demoRole`), the users collection and how the app knows who the current user is
     (search for the "me" profile / current user).
   - Lists: `components/list-page/ListPage.tsx`, `components/data-grid/model.ts` (group-by, filters, views),
     any existing list page that uses `editor` (e.g. charges or carriers) as the pattern.
   - Numbering: `domain/numbering.ts`, `domain/number-sequences.ts` (+ test), `domain/purchase-order.ts`
     (`poNextNo`), `domain/purchase-receipt.ts` (`prNextNo`, `receiptDraftFromOrder`), `data/api/commands.ts`
     (`duplicatePurchaseOrders`, `postPurchaseReceipt`, the number sequence commands), `data/queries/number-sequences.ts`,
     `features/purchasing/purchase-orders/PurchaseOrderEditor.tsx` (`commit`, the new-order draft),
     `features/purchasing/purchase-receipts/PurchaseReceiptEditor.tsx` (draft save + post).

## Build
**Task 6 — read-only mode**
- `components/settings/use-settings-access.ts`: `useSettingsAccess(area)` → `{ canView, canEdit }`, built from
  `canViewArea` / `canEditArea` with the actor = `demoRole` + the current user's record (if the app has no
  current-user record for the demo role, owner/admin need none; a `member` uses the record the app treats as
  "me"). Pure logic stays in the domain; the hook only reads stores / queries.
- `SettingsSection` gets optional `readOnly?: boolean`: every row shows its view text in the **same box** as the
  control (edit in place — nothing moves; reuse whatever view rendering `SettingsRows` / `record-fields` already
  have, or add a `readOnly` path there), no Save bar, Ctrl+S inert, and one quiet state line
  **"View only — ask an admin to change these settings."** under the title.
- `SettingsPage` gets optional `readOnly?: boolean` and exposes it to its body through a small context
  (`useSettingsReadOnly()`), so custom sections can switch their own controls off.
- `SettingsFrame` computes access for the current area / section and passes `readOnly` to the section component
  (`{ module, readOnly }` props, both optional). If `canView` is false the frame shows the existing "no access"
  / fallback behaviour rather than the section.

**Task 7 — ListPage embedded + read-only; Units of measure onto it**
- `ListPage` optional props, other pages unchanged:
  - `embedded?: boolean` — no `TopBar` (no page title row / top-bar New); the grid toolbar shows a New button
    instead; height fits its container (the settings pane) instead of the viewport; page keys only fire when
    focus is inside the list (or nothing else is focused) and never while the frame's Find input is focused.
  - `readOnly?: boolean` — hides New / Edit / Duplicate / Delete / bulk actions / in-grid editing; the drawer
    opens view-only; keys N / E / Delete / Ctrl+S inert.
  Comment each option where it is declared.
- Move `features/settings/units-of-measure/UnitsOfMeasureSection.tsx` onto `ListPage embedded` with an `editor`
  (same fields, validation and delete rules as today — read `UnitDialog.tsx` and keep its rules; delete
  `UnitDialog.tsx` only if nothing else uses it). It stays registered under Warehouse ▸ Settings. Data still via
  the existing UoM query hooks.

**Task 9 — Number sequences section + numbering wired**
- `features/settings/number-sequences/NumberSequencesSection.tsx` (+ `dataset.ts`, `help.ts`): `ListPage embedded`
  over `useNumberSequences()`, grouped by document type (grid group-by on `docType`, labels "Purchase orders",
  "Goods receipts" …), columns **Series · Format · Next number** (the preview, Geist Mono) **· Resets · Status**
  (pill: Default / Active / Inactive), in shared mode also **Module**. Drawer editor fields: Document type, Name,
  Prefix, Digits, Suffix, Next number, Resets, Active, Default; live preview in the drawer; validation from
  `validateSeries`; Delete uses `canDeleteSeries` (blocked reason "Numbers were already issued from this series —
  make it inactive instead."); a "Set as default" row action using `setDefaultNumberSequence`.
  - Registered for each module area that has document types (purchasing, sales, warehouse, production,
    people) with `{ module }` → rows filtered to that module, New pre-fills the module's first docType, the
    docType choices are the module's only; and as the shared list `sequences` (`/settings/shared/sequences`)
    showing all modules with the Module column. Read the registry for the exact section ids.
  - `readOnly` from the frame is passed to `ListPage readOnly`.
- **Number issuing** — one command, used by every place that creates a purchase order or receipt:
  - `issueNumber(docType)` in `data/api/commands.ts`: finds the default active series for the docType
    (none → `CommandError('No active number series for <label>. Add one in Settings ▸ Number sequences.')`),
    takes `takeNext`, but never returns a number that already exists among that docType's documents (if the
    stored `next` is stale, skip forward to one past the highest existing number with the same prefix/suffix),
    saves the series with `next` + 1 and `issued` + 1, returns the number. Pure parts in
    `domain/number-sequences.ts` with tests (e.g. `nextFree(series, existingNos)`).
  - `createPurchaseOrder(draft)` and `createPurchaseReceipt(draft)` commands (+ `useCreatePurchaseOrder`,
    `useCreatePurchaseReceipt` hooks): issue the number and save the document together; return the saved
    document. The editors call them when the document is **new** (first save); later saves keep using the
    existing upsert. After the first save navigate / select by the **issued** number.
  - New drafts show a preview number from `previewNext(default series)` (fall back to today's `poNextNo` /
    `prNextNo` while the series are loading) with the existing "not saved yet" wording.
  - `duplicatePurchaseOrders` issues each copy's number through the same logic.
  - Keep `poNextNo` / `prNextNo` only if still used as the loading fallback; existing numbering tests keep
    passing. Do not change BOM, assembly order, item or employee numbering in this run (later runs).

## Rules
- Pure domain, tested; data only through api / queries; strict types, no `any`; Tailwind tokens; quiet page
  (no descriptions inline — help goes in the section's `help.ts` map); hover / focus / motion on new controls.
- Edit in place everywhere (drawer rows identical in view and edit).
- e2e `e2e/number-sequences.spec.ts`: open `/purchasing/settings/` Number sequences, add a second PO series
  (prefix `KPO`), set it default, create a new purchase order and save → it gets `KPO…`; deleting a series
  that issued numbers shows the blocked reason. And in `e2e/settings-readonly.spec.ts`: with the demo role
  set to `member` (see how existing e2e tests switch it), a Purchasing settings section is view-only (no Save /
  New, the state line shows). Update `e2e/settings*.spec.ts` / UoM specs if the UoM screen's selectors change.


## How to work (tool rules — breaking these stops the run)
- Read and search with your built-in file tools only. No shell commands to read
  or search files.
- Do NOT run any shell commands at all (not even `pnpm typecheck` / `lint` / `test` —
  headless mode denies them and that ends your run). The reviewer runs every check.
  So write code that is correct by reading: strict TypeScript, no unused imports, hook
  dependency arrays complete and stable (memoize derived arrays with `useMemo`).
- Do NOT commit, push or switch branches. Only touch the files this brief lists.

## Always
- Use the templates; never copy them. If you need a template option that
  doesn't exist, add it as an OPTIONAL, backward-compatible prop and say so in
  your summary.
- Data only through `@/data/queries` hooks. No seed imports in features, no
  localStorage, no `any`, Tailwind theme tokens only, `money()`/`int()`/
  `fmtDate()` from `@/lib/format`, status as a pill.
- Use `getByLabel('…', { exact: true })` in Playwright tests (labels also have
  "About …" help buttons).

## When you finish
Print a short summary: files changed, template options added, anything you
could not do or verify, open questions.
