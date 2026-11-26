# Known gaps

Caveats, gaps and future problems found while building Shelfree that could not be fixed in the task that
found them. Read this before starting a task: if a gap touches the area you are working in, fix it in that
task and move it to **Closed**. Add a gap here in the same turn you find it.

Each entry: **id · title** — where, what is wrong or missing, why it was left, what fixing it needs.
`Fix by` names the task or stage most likely to close it (`backend` = only the real backend can).

## Open

### Settings

- **G-002 · Find a setting can't highlight rows inside list sections** — only `SettingsRows` sets
  `data-setting-row`; a hit inside Units of measure or Number sequences opens the section but doesn't
  highlight a grid row (the watcher gives up after 3 s). *Fix by:* a Phase 2 run that touches `DataGrid`
  (pass `?find=` to the grid's quick search or active row).
- **G-003 · Finance ▸ Number sequences is always empty** — no document type belongs to Finance yet, so the
  section shows an empty, New-disabled list. *Fix by:* stage 2 (finance for purchase — vendor bills / payments
  add finance document types).

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
### Lists (template)

- **G-037 · Some settings lists flash "No …" for a moment before their rows** — on a cold load, Locations & warehouses
  (and Payment terms in run 2.1) show the empty-state text for ~100 ms, then the rows. The collection never returns an
  empty seeded list and `ListPage` now treats `rows === undefined` as loading (run 2.5 review), so the grid is being
  handed an empty array briefly — most likely from the query layer (`listOptions` / a dependent query resolving before
  its sources). Seen only on a cold, throttled (hidden) tab. *Fix by:* a pass on `data/queries` that reproduces it with
  a test (render the section, assert the skeleton shows until rows exist).

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
- **G-019 · Inactive sites still appear in document pickers; some references don't block delete** —
  `selectableLocations()` exists but the PO, receipt, assembly-order and item-stock pickers still list every
  site; BOM `wipLocation` and production settings' output location aren't counted as usage, so deleting a site
  they point at isn't blocked. *Fix by:* the next run touching those pickers / Assembly & production settings.
- **G-021 · Item categories: Tree and Flow views not ported** — the prototype also had a collapsible tree and a
  workflow diagram; the React section is the grid (tree order, Parent and Group columns) only. The accent colour
  is a named select with a live preview chip, not swatches. *Fix by:* a visual-polish pass if wanted.

### Settings ▸ Sales and Production (run 2.4)

- **G-026 · Units of measure usage report still uses the built-in category tree** — `domain/units-of-measure.ts`
  (item usage rows, `itemCategoryParent(it.category)`) groups by the built-in tree, so a user-created group shows as
  its own root there. Sales prices were fixed under G-020; this is the remaining reader. *Fix by:* pass
  `categoryParentNames(cats)` into the UoM usage dataset (as `itemDataset` and the sales-price grid do).
- **G-028 · Customer pricing switches save outside the section's Save / Discard** — on Settings ▸ Sales pricing the
  per-customer switches write `customer.pricingEligible` straight away, while the rule above them is a draft until
  Save. Flipping a switch and then discarding the rule leaves the switch changed. *Fix by:* backend (a bulk
  eligibility endpoint) or a staged-changes list if users trip over it.

### Settings ▸ Workspace part A (run 2.5a)

- **G-029 · Regional & format isn't applied to the app's display** — currency, number format, date format, time zone and week
  start are saved (`settings.regional`), but `money()`, `int()` and `fmtDate()` in `src/lib/format.ts` still print en-IN, ₹ and
  `Jul 12, 2026`; `todayLocal()` uses the browser's zone. The prototype's default date format (`DD/MM/YYYY`) is not the app's
  current output, so wiring would change every date on screen. Pure formatters (`formatMoneyAs`, `formatNumberAs`,
  `formatDateAs`) exist and are tested. *Fix by:* a task that decides the visible default, reads the block through one
  provider in `lib/format.ts` and re-renders on change; `docs/regional/README.md`.
- **G-030 · Most terminology renames aren't read by screens** — only the Location wording (Locations section, Stock by Location
  page, item card and Items drawer headings) reads `terms`. Modules, the other records, Favorites and field labels have rows in
  Settings ▸ Terminology but the UI keeps its fixed wording; the *Lot/Batch* row stays hidden until Modules & capabilities
  provides the capability flag. *Fix by:* each page as it touches its labels (use `useTerm` / `recordTerm`); Phase 2 run 2.5b
  for module names and Favorites; `docs/terminology/README.md`.
