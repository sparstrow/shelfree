# Customer profile page — `prototype/designs/erp/Shelfree App.dc.html`

In-app full-page screen inside the ERP shell (not a separate file). Tier-3 surface
of the customer record funnel: **Customers grid → drawer (quick peek) → full-page
customer tab**. Mirrors the Item detail page pattern (`docs/item-page/README.md`).

Tier: **Starter base** (ungated). Every business needs to inspect a customer.
Default on. Only the *Sales prices* tab's content is gated — by the existing
Growth axis `customerPricing`.

Spec: [`../superpowers/specs/2026-08-14-customer-profile-page.md`](../superpowers/specs/2026-08-14-customer-profile-page.md).

## Overview

A read-first page for one customer, opened in its own workspace tab so several
customers (and the list) can stay open side by side. Ten sub-tabs cover the
commercial relationship: balances, contact/billing facts, agreed prices, order &
invoice history, aging, ship-to addresses, notes/activity, documents, the people
at the account, and credit risk.

## Screens & states

- **Entry points** (all → `openCustomerInNewTab(no)`, a new workspace tab at
  `module:'sales', page:'Customer', selNo:no, pinnedNo:no`):
  - **Double-click** a Customers grid row (`r.open`, customers dataset).
  - Customers drawer **"Open full profile"** button (`selTab`).
  - Row **context menu → Open in new tab** (`rowCtxOpenTab`).
  - **Enter** on the active Customers grid row (`openView`).
- The **drawer stays** exactly as before (quick peek: balances, contact, details,
  pricing block); the full page is an additional action, not a replacement.
- **Header**: back button (→ Customers list, row still selected), customer no
  (mono chip), name (becomes a text input while editing), status pill, a
  **Credit hold** badge when held, and a meta line `contact · town · terms`.
  Actions: **Delete**, **Edit** (primary → switches the header buttons to
  **Cancel** / **Save** and opens inline edit fields on the Overview and
  Billing & address tabs, in place — no navigation away from the page).
- **KPI strip** (Overview tab only — hidden on other tabs to give them the space): Balance / Credit limit / Overdue / Open orders.
- **Sub-tabs** (`custTab` state, default `overview`; underline style, content
  cross-fades):
  1. **Overview** — Details fact grid (Payment terms / Credit limit / Sales rep
     become inputs while editing; Last order / Open orders / Customer since stay
     read-only, computed) + Pricing card (eligibility pill, "Own agreed prices"
     switch when mode = `selected`, price count, *Open in Sales prices*) +
     Recent activity.
  2. **Billing & address** (renamed from *Contact & billing*, 2026-10-17) — billing address
     (city/state), GSTIN, payment terms all become inputs while editing;
     currency stays read-only (reads "Workspace default" unless the
     `multiCurrency` axis is on).
  3. **Sales prices** — the real Sales Prices customer grid (`vm.sp.custRows`,
     same inline-editable cells, qty tiers, effective dates, status, row context
     menu), with the customer filter **pinned** to this customer. Actions: *New
     price* (`cpNewRow`), *Open in Sales prices* (`cpGoToCustomer`). When the
     `customerPricing` axis is off the tab shows an explanatory off-state.
  4. **Order history** — every sales order and invoice for this customer
     (matched on `customer === c.name`, the current seed shape), newest first;
     status pill, amount (order amount resolved through `cpResolve`), row opens
     the relevant list page. Labeled as a stand-in until sales order/invoice
     documents exist.
  5. **Statement & aging** — aging buckets (Current / 1–30 / 31–60 / 61–90 /
     90+) computed from unpaid invoices' due dates, plus unpaid total and
     invoice count. Display shell — no real ledger.
  6. **Shipping addresses** — ship-to list with add / edit / delete and
     *Make default*; inline draft form.
  7. **Notes & activity** — add/delete freeform notes (stamped with today's
     date and the current user) + a derived activity list (account opened, last
     order, agreed prices on file, credit hold).
  8. **Documents** — empty state only; no file storage in the prototype.
  9. **Contacts** — people at the account with add / edit / delete and
     *(2026-09-24)* **Add contact** opens the shared contact picker (search People ▸ Contacts, or "Create …" quick-create) and links the person; the edit form then edits the link's role plus the shared name/phone/email (with a "shared by N records" note). The trash button is now **Unlink** — the person stays in Contacts. Clicking a name opens it in People ▸ Contacts; an "Also on N" pill marks shared contacts. Editing the customer's Contact person / Phone / Email boxes writes to the primary linked contact.
     *Make primary*.
  10. **Credit & risk** — credit facts (limit, balance, headroom, overdue,
      terms) + a **Credit hold** switch and a risk note.
