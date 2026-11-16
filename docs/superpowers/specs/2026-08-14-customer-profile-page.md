# Spec — Customer profile (full-page)

Status: **approved and built** (2026-08-14). Implementation and the backend
contract live in [`../../customer-page/README.md`](../../customer-page/README.md).

## Problem

Customers today have only the grid drawer (quick view): contact/billing facts
capped in a scrollable side panel, plus the Pricing block. There's no room for
order history, statements, multiple contacts, shipping addresses, documents,
or notes. Mirror the existing **Item detail page** pattern (tier-3 full page,
opened in its own workspace tab) for Customers.

## Navigation model (mirrors `docs/item-page/README.md`)

- New page id `'Customer'`; dataset stays `customers` (`datasetIdFor` already
  maps `sales/Customers` → `customers`, extend it to also map `sales/Customer`).
- Entry points: drawer gets a new **"Open full profile"** button (next to
  Edit); double-click a Customers row (extend the `ds === 'items'` branch at
  the grid row's `open` handler to also handle `ds === 'customers'`); row
  context menu "Open in new tab"; Enter on the active row.
- New `openCustomerInNewTab(no)` (parallel to `openInNewTab` for items):
  `openTabAt({module:'sales', page:'Customer', selNo:no, pinnedNo:no})`,
  reset `custTab` to `'overview'`, toast "Opened customer".
- Back button → Sales ▸ Customers, row still selected in the drawer. Tab
  pinning condition (`mirrorActiveTab`) extends to keep a tab pinned while its
  page is `Customers` **or** `Customer`.
- **The drawer stays** — quick peek only, unchanged content, plus the new
  "Open full profile" button. It does not gain new tabs itself.

## Tabs (`custTab` state; underline style + cross-fade, same as Item page)

Default tab: **Overview**.

1. **Overview** — balance / credit limit / overdue strip (from today's
   drawer) + Details fact grid (contact, phone, email, payment terms, credit
   limit, sales rep, last order, open orders, customer since) + the Pricing
   block (today's eligibility badge + "Own agreed prices" toggle), moved here
   from the drawer.
2. **Contact & billing details** — billing address, tax/GSTIN, payment terms,
   credit limit, currency (only shown once `multiCurrency` axis is on).
3. **Sales prices** — embeds the real Sales Prices page (Customers view: same
   toolbar, columns, filters, export), pre-filtered to this customer. Per
   your pick: full power over a compact table, accepting the heavier "page
   inside a tab" feel.
4. **Order history** — sales orders & invoices referencing this customer,
   cross-referenced the same way the Item page lists Purchase Orders (status
   pill, date, amount; row opens that document in a new tab). Sales
   Orders/Invoices don't have full documents yet elsewhere in the app — this
   tab renders against current seed data as a stand-in.
5. **Statements / balance & aging** — running balance + aging buckets
   (current/30/60/90+); read-only summary card(s). No real AR ledger yet —
   display shell only (see Backend-build notes).
6. **Shipping addresses** — list of ship-to addresses, add/edit/delete, mark
   default. New data: customers currently have one address; needs
   `shipTo[]`.
7. **Notes & activity timeline** — freeform notes + a simple activity log
   (created, edited, price changed, order placed). New lightweight feature,
   no existing analog.
8. **Documents & attachments** — file list; empty/upload-placeholder state
   only (no file storage in this prototype).
9. **Contacts** — multiple people at the account (name, role, phone, email,
   primary flag); today's single contact becomes the seeded first entry.
10. **Credit & risk** — credit limit (existing), credit-hold toggle,
    days-overdue flag, risk notes — relevant to trade accounts (Girivalam
    stallholders, temple shops) that carry a balance.

## Scale-adaptive notes

- None of these tabs are plan-gated — this is a Starter-base page reshape.
  Only tab 3's content (customer pricing) is gated, same as today: it shows
  its existing "off" empty state when the `customerPricing` axis is off.
- Shipping addresses and Credit & risk matter more for B2B/trade accounts
  than a single retail counter sale, but stay ungated — even a one-location
  shop may ship to festival stalls or extend informal credit.

## Data model additions (prototype-only, `prototype/lib/shelfree-data.js`)

- `customer.shipTo: [{id, label, address, isDefault}]` — default `[]`.
- `customer.contacts: [{id, name, role, phone, email, isPrimary}]` — seed
  the existing single contact as entry 1.
- `customer.notes: [{id, at, by, text}]`; activity feed can start as a
  derived/minimal client log (created, pricing toggled, etc.) rather than a
  full audit trail.
- No new fields needed for Overview / Details / Order history / Statements —
  derived from existing `customers`, `customerPrices`, and current sales
  order/invoice seed shape.

## Open items

- Order history & Statements are both capped by Sales Orders/Invoices not
  having full documents/ledger yet — explicitly labeled as stand-ins on the
  page, not hidden as if complete.
- Documents tab is empty-state only; flag if you'd rather cut it for now
  rather than ship an inert tab.
- Contacts/Shipping addresses: building read + add/edit/delete for both
  (not read-only) unless you say otherwise.

## Backend-build notes

- New entities: `customer_ship_to`, `customer_contact`, and either a
  `customer_note` table or a generic `activity_log` keyed by entity type+id.
- Statements/aging need a real AR ledger (invoices, payments, credit memos);
  out of scope here — tab is a display shell against seed numbers.
- Order history should be a server-side query by `customer_id`, not a client
  scan over all orders (same caveat as the Item page's PO cross-reference).

## Decisions from Q&A (2026-08-14)

- Full tab set above — all 10 proposed tabs, confirmed.
- Drawer is kept for quick peek; full profile is an explicit additional
  action, not a replacement of the drawer.
- Default landing tab: Overview.
- Sales prices tab embeds the full Sales Prices page filtered to the
  customer (vs. a compact inline table).