- **G-031 · GST registrations: card extras not ported** — the per-location rows on a registration (open location, mark as
  declared, make principal), the "Add a registration in another state" tile and the Business profile PAN warning reading *all*
  registrations; Locations has no *Add registration* button or GSTIN chip (the drawer shows the registration and a warning
  only). The link is derived by state, not stored (`locations.registrationId` of the prototype's later model).
  *Fix by:* the run that adds the Structure Designer / site wizard (G-016), or a polish pass.
- **G-032 · Settings navigation and Find a setting still say "Locations & warehouses"** — the registry label is static, so after
  a Location → Store rename the nav entry, breadcrumb and search hit keep the old name while the section's own title reads the
  term. *Fix by:* let `SettingsFrame` pass section labels through `useTerm` (registry label → term key) when Navigation (run 2.5b)
  settles the nav model.
- **G-033 · The workspace record still carries the regional fields** — `workspaceSchema` (`data/api/session.ts`) has `currency,
  timezone, dateFmt, numFmt, fiscalStart, weekStart` which nothing reads now that Regional & format owns them in
  `settings.regional`. *Fix by:* drop them from `workspaceSchema` when the backend splits workspace identity from settings.

### Workspace settings, part B (run 2.5b)

- **G-034 · Ten capabilities are switches nothing reads** — Settings ▸ Modules & capabilities stores all twelve scale
  capabilities, but only *Production orders & routing* (Production Orders page, BOM kind, WIP row) and *Customer-specific
  pricing* (`salesPricing.enabled`) have a reader in the React app. Multiple warehouses, zones, lot / batch, expiry,
  barcodes, serial numbers, advanced reporting, purchase approvals, multi-currency and integrations are saved only (their
  help says so). *Fix by:* each feature as it ships (item card tracking rows, locations, approvals…);
  `docs/modules-capabilities/README.md`.
- **G-035 · Roles are fixed to the seven built-in names** — Team & roles edits a role’s default access and description, but
  cannot add or delete roles: People ▸ Users, its filters and `validateUser` use the fixed `USER_ROLES`, and the prototype
  made *New role* a Growth feature. Editing a role never rewrites people who already hold it. *Fix by:* when custom roles
  are wanted: store role names in `roleDefs` only, make the Users role picker and filters read them, and add a "re-apply to
  everyone" action; `docs/team-roles/README.md`.
- **G-036 · A module that is off still opens by direct link** — switching a module off hides it from the sidebar, Departments,
  search and Settings and redirects its settings URLs, but `/<module>/<page>` URLs (and favourites / saved views pointing
  there) still open. The data is meant to stay reachable. *Fix by:* decide with the backend whether an off module should
  404 its pages; if yes, a `beforeLoad` check on `$module/$page` using `isModuleEnabledNow`.

### Personal settings (run 2.6)

- **G-038 · The tax-split switch is stored and nothing reads it** — Personal defaults ▸ *Show tax split columns on
  document lines* saves `me.showTaxSplit`, but the purchase document lines always show one compact tax tag (no CGST /
  SGST / IGST amount columns exist). *Fix by:* the finance-for-purchase stage, when lines get the split columns.
  `docs/personal-settings/README.md`.
- **G-039 · Personal language, locale and formats are saved, not applied** — Language & region stores `language`,
  `locale`, `dateFmt`, `numFmt`; the app is English only and `lib/format.ts` still prints one format (see G-029).
  `resolveRegional(workspace, me)` is the one resolver (tested) and the section shows what "Workspace default" resolves
  to; the display helpers have to call it when G-029 is fixed. *Fix by:* the G-029 task (read the resolved block through
  one provider), then translation work for language.
- **G-040 · Notifications, two-factor and sessions have no backend** — `notify*` flags and `twoFA` are stored on the
  user's record only; nothing sends an alert, enforces a second factor at sign-in, or lists real sessions (the two
  sessions are demo rows, "Sign out others" only hides them). The People ▸ Users `twoFA` column is a separate flag and is
  not synced. *Fix by:* backend (notifier, auth service, `GET/DELETE /me/sessions`); contract in
  `docs/personal-settings/README.md`.