- **Missing state** (`cpgMissing`): if the pinned customer no longer exists, the
  page shows a "no longer available" panel with a Back button.

## Data model

New fields on the **Customer** record (`prototype/lib/shelfree-data.js` → `seedCustomers()`):

| Field | Shape | Notes |
|---|---|---|
| `gstin` | string | Tamil Nadu GSTIN (state code 33); seeded deterministically. |
| `creditHold` | boolean | Seeded `true` for `status === 'On hold'`. |
| `riskNote` | string | Seeded when the account carries an overdue balance. |
| `shipTo[]` | `{id, label, address, isDefault}` | Always at least one ("Main store" from `city`/`state`). |
| `contacts[]` | `{id, contactId, role, isPrimary}` | **Links to People ▸ Contacts** (2026-09-24, `docs/contacts/`). Name/phone/email live on the contact; role + primary are per link. Flat `contact/phone/email` are a read mirror of the primary linked contact. |
| `notes[]` | `{id, at, by, text}` | Seeded for two customers; empty elsewhere. |

New app state: `custTab` (active sub-tab), `custNoteText`, `custShipDraft`,
`custContactDraft`, `custEdit` (null, or the in-progress edit draft:
`{name, contact, phone, email, city, state, gstin, terms, creditLimit,
salesRep}` — mirrors the drawer's `cc*` fields but scoped to the profile page so
both edit paths can't collide). Routing adds the sales page id `'Customer'` (not
in the sidebar — reachable only via the entry points above). `datasetIdFor` maps
`sales/Customer` → the `customers` dataset; a tab's `pinnedNo` survives while its
page is `Customers` **or** `Customer` (`mirrorActiveTab`). The tab label shows the
customer no.

`state.orders` and `state.invoices` are now loaded from `seedOrders()` /
`seedInvoices()` (previously unused by the app) to feed the Order history and
Statement tabs.

## Interactions & business rules

- Opening a customer always opens (or reuses) a **new tab**; the list tab stays
  intact, and `recentsPush` records the visit.
- Back / **Esc** returns to Sales ▸ Customers with the customer still selected.
  Esc cancels an in-progress inline edit first, then closes an open ship-to /
  contact draft form.
- **Core fields are now edited in place on this page** (`custEditStart` /
  `custEditSet` / `custEditSave` / `custEditCancel`) — Edit no longer navigates
  to the Customers list. The drawer's own edit panel (`startPanelEdit`) is
  unchanged and still used when editing from the Customers grid directly; both
  paths write through the same `custUpdate`/`customers` state, so there's one
  source of truth even though there are two entry points. Sub-records (ship-to,
  contacts, notes, credit hold) continue to edit in place, since they exist
  nowhere else.
- Deleting the last ship-to/contact promotes the next one to
  default/primary automatically; `isDefault` / `isPrimary` are mutually
  exclusive within a customer.
- The Sales prices tab writes through the same `customerPrices` handlers as the
  Sales Prices page — one code path, no divergent editor.
- Order/invoice matching is **by customer name** today because that's the seed
  shape; the backend must key on customer id.

### Keyboard & mouse

| Input | Result |
|---|---|
| Double-click / Enter on a Customers row | Open the profile in a new tab |
| `[` / `]` | Previous / next tab |
| `1`–`9`, `0` | Jump to tab 1–10 |
| `E` | Edit the customer inline on this page |
| `Esc` | Cancel an in-progress edit, else close the open draft form, else back to Customers |

All of these are listed in Settings ▸ General ▸ Keyboard shortcuts
(`shortcutGroups()` → "Customer profile page").

## Persistence

None new. `custTab`, the draft forms and tab pinning are in-memory. Ship-to
addresses, contacts, notes and the credit-hold flag are written into
`state.customers` (seed data, in-memory) via `custUpdate` — they do **not**
survive a reload, matching the existing customers dataset behaviour. Customer
price rows persist through the existing `cpPersist` localStorage key.

## Backend-build notes

- **New entities**: `customer_ship_to` (customer_id, label, address,
  is_default), `customer_contact` (customer_id, name, role, phone, email,
  is_primary), and either `customer_note` (customer_id, author_id, body,
  created_at) or a generic `activity_log` keyed by entity type + id. Exactly
  one default ship-to and one primary contact per customer (partial unique
  index).
