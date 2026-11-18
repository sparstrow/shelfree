# Vendor profile page — `prototype/designs/erp/Shelfree App.dc.html`

In-app full-page screen inside the ERP shell. The purchasing mirror of the
Customer profile (`docs/customer-page/README.md`): **Vendors grid → drawer
(quick peek) → full-page vendor tab**.

Tier: **Starter base** (ungated, on). Tiers are parked (CLAUDE.md, 2026-09-19);
likely Growth candidates for the later pass: Performance, Purchase budget.

## Overview

A page for one vendor in its own workspace tab. Ten sub-tabs cover the whole
supply relationship: what we owe, who to call, what they supply, every PO and
goods receipt, blocking, and delivery/quality performance. Every figure is
**derived** from live purchase orders and receipts — nothing new is stored
except contacts, GSTIN, address fields and the blocked flag on the vendor.

## Screens & states

- **Entry points** (all → `openVendorInNewTab(no)`, new tab at
  `module:'purchasing', page:'Vendor', selNo, pinnedNo`): double-click a Vendors
  row, Enter on the active row, row menu → *Open in new tab*, drawer
  **Open full profile** button (new), and a vendor reference on the Notes page.
- **Header**: back, vendor no chip, name (input while editing), status pill
  (Active / Blocked), *Blocked · all* or *Payments blocked* badge, *Subcontractor*
  badge when `subInfo.sub`, meta `category · town · terms`. Actions: Delete,
  **New purchase order** (pre-fills vendor + purchase person; disabled by toast
  when blocked for all), **Edit** → Cancel / Save.
- **KPI strip** (Overview tab only — hidden on other tabs to give them the space): Balance · Due now (overdue sub-line) · Open orders (value still
  to receive, count, late count) · On-time delivery %.
- **Sub-tabs** (`vendTab`):
  1. **Overview** — Details (category, terms, method, purchase person, purchase
     budget editable; vendor since / last order / open orders read-only) · Supply
     card (item counts; subcontract operations, work centre, cost, quoted lead)
     · Recent activity.
  2. **Address & payment** (renamed from *Contact & address*, 2026-10-17) — address lines, city, state,
     PIN, country, terms, payment method (editable); currency, vendor since read-only.
  3. **Items supplied** — union of: items whose preferred vendor is this vendor
     (item master), rows on the vendor's price list (Vendor Purchase Items), and
     anything ordered from it before. Unit cost, lead time, last ordered, source
     pill. Row → item page (new tab). *Manage price list* → Vendor Purchase Items.
  4. **Purchase orders** — every PO for the vendor, newest first; filter chips
     All / Open / Received & closed / Cancelled with counts; received-progress
     bar; late flag; **Receive** button on receivable orders → `newPRFromPO`
     (draft GRN with outstanding qty). Row → PO editor.
  5. **Purchase receipts** — every GRN; chips All / Draft / Posted / Cancelled;
     vendor challan no, received, rejected (red), value, status. Row → receipt
     editor; PO chip → PO editor.
  6. **Payables & blocking** — Not yet due / Due now / Overdue bars from the
     vendor's running balances, *Received, not yet billed* (posted receipts on
     non-Closed POs), terms/method/currency · **Blocking** radio (Not blocked /
     Block payments / Block all) · **Purchase budget** committed vs budget bar.
  7. **Performance** — delivery record (each posted receipt vs PO expected date,
     days early/late) · scorecard (on-time, avg lead = order→receipt, quoted
     lead, units received/rejected, rejection %, late open orders) · quality
     log (every rejected line with reason).
  8. **Notes & activity** — shared append-only notes block (`vendor` entity) +
     derived activity (added, last PO, last receipt, rejections, late orders,
     blocked).
  9. **Documents** — empty state (no file storage in the prototype).
  10. **Contacts** — add / edit / delete / *Make primary*; Enter saves the form.
     *(2026-09-24)* **Add contact** opens the shared contact picker (search People ▸ Contacts, or "Create …" quick-create) and links the person; the edit form then edits the link's role plus the shared name/phone/email (with a "shared by N records" note). The trash button is now **Unlink** — the person stays in Contacts. Clicking a name opens it in People ▸ Contacts; an "Also on N" pill marks shared contacts. Editing the vendor's Contact person / Phone / Email boxes writes to the primary linked contact.
- **Empty states** per table (no rows vs. no rows in this filter) and a
  **missing** state if the pinned vendor is deleted.

