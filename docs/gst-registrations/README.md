# GST registrations — Settings ▸ Workspace ▸ GST registrations

## Overview
The business's own GSTINs, **one per state it operates in**. Replaces the single GSTIN field in
Business profile. Each registration files its own returns, keeps its own tax credit and numbers its
own invoices. Documents will pick the registration from the location (ship-to on purchase, ship-from on
sales, task 6), so users never choose it by hand. Spec `docs/superpowers/specs/2026-09-25-tax-codes-gst.md`
§2.3; plan task 3. Code: `designs/erp/Shelfree App.dc.html` → `gstRegs()`, `rg*` methods, `rgVM()`.
Tier: parked (POC). Future-pass hint: single registration = Starter; multiple / casual = Growth.

## Screens & states
- **Page** (settings id `ws-gst`, Workspace group, after Business profile). Header: title, "n active
  · n cancelled" pill, **Add registration** (N).
- **Card per registration**, ordered primary → active (by GSTIN) → cancelled. Shows state code chip +
  state name, badges (Primary / Composition / Casual / Cancelled), GSTIN (mono, copy button), legal name
  + principal address, facts (Trade name, Returns, E-invoice, E-way bill threshold, Invoice numbers
  preview e.g. `TN/2026-27/0001`, Registered on / Valid / Cancelled on, Locations). Notes: casual
  validity ended (amber), PAN mismatch (amber), no locations in this state (muted). Click = highlight,
  double-click / Edit = form, ⋯ / right-click = menu. Cancelled cards dimmed.
- **Single-registration UI:** with one active registration a dashed tile "Add a registration in another
  state" follows the card; no registration pickers appear anywhere in the app.
- **Gap banner** (amber, one per state): a location whose state has no active Normal registration —
  "Chennai DC is in X, which has no active GST registration…" + **Add X registration** (opens the
  form with the state code pre-filled and series suggested).
- **Empty state:** "Add your GSTIN to start calculating tax" + button.
- **Form (modal):** GSTIN (locked after save) + live hint, Registered on, State readout (name · code ·
  type · same-state split), Legal name, Trade name, Scheme (Regular/Composition), Registration type
  (Normal/Casual + Valid from/to), Returns filed (Monthly/Quarterly — Monthly disabled for
  Composition), Invoice number prefix (auto-suggested `<abbr>/{FY}/` until edited; live first-number
  preview), E-way bill from (₹), E-invoice switch (disabled for Composition), principal address
  (Address, City, PIN), Primary switch (disabled for Casual). Inline errors + form error.
- **Confirm dialog** for Cancel registration / Delete. **Menu:** Edit · Make primary · Copy GSTIN ·
  Cancel registration… / Reactivate · Delete… — blocked actions are hidden and the reason is shown.
