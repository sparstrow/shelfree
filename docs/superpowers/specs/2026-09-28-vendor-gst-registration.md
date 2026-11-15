# Spec — Vendor GST registration

Status: **Approved & built** (2026-09-28). Open questions resolved with defaults: seed as proposed, Warn by default, *New vendors start as* is a setting. Block stops issuing only (drafts still save).
Parent spec: `2026-09-25-tax-codes-gst.md` (§1 "Party registration type", §3 engine step 2, scenario S7).
Plan slot: task 6 "Master data fields" (vendor part). Customer side follows the same model with Sales (steps 5/6).
Next in series: Tax classifications (HSN/SAC → tax code), separate spec.

## 1. Purpose
Record **why** a vendor does or doesn't charge GST, so purchase documents apply tax correctly,
input tax credit (ITC) is only claimed where allowed, and returns report each case in the right place.
A yes/no "Taxable" checkbox was considered and rejected: it can't tell composition, unregistered, SEZ
and overseas vendors apart, and each of those is treated differently for credit, reporting and imports.

## 2. Approaches considered
| | Approach | Verdict |
|---|---|---|
| A | "Taxable" checkbox on vendor | Rejected — loses the reason; wrong ITC and GSTR reporting. |
| B | **Registration type dropdown** (one field, default Regular) + GSTIN | **Chosen.** Same effort as a checkbox for a small business; correct data. |
| C | B + dated registration history on the vendor | Rejected for now — documents snapshot the type instead (§5.3). Revisit if audits need "type on date X" without opening documents. |

## 3. Registration types
| Type | GSTIN | Vendor's invoice | GST on our PO / bill | ITC | Kanalora example |
|---|---|---|---|---|---|
| **Registered — regular** (default) | Required | Tax invoice with GST | Yes — split CGST+SGST / IGST as normal | Yes (unless the item's classification blocks it) | Kailash Ceramics, Malaimayil Dhoop |
| **Registered — composition** | Required | Bill of supply, no GST | None | No | A small local label printer |
| **Unregistered** | None | Plain bill / cash memo | None | No | A local carton supplier below the threshold |
| **SEZ unit** | Required | Invoice; treated as import | None on the PO — IGST (+ customs duty) paid on the bill of entry | Yes, on the bill of entry | — (future) |
| **Overseas** | None | Foreign invoice | Goods: IGST at customs on the bill of entry. Services: reverse charge (IGST) | Yes | — (future) |

Reverse charge for specific services (e.g. goods transport agencies) is **not** a registration type — it
belongs to the service's tax classification (next spec). A Regular vendor can still supply a reverse-charge service.

## 4. Screens & states
### 4.1 Vendor profile ▸ Overview ▸ Tax card
The existing *Tax calculation* card becomes **Tax**, with a new top row:
- **View:** `GST registration` — type label + GSTIN (mono, copy) or "No GSTIN". A one-line effect note under it:
  - Regular: "GST charged on purchases · credit claimed"
  - Composition / Unregistered: "No GST on purchases · no credit" (neutral, not a warning)
  - SEZ / Overseas: "Import — tax paid at customs"
- **Edit:** `GST registration` select (5 types, "(default)" on Regular, each option's explanation shown
  under the select as in Tax settings) → GSTIN field shown only for Regular / Composition / SEZ.
  Switching to Unregistered/Overseas hides the GSTIN and clears it on save (confirm if one was filled).
- *Calculate tax* / *Round total* rows stay; they're hidden when the type charges no GST (nothing to calculate).
- GSTIN moves **out of** Contact & address into this card (single place). Contact & address shows state/country only.

### 4.2 Vendors grid + drawer
- New column **GST registration** (short labels: Regular · Composition · Unregistered · SEZ · Overseas),
  filterable; hidden by default for a workspace where every vendor is Regular (column chooser still has it).
- Drawer facts show the type beside GSTIN; drawer edit panel gets the same select + GSTIN rule.
- New vendor form: type defaults from Tax settings (§6), GSTIN field follows the type.

### 4.3 Purchase orders
- Vendor picker rows show a small type chip for non-Regular vendors.
- PO header: for non-Regular vendors a neutral tag next to the vendor — "Unregistered · no GST",
  "Composition · no GST", "Import · tax at customs".
- Lines: tax columns show "—" with the line tag reason (engine task 7). Totals show no tax rows.
- Composition vendor in another state than the ship-to location → warning banner "Composition dealers
  can't make inter-state supplies — check the vendor's registration" (§6 check).
- Changing the vendor on a Draft PO re-evaluates; Issued/Partially received POs see §5.3.

### 4.4 Empty / error states
- GSTIN required but blank → inline "Enter the GSTIN, or change the type to Unregistered".
- GSTIN invalid format → inline error (blocks). Check character fails → amber warning, saveable
  (vendor GSTINs warn, own GSTINs block — existing decision).
- GSTIN state ≠ address state → amber "GSTIN is for X, address is in Y" (address may be a branch).

## 5. Interactions & business rules
### 5.1 Field rules
- `gstRegType` required, default from Tax settings (Regular).
- Regular / Composition / SEZ: GSTIN required, 15 chars, valid pattern, known state; unique across
  active vendors (warning, not block — two vendor records for one business happen; show the other vendor).
- Unregistered / Overseas: GSTIN must be empty. Overseas also requires country ≠ India; India country
  with Overseas → inline error.
- GSTIN's first two digits set the vendor's **tax state** (locked while GSTIN present, per parent spec);
  otherwise tax state = address state. SEZ state comes from GSTIN.
- Composition is not detectable from a GSTIN — user must choose it. (Backend later: GSTN public
  search returns taxpayer type; §8.)

### 5.2 How documents use it (engine step 2 in parent spec)
Treatment on a purchase line, first match:
1. Line override (with reason, audited).
2. Vendor type: Composition / Unregistered → **No GST charged**; SEZ / Overseas goods → **Import**
   (no tax on PO; bill of entry carries IGST — future import flow); Overseas services → **Reverse charge (IGST)**.
3. Item's classification taxability (next spec) → Taxable / Exempt / Nil / Non-GST.
4. Taxable → rate from tax code on document date, split by state.

### 5.3 Changing a vendor's type
- Applies to **new documents** immediately.
- Save shows a review line when open POs exist: "3 open purchase orders use Regular — they'll switch
  to No GST on next edit or receipt. Posted receipts and bills keep their tax." (same lazy-recalc rule as
  Tax settings). Confirm → save.
