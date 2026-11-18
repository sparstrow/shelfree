# Sales pricing — `prototype/designs/erp/Shelfree App.dc.html`

Sales ▸ **Sales Prices** page, Settings ▸ Configuration ▸ **Sales pricing**, and
the Pricing block on the Customer drawer.
Spec: [`../superpowers/specs/2026-08-12-customer-specific-pricing.md`](../superpowers/specs/2026-08-12-customer-specific-pricing.md).

## Overview

Two layers of price:

1. **List price** (`item.price`) — the workspace default every customer pays.
   Starter base, ungated. Edited on the Sales Prices page's *List prices* tab or
   on the item record.
2. **Customer prices** — exception rows (customer + item + minimum-quantity
   tier) that override the list price for that customer only. **Growth tier**,
   behind the `customerPricing` capability axis, **off by default**. With the
   axis off there is no customer-price UI anywhere and the concept does not
   exist for the user.

Who may have an override is a **workspace rule** (eligibility mode); what
happens when an eligible customer has no override is two more workspace
switches (fallback, block).

## Screens & states

### Sales ▸ Sales Prices

- **List prices tab** (always available). This tab **is the app's standard data
  grid** — the same engine that backs Items / Customers / Vendors, running on a
  dataset id of `salesPrices`. It therefore inherits every grid tool: saved views
  (with favourites + default), the filter builder, search-all-columns, find-in-view,
  refresh, column show/hide/reorder/resize/pin/autofit, grouping, per-column footer
  aggregation, density, pagination, row selection + bulk bar, Actions/Export menus,
  row right-click menu, and the shared ribbon.
  - Columns: `no` (Item, pinned left), `desc`, `uom`, `cost`, **`price` (editable
    in place)**, `margin`, `priceState` pill (Priced / No price / Below cost),
    `custCount` (agreed-price count, axis on), plus `markup` and `category`
    hidden by default.
  - Seeded views: All list prices · Needs a price · Below cost · Thin margin
    (< 25 %, sorted worst-first) · Has agreed prices.
  - **Editable cells are a generic grid capability**: a column marked
    `editable: true` asks `cellEditor(rec, col)` for an editor; the dataset owns
    what the cell writes (here, `item.price`). Enter commits, Esc reverts, blur
    commits. Click/double-click inside the editor does not select or open the row.
  - Row identity is the item no., so *View / Edit / Open in new tab / Enter*
    open the item; **Delete and Duplicate are refused with a toast** (a list
    price has no life of its own — set the price to 0 to mark an item unpriced).
  - The tab strip (List prices · agreed-prices label) and *Pricing rules* button
    sit in the grid toolbar; the axis-off explanation becomes a slim banner
    between the toolbar and the grid.
  - The needs-attention row dot flags items with no price or priced below cost.
- **Customer prices tab** (axis on only). Above the grid:
  - *Who gets their own price* card — current eligibility mode, eligible count,
    the plain-language consequence of the fallback/block switches, a "Change the
    rule" button into Settings, and row/priced-customer counts.
  - *Price check* card — customer + item + quantity → the resolved price, its
    **price type** pill, the reason, and the list price for comparison. This is
    the same `cpResolve()` a sales order line will call.
  - Filters: customer, item; plus the page search box.
  - Grid: customer, item (no + description), from-qty, price, % vs list, starts,
    ends, status (Active / Scheduled / Expired), row actions. Empty dates render
    as *Always* / *Open-ended* ghost buttons that become date inputs on click.
    Every value cell is edited inline (Enter commits, Esc reverts, blur commits).
  - New-row draft strip at the top of the grid, saved or cancelled inline.
  - Rows for a customer who is **not currently eligible** carry a `!` badge —
    the row is on file but ignored by pricing.
- **Axis-off state** — the List prices tab still works; a banner above the grid
  explains that every customer is billed the list price, with a button into
  Modules & capabilities.
- **Below Growth** — the axis is locked in Modules & capabilities (existing
  upgrade prompt); the Configuration page shows the standard locked panel.