- `customers` gains `gstin` (validate the 15-char GSTIN format server-side,
  state code must match the billing state), `credit_hold` (boolean) and
  `risk_note` (text).
- **Order history** must be `GET /customers/{id}/documents` (orders + invoices,
  keyed on customer id, paginated, newest first) — not a client scan, and not
  name matching.
- **Statement & aging** needs a real AR ledger (invoices, payments, credit
  notes, part-payments) with server-computed aging buckets as of a date. The
  current buckets are derived from unpaid invoice due dates only.
- **Order amounts** are computed here through `cpResolve`; the server's pricing
  function owns this, and posted documents must store their captured line
  prices rather than recomputing.
- **Credit hold** must be enforced where orders are confirmed (block
  confirmation, not just badge it) and is audit-relevant, as is every
  ship-to/contact/note change (security gate: `docs/security/README.md`).
- **Documents tab** needs object storage + an `attachment` entity (entity type,
  entity id, filename, mime, size, uploaded_by, virus-scan status) with signed
  URLs; nothing is uploadable in the prototype.

### Decisions & deferred-to-backend

- Agreed-prices table: Item no. and Description are separate columns; rows for items/customers no longer in the masters are ignored (see `docs/sales-pricing/`).

- **Drawer kept, page added** (user decision): the drawer stays the fast peek;
  the profile is opened explicitly. No duplicated content beyond the KPI/details
  facts, which are cheap and expected in both.
- **Sales prices tab embeds the real grid** (user decision) rather than a
  compact read-only table — one editor, full power (tiers, dates, inline edit).
  The page-level toolbar (search, export, saved views) stays on the Sales Prices
  page; the tab shows the grid plus *New price* and *Open in Sales prices*.
- **Core fields are inline-editable on the profile page** (user decision,
  supersedes the original read-first design): Edit toggles an in-page draft
  covering Overview (terms, credit limit, sales rep) and Billing & address
  (city, state, GSTIN, terms); Save/Cancel live in the
  header. The Customers-grid drawer keeps its own separate edit panel
  (`startPanelEdit`) for quick edits without opening the full page — both write
  through `custUpdate`, so there's no divergent data path, just two entry points.
- **Order history / Statement are stand-ins** and say so on screen; they become
  real when Sales Orders/Invoices and the AR ledger are built.
- **No plan gating added.** All ten tabs are Starter base. If tiering is wanted
  later, the natural Growth candidates are Statement & aging and Documents; that
  decision is deliberately deferred per the build-order rule in `CLAUDE.md`.

## Notes (2026-09-20)

The **Notes & activity** tab's notes list is now the app-wide append-only notes
thread. Two changes from what shipped here originally: the per-note delete
button is gone (notes can never be deleted or edited by anyone — they can only
be marked invalid, once, with a permanent reason, by the author or an
Admin/Manager), and notes no longer live on `customer.notes[]` but in the
global notes collection keyed by `{entityType:'customer', entityNo:<CUS-…>}`.
The activity timeline is unchanged. See [`../notes/README.md`](../notes/README.md).


### Contacts are shared records (2026-09-24)
Backend: replace the per-customer contact table with the shared `contacts` + `contact_links` model in `docs/contacts/README.md`. Unlinking never deletes a contact; deleting a contact is blocked while linked.

## Edit in place (2026-10-17)

Per CLAUDE.md "Edit in place": Overview ▸ Details (`detailRows`) and Billing & address (`billingRows`) render one row list in the same order in view and edit (shared `ipRowFactory()`); edit swaps only the value cell. Read-only rows (Last order, Open orders, Customer since, Currency) stay as text. *Billing address* is split into City + State rows; GSTIN row has copy in view. Header name uses the same box in both modes and the Delete/Edit vs Cancel/Save groups share one grid cell (`ipModeVM()`), so the page never shifts. No data-model change.


## One home for people (2026-10-17)

Primary contact / Phone / Email were removed from *Contact & billing* (now **Billing & address**) — they duplicated the **Contacts** tab and let users edit the flat `contact/phone/email` fields independently of the linked contact. People are managed only on the Contacts tab; the flat fields stay a read mirror of the primary link (`cntMirror`) for the header meta, grid, drawer and documents. Backend: `PATCH /customers/:id` must reject direct writes to contact/phone/email — they derive from the primary `customer_contacts` link.

## React app — Customers list (2026-11-17)

