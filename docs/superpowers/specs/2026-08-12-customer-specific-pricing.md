# Spec — Customer-specific sales pricing

Status: **approved and built** (2026-08-12). Implementation and the backend
contract live in [`../../sales-pricing/README.md`](../../sales-pricing/README.md).

## Problem

Today every item has one `price` (the list price everyone pays). The user wants
the option to charge specific customers a different price for specific items,
with a setting controlling *which* customers that applies to: nobody (default),
a hand-picked set, all customers, or only customers created after the switch.

## Model

- **List price** (`item.price`) stays the Starter-base default every customer
  pays. Unchanged; ungated.
- **Customer price rows** are *exceptions* layered on top — one row per
  customer + item (+ optional min-qty break), each a flat override price. No
  percentage/discount mechanism.
- Feature axis **`customerPricing`** (Modules & capabilities), tier **Growth**,
  default **off**. Off ⇒ no customer-price UI anywhere, item.price is the only
  price. This is a Growth-path feature: shown locked with an upgrade prompt
  below Growth, per the scale-adaptive spec.
- **Eligibility mode** (Configuration, only visible when the axis is on):
  `off | all | selected | newOnly`
  - `off` — axis is on but nobody is eligible yet (lets an admin build price
    lists before turning them on for anyone).
  - `all` — every customer can have overrides.
  - `selected` — only customers with `pricingEligible = true`.
  - `newOnly` — only customers whose `createdAt` is after the mode was last
    set to `newOnly` (a stored cutoff timestamp).
  - Editable in two places that write the same state: the Configuration page's
    mode control (with an inline customer picker when `selected`), and a
    per-customer "Eligible for customer-specific pricing" switch on the
    Customer record itself (only meaningful/shown when mode = `selected`).
- **Fallback setting** (Configuration, same page): *"No customer price → use
  list price"*, off by default.
  - Off (default): an eligible customer with no override row for an item
    shows **no price** on the sales line, flagged "No customer price set" —
    the line itself is **not blocked**; the user can type a price by hand,
    which sets `Price Type = Manual` and the line sells normally.
  - On: falls back silently to `item.price` (`Price Type = List`).
  - Ineligible customers (mode says they're not in scope) always just use
    `item.price` — this setting doesn't apply to them, there's no "customer
    price" concept for them at all.
  - A separate, second **global setting**: *"Block item if no customer
    price"* (off by default). When on, it overrides the above — an eligible
    customer with no override row cannot be sold that item at all (no manual
    entry allowed) until a price row exists. This is the strict-control
    option for businesses that want to hard-enforce customer pricing.

## Where prices are edited

Two views over the same `customerPrices` rows — pick either, edited state
matches everywhere:

1. **Sales Prices page → Customers tab**: pick an item, see/edit every
   eligible customer's override for it.
2. **Customer record → Pricing tab**: pick a customer, see/edit every item's
   override for them.

Sales Prices page itself (the item×list-price grid) is Starter base and
unaffected by the axis; the Customers tab only appears when `customerPricing`
is on.

## Price row shape

```
{ id, customer, item, price, minQty, effFrom, effTo, uom, currency }
```

- **Qty breaks**: multiple rows per customer+item, one row per `minQty` tier
  (e.g. 1 / 50 / 200), each with its own price. Ships with the Growth base.
- **Effective dates** (`effFrom`/`effTo`): ships with the Growth base — a
  price list naturally needs a start/end.
- **Per-UoM price** (selling the same item in an alternate UoM at its own
  price): **Growth**, same as the rest of customer-specific pricing.
- **Currency**: follows the existing `multiCurrency` axis (already Growth,
  gated separately in Regional & format) — a price row only shows/needs a
  currency once that axis is on; otherwise implicitly the workspace base
  currency.

## Sales order line

(Sales Orders doesn't have a line editor built yet — this spec sets the
contract for when it does.)

- New **Price Type** column: `List | Customer | Manual | Quantity break`,
  set automatically when a price resolves and overridable by hand-typing a
  price (→ `Manual`).
- Resolution order per line: eligible customer + matching qty-break row →
  `Quantity break`; eligible customer + flat row → `Customer`; not eligible,
  or eligible-but-unpriced-with-fallback-on → `List`; eligible, unpriced,
  fallback off → blank price with an inline "No customer price set" flag —
  the user types a price to proceed, which sets `Price Type = Manual`. If the
  "Block item if no customer price" global setting is on, this last case
  instead blocks the line (no manual entry) until an override row exists.
- **Price is captured at add-time.** Editing the customer price list later
  never changes lines already on existing orders (draft or otherwise).

## Settings surfaces (per feature)

- **Workspace/Modules & capabilities**: `customerPricing` axis toggle
  (Growth).
- **Configuration** (new page or section, visible when axis on): eligibility
  mode selector + customer picker (when `selected`) + fallback toggle + block
  toggle.
- **Terminology**: `object.customerPrice.label` (default "Customer price"),
  reused anywhere the column/tab is labeled.
- **User-level**: none needed — this is workspace policy, not a personal
  preference.
- **Customer record**: `pricingEligible: boolean` field (new), shown/editable
  only when mode = `selected`.
- **Data model addition**: customers need `createdAt` (not currently seeded)
  to support `newOnly` mode.

## Persistence (prototype)

- `shelfree.settings.customerPricingMode.v1` — `off|all|selected|newOnly`.
- `shelfree.settings.customerPricingNewCutoff.v1` — ISO timestamp, set when
  mode switches to `newOnly`.
- `shelfree.settings.customerPricingFallback.v1` — boolean.
- `shelfree.settings.customerPricingBlockUnpriced.v1` — boolean.
- `customer.pricingEligible` — on the customer record (seed data + edit panel).
- `customerPrices` — array of price rows (seed data file).

## Backend-build notes (deferred, recorded now)

- Real implementation needs a `customer_prices` table (customer_id, item_id,
  min_qty, price, currency, eff_from, eff_to) with a uniqueness constraint on
  (customer, item, min_qty, currency) and no overlapping date ranges.
- Price resolution (eligibility → best matching row → fallback) must be a
  server-side pricing function, not just client logic — sales order creation
  and invoicing both need it, and margin/pricing data shouldn't be fully
  client-computed.
- Order-line price capture means `sales_order_line.price` and `price_type` are
  stored values, never recomputed from the price list after the fact.
- Audit: changes to a customer's override price and to eligibility mode are
  audit-relevant (security gate).

## Open items I'm deciding by default (flag if wrong)

- Qty-break tiers and effective dates ship with the Growth base rather than
  splitting further into Enterprise — a price list without either feels
  half-built.
- Per-UoM overrides kept in Growth with the rest of the feature.