### Settings ▸ Configuration ▸ Sales pricing (`cfg-pricing`, Growth)

- Radio list — **No one** (default) / Every customer / Selected customers /
  New customers only. Disabled with an explanation card when the axis is off.
- *Selected customers* reveals a scrollable customer list with a per-customer
  switch and their price count. **New customers only** shows the stamped cut-off
  date.
- *When a customer has no agreed price*: **Fall back to the list price**
  (default off) and **Block the item instead** (default off, greyed with a note
  while the fallback is on).
- Footer card: row count + "Open Sales prices".

### Customer drawer ▸ PRICING (axis on)

Eligibility pill, the per-customer eligibility switch (only in *Selected
customers* mode), a one-line explanation of the active rule, the customer's
price rows (item · tier · price), and "Manage prices" which opens Sales Prices
filtered to that customer. The drawer also gained a **Customer since** fact.

## Data model

- `item.price` — list price (existing field, unchanged).
- `customer.createdAt` (**new**, ISO date) — drives *new customers only*.
- `customer.pricingEligible` (**new**, boolean) — drives *selected customers*.
- `customerPrices[]` (**new**, `prototype/lib/shelfree-data.js` → `seedCustomerPrices()`):

  | field | meaning |
  | --- | --- |
  | `id` | row id (`CP-nnnn`) |
  | `customer` | customer no |
  | `item` | item no |
  | `price` | agreed unit price |
  | `minQty` | tier floor; 1 = applies to any quantity |
  | `effFrom` / `effTo` | ISO dates, empty = always / open-ended |
  | `uom` | reserved — per-UoM pricing is Growth, not built yet |
  | `currency` | workspace currency today; real once multi-currency is on |
  | `note` | free text (why the price exists) |

- Workspace scalars: `customerPricingMode` (`off｜all｜selected｜newOnly`),
  `customerPricingNewCutoff` (ISO date), `customerPricingFallback` (bool),
  `customerPricingBlockUnpriced` (bool).
- Capability axis `customerPricing` (tier `growth`) in `ws.axes`.
- Terminology key `field.customerPrice.label` (default *Customer price*) — only
  offered in the Terminology editor while the axis is on.

## Interactions & business rules

**Eligibility** (`cpEligible`): axis on **and** plan ≥ Growth **and** —
`all` → everyone; `selected` → `customer.pricingEligible`; `newOnly` →
`customer.createdAt >= customerPricingNewCutoff` (stamped the moment the mode is
chosen); `off` → nobody.

**Resolution** (`cpResolve(customer, item, qty, date)`) — the single pricing
function, in order:

1. Not eligible → list price, price type **List**.
2. Eligible: the row with the **highest `minQty` ≤ qty** among rows for that
   customer + item whose date window contains the date wins →
   **Quantity break** if `minQty > 1`, else **Customer**.
3. No matching row and *Block the item* is on → **Blocked**, no price, the item
   cannot be sold to that customer.
4. No matching row and *Fall back to list price* is on → list price, **List**.
5. Otherwise → **no price**, flagged; the seller types a price on the line,
   which becomes price type **Manual**. The line is **not** blocked.

**Price types**: `List | Customer | Quantity break | Manual | Blocked` — the
values of the Price Type column on the sales line.

**Order lines capture the price at add-time.** Editing a price list later never
re-prices an existing order line (sales orders are not built yet; this is the
contract for when they are).

**Validation in the UI**: duplicate (customer, item, minQty) tiers are refused
with a toast; an end date before the start date (or vice versa) is refused;
price ≥ 0, minQty ≥ 1. Deleting a row toasts with **Undo**. Duplicating a row
creates the next tier at 2× the highest existing minQty and 95% of the price.

**Keyboard & mouse** (also in Settings ▸ Keyboard shortcuts): `1`/`2` switch
tabs, `N` new row, `/` focus search, `Enter` commits a cell, `Esc` unwinds
(cell edit → draft → row menu), right-click a row for *Add a quantity tier* /
*Remove this price*.

