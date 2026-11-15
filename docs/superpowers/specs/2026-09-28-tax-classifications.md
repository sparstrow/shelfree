# Spec — Tax classifications (HSN → tax code)

Status: **Draft — awaiting approval** (2026-09-28)
Parent spec: `2026-09-25-tax-codes-gst.md` (engine step 3 "item taxability"). Follows `2026-09-28-vendor-gst-registration.md`.
Replaces: category-level tax codes (retired 2026-09-28, see `docs/tax-settings/README.md`).

## 1. Purpose
Give every item one place its GST comes from: an **HSN-based classification** that points to a tax code
by date. When the government changes a rate, you edit one classification and every linked item follows —
no per-item edits, no category layer.

**The chain (only source of item tax):**
Vendor GST registration (can switch tax off) → **Item → Classification → Tax code on the document date** → CGST+SGST / IGST split.

## 2. Decisions (agreed in chat 2026-09-28)
| # | Decision |
|---|---|
| D1 | **No item-level override.** An exception = fix or add a classification. Override (reason + audit + "Set on item") can be added later if a real case appears. Imports parked. |
| D2 | Every change is a **dated history row**; effective date may be **past or future**. Future rows switch on by themselves on that date. Past rows trigger a review of documents already dated on/after it. |
| D3 | **Open POs keep their rate** and get a flag "Rate changed after this order — tax will follow the vendor's bill". The bill (next stage) takes the rate on the bill date. Drafts recalculate on next edit. |
| D6 | Store the **full HSN you know** (4–8 digits). Workspace setting *Minimum HSN digits* = **4** (default) or 6; shorter codes are flagged. |
| D7 | Seed with best-known HSN codes, each marked **"Verify with CA"** until someone confirms it. |
| — | Classification **points to a tax code**, never stores a rate or calculation. |

**Parked (not in this spec):** reverse-charge + blocked-credit flags (4), default classification for new items + bulk "Assign classification" (5), service/SAC classifications (8), imports.
Charges (freight, courier…) keep their own GST + SAC fields until services are unparked.

## 3. Screens & states

### 3.1 Settings ▸ Configuration ▸ Tax classifications (new page, next to Tax codes)
Standard reference grid (same shell as Tax codes / Charges): search, filter, column chooser, drawer, right-click menu.

| Column | Notes |
|---|---|
| HSN | Mono. 4–8 digits. |
| Description | "Ornamental ceramic articles — incense holders" |
| Taxability | Taxable · Nil-rated · Exempt · Non-GST |
| Tax code | Current row's code + rate, e.g. `GST5 · 5%`. "—" when not Taxable. |
| Next change | e.g. "GST18 from 1 Apr 2027" when a future row exists; blank otherwise. |
| Items | Count of linked items (click → Items grid filtered). |
| Verified | "Verify with CA" amber pill, or ✓ + who/when on hover. |
| Status | Active / Inactive. |

**Drawer / edit panel**
- Fields: HSN, Description, Status, Notes (optional).
- **Tax history** table (newest first): *Effective from* · *Taxability* · *Tax code* · *Added by / on*. The row in force today is marked "Current"; future rows "Scheduled".
- **Add change** → inline row: effective date (any date), taxability, tax code (only when Taxable; active codes only) → **Review** (§3.3).
- **Mark verified** button (when unverified) → records user + date; *Mark unverified* in the ⋯ menu.
- Linked items list (first 20 + "View all in Items").

**States**
- Empty: "No tax classifications yet. Add one for each HSN you buy or sell — items take their GST from it." + *Add classification*.
- Inactive: hidden from pickers; linked items keep working and show "Classification inactive" (amber) on the item.
- Delete: blocked while items are linked ("Linked to 12 items — reassign them or make it inactive").

### 3.2 Item card / item page
- New required field **Tax classification** (picker: HSN + description, search by either; inline "Create classification").
- Read-only line under it: "GST 5% · from 22 Sep 2025 · HSN 6913" — and "Changes to GST 18% on 1 Apr 2027" if scheduled.
- **Missing classification** → amber banner on the item + badge in the Items grid. A PO with that item can be saved as a draft but **not issued** ("Pick a tax classification for 2 items before issuing").
- **HSN too short** (below the workspace minimum) → amber note on the item and the classification.
- Items grid: new columns **HSN** and **Tax classification**, filterable (incl. "Missing").

### 3.3 Rate-change review (modal, on saving a history row)
- Header: "HSN 6913 · GST 12% → GST 5% from 22 Sep 2025".
- **Items:** "18 items will use GST 5% from 22 Sep 2025."
- **Future date:** "Nothing changes until 22 Sep. Documents from that date use GST 5%."
- **Past date:** list of documents **dated on/after** the effective date that used the old rate (PO no., vendor, date, status) — "These were created before the change was recorded. Check each with the vendor; posted bills are corrected with a debit/credit note (next stage)."
- **Open POs dated before** the effective date: count + "They keep their rate and get a flag — tax follows the vendor's bill."
- Buttons: *Save change* · *Back*. Ctrl/Cmd+Enter saves, Esc goes back.

### 3.4 Purchase order
- Line tax code = item's classification row in force on the **PO date** (engine, task 7). Stored on the line as a snapshot: `hsn`, `classificationId`, `taxability`, `taxCode`.
- Flag on the PO (info, not warning) when a later history row changes any line's rate: "Rate changed after this order — tax will follow the vendor's bill."
- Draft POs re-read the rate on next edit.

