# States & territories — Settings ▸ Configuration ▸ States & territories

## Overview
Read-only list of the official GST state codes (the first two digits of every GSTIN). Carries **codes
only, no rates** — rates are national (see `docs/tax-codes/`). Used by every address State field,
GSTIN parsing, and (from task 6) the tax engine's same-state vs different-state comparison.
Spec: `docs/superpowers/specs/2026-09-25-tax-codes-gst.md` §2.2; plan task 2. Built in
`prototype/designs/erp/Shelfree App.dc.html` (`gstStates()`, `gstStateByCode/ByName()`, `gstinParse()`,
`stOptsFor()`, `st*` methods, `stVM()`). Tier: parked (POC) — ungated. Future-pass hint: Starter base.

## Screens & states
- **Page** (settings id `cfg-states`): title + "38 in use" pill, description.
- **Check a GSTIN** card: mono input (15 chars, auto-uppercase, clear button). States:
  empty (helper text) · typing (state shown from the first two digits + "Keep typing — n of 15") ·
  invalid (red: bad state code / wrong pattern) · valid (code chip, state name, type, split pill vs
  our state — green "Same state as you → CGST + SGST" or blue "TN → KA · IGST", PAN) ·
  valid-with-warning (amber: check character fails, or a retired code).
- **Filter bar:** search (code, name, exact short code, type) + segmented All / States / Union
  territories with counts.
- **Table:** Code (mono) · Name + retired note · Short · Type · Same-state tax (UTGST rows highlighted)
  · Parties (vendors + customers whose address state is here; tooltip splits them) · Status (only
  retired codes show a "Retired" pill; current codes show nothing). Retired rows sort last, dimmed.
  Click highlights a row.
- **No "Your state" badge** (removed 2026-09-25): a multi-state business has no single home state and
  the company address isn't what GST keys on. Task 3 adds a **Registered** badge (from GST
  registrations, many allowed) and a **Locations** count per state.
- **Empty state:** "No state matches “…”" + Clear search & filter.
- **Row menu** (right-click): Copy code · Copy name.
- **Address fields now read the list:** Workspace ▸ Company profile *State* (was free text
  "State / region"), Vendor page *State*, Customer page *State* are `<select>`s of current states A–Z
  (retired + "Foreign country" excluded). A saved value that isn't a GST state stays visible as
  "X (not a GST state)" so nothing is silently lost.
- **Company profile GSTIN hint:** under the GSTIN field — state + code when fine; red when invalid;
  amber when the GSTIN's state ≠ the address state. Seed GSTIN corrected `29…` (Karnataka) →
  `33ABCDE1234F1Z7` (Tamil Nadu, valid check character) — saved workspaces keeping the old value now
  see the mismatch warning.

## Data model
`GstState { code: '01'–'38' | '96' | '97' (PK), name, abbr (2-letter), type: 'state' | 'ut-leg' |
'ut' | 'other' | 'foreign', ut: boolean (true → CGST + UTGST), legacy: boolean, note }`
- `ut-leg` (Delhi 07, Puducherry 34, Jammu and Kashmir 01) → CGST + SGST.
- `ut` (Chandigarh 04, DNHDD 26, Lakshadweep 31, Andaman & Nicobar 35, Ladakh 38) and `other`
  (97 Other territory) → CGST + UTGST. `foreign` (96) → IGST only.
- Retired: **25** Daman and Diu (merged into 26 on 26 Jan 2020), **28** Andhra Pradesh (old; AP uses 37).
- Addresses still store the **state name** (`vendors[].state`, `customers[].state`, `ws.region`);
  `stateCode` fields arrive with tasks 5–7 (`gstStateByName()` resolves names + short codes today).

## Interactions & business rules
- List is not editable (codes set by GSTN). No create/edit/delete.
- GSTIN rule: `^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$`; digits 1–2 must be a non-foreign code;
  char 15 = mod-36 check character (`gstinCheckChar()`) — mismatch is a **warning**, not a block.
- GSTIN-check split compares against the workspace address state **until task 3**, then against the
  primary / chosen GST registration. The table no longer marks any state as "yours".
- Keyboard (Settings ▸ Keyboard shortcuts → "Settings › States & territories"): `/` search · `G` GSTIN
  check · `1/2/3` filter · `↑/↓` move highlight (auto-scrolls) · `C` copy code · right-click menu · Esc.

## Persistence
None — seed is code (`gstStates()`). Page UI state (`stQ`, `stTab`, `stSel`, `stGstin`) is in memory.
Address State values persist wherever their record already does.

## Backend-build notes
- Table `gst_states` (global, not tenant-scoped): code char(2) PK, name, abbr, type enum, is_ut_tax
  bool, is_retired bool, note. Seed via migration; change only by migration.
- Endpoints: `GET /reference/gst-states` (cacheable), `POST /gstin/validate` → `{ valid, state, pan,
  checkOk, errors[] }` (server re-validates; later can call the GSTN public search API).
- Address entities get `state_code char(2) FK gst_states` (keep display name derived). Reject retired
  codes on new/edited addresses; accept them on historical documents.

### Security checklist (per-feature)
- Reference data, no PII, no tenant data. GSTIN check input is not stored or logged. Parties count is
  an aggregate of the tenant's own records only. Nothing added to localStorage.

### Decisions & deferred-to-backend
- 38 codes + 96/97 per spec; code 99 (Centre jurisdiction) omitted — not an address state.
- Short codes follow the GST portal (Telangana `TS`, new Andhra Pradesh `AD`, DNHDD `DN`).
- Check-character failure warns rather than blocks (typos in vendor paperwork shouldn't stop entry);
  backend may harden to block on save for registrations (task 3).
- Name → code migration of existing addresses deferred to tasks 5–7.

## Update — task 3 (GST registrations)
- **Registered** badge on states where an active registration exists ("Registered · primary" for the
  primary; tooltip lists GSTINs). New **Locations** column counts `siteDefs()` entries by `stateCode`.
- GSTIN check now compares against our registrations: same state as any active Normal registration →
  CGST + SGST / UTGST; otherwise IGST vs the primary ("(vs primary)" when several).
- Business profile GSTIN hint moved into the registration form (see `docs/gst-registrations/`).

## Update 2026-09-26 — task 4
The **Locations** column now counts real locations from Locations & warehouses (`locDefs()`), by `state`.