**Keyboard (Sales Prices)** — `1` list prices, `2` agreed prices, `n` new agreed
price (axis on), `/` focuses the grid search on the list tab and the page search
on the agreed-prices tab, `Cmd/Ctrl+S` saves the active view, `Cmd/Ctrl+Shift+S`
saves a new view. Catalogued in Settings ▸ General ▸ Keyboard shortcuts.

## Persistence

- `shelfree.customerPrices.v1` — the price rows (JSON array).
- `shelfree.settings.customerPricingMode.v1`,
  `shelfree.settings.customerPricingNewCutoff.v1`,
  `shelfree.settings.customerPricingFallback.v1`,
  `shelfree.settings.customerPricingBlockUnpriced.v1`.
- `customer.pricingEligible` lives on the in-memory customer record (seeded);
  like other customer edits in this prototype it is **not** persisted across
  reloads. List-price edits likewise update `state.items` only.
- The axis flag rides in `shelfree.settings.workspace.v1` → `axes.customerPricing`.

## Backend-build notes

### Entities & endpoints

- `customer_prices` — `(id, tenant_id, customer_id, item_id, min_qty, price,
  currency, uom, eff_from, eff_to, note, created_at, created_by, updated_at)`.
  Unique on `(tenant_id, customer_id, item_id, min_qty, currency, uom)`; reject
  overlapping date windows for the same key; `min_qty >= 1`; `price >= 0`.
- `customers` gains `created_at` (already implied) and `pricing_eligible`.
- Workspace settings: `pricing_mode`, `pricing_new_cutoff`,
  `pricing_fallback_to_list`, `pricing_block_unpriced`.
- `GET/POST/PATCH/DELETE /customer-prices` (filterable by customer/item),
  `GET /customers/{id}/prices`, `GET /items/{id}/customer-prices`,
  `PATCH /workspace/settings/pricing`.
- **`POST /pricing/resolve`** — `{customerId, itemId, qty, date}` →
  `{price, priceType, sourceRowId, listPrice, reason}`. Sales orders, quotes and
  invoices must all call it; the client must never be the authority on price.

### Decisions & deferred-to-backend

- **Agreed prices reference real records only (2026-10-17).** `cpAll()` ignores rows whose item or customer is no longer in the masters, so legacy/orphan rows never surface. Customer-prices tables (Sales Prices › Customer prices and the customer page) show Item no. and Description as separate columns. Backend: `customer_prices.item_id` / `customer_id` are FKs; deleting an item or customer must be blocked or cascade-archive its price rows.