- **In-place edit (2026-10-17):** *Edit* never moves a field. Overview ▸ Details, Overview ▸ Tax and
  Address & payment each render one row list (`detailRows`, `taxRowsA`/`taxRowsB`, `addrRows` built by
  the `R()` row factory in the vendor-page VM) in the same order in view and edit; edit only swaps the
  value cell for its input/select in the same box (value text sits at the same x/y in both modes).
  Read-only rows (Supplies, Vendor since, Last order, Open orders, Currency) stay put as text. Nothing
  is edit-only: every editable field is visible in view mode (Address line 1/2, City, State, PIN are
  separate rows; GSTIN is its own row with copy; **Tax rules** = Workspace settings / Vendor-specific
  replaces the old edit-only *Use workspace settings* checkbox and the header pill). While inheriting,
  *Calculate tax* / *Round total* stay read-only in edit; picking *Vendor-specific* turns them into
  selects in place. Inline option descriptions were dropped (quiet pages). Vendor name in the header
  uses the same box in both modes.
- **Overview ▸ Tax calculation card (2026-09-26, spec `2026-09-26-vendor-tax-matching.md` §A):** pill
  *Workspace settings* / *Vendor-specific*; view mode lists *Calculate tax* + *Round total to the rupee*
  (+ *Open Tax settings* when inheriting). Edit mode: **Use workspace settings** checkbox (default on,
  shows the workspace values); unchecking reveals the two selects (prefilled from workspace, workspace
  option marked) with the chosen method's explanation. Note: applies to new purchase orders only.

## Data model

New fields on **Vendor** (`prototype/lib/shelfree-data.js → seedVendors()`):

| Field | Shape | Notes |
|---|---|---|
| `gstin` | string | 15-char GSTIN; seeded with TN state code 33. |
| `contacts[]` | `{id, contactId, role, isPrimary}` | **Links to People ▸ Contacts** (2026-09-24, `docs/contacts/`). Name/phone/email live on the contact; role + primary are per link. Flat `contact/phone/email` are a read mirror of the primary linked contact. |
| `subInfo` | `{sub, ops[], wc, cost, lead, cert}` | Existing seed argument, now actually stored on the record (was dropped by the `V()` factory). Drives the Subcontractor badge, Supply card and quoted lead time. |
| `blocked` | `'' \| 'Payment' \| 'All'` | Existing field, now editable. `vendorStatus()` → Blocked when non-empty. |
| `addr1, addr2, city, state, zip, country, paymentMethod, budgetedAmount` | existing | Now editable on the profile. |

New app state: `vendTab`, `vendEdit` (draft), `vendContactDraft`,
`vendPoFilter`, `vendPrFilter`. `datasetIdFor('purchasing','Vendor')` →
`vendors`; tab pinning survives on `Vendors` / `Vendor`.

- **Vendor tax calculation:** `taxCalcOverride: boolean` (default false) · `taxCalc: 'line'|'rate'|null` ·
  `roundTotal: boolean|null` (null while inheriting). Resolver `vendTaxCalc(v)` → `{ taxCalc, roundTotal,
  src: 'workspace'|'vendor' }`; inheriting vendors follow `ws.taxSettings` live.

## Interactions & business rules

- Derived metrics (`vendStats`): on-time = posted receipt date ≤ PO expected
  date; lead = receipt date − PO order date; rejection % = rejected ÷ (received
  + rejected); open value = Σ outstanding qty × unit cost on Issued/Partially
  received POs; committed = Σ PO subtotals excluding Draft/Cancelled.
- **Blocking**: *All* hides Receive buttons and refuses New PO / Receive with a
  toast. *Payment* is informational until vendor payments exist.
- GSTIN is validated client-side on save (format only).
- Edit writes through `vendUpdate` — same `vendors` state as the drawer's edit
  panel (`saveVendorEdit`), so one source of truth.
- Deleting the primary contact promotes the next one.

### Keyboard & mouse

| Input | Result |
|---|---|
| Double-click / Enter on a Vendors row | Open profile in a new tab |
| `[` / `]` | Previous / next tab |
| `1`–`9`, `0` | Jump to tab 1–10 |
| `E` | Edit inline |
| `N` | New purchase order for this vendor |
| Enter in contact form | Save contact |
| `Esc` | Close contact form → cancel edit → back to Vendors |

Listed in Settings ▸ General ▸ Keyboard shortcuts → "Vendor profile page".

- **Tax calculation rules:** purchase side only (never sales). Round-off account stays workspace-only.
  Saving a change toasts that it applies to new POs; existing POs keep their stamp. Checkbox is a native
  input (Space toggles, Tab order follows the card). Tier (future pass): Starter.

