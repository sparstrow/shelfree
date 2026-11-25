# Shelfree — prototype documentation index

Living functional specs for each screen/feature in this prototype, written for a
future backend/handoff team. Update the matching doc in the same turn as any
behavior, data-model, or screen change (see root `CLAUDE.md`).

## Workflow

- [`superpowers/`](superpowers/README.md) — the brainstorming → spec → plan
  workflow (adapted from Superpowers). In-flight design decisions get captured
  as specs (`superpowers/specs/`) and implementation plans (`superpowers/plans/`)
  before building. Latest approved spec:
  [`2026-09-20-notes-system.md`](superpowers/specs/2026-09-20-notes-system.md)
  — built; see [`notes/`](notes/README.md).
- [`skills/`](skills/interactive-prototype.md) — verbatim source of the built-in
  skills this project builds against, plus how each maps onto our rules.
  Currently: [`interactive-prototype.md`](skills/interactive-prototype.md).
- [`gaps.md`](gaps.md) — known gaps, caveats and future problems not fixed yet;
  read before a task, close what you can, add what you find.
- [`security/`](security/README.md) — security & compliance checklist, a **hard
  gate** every feature/page must pass (see root `CLAUDE.md`).

## Pages

- [`numbering/`](numbering/README.md) — **Record numbering**, the one format every
  auto-numbered series uses (`V00001`, `CUS00001`, `PO00001`…): prefix + 5 digits,
  no hyphen, steps of 1; plus the 2026-10-24 stored-data migration.

- [`notes/`](notes/README.md) — **Notes**, the app-wide append-only notes log
  (also part of `Shelfree App.dc.html`, plus `prototype/designs/erp/SFNotesBlock.dc.html`):
  a multi-author notes thread on every record (PO, receipt, BOM, assembly order,
  item, vendor, customer) and a top-level **Notes** page listing every note by
  reference. Notes can never be edited or deleted — only marked invalid, with a
  permanent reason. Ungated Starter base.

- [`erp-app/`](erp-app/README.md) — the flagship ERP shell (`prototype/designs/erp/Shelfree App.dc.html`):
  app chrome, module/page navigation, the three-tier record-navigation pattern,
  Items/Customers/Vendors table pages, People (Users & Employees), Settings
  (Units of measure, Item categories), and the Vendor Purchase Items screen.
- [`units-of-measure/`](units-of-measure/README.md) — **Units of measure** (also
  part of `Shelfree App.dc.html`): the item profile's Units of measure tab plus
  the Warehouse ▸ Units of Measure register (one row per item × unit) on the
  generic data grid; the unit definitions live at Warehouse ▸ Settings ▸ Units of
  measure (`/warehouse/settings/uom`). Ungated Starter base.
- [`settings/`](settings/README.md) — **Settings**, redesigned 2026-11-25: four areas (Workspace, one per
  module, Shared lists, Personal), one URL per section (`/settings/<id>`, `/<module>/settings/<id>`,
  `/settings/shared/<list>`), Find a setting, per-module Manage settings right and read-only mode, legacy
  redirects, quiet help. Also keeps the prototype reference for sections not moved yet.
- [`number-sequences/`](number-sequences/README.md) — **Number sequences** (Settings, module slice and shared
  list): per-document-type numbering series (`PO`, `GRN`, `SO`, `INV`, `ITM`, `BOM`, `AO`, `EMP`), default
  series, never-reuse issuing for purchase orders and receipts, GST-audit uniqueness / gapless rules and
  atomic server-side issuance.
- [`item-page/`](item-page/README.md) — the full-page **Item detail** screen
  (also part of `Shelfree App.dc.html`): opens in its own workspace tab from the
  Items grid; Overview / Stock & locations / Purchasing sub-tabs, with
  cross-referenced purchase orders. Ungated Starter base.
- [`customer-page/`](customer-page/README.md) — the full-page **Customer profile**
  screen (also part of `Shelfree App.dc.html`): opens in its own workspace tab from
  the Customers grid/drawer; ten sub-tabs (Overview, Billing & address, Sales
  prices, Order history, Statement & aging, Shipping addresses, Notes & activity,
  Documents, Contacts, Credit & risk). Ungated Starter base.
- [`vendor-page/`](vendor-page/README.md) — the full-page **Vendor profile**
  screen (also part of `Shelfree App.dc.html`): opens in its own workspace tab from
  the Vendors grid/drawer; ten sub-tabs (Overview, Address & payment, Items
  supplied, Purchase orders, Purchase receipts, Payables & blocking, Performance,
  Notes & activity, Documents, Contacts). Ungated Starter base.
- [`production/`](production/README.md) — Production ▸ Bills of Materials &
  Assembly Orders (also part of `Shelfree App.dc.html`): BOM + assembly-order
  list pages and document editors, the Item page's Bill of materials sub-tab,
  and the Assembly & production settings. Assembly is ungated Starter base;
  routed production is Growth.
- [`purchase-orders/`](purchase-orders/README.md) — Purchasing ▸ Purchase Orders
  (also part of `Shelfree App.dc.html`): live table page + full-page document
  editor. First transactional (goods-in) surface; ungated Starter base.