- **URLs**: `/sales/customers` (`?sel=` opens the preview drawer on arrival); `/sales/customers/$no` (renders `PlaceholderPage` until the full customer profile page is ported; `/sales/customers/new` uses the same placeholder).
- **Files**:
  - `apps/web/src/data/schemas/index.ts` — full `customerSchema` (`z.object`) with `CUSTOMER_STATUSES` (`Active | On hold | Prospect`), `shipTo[]`, `contacts[]` (`contactLinkSchema`), `notes[]`, and all scalar fields.
  - `apps/web/src/domain/customer.ts` + `customer.test.ts` — pure helpers `customerStatus`, `customerLocation`, `customerDeleteBlockedReason`.
  - `apps/web/src/features/sales/customers/dataset.ts` — `customerDataset({ customers, employees })` (12 columns matching the prototype's widths/visibility/aggregates, 2 views `All customers` and `On hold`, 11 filter columns including filter-only `city`/`state`, masked `phone` column/export, full `phone` in `searchBlob`).
  - `apps/web/src/features/sales/customers/CustomersPage.tsx` — `ListPage` wrapper reading via `useList` (`customers`, `employees`), preview drawer (`Balance`, `Credit limit`, `Overdue` with `bad` tone when > 0, `CONTACT` section, `DETAILS` facts, and `NotesBlock` with `entityType="customer"`).
  - `apps/web/src/routes/sales/customers/index.tsx` and `apps/web/src/routes/sales/customers/$no.tsx`.
- **Rules & decisions**:
  - **Phone masking (PII)**: the grid cell and CSV/clipboard exports display `maskPhone(phone)` (or `—` when empty), while the preview drawer's `CONTACT` section shows the full phone number. Quick search (`searchBlob`) continues to match the full number.
  - **Sales rep lookup**: `salesRep` stores an employee id and displays the employee's name (from `useList('employees')`, `—` when none).
  - **Referential/balance integrity on delete (decision)**: the prototype allowed deleting any customer; the React UI blocks deleting any customer with `openOrders > 0` or non-zero `balance` (`'This customer has open orders or a balance — put it on hold instead'`). Backend `DELETE /customers/:no` must enforce this check (rejecting deletion when open orders or a non-zero balance exist) and emit an audit event on delete. Idle customers use confirm + Undo.
  - **Out of scope for this slice**: drawer inline Edit mode, the customer profile page, customer-specific sales prices in the drawer, and sales orders.
- **Tests**: Vitest unit tests in `apps/web/src/domain/customer.test.ts` and `apps/web/src/data/schemas/seed.test.ts`; Playwright e2e tests in `apps/web/e2e/customers.spec.ts` (seed count, masked phone in grid vs full phone in drawer, *On hold* view, blocked vs undoable delete, double-click navigation, and notes thread in preview).

## React app (2026-11-17)

The Customer profile is built on the shared **Record page** template (`apps/web/src/components/record-page/RecordPage.tsx`) with all 10 prototype tabs in prototype order. Eight tabs are ported; *Sales prices* and *Contacts* render `RecordTabPending` ("This tab has not been moved yet").

- **URL**: `/sales/customers/$no?tab=<id>` (tab ids in order: `overview` (default, omitted from URL), `details` (*Billing & address*), `prices` (*Sales prices*, pending), `orders` (*Order history*), `statement` (*Statement & aging*), `shipping` (*Shipping addresses*), `notes` (*Notes & activity*), `docs` (*Documents*), `contacts` (*Contacts*, pending), `credit` (*Credit & risk*)). `/sales/customers/new` remains `PlaceholderPage` ("New customer").
- **Files**:
  - `apps/web/src/data/schemas/index.ts` — `SALES_ORDER_STATUSES` (`Open | Released | Shipped | Invoiced`), `salesOrderLineSchema` (`[itemNo, qty]`), `salesOrderSchema`, `SALES_INVOICE_STATUSES` (`Draft | Open | Overdue | Paid`), `salesInvoiceSchema`.
  - `apps/web/src/data/api/index.ts` — `salesOrders` and `salesInvoices` read collections (for this profile page; Sales lists come later).
  - `apps/web/src/domain/customer.ts` + `customer.test.ts` — pure helpers: `customerKpis`, `customerActivity`, `customerOrderTotal`, `customerDocuments`, `customerDocStatusTone`, `customerAging`, `customerToForm`, `normalizeCustomerForm`, `validateCustomerForm`, `applyCustomerForm`, `validateCustomerShipTo`, `upsertCustomerShipTo`, `deleteCustomerShipTo`, `setDefaultCustomerShipTo`, `toggleCustomerCreditHold`.
  - `apps/web/src/features/sales/customers/CustomerProfilePage.tsx` + `customer-tabs/CustomerOverviewTab.tsx`, `CustomerDetailsTab.tsx`, `CustomerOrdersTab.tsx`, `CustomerStatementTab.tsx`, `CustomerShippingTab.tsx`, `CustomerNotesTab.tsx`, `CustomerDocumentsTab.tsx`, `CustomerCreditTab.tsx`.
  - `apps/web/src/routes/sales/customers/$no.tsx` — `validateSearch` with `tab`, renders `CustomerProfilePage` (or `PlaceholderPage` for `new`).
  - `apps/web/e2e/customer-profile.spec.ts` + `apps/web/e2e/customers.spec.ts` (double-click assertion updated from placeholder to customer heading).
- **Same as prototype**:
  - Header: back button (`Esc` / Back returns to `/sales/customers?sel=<no>`), customer no. mono pill, inline-editable name (`titleField="name"`), status pill, `Credit hold` badge when held, meta line `contact · city · terms`, mode-stable Edit / Cancel / Save cell.
  - All 10 sub-tabs in exact prototype order with keyboard shortcuts (`[` / `]`, `1`–`9` / `0`, `E`, `Ctrl/Cmd+S`, `Esc`).
  - Overview KPI strip (Balance, Credit limit, Overdue, Open orders — Overview tab only), Details card (`terms`, `creditLimit`, `salesRep` editable; `lastOrder`, `openOrders`, `createdAt` locked), Pricing summary card, and Recent activity.
  - Billing & address (`details` tab) edits `city`, `state` (active `GST_STATES`), `gstin` (mono, copyable in view), `terms`, with read-only `currency` (`Workspace default`). People remain managed solely on the Contacts tab ("One home for people").
  - Statement & aging buckets (`Current`, `1–30 days`, `31–60 days`, `61–90 days`, `90+ days`) from unpaid invoices (`status !== 'Paid'`) relative to `todayLocal()`, plus unpaid total and invoice count.
  - Shipping addresses: add, edit, delete (auto-promoting the first remaining address to default if the default is deleted), and make default; `Esc` closes the inline draft form before returning to the list.
  - Notes & activity embeds `NotesBlock` (`entityType="customer"`) alongside the derived activity feed.
  - Documents shows the prototype's empty state (no upload).
  - Credit & risk shows credit facts (limit, balance, headroom, overdue, terms), risk note, and an immediate `Credit hold` switch (`role="switch"`).
- **Deliberate changes & deferred rules**:
  - **Order totals use item list price (deferred rule)**: the prototype resolved order line unit prices via `cpResolve` (agreed customer price if any, else `item.price`). Agreed prices (`customerPrices`) are not in React yet, so `customerOrderTotal` sums `item.price * qty`. Once Sales prices is ported, wire `cpResolve` before `item.price` fallback.
  - **Order history rows are plain (not linked)**: Sales Orders and Sales Invoices list/document pages are not built in React yet, so rows in *Order history* are read-only with no click navigation.
  - **Chronological sort**: *Order history* sorts by raw ISO `date` (`YYYY-MM-DD`) before formatting with `fmtDate`, fixing alphabetical month sorting in the prototype.
  - **GSTIN validation**: optional on customers (blank allowed); when non-empty, 15-character GSTIN format and valid GST state code are enforced on save (`gstinFormatError`).
  - **Pending header Delete action**: omitted from the header in this pass (matching `VendorProfilePage`; delete remains in the Customers list/drawer).
  - **Pending tabs**: *Sales prices* (`prices`) and *Contacts* (`contacts`) use `RecordTabPending`.
- **Persistence**: `shelfree.v2.customers` (profile edits, `shipTo[]`, `creditHold`), `shelfree.v2.notes` (via `NotesBlock`), `shelfree.v2.salesOrders`, `shelfree.v2.salesInvoices`, `shelfree.v2.items`, `shelfree.v2.employees` (all via `@/data/queries` → `api`).
- **Backend rules & security gate (`docs/security/README.md`)**:
  - `PATCH /customers/:no` must re-validate required `name`, `creditLimit >= 0`, and optional 15-char GSTIN format + state code; reject direct writes to flat `contact` / `phone` / `email` (derived from primary contact link); emit audit events for customer edits, `creditHold` toggles, and `shipTo` changes.
  - `GET /customers/:no/documents` and `/aging` must query by `customer_id` scoped to the authenticated tenant (never client-side name matching or unscoped scans).
  - `Credit hold` enforcement (`creditHold === true` blocking order confirmation) must run server-side when Sales Orders confirmation is implemented.
  - PII / localStorage check: no new personal-data fields introduced; phone/email are not masked on the customer record itself (per PII policy: masked in grids/exports, full on the record); no secrets in client storage (`shelfree.v2.*` holds demo data only).
- **Tests**: Vitest unit tests in `apps/web/src/domain/customer.test.ts` and `apps/web/src/data/schemas/seed.test.ts`; Playwright e2e tests in `apps/web/e2e/customer-profile.spec.ts` and `apps/web/e2e/customers.spec.ts`.

## React app — Sales prices & Contacts tabs (2026-11-17)

Wired the two remaining tabs on `/sales/customers/$no` (`?tab=prices` and `?tab=contacts`), and connected `customerOrderTotal` / `customerDocuments` to agreed customer pricing.

- **Files**:
  - `apps/web/src/features/sales/customers/customer-tabs/CustomerPricesTab.tsx`
  - `apps/web/src/features/sales/customers/customer-tabs/CustomerContactsTab.tsx`
  - `apps/web/src/features/sales/customers/CustomerProfilePage.tsx` (wired `prices` and `contacts` tabs and passed `customerPrices` into `customerDocuments`)
  - `apps/web/src/domain/customer.ts` + `customer.test.ts` (`customerOrderTotal` and `customerDocuments` resolve agreed customer prices via `resolveCustomerPrice` when pricing context is provided, falling back to `item.price`).
- **Same as prototype**:
  - *Sales prices* tab lists the customer's agreed prices (`Item no.`, `Description`, `From qty`, `Price ₹`, `vs list`, `Starts`, `Ends`, `Status`), supports inline cell editing (`CellEditor` with `Enter`/`Tab`/`Esc`), inline *New price* and *Add quantity tier* drafts (`Esc` closes draft before returning to Customers), *Remove* with Undo, eligibility status pill + *Own agreed prices* switch (`customer.pricingEligible`), and *Open in Sales prices* (`/sales/sales-prices?customer=<no>`).
  - *Contacts* tab lists linked contacts (`Name` linking to `/people/contacts?sel=<no>`, `Also on N` shared badge, `Primary` badge, `Role`, full formatted `Phone`, `Email`), links existing or newly quick-created contacts via the shared `ContactPicker`, switches primary, edits shared person fields + per-link role with the shared-edit warning and primary-mirror sync across linked customers/vendors, and unlinks without deleting from People ▸ Contacts (promoting the next link if primary was unlinked).
  - *Order history* totals resolve agreed customer prices (including quantity tiers) on `orderDate` before falling back to `item.price`.
- **Deliberate changes**:
  - *Sales prices* tab uses `DEFAULT_SALES_PRICING_SETTINGS` (`enabled: true`, `mode: 'selected'`) without a capability-axis off state (tiers parked per `CLAUDE.md`) and uses an inline draft card above the table for *New price* / *Add quantity tier* alongside *Open in Sales prices* for full `ListPage` filtering/views.
  - `CustomerOverviewTab` Pricing summary copy was left untouched in this pass.
- **Persistence**: `shelfree.v2.customerPrices`, `shelfree.v2.customers` (`pricingEligible`, `contacts[]`, and mirrored `contact`/`phone`/`email`), `shelfree.v2.contacts`, `shelfree.v2.vendors` (mirror sync on shared primary contact edits).
- **Backend rules & security gate (`docs/security/README.md`)**:
  - Customer price CRUD (`GET/POST/PATCH/DELETE /customers/:no/prices` / `/customer-prices`) and `pricingEligible` toggles must be tenant-scoped, RBAC-gated (`sales.prices.edit` / `customers.edit`), validated against date overlaps and `min_qty >= 1` / `price >= 0`, and audited.
  - Contact linking (`POST/PATCH/DELETE /customers/:no/contacts`) maps to `contact_links`, enforces single `is_primary`, tenant isolation on both sides, unlink ≠ delete, primary mirror consistency, and emits audit events on link/unlink/role/primary changes and shared contact PII edits.
  - Phone and email remain PII: masked in grids/exports, full on the profile's Contacts tab for authorized readers, and included in data-subject export/erasure.
- **Tests**: `apps/web/src/domain/customer.test.ts`, `apps/web/e2e/customer-prices-contacts.spec.ts`.
