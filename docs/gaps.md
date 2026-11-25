# Known gaps

Caveats, gaps and future problems found while building Shelfree that could not be fixed in the task that
found them. Read this before starting a task: if a gap touches the area you are working in, fix it in that
task and move it to **Closed**. Add a gap here in the same turn you find it.

Each entry: **id · title** — where, what is wrong or missing, why it was left, what fixing it needs.
`Fix by` names the task or stage most likely to close it (`backend` = only the real backend can).

## Open

### Settings

- **G-001 · Module on/off is not applied to settings areas** — `components/settings/registry.ts`
  `areasForModules()` exists but the frame and routes don't use it, so every module's settings area is
  listed even when the module is switched off. The spec says an off module's area is hidden and its URLs
  redirect to `/settings`. Left because Modules & capabilities wasn't ported yet. *Fix by:* Phase 2 run 2.5
  (Workspace ▸ Modules & capabilities).
- **G-002 · Find a setting can't highlight rows inside list sections** — only `SettingsRows` sets
  `data-setting-row`; a hit inside Units of measure or Number sequences opens the section but doesn't
  highlight a grid row (the watcher gives up after 3 s). *Fix by:* a Phase 2 run that touches `DataGrid`
  (pass `?find=` to the grid's quick search or active row).
- **G-003 · Finance ▸ Number sequences is always empty** — no document type belongs to Finance yet, so the
  section shows an empty, New-disabled list. *Fix by:* stage 2 (finance for purchase — vendor bills / payments
  add finance document types).
- **G-004 · Form sections' read-only mode is untested in the UI** — `SettingsSection readOnly` works by
  reading, but the only ported form section (Business profile) is workspace-only, which a member can't open.
  *Fix by:* the first Phase 2 run that ports a module form section (2.3 Tax settings or 2.4) — add an e2e.
- **G-005 · Links to settings that are not moved yet** — People ▸ Users "Manage roles" goes to
  `/settings/ws-team`, and a member's `/settings` lands on `me-profile`; both show "not moved yet".
  *Fix by:* Phase 2 runs 2.5 (Team & roles) and 2.6 (Personal).

### Number sequences and numbering

- **G-006 · Yearly reset is stored but never applied** — `resets: 'yearly-apr' | 'yearly-jan'` is saved,
  but nothing rolls the counter (or a financial-year suffix) over at year end. *Fix by:* backend (issue time
  decides the period); the frontend can preview it once the rule is defined.
- **G-007 · Issuing a number is not atomic in the prototype** — `issueNumber` updates the series and then
  the document is saved in a separate write; a failed save burns a number, and two tabs could race. Safe
  enough for a single-user prototype. *Fix by:* backend (issue in the document's transaction with a row lock;
  see `docs/number-sequences/README.md`).
- **G-008 · The draft's preview number can differ from the issued number** — the editor shows
  `previewNext(series)`; `nextFree` may skip ahead (stale `next`, or another document took the number), so
  the saved number can differ. Notes added before the first save are keyed to the preview number and would
  not follow. *Fix by:* when notes move to the backend, key unsaved-document notes to a draft id instead of
  the number.
- **G-009 · Series `docType` and `issued` are not server-controlled** — only the drawer locks `docType` once
  numbers are issued; `issued` comes from the client. *Fix by:* backend (derive `issued`, refuse a `docType`
  change once issued).
- **G-010 · Only purchase orders and receipts use number sequences** — BOMs, assembly orders, items,
  employees, sales orders and invoices still number themselves with `nextNo()`; their series exist but are
  not used. *Fix by:* each stage as it touches that document (production, sales).

### Purchasing settings (run 2.1)

- **G-013 · Documents don't read Statuses & stages** — `StatusDef` rows (system + custom) are listed in
  Settings, but purchase orders, receipts, sales orders / invoices, BOMs and assembly orders still use their
  hard-coded status enums (`PO_STATUSES`, `SALES_ORDER_STATUSES`, …), so a custom stage such as *Packed* can't
  be chosen on a document and delete is never blocked by use. Left because each document's transitions are
  business rules in `domain/`. *Fix by:* each stage as it touches that document (purchase now, sales,
  production); `docs/statuses/README.md`.
- **G-014 · Custom field values are not captured or shown** — definitions exist (`customFields`), but no
  record page or drawer renders or stores values, so *Required* isn't enforced. *Fix by:* a "Custom fields"
  card on record pages / drawers (via `FieldRows`) plus a values store; `docs/custom-fields/README.md`.
- **G-015 · Vendor and customer payment terms are free text** — the vendor `paymentTerms` and customer `terms`
  fields don't pick from Settings ▸ Payment terms, so "in use" (delete block, code lock) matches by text
  (`NET 30` = `NET30`) and a typo isn't counted. *Fix by:* convert both editors to a picker that stores the
  term code; `docs/payment-terms/README.md`.

### Testing

- **G-012 · Some browser tests fail under full-suite load** — assembly-order-document, customer-profile,
  item-units, people, purchase-prices, sales-prices, saved-views-favorites and settings fail now and then in a
  full parallel run and pass alone. CI runs them on a slower machine with fewer workers so it mostly passes.
  *Fix by:* a dedicated pass to replace timing-sensitive waits with state-based ones.

## Closed

- **G-011 · Shared records carry one `module`, the spec says `modules[]`** (closed 2026-11-25, run 2.1) — decided
  per list: number sequences, statuses and custom fields have one `module` (derived from document type /
  flow / entity, which each belong to exactly one module); payment terms carry `modules: string[]` and the
  slice filters by inclusion. Recorded in `docs/settings/README.md` and each list's doc.
