# Spec — Freight & shipping charges (Option B: policy-driven)

**Status:** DRAFT — pending user sign-off. Nothing built yet.
**Date:** 2026-09-22
**Scope:** Purchase side ships with build step 2 (Finance for purchase); sales side ships with step 5 (Sales) + step 6 (Finance for sales).
**Tiering:** parked (POC mode for Kanalora) — built ungated. Future-pass hint: basic freight line = Starter; policies/tiers + landed-cost allocation = Growth; carrier performance analytics = Growth.

---

## 1. Concepts

Three independent fields on every order and every shipment:

| Concept | Values | Notes |
|---|---|---|
| **Shipment method** (how) | Self pickup · Vendor/our delivery · Carrier · Own vehicle | Purchase: "Self pickup" = we collect. Sales: "Customer pickup" = they collect. |
| **Freight policy** (who pays / how much) | Tiered scale per vendor/customer | Charge types per tier: Actual · Flat · % of order · Free |
| **Carrier + tracking** | Only when method = Carrier | AWB (courier) / LR (transporter) + e-way bill |

Freight money is tracked at three points: **Estimated** (PO/SO, from policy) → **Billed** (receipt/vendor bill or sales invoice) → **Actual paid** (carrier bill / our courier cost).

**Split shipments:** one PO/SO, many receipts/deliveries. Never a separate PO. Policy tier is judged on the **whole order value**, not per shipment.

---

## 2. Configuration & settings

### 2.1 Configuration ▸ Freight & shipping (new page)
- Freight tracking on/off — Purchase, Sales (separate toggles). Off = no freight UI anywhere.
- Shipment methods list (enable/disable, rename).
- **Capitalise inward freight into inventory (landed cost):** on (default) · off = expense directly to Freight Inward.
- Default landed-cost allocation basis: **Value** (default) · Quantity · Weight.
- Tier basis default: order value **before GST** (default) · quantity · weight.
- Sales split-shipment rule: Charge per shipment · First shipment only · **Waive on backorder splits** (default).
- Near-threshold nudge: on/off + trigger window (default: within 25% of next free/cheaper tier).
- Override reason codes (editable list): Negotiated · Urgent shipment · Vendor error · Goodwill · Promo · Other.
- Pickup internal cost: workspace default method (Flat / Per km) + default rates — overridable per vendor and per PO — analysis only, never posted.
- Allow G/L account lines on documents: off (default).
- E-way bill threshold: ₹50,000 (warn when consignment value exceeds and field empty).
- Dispute rule: flag when billed freight > policy-expected freight (tolerance ₹ / %).

### 2.2 Workspace settings
- Our pickup address + hours (shown on SO/invoice when Customer pickup).
- Own vehicles list: vehicle no., description (for "Own vehicle" method).

### 2.3 Terminology
- "Freight" / "Shipping" / "Delivery charge" (separately for purchase and sales).
- "Tracking no." / "AWB" / "LR no."
- "Self pickup" / "Collect".

### 2.4 User-level (permissions + preferences)
- `freight.override` — change the policy-calculated freight on PO/SO (reason required).
- `freight.waive` — waive customer freight to ₹0 (sales).
- `freight.dispute.resolve` — accept/reject a freight dispute.
- `carriers.manage`, `freightPolicies.manage`.
- Preference: show near-threshold nudge (on/off).

---

## 3. Master data pages

### 3.1 Carriers (new) — Purchasing & Sales ▸ Carriers
List + drawer. Fields: code, name, type (Courier · Transporter/GTA · Own vehicle), GSTIN, **RCM default** (auto-on for GTA without forward-charge opt-in), tracking-URL template (`https://…/{tracking}`), contact name/phone, default service, active.
Examples: ST Courier, Professional Couriers, DTDC, local lorry transporter (Tiruvannamalai–Chennai).

### 3.2 Freight policies (new) — one page, filter by Purchase / Sales
List + editor. Fields: code, name, direction, basis (value/qty/weight), effective from/to, notes.
**Tiers table:** From · To · Charge type (Actual / Flat / % / Free) · Amount.
Example — *Kiln vendor standard*: `< ₹10,000` Actual · `₹10,000–24,999` Flat ₹600 · `≥ ₹25,000` Free.
Example — *Retail delivery (sales)*: `< ₹2,000` Flat ₹150 · `≥ ₹2,000` Free (local); Pournami promo policy with effective dates.
Rules: tiers contiguous, no overlaps; one active policy per vendor/customer per date.