- **List prices are a grid dataset, not a bespoke table** (2026-08-15, at the
  user's request: "the sales price page should inherit the design table and its
  tools"). Rows are derived per render from `items` + `custPrices`, exactly like
  the Units of Measure register — nothing new is stored. The backend equivalent is
  a read model / view (`GET /sales-prices?view=…&filter=…&sort=…&page=…`) over
  `items` joined to an aggregate count of `customer_prices`, with the same
  server-side filter/sort/pagination contract the other grids use; editing the
  `price` cell is a `PATCH /items/{id} { price }` and must emit the item-price
  audit event.
- `priceState` (Priced / No price / Below cost), `margin` and `markup` are
  **computed**, never stored; the backend should expose them on the read model so
  filtering and sorting stay server-side.

- **Mechanism is a flat override, not a discount %.** Decided with the user: a
  customer price replaces the list price outright. Percentage discounts and
  price groups were considered and dropped for now.
- **Tiering**: quantity breaks and effective dates ship with the Growth base.
  **Per-UoM pricing stays Growth** but is not built — no alternate-UoM selling
  exists yet; the `uom` column is reserved for it.
- **Currency** follows the existing `multiCurrency` axis; until it is on, every
  row is the workspace base currency.
- **Not blocking is the default.** A missing customer price must not stop a
  sale: the line comes through unpriced and is completed manually. Blocking is
  opt-in per workspace.
- **`newOnly` uses a stored cut-off**, not "created after the account's first
  order" — switching modes back and forth re-stamps the cut-off. The backend
  must store the cut-off timestamp, not recompute it.
- **Price capture**: `sales_order_line.price` and `price_type` are stored
  values; never recompute them from the price list after the fact.
- **Audit** (per `docs/security/README.md`): creating/changing/removing a
  customer price, changing the eligibility mode or the fallback/block switches,
  and toggling a customer's eligibility are all audit events (actor, before,
  after). Prices are commercially sensitive — reads should be permission-scoped
  (a sales rep sees their own customers' prices) and never exposed cross-tenant.
- **Enforcement is server-side**: eligibility, tier gating and the block rule
  are advisory in the client only.


## Update 2026-10-15 — Quiet help (Settings ▸ Configuration ▸ Sales pricing)
Follows the quiet-page rule (CLAUDE.md; reference `docs/tax-settings/README.md` → "Quiet help").
- **Removed inline:** page description, each "Who can have their own price" option's explanation, and
  the explanations under "Fall back to the list price" / "Block the item instead". No `?` inline mode.
- **ⓘ + hover (~400 ms):** page title; sections "Who can have their own price", "Customers on customer
  pricing", "When a customer has no agreed price"; settings "Fall back to the list price" and "Block the
  item instead". Popovers list each option (current marked, default tagged) with **Use default** —
  defaults: mode `off` (No one), fallback Off, block Off. Touch → bottom sheet.
- **Kept inline (state):** capability-off card, "Cut-off: accounts opened on or after …", the customer
  count, "Not used while the fallback above is on" (only while fallback is on), row-count card.
- **Switches** are now real `role="switch"` buttons with `aria-checked` (were clickable divs) — keyboard
  focusable, Space/Enter toggles.
- **Help-text map:** `cpHelpText()` / `cpHelpVM()` → `hpCp.<key>`, keys `cp.page|mode|cust|missing|fallback|block`.
- **Shortcuts:** listed under "Settings › Sales pricing" in Keyboard shortcuts.
- **Backend:** no change — "Use default" writes the same settings keys as the controls
  (`customerPricingMode`, `customerPricingFallback`, `customerPricingBlockUnpriced`) and must emit
  the same audit event as any other change to them.

## React app (2026-11-17)

Ported to `apps/web` at `/sales/sales-prices` (`?tab=list|customer|check`, `?sel=CP00001` opens a customer price's drawer, `?customer=CUS00001` / `?item=ASH-PWH-18` filter Customer prices, and `?new=1` opens the New customer price drawer pre-filled).

- **Files:**
  - `apps/web/src/data/schemas/index.ts` — `customerPriceSchema` and `CustomerPrice` matching `seedCustomerPrices()`.
  - `apps/web/src/data/api/index.ts` — `customerPrices` collection (`key: 'customerPrices'`, `idOf: (r) => r.id`).
  - `apps/web/src/domain/sales-prices.ts` + `sales-prices.test.ts` — `DEFAULT_SALES_PRICING_SETTINGS`, `isCustomerPricingEligible`, `eligibleCustomers`, `validCustomerPrices`, `isCustomerPriceActiveOn`, `customerPriceStatus`, `resolveCustomerPrice`, `buildListPriceRows`, `commitListPrice`, `customerPriceNextNo`, `priceDeltaVsList`, `priceDeltaVsListText`, `blankCustomerPrice`, `startCustomerPriceTier`, `normalizeCustomerPrice`, `validateCustomerPrice`, `toCustomerPrice`, `commitCustomerPriceCell`.
  - `apps/web/src/features/sales/sales-prices/dataset.ts` (`listPriceDataset`, `customerPriceDataset`) and `SalesPricesPage.tsx` (*List prices* tab on `ListPage` with in-grid `List price` editing, *Customer prices* tab on `ListPage` with `EditableDrawer` + in-grid `column.edit` + `T` add quantity tier + delete with Undo, and *Price check* tab).
  - `apps/web/src/routes/sales/sales-prices/index.tsx`.
- **Same as prototype:**
  - *List prices*: columns (`Item`, `Description`, `UoM`, `Unit cost`, inline-editable `List price`, `Margin %`, `Price status`, `Customer prices`, hidden `Markup %` / `Category`), views (`All list prices`, `Needs a price`, `Below cost`, `Thin margin` sorted ascending, `Has agreed prices`), warning dot on unpriced / below-cost rows, row open navigates to `/warehouse/items/$no`, delete/duplicate omitted.
  - *Customer prices*: 11 seeded rows (`CP00001`–`CP00011`), orphan filtering via `validCustomerPrices`, `% vs list`, `Active` / `Scheduled` / `Expired` status pills, inline editable cells (`From qty`, `Price ₹`, `Starts`, `Ends`, `Note`), non-eligible customer warning dot/notice, quantity tier duplication (`2×` highest `minQty` at `95%` price), non-overlapping date validation per `(customer, item, minQty)`, delete with Undo.
  - *Resolution* (`resolveCustomerPrice`): unknown item → `none`; ineligible customer → `list`; eligible customer → highest active `minQty ≤ qty` (`break` or `customer`); missing → `blocked` / `list` fallback / `manual`.
  - *Shortcuts*: `1` / `2` / `3` switch tabs, `N` new customer price, `T` add quantity tier, `E` edit drawer, `Ctrl/Cmd+S` save, `Esc` cancel/close, `/` search, `Enter`/`Tab`/`Esc` in-grid cell edit.
- **Deliberate changes:**
  - Per `CLAUDE.md` (tiers parked for POC), customer pricing is always unlocked (`DEFAULT_SALES_PRICING_SETTINGS`: `enabled: true`, `mode: 'selected'`, `fallbackToList: false`, `blockUnpriced: false`) until Settings ▸ Configuration ▸ Sales pricing is ported; no axis-off lock UI is rendered.
  - *Customer prices* uses the shared `ListPage` + `DataGrid` + `EditableDrawer` template instead of a bespoke HTML table, gaining views (`All customer prices`, `Active`, `Scheduled`, `Expired`, `By customer`), filter builder, column visibility, CSV export, and click/Enter cell editing (`CellEditor`).
  - *Price check* and the rule summary card live on a dedicated *Price check* tab instead of above the Customer prices grid.
  - `Thin margin` filters out `No price` rows (`priceState is not No price` + `margin < 25`) so unpriced raw materials do not appear as thin-margin items.
  - Overlap validation uses `datesOverlap` per `(customer, item, minQty)` so historical non-overlapping windows on the same tier are permitted.
- **Persistence:** `shelfree.v2.customerPrices` (key `id`), `shelfree.v2.items` (inline list-price edits update `item.price`).
- **Backend rules & security gate (`docs/security/README.md`):**
  - `POST/PATCH/DELETE /customer-prices` must validate customer and item exist, `minQty` integer `>= 1`, `price >= 0`, `effTo >= effFrom` when both present, and enforce an exclusion constraint against overlapping date windows for `(tenant_id, customer_id, item_id, min_qty, currency, uom)`.
  - `PATCH /items/:no` for list-price edits must validate `price >= 0` and emit an item-price audit event.
  - `POST /pricing/resolve` (and order/invoice line pricing) must compute `price` and `priceType` server-side from tenant-scoped `customer_prices` and workspace settings.
  - Create/edit/delete and eligibility changes must emit immutable audit events, enforce `sales.prices.edit` RBAC and tenant isolation, and keep commercial pricing data out of unauthenticated endpoints; no PII or secrets in localStorage.
- **Tests:** `apps/web/src/domain/sales-prices.test.ts`, `apps/web/src/data/schemas/seed.test.ts`, `apps/web/e2e/sales-prices.spec.ts`.