- [`chart-of-accounts/`](chart-of-accounts/README.md) — Finance ▸ **Chart of
  Accounts** (part of `Shelfree App.dc.html`): minimal purchase-side CoA (freight step 1),
  first page on the reference-dataset registry + shared reference drawer.
- [`charges/`](charges/README.md) — Purchasing ▸ **Charges** (part of `Shelfree App.dc.html`):
  non-stock charge master (freight, packing, insurance, loading) — posting account from the
  CoA, GST/HSN-SAC, landed-cost flag. Freight step 1, task 2; registry page.
- [`carriers/`](carriers/README.md) — Purchasing ▸ **Carriers** (part of `Shelfree App.dc.html`):
  couriers, transporters (GTA) and own vehicle — GSTIN, reverse-charge default, tracking-link
  template, masked contact phone. Freight step 1, task 3; registry page.
- [`contacts/`](contacts/README.md) — People ▸ **Contacts** (part of `Shelfree App.dc.html`):
  one shared directory of external people; carriers, vendors and customers **link** to a
  contact instead of keeping their own name/phone/email. Includes the app-wide searchable
  contact picker. Registry page.
- [`people/`](people/README.md) — People ▸ **Users** & **Employees** (also part of
  `Shelfree App.dc.html`): sign-in accounts with 8-module `None / Read / Write` permissions,
  invite lifecycle, last-Admin / self-delete guards, employee directory, masked grid & export PII,
  and reference-safe deletion.
- [`tax-codes/`](tax-codes/README.md) — Settings ▸ Configuration ▸ **Tax codes**: national GST
  rate codes with dated rate history, Goods-rate system code, retired 12%/28% kept inactive.
  Tax codes & GST plan task 1.
- [`tax-settings/`](tax-settings/README.md) — Settings ▸ Configuration ▸ **Tax settings**: rounding,
  default tax codes (workspace + per category), line override / GSTIN mismatch checks, bill-to ≠
  ship-to handling, ITC booking mode, branch transfer value. Tax codes & GST plan task 5.
- [`states/`](states/README.md) — Settings ▸ Configuration ▸ **States & territories**: read-only GST
  state codes (UTGST flag, retired codes), GSTIN check, address State dropdowns. Plan task 2.
- [`gst-registrations/`](gst-registrations/README.md) — Settings ▸ Workspace ▸ **GST registrations**:
  one GSTIN per state, primary, scheme/filing/e-invoice/series, cancel & reactivate. Plan task 3.
- [`carrier-types/`](carrier-types/README.md) — Settings ▸ Configuration ▸ **Carrier types**:
  user-maintained Type list for carriers; each type has a fixed behaviour (courier / GTA / own)
  that drives GST treatment and tracking fields.
- [`purchase-receipts/`](purchase-receipts/README.md) — Purchasing ▸ **Purchase
  Receipts** (also part of `Shelfree App.dc.html`): goods-in against a purchase
  order — order picker, receipt document with outstanding/received/rejected per
  line, posting that lands stock and re-derives the order's status. Replaces the
  removed Warehouse Receipts / Shipments pages.
- [`vendor-purchase-items/`](vendor-purchase-items/README.md) — detail on the
  Vendor Purchase Items screen (also part of `Shelfree App.dc.html`), opened
  from the Vendors ribbon's Purchasing → Item button.
- [`purchase-prices/`](purchase-prices/README.md) — Purchasing ▸ **Purchase Prices**: vendor × item × from-qty price register with validity dates; will price purchase orders.
- [`sales-pricing/`](sales-pricing/README.md) — Sales ▸ **Sales Prices** (also part of
  `Shelfree App.dc.html`): the item list-price grid (Starter base) plus
  customer-specific prices with quantity tiers and effective dates (Growth axis
  `customerPricing`, off by default), the eligibility rule in Settings ▸
  Configuration ▸ Sales pricing, and the Pricing block on the Customer drawer.
- [`departments/`](departments/README.md) — **Departments**, the whole-app page
  directory (also part of `Shelfree App.dc.html`): one screen listing every
  department and every page under it, with a live filter, stars, a recents row
  and full keyboard navigation; unbuilt pages are greyed out, tagged Coming soon
  and still navigable. Includes the new Configuration ▸ Navigation page.
  Ungated Starter base.
- [`favorites-views/`](favorites-views/README.md) — per-user **Favorites &
  views** (also part of `Shelfree App.dc.html`): the pinned sidebar section,
  private saved views with a per-page default, recents in the page search, plus
  the My-settings and Configuration surfaces and the Favorites keyboard
  shortcuts. Ungated Starter base.
- [`locations-warehouses/`](locations-warehouses/README.md) — Locations &
  warehouses settings page (`prototype/designs/erp/SFLocationsWarehouses.dc.html`): site
  list, 2D/3D structure designer, zones/aisles/bins. A separate Design
  Component, mounted into `Shelfree App.dc.html`'s Settings via `<dc-import>`.