- **G-041 · No profile photo, and the Employee record isn't mirrored** — Profile has no *Change photo* (no file
  storage yet; the avatar is the initials). Saving the profile mirrors name and email to the People ▸ Users record but
  not to the linked Employee (`empId`), whose phone / title stay as they were. *Fix by:* backend (single person record
  behind user and employee; avatar upload).

## Closed

- **G-017 · Locations didn't read GST registrations** (closed 2026-11-25, run 2.5a) — `validateLocation` refuses *Active* (and moving an
  Active site to another state) while the state has no active Normal registration; the Locations list and drawer show the
  registration the site files under (`registrationForSite`, derived by state). Extras left over are G-031.
- **G-018 · Location terminology was fixed to "Locations"** (closed 2026-11-25, run 2.5a) — Terminology is ported; the Locations
  section, its grid / drawer nouns, the Warehouse sidebar page, the item card and Items drawer headings read `object.location`
  (`useLocationTerm`). The settings navigation still uses the registry label (G-032).
- **G-025 · The GSTIN check compared against the workspace address state** (closed 2026-11-25, run 2.5a) — it reads the GST
  registrations (same state as one of them is CGST + SGST, otherwise IGST against the primary); States & territories also has
  the *Registered* badge, *Locations* column and the *Registered* view.
- **G-001 · Module on/off is not applied to settings areas** (closed 2026-11-25, run 2.5b) — Settings ▸ Modules & capabilities stores
  the module switches; the frame lists `areasForModules(enabled)`, `/<module>/settings` and `/<module>/settings/<section>`
  redirect to `/settings` when the module is off, and the sidebar, Departments and page search follow
  (`e2e/settings-workspace-b.spec.ts`).
- **G-027 · Sales pricing’s capability switch and Assembly’s work-in-progress site had no owner** (closed 2026-11-25, run 2.5b) — the
  *Customer-specific pricing* capability in Modules & capabilities IS `salesPricing.enabled` (one source, block-level save);
  *Work-in-progress location* shows only while *Production orders & routing* is on (as in the prototype) and new BOMs start at
  `production.wipLoc` instead of the hard-coded `WH-ASSY`.
- **G-005 · Links to settings that were not moved yet** (closed 2026-11-26, run 2.6) — a member's `/settings` lands on a working
  Profile (`e2e/settings-personal.spec.ts` signs in as Member and edits it); the Team & roles half closed in run 2.5b.
- **G-005 (Team & roles half) · People ▸ Users "Manage roles" pointed at an unported page** (closed 2026-11-25, run 2.5b) —
  `/settings/ws-team` is ported; the Personal half stays open.
- **G-004 · Form sections' read-only mode is untested in the UI** (closed 2026-11-25, runs 2.3 and 2.4) — Tax settings, Sales pricing and Assembly & production are module
  form sections; `e2e/settings-finance.spec.ts` and `e2e/settings-sales-production.spec.ts` switch to the Member (Kavitha: reads Finance, Sales and Production, no Manage settings right)
  and check the values show as text in the same rows with the "View only" line, no inputs and no Save bar.
- **G-011 · Shared records carry one `module`, the spec says `modules[]`** (closed 2026-11-25, run 2.1) — decided
  per list: number sequences, statuses and custom fields have one `module` (derived from document type /
  flow / entity, which each belong to exactly one module); payment terms carry `modules: string[]` and the
  slice filters by inclusion. Recorded in `docs/settings/README.md` and each list's doc.
- **G-020 · Sales prices still used the built-in category tree** (closed 2026-11-25, run 2.4 — Sales prices part) —
  the List prices grid, its category filter and `buildListPriceRows` now take `categoryParentNames(itemCategories)`;
  the same result for the seed (`sales-pricing-settings.test.ts`). The UoM usage report is split out as G-026.
