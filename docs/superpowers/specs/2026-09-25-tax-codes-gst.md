# Spec — Tax codes & GST (multi-registration, ship-from / ship-to aware)

**Status:** Approved 2026-09-25 · amended 2026-09-26 (§2.7 Locations ↔ registrations, now build step 4).
**Date:** 2026-09-25
**Scope:** Configuration + purchase-side tax now (build step 2 — Finance for purchase). Sales output tax, GSTR-1 and e-invoice generation ship with steps 5/6; the engine below is designed for both sides from day one.
**Tiering:** parked (POC mode for Kanalora) — built ungated. Future-pass hint: single registration + tax codes = Starter; multiple registrations / inter-state branch transfers = Growth; 2B/IMS reconciliation = Growth.

**Law baseline (verify with CA):** GST 2.0 slabs effective 22 Sep 2025 — 0% · 5% · 18% · 40% (+ special 3% / 1.5% / 0.25%). 12% and 28% abolished. Dhoop/sambrani (HSN 3307 41) 5%; ornamental ceramics (HSN 6913) 5%. E-invoice mandatory above ₹5 cr AATO. **HSN for the holder must be confirmed by Kanalora's CA.**

---

## 1. Concepts (plain language)

| Concept | What it is | Where it lives |
|---|---|---|
| **Tax code** | A national rate: GST 0 / 5 / 18 / 40 (+ specials). **Same in every state.** Effective-dated. | Configuration ▸ Tax codes |
| **Split** | Not chosen by users. Same state → **CGST + SGST** (or **CGST + UTGST** in UTs without legislature). Different state → **IGST**. | Computed per line |
| **Tax treatment** | Why a line is or isn't taxed: Taxable · Exempt · Nil-rated · Zero-rated (export/SEZ) · Non-GST · Reverse charge. | Fixed system list, set per item / party / line |
| **Party registration type** | Regular · Composition · Unregistered · SEZ · Overseas. Drives whether GST is charged and whether we can claim it back. | Vendor / customer record |
| **GST registration** | One GSTIN **per state** we operate in. Each files its own returns, has its own invoice series, and its own credit. | Workspace ▸ GST registrations |
| **Location → registration** | Every location belongs to exactly one registration (its state). | Location record |
| **State** | Official GST state codes (33 TN, 29 KA …). Seeded list, no rates. | Configuration ▸ States & territories |

**Place-of-supply rule the engine applies (goods):** tax follows **where the goods' journey ends**.
- Our state = state of the **registration on the document** (derived from ship-from on sales, ship-to on purchase).
- Other state = party GSTIN's first two digits, else the party address state.
- Sales: customer **ship-to** state. Purchase: our **ship-to location's** state.
- Same → CGST+SGST / UTGST. Different → IGST.

---

## 2. Configuration & settings

### 2.1 Configuration ▸ Tax codes (replaces the placeholder)
- Grid: Code · Name · Current rate · Effective from · Applies to (Goods / Services / Both) · Status · Used by (count).
- Seed: `GST0`, `GST5`, `GST18`, `GST40`, `GST3` (inactive), plus system `GOODS` ("Goods rate" — charge takes the rate of the goods it rides with; existing Charges behaviour).
- **Rate history** (drawer): list of `{ rate, from, to }` rows. Rate change = add a new dated row; never edit a used row. Documents read the rate valid on the **document date**.
- Cess: field reserved (hidden, off) — not in scope.
- Delete blocked while used; deactivate instead.

### 2.2 Configuration ▸ States & territories (read-only seed)
- 38 rows: code, name, type (State / UT with legislature / UT without legislature → UTGST), plus `97 Other territory`, `96 Foreign`.
- Used by every address state dropdown and GSTIN parsing. No rates.

### 2.3 Workspace ▸ GST registrations (replaces the single GSTIN field)
- List of registrations: GSTIN, legal/trade name, state (auto from GSTIN), scheme (**Regular** / Composition), registration type (Normal / Casual — with valid-from/to), filing frequency (**Monthly** / Quarterly-QRMP), e-invoice required (toggle), e-way bill threshold (default ₹50,000), invoice series prefix (e.g. `TN/{FY}/`), principal address, status.
- **Primary** registration flag (one). Seed: Kanalora TN `33…` = Regular, Quarterly, e-invoice off.
- **Single-registration UI:** when only one exists, no registration pickers appear anywhere; the settings page shows one card with "Add a registration in another state" link.
- Rule: a location in a state with no registration can't be activated — prompt: "Bengaluru is in Karnataka. Add a Karnataka GST registration first."