### 3.3 Vendor card — new **Shipping** section
Default shipment method · Freight policy · Default carrier · Vendor pickup address · **Pickup cost method (Flat / Per km) + rate + one-way distance** · Freight terms note.
Vendor Purchase Items: no change.

### 3.4 Customer profile — extend **Shipping addresses** tab
Per address: delivery method · delivery policy · default carrier. Overview shows current policy.

### 3.5 Item card — Purchasing tab
Add weight (needed for weight basis) and **Landed unit cost** (last receipt: unit cost + allocated freight).

### 3.6 Charges (new) — master list of non-stock charges
Fields: code, description, direction (Purchase / Sales / Both), posting account, GST rate/HSN-SAC, **allocate to landed cost** (yes/no), active.
Seed: `FRT-IN` Freight inward → Freight Inward (allocatable) · `FRT-OUT` Shipping charge → Freight Recovered · `PKG` Packing · `INS` Transit insurance · `LOAD` Loading/unloading.

### 3.7 Line Type (applies to PO, receipt, vendor bill, SO, sales invoice lines)
Every line starts with a **Type** dropdown that sets what the No. field looks up:
| Type | Looks up | Effect |
|---|---|---|
| **Item** (default) | Items | Inventory + qty |
| **Charge** | Charges (3.6) | Posts to charge's account; allocatable charges spread to item lines |
| **G/L account** | Chart of accounts | Direct posting, non-stock (stationery, repairs). Hidden unless enabled in Configuration; needs finance permission |
| Fixed asset | Assets | Later, with asset accounting |
Freight is always a **Charge** line, never raw G/L — so GST, landed-cost allocation and freight reporting work. Policy-generated freight = Charge line `FRT-IN`/`FRT-OUT`, pre-filled. Charge lines sort to the bottom of the grid.

---

## 4. Purchase transactions (build step 2)

### 4.1 Purchase order editor
- Header: Shipment method, Freight policy, Carrier (if Carrier) — defaulted from vendor, editable.
- **Freight Charge line** (Type = Charge, `FRT-IN`) auto-calculated from policy, grouped at bottom of the lines grid; shows tier badge ("Standard ₹600", "Free — over ₹25,000").
- Nudge: "Add ₹3,200 more for free freight."
- Override: edit amount → reason code required → audit event.
- Totals: Subtotal · Freight · GST · **Total** (freight taxed at goods rate when vendor bills it).
- Self pickup → freight ₹0; internal pickup cost shown greyed "(analysis only)" with method toggle (Flat ↔ Per km) and editable rate/distance for this PO.
- Freight line shows **Est.** and **Actual** columns + variance; total uses Actual when entered.
- PO list: new columns Method, Freight.

### 4.2 Purchase receipt (per shipment)
- **Shipment block:** method (inherited), carrier, tracking no., e-way bill no., vehicle no., driver name/phone, dispatched / expected / received dates, status (Dispatched → In transit → Received).
- **Freight on this shipment:** Billed by (Vendor on invoice · Carrier separately · None) · amount.
- Dispute flag when order qualified for Free but freight billed, or billed > expected + tolerance.
- **Allocation preview:** freight spread to received lines by basis → landed unit cost per line.

### 4.3 Vendor bill (step 2, new page)
- Vendor freight comes as a bill charge line, matched to receipt(s).
- Carrier freight = separate vendor bill for the carrier, linked to one or more receipts, RCM flag from carrier.
- Estimate vs actual difference: to inventory if stock on hand, else Freight variance.

### 4.4 Postings (accounts introduced in step 2)
| Account | Type | Use |
|---|---|---|
| **Freight Inward** | Direct expense (COGS) | Vendor/carrier freight bills debit here; landed-cost allocation credits it to Inventory. Residual balance = variance (stock already consumed, estimate ≠ actual) |
| **Freight Inward Clearing** | Current liability | Receipt accrues expected freight until the bill arrives; bill clears it |
| GST RCM payable / ITC | Existing tax accounts | GTA freight under reverse charge — no new account |

Inventory valued at landed cost when capitalisation is on. Freight on fixed-asset purchases → capitalised to the asset, not Freight Inward.

---

## 5. Sales transactions (build steps 5–6)

### 5.1 Sales order editor
Delivery method, delivery policy, carrier; **Shipping charge** line from policy; nudge ("Customer is ₹400 away from free delivery"); waive needs `freight.waive` + reason.

### 5.2 Delivery / shipment (per fulfilment)
Same shipment block as receipts (carrier, AWB/LR, e-way bill, vehicle, dates, status → Delivered) + **Actual cost to us** (courier charge). Split rule from config decides charge on 2nd+ shipment.