## Persistence

None new. Vendor edits, contacts and blocking live in in-memory `state.vendors`
(seed data — lost on reload, same as the Vendors grid today). POs, receipts,
notes and the price list keep their existing localStorage keys.

## Settings surfaces

No new settings: the page reuses workspace currency (`multiCurrency` axis),
Purchasing-department employees for the purchase person, and existing notes /
tabs / recents preferences. Terminology ("Vendor") follows the existing label.

## Backend-build notes

- **Entities**: `vendor` gains `gstin`, `blocked` (enum), address columns;
  new `vendor_contact (vendor_id, name, role, phone, email, is_primary)` with a
  partial unique index on one primary per vendor.
- **Endpoints**: `GET /vendors/{id}/profile` (header + KPIs),
  `GET /vendors/{id}/purchase-orders?status=` and `/receipts?status=`
  (paginated, newest first), `GET /vendors/{id}/items-supplied`,
  `GET /vendors/{id}/performance?from&to`, `PATCH /vendors/{id}`,
  CRUD `/vendors/{id}/contacts`.
- **Server-computed**: all KPIs/performance above — never trust the client
  scan. Payables aging must come from real vendor bills / payments / debit notes
  once purchase finance (step 2) lands; *received not billed* becomes the GRNI
  clearing balance per vendor.
- **Blocking must be enforced server-side**: `All` blocks PO issue, receipt
  posting and payments; `Payment` blocks payment runs only.
- **Validation**: GSTIN format + checksum, state code must match `state`.
- **Security gate** (`docs/security/README.md`): contacts are personal data
  (name/phone/email) → PII handling + tenant scoping; vendor edits, blocking
  changes and contact CRUD are audit events; bank details are deliberately not
  on this page (future payments slice, encrypted at rest). Nothing sensitive is
  written to localStorage.

- Backend: `vendors.tax_calc_override bool default false`, `vendors.tax_calc enum(line,rate) null`,
  `vendors.round_total bool null`; validate both set when override is true, both null otherwise. Audit
  event `vendor.tax_calc.updated` (old → new resolved method, who, when). `PATCH /vendors/:no`
  gated by vendor-edit permission.

### Decisions & deferred-to-backend

- **Items supplied reads Purchase prices (2026-10-18, phase 2).** One row per price row for this vendor (tiers and date ranges separate) plus preferred-vendor / previously-ordered items with no current price (status *No price*). Columns: Item no. · Description (+ *Preferred* chip) · UoM · From qty · Unit cost · Lead time · Valid · Last ordered · Status. Expired rows hidden behind "Show N expired" (`vendShowExpired`, in-memory). "Manage prices" opens Purchasing ▸ Purchase Prices filtered to the vendor no. Source: `shelfree.purchasePrices.v1` (see `docs/purchase-prices/`).

- **Items supplied = real items only (2026-10-17).** Item no. and Description are separate columns. Price-list rows are resolved against the item master via `vItemsLive()`: rows whose item no longer exists are dropped, and desc/UoM always come from the live item (never the stored copy). Backend: `vendor_price_list.item_id` is an FK to items (ON DELETE RESTRICT or cascade-deactivate); the API returns item desc/uom by join, not a denormalised copy.

- Built as a mirror of the Customer profile; customer-only tabs were swapped
  for purchasing equivalents (Sales prices → Items supplied, Order history →
  Purchase orders + Purchase receipts, Statement → Payables, Credit & risk →
  Blocking, Shipping addresses dropped, Performance added).
- The drawer stays; the full page is an extra action.
- Payables figures are stand-ins until vendor bills exist; labelled on screen.
- No plan gating (tiers parked).


### Contacts are shared records (2026-09-24)
Backend: replace the per-vendor contact table with the shared `contacts` + `contact_links` model in `docs/contacts/README.md`. Unlinking never deletes a contact; deleting a contact is blocked while linked.

### Supplies — goods / services / both (2026-09-26, spec §2.7 d8)
- New field `vendor.supplies` = `goods` (default) | `services` | `both`. Shown in the grid (Supplies column,
  filterable), drawer and profile facts, and edited in the drawer's edit panel.
- Default views: **All vendors · Suppliers** (Goods, Goods + services) **· Service providers** (Services,
  Goods + services).