- Every PO / receipt / bill **snapshots** `gstRegType` + GSTIN at posting; never re-read later.
- Change logged to vendor activity + audit event.

### 5.4 Keyboard & mouse
No new shortcuts — the select uses native keys (↑/↓, type-ahead, Enter) in the existing edit flow
(`E` edit, Ctrl/Cmd+Enter save, Esc cancel). Grid column gets the standard filter / right-click
"Filter by this value". Nothing to add to the Keyboard shortcuts page beyond the column filter if not already listed.

## 6. Settings surfaces
- **Workspace (Tax settings ▸ 3 Default tax codes → renamed "Defaults"):** *New vendors start as* —
  Registered — regular (default) / Unregistered. Going-forward impact.
- **Configuration (Tax settings ▸ 4 Document checks):** *Composition vendor in another state* —
  Warn (default) / Block the purchase order. Only shown when any Composition vendor exists or ≥2
  registrations/states are in play.
- **Terminology:** none — "GST registration" is a legal term, not scale-dependent.
- **User-level:** permission `vendors.tax.edit` to change type/GSTIN (finance or purchase manager);
  others see it read-only. Not enforced in the prototype.

## 7. Data model
`Vendor` gains:
- `gstRegType: 'regular'|'composition'|'unregistered'|'sez'|'overseas'` (NOT NULL, default `'regular'`).
- `gstin` (existing) — now conditional on type.
- `taxStateCode` (derived: GSTIN digits 1–2, else address state code; stored for indexing).

Documents (PO, receipt, vendor bill) gain snapshot fields: `vendorGstRegType`, `vendorGstin`, `vendorTaxStateCode`.

**Seed (Kanalora):**
- V00001 Kailash Ceramics, V00002 Malaimayil Dhoop, V00005 TN Express Cargo, V00006 Ambattur Logistics → Regular.
- V00003 Sri Annamalai Packaging → **Composition** (demo S7-style "no GST" path with a real GSTIN).
- V00004 Vellore Silicone Components → **Unregistered** (GSTIN cleared; small component supplier).
- No SEZ/Overseas seed (no import flow yet); types exist so the dropdown is complete.

**Migration:** existing vendor with GSTIN → Regular; without → Unregistered.

## 8. Backend-build notes
- `vendors.gst_reg_type` enum NOT NULL default 'regular'; CHECK: gstin NOT NULL for regular/composition/sez,
  NULL for unregistered/overseas; overseas ⇒ country ≠ 'IN'. `vendors.tax_state_code` FK `gst_states`.
- `PATCH /vendors/:no { gstRegType, gstin }` → returns `{ impact: { openPoCount } }` on dry-run
  (`?preview=1`) for the review line; real save re-validates.
- Document snapshot columns on `purchase_orders`, `purchase_receipts`, `vendor_bills`; set at create,
  refreshed on edit while Draft/open, frozen at posting.
- Server-enforced: Composition vendor + inter-state ship-to → warn/block per setting; ITC never booked
  on bills from composition/unregistered vendors; returns: purchases from composition/unregistered go to
  GSTR-3B "inward supplies from composition/exempt/nil/non-GST".
- Later: GSTN public search on GSTIN entry to pre-fill legal name + taxpayer type (Regular/Composition/SEZ)
  and flag cancelled GSTINs; periodic re-check job flags vendors whose GSTIN got cancelled.

### Security checklist
- GSTIN = business identity, not PII. An **Unregistered individual** vendor may be a person — their name/address
  are already PII-handled via Contacts; no new PII field.
- Audit event `vendor.gst_registration.updated` (old → new type + GSTIN, who, when, open-PO count at change).
- Tenant-scoped; nothing sensitive in localStorage.

### Decisions & deferred-to-backend
- Dropdown over checkbox (§2). Snapshot on documents over dated vendor history (§2 C).
- Reverse charge lives on the service classification, not the vendor type (except Overseas services).
- SEZ/Overseas import flow (bill of entry, customs duty, IGST on import) deferred; types exist now.
- Customers reuse the same enum with Sales; carriers keep their own `gstin` + `rcm` until aligned with classifications.

## 9. Success criteria
- A PO from V00004 shows no tax and the "Unregistered · no GST" tag; from V00003 the same with "Composition".
- Changing V00003 to Regular with an open PO shows the impact line; the PO recalculates on next edit only.
- Regular vendor without GSTIN can't be saved; Unregistered with GSTIN can't be saved.
- Vendors grid filters by type; docs `docs/vendor-page/` + `docs/tax-settings/` updated at build.

## 10. Open questions
1. Seed choice — OK to make Sri Annamalai Packaging composition and Vellore Silicone unregistered?
2. Composition + inter-state: default **Warn** or **Block**?
3. Should *New vendors start as* be a setting, or always Regular? → **Revised 2026-10-15: always Regular; setting removed.** Vendor creation templates (parked) will carry the type.