### 5.3 Sales invoice
Shipping charge line, GST at goods rate. Customer pickup → no charge line; pickup address printed.

### 5.4 Postings (accounts introduced in step 6)
| Account | Type | Use |
|---|---|---|
| **Freight Outward** | Indirect expense (selling & distribution) | What we pay couriers/transporters to deliver |
| **Freight Recovered** | Other operating income | Shipping charged to customers — kept gross, not netted, so recovery ratio stays visible |

Free-delivery absorbed = analysis tag on Freight Outward postings, not an account.

---

## 6. Tracking & analysis

### 6.1 Shipments tracker (new) — Warehouse ▸ Shipments
One list of all inbound + outbound shipments: direction, doc no., party, method, carrier, tracking (clickable link), e-way bill, status, expected date, **overdue** flag. Status updated manually in POC (carrier API = future integration).

### 6.2 Freight analysis (new report page)
- **Purchase:** freight % of purchase value by vendor; missed free-freight (paid freight on orders within X of threshold); pickup savings (standard freight avoided – internal cost); disputes open/resolved; estimate vs actual variance.
- **Sales:** freight recovery (charged ÷ actual cost) by customer/area; free-delivery cost absorbed; promo-policy impact (Pournami/Deepam windows).
- **Carriers:** on-time %, avg transit days, cost per shipment / per kg.

Every shipment stores: method, policy + tier applied, expected / billed / actual, borne by (us / vendor / customer), override reason, carrier, dates — so all reports derive from shipment records.

---

## 7. Keyboard, context menus, audit
- Shortcuts (added to Settings ▸ Keyboard shortcuts): `Alt+F` focus freight line; `Ctrl+Shift+T` copy tracking link; `Alt+O` override freight; Carriers/Policies lists use standard grid shortcuts.
- Right-click on shipment row: Open tracking · Copy AWB · Mark delivered · Raise dispute.
- Audit events: freight override, waive, dispute raise/resolve, policy create/edit, carrier edit.
- Security: driver name/phone = PII (mask in lists, retention rule); carrier GSTIN validated; no tracking API keys client-side.

## 8. Docs to update on build
`purchase-orders/`, `purchase-receipts/`, `erp-app/` (vendor card), `customer-page/`, `settings/`, `item-page/`, new `carriers/`, `freight-policies/`, `shipments/`, `freight-analysis/`, `security/`.

## 9. Open questions (for sign-off)
**Resolved 2026-09-22:**
- Tier basis = order value **before GST**. ✅
- One freight policy **per vendor** (not per ship-from location). ✅
- Chart of Accounts: build a **minimal purchase-side CoA in step 1** (Freight Inward, Freight Inward Clearing, Inventory, GST input/RCM) so Charges can reference real accounts. ✅
- **G/L account line type deferred** until CoA/finance posting lands (step 3). Step 1 line types = Item + Charge. ✅

**Pending (explained, awaiting answer):**
- (none)

**Resolved 2026-09-22 (round 2):**
- **Estimated + Actual freight fields.** The freight Charge line carries both: **Est.** (from policy; for Actual-tier = avg of last N freights for that vendor) and **Actual** (user-entered). Actual can be typed on the PO when known (e.g. vendor quotes by phone); once any receipt carries freight, PO Actual becomes read-only = sum of receipt actuals (split shipments). PO total uses Actual when present, else Est. Variance (Actual − Est.) shown on the line and feeds freight analysis.
- **Pickup internal cost — both methods, per vendor.** Vendor card: pickup cost method **Flat per trip** or **Per km**, with rate (₹/trip or ₹/km) and one-way distance (km). Workspace default rate in Configuration. On the PO the user can switch method (flat ↔ km) and override rate/distance for that order. Analysis only — never posted.
- **Deferred — pickup trip expenses (future spec):** driver/trip spend (fuel, tolls, food, loading labour) as real expenses to a separate expense account, captured per trip. Not in step 1.

**Pending (superseded above):**
- "Actual" tier: PO carries an estimate (avg of last N freights for that vendor, labelled "Est."); true amount entered at receipt/bill; difference = freight variance.
- Pickup internal cost: flat ₹ per trip vs ₹/km × vendor distance.

**Later steps:**
1. Tier basis = order value **before GST**?
2. "Actual" tier: enter estimate on PO, true amount at receipt/bill — OK?
3. Policy per vendor only, or also per vendor + ship-from location?
4. Sales split default = waive on backorder splits?
5. Pickup internal cost: flat per trip, or per km?
6. Shipments tracker as its own page — yes?
7. Tracking status manual for now (no carrier API) — OK?