- Services-only vendors are left out of purchase-order vendor pickers (a PO already on one keeps it).
- Seed: V00005 TN Express Cargo and V00006 Ambattur Logistics Park (3PL for CHN-DC, SAC 9967 @ 18%) = services.
- Deferred to vendor bills (task 8): default expense account, default tax code, recurring bill, hiding
  PO-only fields on services vendors' profile.
- Backend: `vendors.supplies` enum NOT NULL default 'goods'; PO create rejects a services-only vendor.

## GST registration (2026-09-28 · spec `docs/superpowers/specs/2026-09-28-vendor-gst-registration.md`)
**Tier note (parked):** Starter base, always on.

### Screens & states
- Overview ▸ **Tax** card (was *Tax calculation*): top row **GST registration** — type label, GSTIN (mono + copy) or "No GSTIN", and a one-line effect (Regular: "GST charged on purchases · credit claimed"; Composition/Unregistered: "No GST on purchases · no credit"; SEZ/Overseas: "Import — tax paid at customs"). GSTIN-state ≠ address-state shows an amber note when Tax settings ▸ *GSTIN state mismatch warning* is on.
- *Calculate tax / Round total* rows only show for Regular (nothing to calculate otherwise).
- Edit: **GST registration** select (5 types, "(default)" marks Registered — regular; the *New vendors start as* setting was removed 2026-10-15 — vendor creation templates will replace it) with the type's explanation under it → GSTIN field only for Regular / Composition / SEZ. Switching to Unregistered/Overseas shows "The GSTIN … will be removed when you save".
- **GSTIN moved out of Address & payment** (then *Contact & address*) — the Tax card is its one home.
- Type change with open POs → inline amber review "N open purchase orders use X. They switch to Y the next time they are edited or received. Posted receipts and bills keep their tax." → *Save anyway* / *Keep editing*.
- Notes & activity lists "GST registration changed · Regular → Composition" / "GSTIN updated".
- Vendors grid: new **GST registration** column (shown) + **GSTIN** column (hidden, mono); both filterable. Drawer facts add *GST registration* (type · GSTIN).

### Data model
- `gstRegType: 'regular'|'composition'|'unregistered'|'sez'|'overseas'` (default `regular`; legacy records without it → `regular` if GSTIN, else `unregistered` — `vendGstType()`).
- `gstin` — required for regular/composition/sez; cleared for unregistered/overseas.
- `gstRegLog[]` `{ at, from, to, gstinFrom, gstinTo, openPOs, by }` — prototype mirror of the audit event, feeds the activity list.
- Seed: V00003 Sri Annamalai Packaging = **composition**, V00004 Vellore Silicone Components = **unregistered** (no GSTIN); all others regular.

### Interactions & business rules
- Validation (`vgCheck`): GSTIN required + 15-char pattern + known state code for regular/composition/sez (**blocks**); overseas with country India (**blocks**). Warnings (saveable): another vendor has the same GSTIN; GSTIN state ≠ address state (if mismatch warning on); check character fails (only when the GSTIN was changed — seed GSTINs are fictitious).
- Tax state = GSTIN digits 1–2, else address state (`vendTaxState`).
- Composition can't be detected from a GSTIN — the user picks it.
- No new keyboard shortcuts: the select uses native keys inside the existing edit flow (E / Ctrl+Enter / Esc).

### Backend-build notes
- `vendors.gst_reg_type` enum NOT NULL default 'regular'; CHECK gstin NOT NULL for regular/composition/sez and NULL for unregistered/overseas; overseas ⇒ country ≠ IN. `vendors.tax_state_code` (derived, FK gst_states).
- `PATCH /vendors/:no { gstRegType, gstin }` with `?preview=1` returning `{ impact: { openPoCount } }` for the review line; server re-validates.
- Audit event `vendor.gst_registration.updated` (old → new type + GSTIN, actor, time, open-PO count). Permission `vendors.tax.edit` (not enforced in prototype).
- Later: GSTN public search on GSTIN entry (legal name, taxpayer type, cancelled status) + periodic re-check job.

#### Decisions & deferred-to-backend
- Dropdown instead of a "Taxable" checkbox — the reason drives credit and returns reporting.
- Documents snapshot the type instead of keeping a dated history on the vendor.
- Reverse charge for services (e.g. GTA) belongs to the service's tax classification (next spec), not the vendor type — except Overseas services.
- SEZ/Overseas import flow (bill of entry, customs duty) deferred; the types exist so the list is complete.
- GST registration column is shown by default (the seed has mixed types); spec's "hide when all Regular" deferred to per-workspace column defaults.


