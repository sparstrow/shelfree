# Spec — Purchasing ▸ Purchase Prices (2026-10-17)

Status: **awaiting approval** · Stage: 1 Purchase (Starter base, ungated — tiers parked)

## Goal
One register of what Kanalora pays each vendor for each item, by quantity tier and date,
and make purchase orders price themselves from it. Many vendors may quote the same item;
the PO's vendor decides which price applies.

## Decisions (from the question rounds)
| # | Decision |
|---|---|
| D1 | **Keep both screens over one store.** Purchase Prices = cross-vendor register; Vendor Purchase Items + the vendor page's *Items supplied* read/write the same rows filtered by vendor. |
| D2 | Row carries: **min qty tier, start/end dates, lead time, vendor's item code, note**. Currency is stored (`INR`) but **hidden** — INR only until imports. |
| D3 | **Price change = close + new row.** "Change price" ends the old row yesterday and adds a new row starting today. Plain edits are for corrections. |
| D4 | **Inline editing in a grid** (like Customer prices), on the standard grid engine so views/filters/group-by work. |
| D5 | **PO item picker shows only that vendor's items with an active price.** Off-list items are blocked; the empty state links to Purchase Prices (no inline add). |
| D6 | **Unit cost on PO lines is locked** to the resolved price; **re-prices on every qty change.** To change it, change the price row. |
| D7 | **Qty below the vendor's lowest tier blocks saving** the PO. |
| D8 | Saved views: All · Active · **Expiring in 30 days** · **Grouped by vendor**; plus an **Items with no vendor price** tab. No compare panel now. |
| D9 | *Decided for you:* rules apply to **Draft** POs. Released/Received/Closed keep their saved costs; their lines show a **"Cost ≠ current price"** flag when they differ from today's active price (drift flag kept, informational only). |
| D10 | *Decided for you, per "change current POs to the new spec":* the list starts empty **except** one row per vendor×item already on an existing PO, at that PO's cost (min qty 1, start = PO date, open-ended). That makes every current PO valid under the new rules without inventing other prices. Legacy Vendor Purchase Items browser rows are migrated in once. |

## Screens
**Purchasing ▸ Purchase Prices** (sidebar, after Vendors)
- Tabs: *Prices* (grid) · *Items with no vendor price* (purchasable items — components, cones, packaging — with zero active rows; row → open item).
- Grid columns: Vendor · Item no. · Description · Vendor item code · From qty · Price ₹ · vs item cost · Lead time · Starts · Ends · Status (Active / Scheduled / Expired) · Note. Description/UoM resolve live from the item.
- Inline edit on every value cell (Enter commits, Esc reverts, blur commits); new-row draft strip at the top (vendor + item lookups; item list excludes nothing — tiers allowed).
- Row actions / right-click: Change price… · Add quantity tier · Duplicate to another vendor · Open vendor · Open item · Delete.
- Quiet page: no subtitles; ⓘ + hover help per column/setting.
- States: empty (no prices yet → "New price"), filtered-empty, validation error inline on the row.

**Vendor page ▸ Items supplied / Vendor Purchase Items** — same rows filtered to the vendor; gain From qty, Starts/Ends, Status columns; "Manage prices" opens Purchase Prices filtered to the vendor.

**PO editor (Draft)**
- Lines require a vendor first. Item picker = vendor's active-priced items only; empty → "No prices for {vendor}. Add them in Purchase Prices."
- Unit cost read-only, shows tier hint ("from 50 · ₹55.00"); qty change re-resolves.
- Line errors (block Save/Release): *Below minimum qty (min N)*, *No active price for this vendor*. Changing the vendor re-resolves every line; unpriced lines get the error + "Remove unpriced lines" action.
- Released/Received: drift pill on lines; Purchase Lines grid gets a "Current price" + drift column.

## Price resolution — `ppResolve(vendor, item, qty, date)`
Rows for vendor+item active on `date` (effFrom ≤ date ≤ effTo, blanks = open) → tier with the largest
minQty ≤ qty. None active → `noPrice`. Active rows exist but all minQty > qty → `belowMoq` (min = lowest minQty).
PO uses its **order date**.

## Data model — `PurchasePrice`
`{ id, vendor (vendor no), item (item no), vendorItemNo, minQty (int ≥1), price (≥0), currency:'INR', leadDays (int ≥0, blank = item lead), effFrom, effTo, note, createdAt, updatedAt }`
Validation: no two rows with the same vendor+item+minQty whose date ranges overlap; effTo ≥ effFrom.

## Settings surfaces (same turn)
- **Configuration ▸ Purchase pricing:** Lock PO cost to price list (on) · Block qty below minimum (on) · Expiring-soon window (30 days).
- **Terminology:** "Purchase price", "Vendor item code" labels.
- **User:** grid prefs/views (existing per-user grid storage).
- **Keyboard shortcuts:** N new row · Enter edit/commit · Esc · Shift+P change price · T add tier · Del delete · `?` help — listed in Keyboard shortcuts.

## Persistence (prototype)
`shelfree.purchasePrices.v1` (array). One-time migration from `shelfree.vendorPurchaseItems.<vendorNo>`.

## Backend-build notes
- Table `purchase_prices` (FKs vendor_id, item_id; tenant-scoped); index (tenant, vendor, item, effFrom).
- `GET /purchase-prices?vendor=&item=&active_on=`; `POST/PATCH/DELETE /purchase-prices/:id`; `POST /purchase-prices/:id/change` (atomic close + insert).
- `GET /purchase-prices/resolve?vendor&item&qty&date` — server is the authority; PO save re-resolves and rejects locked-cost tampering, below-MOQ and unpriced lines on Draft.
- Audit events on create/edit/delete/change; permission `purchasing.prices.edit`. No PII.
- Future tier hint: likely Starter (tiers & dates may become Growth).
