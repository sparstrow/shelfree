# Customer profile page — `designs/erp/Shelfree App.dc.html`

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

New fields on the **Customer** record (`lib/shelfree-data.js` → `seedCustomers()`):

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