## One home for people (2026-10-17)

Primary contact / Phone / Email were removed from *Contact & address* (now **Address & payment**) — they duplicated the **Contacts** tab. People are managed only on the Contacts tab; flat `contact/phone/email` stay a read mirror of the primary link (`cntMirror`). Backend: `PATCH /vendors/:id` must reject direct writes to those fields — they derive from the primary `vendor_contacts` link.

## React app — Vendors list (2026-11-17)

- **URLs**: `/purchasing/vendors` (`?sel=` opens the preview drawer on arrival); `/purchasing/vendors/$no` (renders `PlaceholderPage` until the full vendor profile page is ported; `/purchasing/vendors/new` uses the same placeholder).
- **Files**:
  - `apps/web/src/domain/vendor.ts` + `vendor.test.ts` — pure helpers `vendorStatus`, `vendorSuppliesLabel`, `vendorLocation`.
  - `apps/web/src/lib/privacy.ts` + `privacy.test.ts` — `maskPhone` (`•••• ` + last 4 digits, `''` when no digits).
  - `apps/web/src/features/purchasing/vendors/dataset.ts` — `vendorDataset({ vendors, employees })` (17 columns, 5 views, 16 filter columns including filter-only `city`/`state`, masked `phone` column/export, full `phone` in `searchBlob`).
  - `apps/web/src/features/purchasing/vendors/VendorsPage.tsx` — `ListPage` wrapper reading via `useList` (`vendors`, `employees`, `purchaseOrders`, `purchaseReceipts`).
  - `apps/web/src/routes/purchasing/vendors/index.tsx` and `apps/web/src/routes/purchasing/vendors/$no.tsx`.
  - `apps/web/src/components/record-drawer/RecordDrawer.tsx` — added optional `tone?: 'bad'` on `DrawerStat` (`text-bad-fg` when overdue > 0) and optional `sections?: DrawerSection[]` rendered before `DETAILS` (used for the `CONTACT` section).
- **Rules & decisions**:
  - **Phone masking (PII)**: the grid cell and CSV/clipboard exports display `maskPhone(phone)` (or `—` when empty), while the preview drawer's `CONTACT` section shows the full phone number. Quick search (`searchBlob`) continues to match the full number.
  - **Referential integrity on delete (decision)**: the prototype allowed deleting any vendor; the React UI blocks deleting any vendor referenced by a purchase order or purchase receipt (`'This vendor has purchase orders or receipts — block it instead'`). Backend `DELETE /vendors/:no` must enforce the same referential integrity check (rejecting deletion when orders or receipts exist) and emit an audit event on delete. Unreferenced vendors use confirm + Undo.
  - **Out of scope for this slice**: drawer inline Edit mode (moves to the vendor profile page), the vendor profile page itself, Purchase items, and new-PO-for-vendor.
- **Tests**: Vitest unit tests in `apps/web/src/domain/vendor.test.ts` and `apps/web/src/lib/privacy.test.ts`; Playwright e2e tests in `apps/web/e2e/vendors.spec.ts` (seed count, masked phone in grid vs full phone in drawer, *Service providers* / *Overdue balance* views, blocked vs undoable delete, double-click navigation).


## React app — profile page template and Overview (2026-11-17)

The Vendor profile is the first user of the shared **Record page** template (`apps/web/src/components/record-page/RecordPage.tsx`; Customer and Item will reuse it). Only the **Overview** tab is ported; the other nine tabs render "This tab has not been moved yet".

- **URL**: `/purchasing/vendors/$no?tab=<id>` (tab ids: `overview` (default, omitted from the URL), `details`, `items`, `orders`, `receipts`, `payables`, `performance`, `notes`, `docs`, `contacts`). `/purchasing/vendors/new` still shows the placeholder (vendor creation is a later task). Entry: double-click / Enter on a Vendors row, drawer *Open full profile*.
- **Files**:
  - `components/record-page/RecordPage.tsx` — template: header (back, number pill, title, status, tags, meta), mode-stable Edit / Cancel / Save cell (inactive group `invisible` + `inert`), tab bar, edit state (`draft`, `errors`, `formError`, review-before-save), keys, loading / error / not-found, `RecordCard`, `RecordTabPending`.
  - `components/record-fields/FieldRows.tsx` + `model.ts` — the in-place label | value rows, extracted from `EditableDrawer` (which now uses it unchanged: Charges, Chart of Accounts and Contacts drawers render identically).
  - `features/purchasing/vendors/VendorProfilePage.tsx` (tabs, header, save) and `VendorOverview.tsx` (cards).
  - `domain/vendor.ts` (+ tests): `vendorStats`, `vendorSupply`, `vendorActivity`, `vendorLastOrderDate`, `vendorGstEffect`, `vendorToForm`, `normalizeVendorForm`, `validateVendorForm`, `gstinFormatError`, `vendorGstReview`, `applyVendorForm`, `vendorSavedNote`.
  - `data/schemas`: `vendor.gstRegLog[]` (optional) — mirror of the audit event, feeds Recent activity.
  - `e2e/vendor-profile.spec.ts`.