### 3.5 Tax settings
- Section 3 *Defaults*: **"New items start with" (tax code) is removed** — items no longer carry a tax code (default classification is parked, D5).
- New row **Minimum HSN digits**: 4 (default) · 6. Impact: "N items have a shorter HSN and will be flagged."

## 4. Interactions & business rules
- HSN: digits only, 4/6/8 long; unique among active classifications (warn if reused on an inactive one).
- Exactly one history row in force per date; two rows can't share an effective date.
- Taxable rows need an active tax code; Nil-rated / Exempt / Non-GST rows have no code.
- A row can be deleted only if it's **future** (not yet in force). Past/current rows are permanent — correct by adding a new row.
- Tax code deactivation is blocked while a current or future classification row uses it (extends Tax codes' existing "in use" check).
- Rate lookup: `rowOn(classification, date)` = latest row with `effectiveFrom ≤ date`; none → "No rate on this date" error on the line.
- Verified: editing HSN or adding a history row resets "Verified" to "Verify with CA".

**Keyboard & mouse** (added to Settings ▸ Keyboard shortcuts in the build turn)
- Grid: `/` search, ↑/↓ move, Enter open drawer, `N` new, `E` edit, Delete make inactive/delete, right-click menu (Open, Add change, Mark verified, Copy HSN, View items, Make inactive).
- Drawer: `A` add change, `V` mark verified, Esc close.
- Item picker: type to search HSN or description, ↑/↓, Enter pick, Alt+Enter create.

## 5. Settings surfaces
- **Workspace:** Tax settings ▸ Defaults ▸ *Minimum HSN digits*.
- **Configuration:** Settings ▸ Configuration ▸ Tax classifications (the list itself).
- **Terminology:** "HSN" label fixed (Indian GST); becomes "Commodity code" only if multi-region is ever enabled — noted, not built.
- **User-level:** permission `tax.classifications.edit` (add/edit/history/verify); others read-only. Not enforced in prototype.

## 6. Data model
```
TaxClassification {
  id, hsn, desc, kind: 'goods',            // 'services' when unparked
  status: 'active'|'inactive', notes,
  history: [{ id, effectiveFrom, taxability: 'taxable'|'nil'|'exempt'|'nongst', taxCode|null, addedBy, addedAt }],
  verified: { by, at } | null,
  createdAt, updatedAt
}
Item   += classificationId (required for new items; legacy null → "Missing")
PO line += hsn, classificationId, taxability, taxCode   (snapshot at PO date)
TaxSettings += hsnMinDigits: 4|6 (default 4);  − defaultItemCode (removed)
```

**Seed (Kanalora) — all "Verify with CA"**
| HSN | Description | Tax code | Items |
|---|---|---|---|
| 6913 | Ornamental ceramic articles — incense holders (finished) | GST5 (from 22 Sep 2025; GST12 before) | Sambrani holders |
| 6913 | Ceramic lid / base components | GST5 (same history) | Ceramic components |
| 3307 41 | Agarbatti, dhoop & sambrani cones | GST5 | Cones |
| 6913 | Holder + cones combo pack (taxed at holder's rate) | GST5 | Combo packs |
| 4819 | Cartons & boxes of paper/board | GST18 | Cartons |
| 4821 | Printed paper labels | GST18 | Labels |
| 4016 | Silicone/rubber components | GST18 | Silicone parts |

The three 6913 rows share an HSN only if the CA confirms; otherwise components get their own. (Uniqueness rule is per active HSN + description pair until verified.)

## 7. Persistence
Prototype: `ws.taxClassifications` in localStorage (reference-dataset pattern, `refLoad('taxClass', seed)`); item `classificationId` on the item record.

## 8. Backend-build notes
- Tables `tax_classifications`, `tax_classification_rates (classification_id, effective_from, taxability, tax_code_id, added_by, added_at)` — UNIQUE(classification_id, effective_from); `items.tax_classification_id` FK.
- `GET /tax-classifications`, `POST`, `PATCH /:id`, `POST /:id/rates` with `?preview=1` → `{ itemCount, docsOnOrAfter[], openPosBefore }`; `DELETE /:id/rates/:rateId` only when `effective_from > today`.
- Server resolves line tax: `rate_on(classification, doc_date)`; snapshot on line; never re-read after posting.
- Issue guard: PO can't be issued with an item lacking a classification or a rate on the PO date.
- Nightly job not needed — resolution is by date at read time.

### Security checklist
- No PII. Financially sensitive: every create/edit/rate row/verify is an audit event (`tax_classification.*`), with actor + before/after.
- Permission `tax.classifications.edit`; tenant-scoped; nothing sensitive in localStorage beyond workspace config.

### Decisions & deferred-to-backend
- D1–D7 above. Parked: RCM / blocked-ITC flags, default classification + bulk assign, SAC/services, imports, item override.
- GSTR-1 HSN summary will group by line snapshot `hsn` (sales stage).

## 9. Success criteria
- Every seed item shows its classification, HSN and current rate; none "Missing".
- Adding "GST18 from 1 Apr 2027" to HSN 4819 shows "Next change" in the grid and the scheduled note on carton items; nothing else changes today.
- Adding a past-dated row lists POs dated on/after it in the review.
- A new item without a classification blocks issuing a PO that uses it.
- Category and "New items start with" tax code no longer exist anywhere.

## 10. Open questions
1. ~~OK to remove **"New items start with"** now?~~ **Resolved 2026-10-15: removed** (built ahead of the page). Default classification for new items stays parked (D5).
2. Components and finished holders — one 6913 classification or two separate rows (for reporting)?
