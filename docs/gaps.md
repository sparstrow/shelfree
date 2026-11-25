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

### Settings ▸ Finance (run 2.3)

- **G-022 · Tax settings: no mixed-rate preview and no change history** — the prototype showed a live preview of
  both calculation methods on mixed-rate lines under *Calculate tax*, and a *Change history* (last saves, who /
  when / note, each field old → new) fed by a review-before-save dialog. The React section uses the template's
  Save / Discard bar, so none of the three exist. *Fix by:* the preview is a small optional `preview` slot on
  `SettingsSection`; the history needs the audit-event feed (`tax_settings.updated`) from the backend.
  `docs/tax-settings/README.md`.
- **G-023 · Charges, items and document lines don't reference a tax code** — GST is still text on charges
  (`5%`, `Goods rate`, mapped to a code by `chargeTaxCode`); items, price lists and document lines carry no GST
  rate, and the charge editor's list is the fixed `CHARGE_GST_RATES`, not the active tax codes. So a code's
  *Charges* count and the delete / deactivate blocks cover charges only, and a rate change on a code reaches no
  calculation. *Fix by:* the stage that adds the tax engine (store the code + resolved rate on each line at
  posting; offer active codes in pickers; extend `taxCodeUsage`). `docs/tax-codes/README.md`.
- **G-024 · A custom account chosen as the round-off account can still be deleted or deactivated** — Tax settings
  stores `roundOffAcct`, but Chart of accounts doesn't count it as usage (the default 6190 is a system account, so
  it is safe). *Fix by:* add the setting to `accountDeleteBlocked` and the deactivate check in
  `domain/chart-of-accounts.ts`.
- **G-025 · The GSTIN check compares against the workspace address state** — States & territories has no
  registrations to compare with, and no *Registered* badge or *Locations* count (same dependency as G-017).
  *Fix by:* the run that ports Workspace ▸ GST registrations.

### Testing

- **G-012 · Some browser tests fail under full-suite load** — assembly-order-document, customer-profile,
  item-units, people, purchase-prices, sales-prices, saved-views-favorites and settings fail now and then in a
  full parallel run and pass alone. CI runs them on a slower machine with fewer workers so it mostly passes.
  *Fix by:* a dedicated pass to replace timing-sensitive waits with state-based ones.

### Settings ▸ Warehouse (run 2.2)

- **G-016 · Locations: Structure Designer and creation wizard not ported** — the prototype's 2D/3D designer
  (floors, zones, aisles, bins, occupancy) and 4-step wizard on Locations & warehouses are not in the React app;
  sites are created and edited in the drawer and carry no floors or layouts. *Fix by:* its own run (needs a
  layout data model: floors, zones, aisles, bin overrides — see `docs/locations-warehouses/README.md`).
- **G-017 · Locations don't read GST registrations** — the rule "a site can't be Active while its state has no
  active Normal registration", the registration line, *Add registration*, the GSTIN chip and *Mark as declared*
  need the GST registrations collection, which isn't ported. Only the one-principal-per-state rule is enforced.
  *Fix by:* the run that ports Workspace ▸ GST registrations (then add the rule to `validateLocation`).
- **G-018 · Location terminology is fixed to "Locations"** — the prototype's `locLabel()` reads the workspace
  terminology (`object.location`); Terminology isn't ported, so the section, nav and drawer say "Location(s)".
  *Fix by:* the run that ports Workspace ▸ Terminology.
- **G-019 · Inactive sites still appear in document pickers; some references don't block delete** —
  `selectableLocations()` exists but the PO, receipt, assembly-order and item-stock pickers still list every
  site; BOM `wipLocation` and production settings' output location aren't counted as usage, so deleting a site
  they point at isn't blocked. *Fix by:* the next run touching those pickers / Assembly & production settings.
- **G-020 · Sales prices and UoM usage still use the built-in category tree** — the item card, items grid, items
  drawer and item profile read `itemCategories`; `domain/sales-prices.ts`, its grid and
  `domain/units-of-measure.ts` (item usage report) derive the top-level group from `DEFAULT_CATEGORY_PARENTS`,
  so a user-created group shows as its own root there. *Fix by:* pass `categoryParentNames(cats)` into those
  datasets (as `itemDataset` does).
- **G-021 · Item categories: Tree and Flow views not ported** — the prototype also had a collapsible tree and a
  workflow diagram; the React section is the grid (tree order, Parent and Group columns) only. The accent colour
  is a named select with a live preview chip, not swatches. *Fix by:* a visual-polish pass if wanted.

## Closed

- **G-004 · Form sections' read-only mode is untested in the UI** (closed 2026-11-25, run 2.3) — Tax settings is a module
  form section; `e2e/settings-finance.spec.ts` switches to the Member (Kavitha: Finance *write*, no Manage settings right)
  and checks the values show as text in the same rows with the "View only" line, no inputs and no Save bar.
- **G-011 · Shared records carry one `module`, the spec says `modules[]`** (closed 2026-11-25, run 2.1) — decided
  per list: number sequences, statuses and custom fields have one `module` (derived from document type /
  flow / entity, which each belong to exactly one module); payment terms carry `modules: string[]` and the
  slice filters by inclusion. Recorded in `docs/settings/README.md` and each list's doc.