- **Business profile ▸ Tax identifiers:** GSTIN is now read-only (primary GSTIN + state, "primary of
  n" when several) with **Manage registrations**. PAN stays editable and warns if it doesn't match the
  PAN inside any active registration.
- **States & territories** gains a **Registered** badge (primary marked) and a **Locations** column;
  its GSTIN check says "Same state as your registration → CGST + SGST" when we're registered in that
  state, else "TN → KA · IGST" against the primary.

## Data model
`GstRegistration { id, gstin (15, unique), legal, trade, scheme: 'Regular'|'Composition',
regType: 'Normal'|'Casual', validFrom, validTo (casual only), registeredOn, filing: 'Monthly'|'Quarterly',
eInvoice: bool, ewayMin: int ₹, series: string (may hold {FY}), addr1, city, postal, primary: bool,
status: 'Active'|'Cancelled', cancelledOn }`. State = GSTIN digits 1–2 (never stored separately).
- Seed: `REG-TN` · `33ABCDE1234F1Z7` · Regular · Quarterly · e-invoice off · ₹50,000 · `TN/{FY}/` ·
  primary (spec Q1 A, Q2 B). Spec Q4 (demo Karnataka registration + Bengaluru warehouse) is **not
  seeded yet** — deferred to task 13 (after Q4); it depends on task 4 (real location → state wiring).
- `ws.gstin` is kept as a **read mirror** of the primary GSTIN (older readers keep working).
- Seed reuses a saved legacy `ws.gstin` only if it's fully valid (check character passes) and in the
  address state; otherwise the TN default. Series derives from the seeded state (`<abbr>/{FY}/`). On
  first load without a saved list, a mismatched legacy `ws.gstin` is healed by persisting the seed.
- Locations: `siteDefs()` entries now carry `stateCode` (all four Kanalora sites = `33`). A location's
  registration = the active Normal registration of its state (real location registry + `registrationId` + place-of-business in task 4, spec §2.7).

## Interactions & business rules
- GSTIN (new only): 15 chars, valid pattern, known non-retired state, **check character must pass**
  (blocks for own registrations), unique, and PAN inside must equal Business profile PAN.
- One active **Normal** registration per state; Casual registrations may overlap.
- Legal name required. Registered on ≤ today. Casual: both dates, to ≥ from, ≤ 180 days (90 + one
  90-day extension).
- Invoice prefix required; `A–Z 0–9 / -` plus `{FY}`; expanded prefix + 4 digits ≤ 16 chars (GST
  invoice-number limit); unique among active registrations. `{FY}` = financial year from
  Regional ▸ fiscal start (April → `2026-27`).
- E-way threshold: whole rupees ≥ 0. Composition forces Quarterly + e-invoice off.
- Exactly one primary among active registrations; must be Normal. Unsetting the only primary is
  blocked; making one primary clears the rest; if the primary disappears the first active Normal
  becomes primary.
- Cancel: blocked for the primary, and when it would leave a location's state without a registration.
  Cancelled = kept, dimmed, not offered to new documents. Reactivate blocked if another active Normal
  registration covers the state. Delete: same blocks as cancel (cancelled ones can always be deleted
  in the prototype).
- Keyboard (Settings ▸ Keyboard shortcuts → "Settings › GST registrations"): N · ↑/↓ · Enter · P · C ·
  Delete · right-click · Ctrl/Cmd+Enter · Esc. Scoped to the page, off while typing.

## Persistence
`ws.gstRegs` inside `localStorage['shelfree.settings.workspace.v1']` (via `wsSet`). Page UI state
(`rgSel`, `rgEdit`, `rgConf`, `rgCtx`) in memory.

## Backend-build notes
- Table `gst_registrations` (tenant-scoped): id, workspace_id FK, gstin unique per workspace,
  state_code FK `gst_states` (derived from gstin, stored for indexing), legal_name, trade_name,
  scheme, reg_type, valid_from, valid_to, registered_on, filing_frequency, e_invoice, eway_threshold,
  series_prefix, address fields, is_primary, status, cancelled_on, audit columns.
  Partial unique index: one active `Normal` per (workspace, state_code); one `is_primary` per workspace.
- Endpoints: `GET/POST /gst-registrations`, `PATCH /gst-registrations/:id` (gstin immutable),
  `POST /:id/make-primary`, `POST /:id/cancel`, `POST /:id/reactivate`, `DELETE /:id`.
- Server re-validates every rule above, plus: delete blocked once **any** document references the
  registration; cancel blocked while open documents use it; `locations.registration_id` re-links
  when a location's state changes (task 4).
- Invoice number series per registration: `series_prefix` expanded at issue time; counter per
  (registration, FY), gap-free, allocated transactionally.
- Later: verify GSTIN + legal name against the GSTN public search API on create.

### Security checklist (per-feature)
- Business identity, not PII. Tenant-scoped IDs. Permission `tax.registrations.manage` (finance
  admin) — not enforced in the prototype. **Audit events:** registration create / edit (field diff) /
  make-primary / cancel / reactivate / delete. No portal credentials, GSP keys or e-invoice API
  secrets ever client-side (e-invoice switch is a flag only).

### Decisions & deferred-to-backend
- GSTIN is immutable after save — wrong GSTIN = cancel + add (keeps the audit trail clean).
- Own-registration check character **blocks** (vs a warning for vendor/customer GSTINs).
- Casual registrations don't own locations; their documents pick them explicitly (task 7).
- Demo KA registration (Q4) deferred to task 13. Composition's effect on documents (no tax on sales,
  no credit) lands with the engine (task 7) and sales finance.

## Update 2026-09-26 — location rows (task 4, spec §2.7)
- Locations come from **Locations & warehouses** (one registry), not a hard-coded list. A registration's
  sites = non-inactive Indian locations whose `state` matches its GSTIN's first two digits.
- The **Locations** fact became a **location list** on each card: name · code · status (Active / Setting up)
  · certificate status (Principal / Additional / **Not on certificate**, colour + icon + text). Undeclared
  rows sort first; the header shows **"n not on certificate"**. >5 rows fold behind *Show all (n)*.
- Row click / **Enter** opens the location in Locations & warehouses (edit form, Details step).
  **↑/↓** move between rows, **D** marks declared, **P** make principal (confirm), right-click / Shift+F10 →
  Open location · Mark as declared · Make principal… · Copy address. Listed in Keyboard shortcuts.
- **Mark as declared**: undeclared → Additional (or Principal if the state has none). **Make principal**
  moves the old principal to Additional after a confirm. Both write `shelfree.wh.v7`.
- Gap banner and cancel/delete guards ignore inactive locations.
- Backend: `POST /locations/:id/declare`, `POST /locations/:id/make-principal` (audited; unique principal
  per registration). Permission `locations.manage`.