### 2.7 Locations ↔ registrations (amendment 2026-09-26 · build step 4)
**Problem found:** the GST registration card listed locations from a hard-coded 4-entry list in the app (`siteDefs()`), not from Locations & warehouses (`SFLocationsWarehouses.dc.html`, `shelfree.wh.v7`, 3 records). `TVM-RET` isn't a real location. Warehouse state is free text (`'TN'`) and country defaults to `US`.

**Decisions (all recommended options, 2026-09-26):**
1. **One location list, everywhere.** The Locations & warehouses registry is the only source of locations. GST registrations, States & territories, item stock (tab, grid, filters), receipt "Received into", assembly order location, production settings and the "Default location" preference all read it. Add a site once and it appears everywhere.
2. **`TVM-RET` retired as a location.** Returns stay the `RET` area inside `TVM-MAIN`; item `locs.returns` stock folds into Main. Items are keyed by warehouse id: `main→WH-TVM`, `assembly→WH-ASSY`, `east→WH-CHN`, `returns→WH-TVM` (summed).
3. **Setup locations show on the registration**, tagged *Setting up*, so they're declared before the first stock moves.
4. **Place of business tracked per location:** `pobStatus` = `principal` | `additional` | `undeclared`. Exactly one Principal per registration (seed: TVM-MAIN). New locations start `undeclared` and warn until you mark them declared (done on the GST portal, form REG-14 — the app never touches the portal). Seed: TVM-MAIN principal, TVM-ASSY additional, CHN-DC undeclared.
5. **3PL operator = vendor link.** Location gets `operatorVendorId` (the 3PL's vendor record carries their GSTIN, contacts and storage bills @ 18% SAC 9967). Stock at a same-state 3PL is filed under **our** GSTIN; transfers to it are delivery challans. Another-state 3PL needs that state's registration (§4.2 branch transfer).
6. **Registration card — location rows:** name · code · status · place-of-business status. Undeclared rows sort first; header shows `n not on certificate`. Row opens the location. 1 site = one line; >5 = first 5 + *Show all (n)*.
7. **Locations page:** GSTIN chip on each card · warning on the card when its state has no registration (can't go Active until one exists) · read-only *GST registration* line in the edit form that updates live as state changes · **State = required GST state dropdown** for Indian sites (country default `IN`; stored as code, `'TN'`→`'33'` migrated).

8. **Vendor kind — "Supplies": Goods / Services / Both** (`vendor.supplies`, default `goods`). Services vendors hide PO fields (items, lead time, ship method) and show default expense account, default tax code, optional recurring bill (built with vendor bills, task 8). Vendors list filter: All · Suppliers · Service providers. PO vendor pickers offer Goods + Both only.
9. **Demo 3PL vendor:** `Ambattur Logistics Park Pvt Ltd` (TN GSTIN, supplies = services, default SAC 9967 @ 18%) linked as CHN-DC `operatorVendorId`.
10. **Location contacts → Contacts links.** Warehouse manager/phone/email move to `contacts[]` `{ id, contactId, role, isPrimary }` via the shared picker; flat fields become a read mirror (`cntMirror`); link registered in `cntLinks()`.
11. **Carriers pay through a linked vendor** (`carrier.vendorId`) — added with vendor bills (task 8), not now.

8. **Vendor "Supplies" = Goods | Services | Both** (default Goods). Services hides PO fields (items, lead time, ship method) and shows default expense account, default tax code and optional recurring bill. Vendors list filter: All · Suppliers · Service providers. PO vendor pickers offer Goods + Both only. Field lands in step 4; expense accounts + recurring bills are built in the vendor-bills step.
9. **Demo 3PL vendor** seeded: *Ambattur Logistics Park Pvt Ltd*, TN GSTIN, Supplies = Services, 18% SAC 9967; linked as CHN-DC `operatorVendorId`.
10. **Location contacts move to Contacts links** (`contacts[]` of `{id, contactId, role, isPrimary}` per the contacts rule; registered in `cntLinks()`); existing typed contacts migrate to Contact records.
11. **Carriers link to a vendor record** (`vendorId`) so freight bills pay through the vendor-bill flow — built in the vendor-bills step, not step 4.
12. **TDS** (rent, contractors) — later; confirm applicability with CA.

**Built 2026-09-26 — refinement to decision 10:** a site manager is our own staff, so it links to People › Employees (`managerEmpId`), not People › Contacts (external people only). A 3PL site's people are its operator vendor's contacts. Free-typed site contact fields are removed.

**Rules:** registration is derived (active Normal registration of the location's state), never picked. Changing a location's state re-links it, and is blocked while open documents use the location. A location with stock or open documents can't be deleted (deactivate). A registration can't be cancelled/deleted while it has active locations. Changing the Principal moves the old one to *Additional* (confirm).

**Settings surfaces (same turn):** Workspace ▸ GST registrations (location rows, declare action) · Configuration ▸ Locations & warehouses (state, POB, operator) · Terminology: existing `object.location` labels apply · User: `locations.manage` for POB/state edits.

**Keyboard/mouse:** location rows on the card are focusable (↑/↓, Enter opens); right-click → Open location · Mark as declared · Make principal · Copy address. Added to Keyboard shortcuts.

**Backend:** `locations(id, code, name, type, status, address…, state_code, country, registration_id FK derived, pob_status, operator_vendor_id FK)`; unique principal per registration; audit POB/state/operator changes; stock tables key on `location_id`.

### 2.4 Configuration ▸ Tax settings
- Rounding: per line (default) / per document; round-off account.
- Default tax code for new items; default per **item category** (category grid gets a Tax code column).
- Allow line-level tax override: on (default), requires reason.
- Warn on GSTIN-vs-address state mismatch: on.
- Bill-to / ship-to (paper transfer) handling: **Warn + auto-draft branch invoice** (default) / Block.

### 2.5 Terminology
- "Tax code" / "GST rate"; "Registration" / "GSTIN"; "Branch transfer" / "Stock transfer".

### 2.6 User-level (permissions + preferences)
- `tax.codes.manage`, `tax.registrations.manage` (finance admin only).
- `tax.line.override` (reason required, audited).
- `tax.recon.manage` — run/resolve 2B reconciliation.
- Preference: show tax split columns on document lines (on/off).

---

## 3. Master data changes

| Record | New / changed fields | Rules |
|---|---|---|
| **Item** | `hsn` (4/6/8 digits), `taxCode`, `taxTreatment` (default Taxable) | HSN required when taxable. Category default fills taxCode. |
| **Item category** | `taxCode` default | — |
| **Vendor** | `regType`, `gstin`, `stateCode` (derived) | GSTIN filled → state auto + locked. No GSTIN → regType ≠ Regular; state from address. Composition/Unregistered → no GST on their bills, no credit. |
| **Customer** | same as vendor; each ship-to address has `stateCode` | Ship-to state drives the split. |
| **Location** | `stateCode` (required dropdown), `registrationId` (derived), `pobStatus`, `operatorVendorId` — see §2.7 | Single registry for all screens; changing state re-links; blocked if open documents. |
| **Charge** | `gst` enum → `taxCode` ref (keeps `GOODS`); `sac` stays | Removes stale 12% / 28%. |
| **Carrier (GTA)** | existing `rcm`; RCM rate from tax code (GTA RCM = 5%) | — |

---

## 4. Tax engine (per document line)

1. **Registration on the document**
   - Purchase: ship-to location → its registration (**bill-to follows ship-to** by default).
   - Sales: ship-from location → its registration.
   - Invoice/bill number series comes from that registration.
2. **Treatment** — first match: line override → party (SEZ/Overseas → Zero-rated; Composition/Unregistered vendor → No GST charged) → item treatment → Taxable.
3. **Rate** — line override → item tax code (charge `GOODS` → the goods' code) → valid rate on document date.
4. **Split** — compare our state vs other state (§1). UT without legislature → UTGST label.
5. **Reverse charge** — GTA with `rcm`, or treatment = Reverse charge → vendor bills no GST; we self-assess the same amount.
6. Line shows a compact tag: `GST 5% · TN → KA · IGST`. Overrides show an **Overridden** badge with reason.

### 4.1 Scenarios the engine must pass
| # | Scenario | Result |
|---|---|---|
| S1 | PO to Vellore vendor (33), ship-to TVM-MAIN | TN registration · CGST 2.5 + SGST 2.5 |
| S2 | PO to Bengaluru supplier (29), ship-to TVM-MAIN | TN · IGST 5 |
| S3 | PO to Vellore vendor, ship-to **Bengaluru warehouse** | Bill-to auto = **KA** registration · IGST 5 · credit lands in KA · **no transfer** |
| S4 | Same as S3 but user forces bill-to TN | Warning: "Creates a paper transfer to KA." Vendor bill = CGST+SGST to TN; on receipt, auto-draft **branch invoice TN → KA (IGST)** |
| S5 | Sale from Bengaluru warehouse to Bengaluru store | KA registration · CGST + SGST · KA invoice series |
| S6 | Customer HQ Chennai, ship-to Tirupati (37) | IGST (ship-to wins) |
| S7 | Unregistered local packaging supplier | No GST on bill, no credit; line tagged "Unregistered" |
| S8 | Arunachala Road Transport (GTA, RCM) freight ₹4,000 | No GST on LR; we book RCM 5% = ₹200 payable + ₹200 credit |
| S9 | PO dated before a rate change, bill dated after | Each document uses the rate valid on its own date; bill shows "Rate changed since PO" note |

### 4.2 Stock transfer order (new document, same step)
- From location → To location, lines, quantities.
- Same registration → **delivery challan**, no tax, inventory moves only.
- Different registrations → **branch transfer invoice** (tax invoice, IGST, value = cost/landed cost by default, editable) from sending registration + matching **branch purchase** in receiving registration. E-way bill flag above threshold.

---

## 5. Finance postings (purchase side, this step)

Existing accounts reused: `1410` CGST input, `1411` SGST input, `1412` IGST input, `2320` GST payable — RCM.
New (only what this step needs):
- `1413` UTGST input — created when a UT registration exists.
- `1420` GST input — awaiting 2B match (optional holding, see §6.3 decision).
- `1510` Inter-branch account (asset/liability, per registration pair) and `2330` IGST output — branch transfers only. Other output accounts arrive with Sales finance.

**Registration is a dimension on every GST posting** (not separate accounts per state) — reports filter by it.

| Event | Posting |
|---|---|
| Vendor bill, Regular vendor | Dr Inventory/Expense · Dr GST input (head per split) · Cr AP |
| Bill from Composition / Unregistered | Dr Inventory/Expense (full amount) · Cr AP — no GST |
| Blocked credit (Sec 17(5) item flag) | GST added to cost — Dr Inventory/Expense · Cr AP |
| RCM freight | Dr Freight/Inventory · Cr AP (net) ; Dr GST input · Cr 2320 RCM payable |
| Branch transfer TN → KA | TN: Dr 1510 · Cr Inventory · Cr 2330 IGST output. KA: Dr Inventory · Dr 1412 IGST input · Cr 1510 |
| Credit note from vendor | Reverses the bill's lines proportionally |

---

## 6. Tracking & reports (this step)

### 6.1 GST summary (Finance ▸ Tax ▸ GST summary)
Per registration + period (month or quarter per its filing frequency): credit earned by head (CGST/SGST/IGST), RCM payable, blocked credit, **net position**. Drill to documents.

### 6.2 Input tax credit register
Every bill line with GST: vendor, GSTIN, invoice no./date, HSN, taxable value, heads, eligibility (Eligible / Blocked / Reversed), 2B status.

### 6.3 GSTR-2B / IMS reconciliation
- POC: user uploads the portal's 2B JSON/Excel per registration (parsed client-side, mocked). Backend later pulls via GSP API.
- Match on GSTIN + invoice no. + date + value; status per bill: **Matched · Missing in 2B · Value mismatch · In 2B, not in books**.
- Actions: mark accept / reject / pending (mirrors IMS), note, "Chase vendor" (opens a note on the vendor).
- Decision needed: book credit immediately to 1410–1412 and flag unmatched (simpler, **recommended**), or hold in `1420` until matched.

### 6.4 Reverse charge register
All RCM lines: carrier/vendor, LR no., value, tax, paid-in-cash status (RCM must be paid in cash, not from credit).

### 6.5 Later (with Sales, steps 5/6)
GSTR-1 prep, GSTR-3B prep, HSN summary, e-invoice (IRN) generation, e-way bill generation, output tax accounts.

---

## 7. Screens, states, input model
- Every grid/drawer follows existing registry patterns (views, search, keyboard, right-click).
- Empty states: no registrations ("Add your GSTIN to start calculating tax"); no rate history; reconciliation not yet uploaded.
- Error states: GSTIN invalid / duplicate; location state without registration; tax code inactive on a draft.
- Document line: tax tag + hover card showing how it was decided (registration, states, treatment, rate date).
- Shortcuts (added to Settings ▸ Keyboard shortcuts): `Alt+T` open tax detail on focused line; `Alt+Shift+T` override tax on line; standard grid shortcuts on all new lists. Right-click on bill in reconciliation: Accept · Reject · Pending · Open bill · Chase vendor.

## 8. Audit & security
- Audit: tax code / rate change, registration create/edit, line override (with reason), reconciliation status change, branch-transfer auto-draft.
- GSTIN is business identity (not PII) but validated; no portal credentials or GSP keys client-side ever.
- Tenant isolation: registration IDs scoped to workspace.
- Update `docs/security/README.md` checklist with the reconciliation upload surface.

## 9. Docs to update on build
`settings/`, `erp-app/`, new `tax-codes/`, new `gst-registrations/`, new `gst-reports/`, new `stock-transfers/`, `locations-warehouses/`, `vendor-page/`, `customer-page/`, `item-page/`, `charges/`, `carriers/`, `chart-of-accounts/`, `purchase-orders/`, `purchase-receipts/`, `security/`, `README.md` index.

## 10. Decisions & open questions
**Resolved 2026-09-25:**
- Rate-level tax codes; engine computes the split (Option A). ✅
- Rates national, not per state; states list carries codes only. ✅
- One State field per party; GSTIN fills and locks it. ✅
- Multiple registrations and ship-from / ship-to supported now. ✅
- Direct delivery to another-state warehouse = PO billed to that state's registration (bill-to follows ship-to); forced bill-to/ship-to = warn + auto-draft branch invoice. ✅

**Resolved 2026-09-26 (§2.7):** one location registry everywhere · TVM-RET retired into TVM-MAIN · Setup sites shown on registration · place-of-business tracked · 3PL = vendor link · card rows = name/code/status/POB · Locations page gets GSTIN, gap warning, derived registration line, required state dropdown · vendor "Supplies" field + demo 3PL vendor · location contacts → Contacts links · carriers → vendor link at task 8. ✅

### Open questions (to confirm with CA / owner — none block the build)
Each answer is a **setting or seed value**, so the build uses the recommended option as a changeable default.

**Q1. Kanalora's GST scheme** — who to ask: CA
- **A. Regular** (recommended) — charge GST on sales, claim back GST paid on purchases.
- B. Composition — flat small tax on turnover, no GST on invoices, no credit claims.
- *Build impact:* registration `scheme` field; Composition hides tax on sales documents and disables credit.

**Q2. Return filing frequency** — who to ask: CA
- A. Monthly — GSTR-1 + GSTR-3B every month.
- **B. Quarterly (QRMP)** (recommended seed) — allowed under ₹5 cr turnover; tax still paid monthly.
- *Build impact:* registration `filingFrequency`; sets the GST summary period (month vs quarter).

**Q3. HSN code + rate for the holder** — who to ask: CA
- **A. 6913 — ornamental ceramic article @ 5%** (recommended seed).
- B. 6912 — ceramic household article @ 5%.
- C. Other, as advised by CA.
- *Build impact:* item seed values only; cones stay 3307 41 @ 5%.

**Q4. Demo multi-state setup** — who to ask: owner
- **A. Seed a demo Karnataka registration + Bengaluru warehouse, labelled "Demo"** (recommended) — lets scenarios S3/S5/S6 be shown.
- B. Single TN registration only; add another state when it's real.
- *Build impact:* seed data only; engine is built multi-state either way.

**Q5. When to book GST credit vs the government's 2B list** — who to ask: CA
- **A. Book credit when the bill is posted; flag bills missing from 2B** (recommended) — simpler books.
- B. Hold credit in `1420 GST input — awaiting 2B match` until matched, then move it.
- *Build impact:* Tax settings toggle `itcBooking: 'onBill' | 'on2bMatch'`; reconciliation screen is the same.

**Q6. Value used on stock moved between your own states** — who to ask: CA
- **A. Landed cost** (recommended) — what the stock actually cost incl. freight.
- B. Purchase cost only (excl. freight).
- C. A set % of selling price.
- *Build impact:* Tax settings default `branchTransferValue`; always editable per transfer.

### Build now vs later
**Not blocked — build now:** Locations ↔ registrations (§2.7) · Tax codes page + rate history · States & territories list · GST registrations page · Tax settings page · item / category / vendor / customer / location / charge field changes · tax engine + line tag + hover card · PO + receipt + vendor bill tax lines · RCM on GTA freight · finance postings (§5) · ITC register · RCM register · GST summary · 2B reconciliation screen (with Q5 toggle) · stock transfer order + branch invoice (§4.2, Q6 as default).
**Build after Q4:** Karnataka demo seed (engine ships regardless).
**Build with Sales (steps 5/6):** GSTR-1 / 3B prep · HSN summary · e-invoice · e-way bill.