- **Overview cards** (same as the prototype): KPI strip (Balance · Due now · Open orders · On-time delivery); **Details** (Category, Supplies*, Payment terms, Payment method, Purchase person, Purchase budget, Vendor since*, Last order*, Open orders*; *read-only text rows that stay put in edit); **Supply** (item counts; subcontract operations / work centre / cost / quoted lead; buttons to the Items supplied and Purchase orders tabs); **Tax** (GST registration, GSTIN with copy, effect line, Tax rules, Calculate tax, Round total — Calculate / Round only for Regular vendors, and read-only text in edit until *Vendor-specific* is chosen); **Recent activity**. Contact person / phone / email are **not** edited here ("One home for people" — they belong to the Contacts tab).
- **Edit in place**: Edit swaps each value for its control in the same 32 px box (e2e asserts the same x / y / height). The title is an input in the same box; the GSTIN row appears or disappears only when the chosen registration type needs it.
- **Keyboard** (to be listed in Settings ▸ General ▸ Keyboard shortcuts → "Vendor profile page" when that page is ported — until then this table is the catalogue):

  | Key | Result |
  |---|---|
  | `[` / `]` | Previous / next tab |
  | `1`–`9`, `0` | Jump to tab 1–10 |
  | `E` | Edit |
  | `Ctrl/Cmd+S` | Save changes (also from inside a field; confirms a pending "Save anyway") |
  | `Esc` | Cancel edit; otherwise back to Vendors with the row selected |

  None of these fire while typing in a field, except `Esc` and `Ctrl/Cmd+S` while editing. Shortcuts are also on the buttons' tooltips.
- **Rules** (pure, in `domain/vendor.ts`): name required; budget ≥ 0; GSTIN required for Regular / Composition / SEZ with the 15-character pattern and a known state code (cleared on save for Unregistered / Overseas); Overseas with country India is refused. Changing the registration type while Draft / Issued / Part-received orders exist shows the amber review ("N open purchase orders use X…") with *Save anyway* / *Keep editing*. Saving appends a `gstRegLog` entry when the type or GSTIN changed; toast: "Vendor updated" + "now composition — applies to new purchase orders" / "new tax calculation applies to new purchase orders". Vendor-specific tax rules are only stored for vendors that charge GST; back on *Workspace settings* the dependent rows return to the workspace values.
- **Persistence**: vendor edits go through `useUpsert('vendors')` (localStorage-backed collection today). Nothing else is stored.

### Ported vs pending

Ported: header, tabs + URL sync, shortcuts, Overview (all five cards), in-place edit, validation, GST review.
Pending: tabs 2–10 (Address & payment, Items supplied, Purchase orders, Purchase receipts, Payables & blocking, Performance, Notes & activity, Documents, Contacts); header Delete and *New purchase order* buttons (and the `N` shortcut); *Open Tax settings* button (Settings page not ported); GSTIN warnings that don't block (duplicate GSTIN on another vendor, GSTIN state ≠ address state, check-character mismatch — the mismatch setting isn't in the React settings yet); drawer inline edit stays out (moved here).

### Deliberate changes from the prototype

- The prototype's *Edit* edited contact / phone / email / address from several tabs; the React Overview edits only what it shows, and people live on the Contacts tab.
- Tax rule values are shown as the workspace's while inheriting (read-only text in edit, as before).
- The registration review also counts **Draft** orders (the prototype's `vendOpenPOs` rule), not only receivable ones.
- Esc / Back return to the list with `?sel=<no>`, so the row is selected and the drawer re-opens.

### Backend-build notes

- `PATCH /vendors/:no` with `{ name, category, paymentTerms, paymentMethod, purchasePerson, budgetedAmount, gstRegType, gstin, taxCalcOverride, taxCalc, roundTotal }` — server re-validates every rule above; rejects direct writes to contact / phone / email (derived from the primary contact link); tax fields only accepted when the registration type charges GST (clear them when override is false).
- `GET /vendors/:no/overview` (or the profile endpoint above) should return the KPI figures and Recent activity computed server-side; the React page derives them from the full order / receipt lists only because the prototype data is local. Do not trust client-computed figures.
- `?preview=1` on the PATCH returning `{ impact: { openPoCount } }` replaces the client-side review count.
- Audit event `vendor.gst_registration.updated` (old → new type + GSTIN, actor, time, open-PO count) replaces `gstRegLog`; `vendor.updated` for the other fields. Permission `vendors.edit` / `vendors.tax.edit`.
- Security gate (`docs/security/README.md`): no new PII on this tab (contact fields are not shown or edited here); GSTIN is a business identifier; nothing sensitive in localStorage beyond the existing vendor collection.

#### Decisions & deferred-to-backend

- The template owns edit state (`draft`, `errors`, `formError`) so a draft survives tab switches; saving from any tab validates the whole form and jumps to the tab holding the first error.
- Warnings that don't block saving (duplicate GSTIN etc.) are deferred until the GSTIN field gets server lookups (GSTN public search).
- Notes thread (`NotesBlock`, entity `vendor`) lives on the **Notes & activity** tab in the prototype, not on Overview, so it arrives with that tab.

## React app (2026-11-17) — Items supplied, Purchase orders, Purchase receipts, Performance

- **URLs**: `/purchasing/vendors/$no?tab=items` (key `3`), `?tab=orders` (`4`), `?tab=receipts` (`5`), `?tab=performance` (`7`).
- **Files**: `features/purchasing/vendors/tabs/VendorItemsTab.tsx`, `VendorOrdersTab.tsx`,
  `VendorReceiptsTab.tsx`, `VendorPerformanceTab.tsx`; pure rules in `domain/vendor-activity.ts`
  (+ test): `vendorItemsSupplied`, `purchasePriceStatus`, `vendorOrderGroup` / `vendorOrderRows`,
  `vendorReceiptRows`, `vendorPerformance`, `formatDeliveryDelta`; tests `e2e/vendor-tabs-b.spec.ts`.
- **Same as prototype**: read-only lists with the prototype's filter chips and counts (orders:
  All / Open / Received & closed / Cancelled — Draft, Released and Partially received count as
  Open); rows are focusable buttons that open `/purchasing/purchase-orders/<no>` and
  `/purchasing/purchase-receipts/<no>`; empty states use the prototype copy; tab badges show the
  counts. Performance: on-time %, average delivery delta, rejected quantity, late open orders.
- **Persistence**: read-only from `shelfree.v2.purchaseOrders`, `shelfree.v2.purchaseReceipts`,
  `shelfree.v2.purchasePrices`, `shelfree.v2.items`.
- **Backend**: `GET /vendors/:no/items`, `/orders?group=`, `/receipts?status=`, `/performance`
  should be computed server-side (paged, tenant-scoped, `vendors.view` + `purchasing.view`);
  the client-side derivations here are the reference implementation.

## React app (2026-11-17)

Ported four more Vendor profile tabs: **Address & payment** (`details`), **Payables & blocking** (`payables`), **Notes & activity** (`notes`), and **Documents** (`docs`).

- **URLs**: `/purchasing/vendors/$no?tab=details` (key `2`), `?tab=payables` (key `6`), `?tab=notes` (key `8`), `?tab=docs` (key `9`).
- **Files**:
  - `apps/web/src/features/purchasing/vendors/tabs/VendorDetailsTab.tsx` — Address & payment card using `RecordCard` + `FieldRows` in place (`Address line 1`, `Address line 2`, `City`, `State`, `PIN code`, `Country`, `Payment terms`, `Payment method`, plus read-only `Currency` and `Vendor since`).
  - `apps/web/src/features/purchasing/vendors/tabs/VendorPayablesTab.tsx` — **Payables** card (aging bars `Not yet due` / `Due now` / `Overdue`, `Balance`, `Received, not yet billed` GRNI, `Payment terms`, `Payment method`, `Currency`, note), **Blocking** radiogroup (`Not blocked` / `Block payments` / `Block all transactions`, saving via `useUpsert('vendors')` with prototype toast copy), and **Purchase budget** card (committed vs budget bar).
  - `apps/web/src/features/purchasing/vendors/tabs/VendorNotesTab.tsx` — full `NotesBlock` (`entityType="vendor"`) + **Activity** card (`vendorActivity` + backend audit-trail note).
  - `apps/web/src/features/purchasing/vendors/tabs/VendorDocsTab.tsx` — prototype empty state (`No documents attached`).
  - `apps/web/src/features/purchasing/vendors/VendorProfilePage.tsx` — added the four tab branches and updated `tabOfField` so address validation errors keep or jump focus to `Address & payment`.
  - `apps/web/src/domain/vendor.ts` + `vendor.test.ts` — extended `VendorForm`/`vendorToForm`/`normalizeVendorForm`/`validateVendorForm`/`applyVendorForm` with address fields + PIN code check, and added `vendorPayables`, `vendorStateOptions`, `VENDOR_BLOCK_OPTIONS`, `vendorBlocked`, `applyVendorBlocked`, `vendorBlockToast`.
  - `apps/web/e2e/vendor-tabs-a.spec.ts` — e2e coverage for tab navigation (click + number keys), Address & payment in-place edit / validation / persistence, blocking / unblocking, and adding a note.
- **Same as prototype**:
  - Address & payment shares the page's single edit draft (`E` / `Ctrl+S` / `Esc`), uses the current-GST-states dropdown (`Select state…`, sorted A–Z, legacy and `Foreign country` omitted, unrecognised saved values kept as `X (not a GST state)`), and keeps `Currency` (`Workspace default`) and `Vendor since` as read-only text rows.
  - Payables & blocking computes `Not yet due = max(0, balance - balanceDue)`, `Due now = max(0, balanceDue - overdue)`, `Overdue = overdue`, GRNI (`prValue` sum of posted receipts on non-Closed POs), and `Committed` (`poSubtotal` sum of non-Draft, non-Cancelled POs). Blocking writes `blocked: '' | 'Payment' | 'All'` immediately and shows the prototype toast (`Vendor blocked` / `Payments blocked` / `Vendor unblocked`).
  - Notes & activity uses the append-only `NotesBlock` (`Ctrl/Cmd+Enter` adds, `Enter`/`Esc` in the invalidate reason field) alongside the derived activity timeline.
  - Documents renders the prototype's empty state with no upload control.
- **Deliberate changes**:
  - Added client-side 6-digit PIN code validation (`A PIN code has 6 digits.`) when `country` is India (or blank), matching `Shelfree App.dc.html` GST registration postal validation while allowing non-Indian postal codes.
  - `validateVendorForm` validates `country` from the live edit draft rather than the saved vendor so changing `country` on Address & payment and `gstRegType: 'overseas'` on Overview works in a single edit session; `tabOfField` routes address field errors to `details`.
  - `Currency` on Address & payment displays `Workspace default` directly because the `multiCurrency` workspace axis is not yet in `apps/web/src/data/api/settings.ts` (whereas the Payables card still displays `vendor.currency || 'INR'`, matching the prototype).
  - Vendor bills and payment runs do not exist yet, so payables aging uses the vendor record's running `balance` / `balanceDue` / `overdue` fields and GRNI uses posted receipts on non-`Closed` POs, as noted inline on the card.
- **Persistence**: `shelfree.v2.vendors` (address/payment fields and `blocked` state via `useUpsert('vendors')`) and `shelfree.v2.notes` (via `NotesBlock`); payables/budget figures read `shelfree.v2.purchaseOrders` and `shelfree.v2.purchaseReceipts`.
- **Backend rules & security gate (`docs/security/README.md`)**:
  - `PATCH /vendors/:no` must accept `addr1`, `addr2`, `city`, `state`, `zip`, `country`, re-validate the 6-digit PIN for India (`IN`) and valid non-retired GST state, reject direct writes to `contact`/`phone`/`email`, and emit `vendor.updated`.
  - Blocking updates (`PATCH /vendors/:no` or `POST /vendors/:no/block`) require `vendors.block` / `vendors.edit`, must emit `vendor.blocked.updated` (before/after, actor, timestamp), and must be enforced server-side (`All` rejects PO issue, receipt posting, and payment runs; `Payment` rejects payment runs).
  - `GET /vendors/:no/payables` must compute aging buckets from vendor bills/payments/debit notes, GRNI from the clearing ledger, and budget commitment server-side once purchase finance lands.
  - Notes remain append-only (`POST /notes`, one-way `POST /notes/:id/invalidate`, no `DELETE`); free-text notes and vendor addresses are covered under tenant isolation and data-subject export.
- **Tests**: Vitest (`apps/web/src/domain/vendor.test.ts`); Playwright (`apps/web/e2e/vendor-tabs-a.spec.ts`).
