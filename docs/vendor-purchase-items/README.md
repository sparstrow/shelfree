# Vendor Purchase Items

In-app screen inside `prototype/designs/erp/Shelfree App.dc.html` (not a separate file —
opening it in a new tab hit the sandbox's preview-token restriction on
navigating to a second static file, so it's now a screen within the same
single-page app instead). Reached from the Vendors table's HOME ribbon
(Purchasing group → **Item** button), enabled only when a vendor row is
selected. A back arrow in the screen's header returns to Vendors.

## Overview

Lets a Purchasing user record which catalog items they buy from a given
vendor and the price they're purchasing them at. One list per vendor.

## Screens & states

- **Header**: back button, "Purchase Items — {vendor name}" title, vendor no.
  chip, item count, "Add Item" button.
- **Table** (shown when the vendor has ≥1 purchase item, or while adding):
  Item No., Description, UoM, Purchase Price, Currency, Added (date), remove
  action per row.
- **Empty state**: shown when the vendor has no purchase items yet and no add
  row is in progress.
- **Add row (inline, no modal)**: "Add Item" inserts an editable row at the
  top of the table itself — type-ahead search input (no./description,
  already-added items excluded) with a results dropdown; picking one fills
  the Item No./UoM cells and shows its description under the search box.
  Purchase price and Currency (USD/CAD/EUR) are edited directly in-row.
  Checkmark button confirms (validates: item required, price a valid
  non-negative number, item can't be added twice — error shows under the
  row); × button cancels. No dialog/overlay is used.

## Data model

New state on the app component (not a new Vendor/Item field):
- `vendorItemsFor`: the vendor `no` currently open on this screen.
- `vendorItemsRows`: `{ [vendorNo]: Row[] }`, an in-memory cache seeded from
  localStorage when the screen opens.
- Row shape: `{ no, desc, uom, price, currency, added }` — `no`/`desc`/`uom`
  copied from the item master (`prototype/lib/shelfree-data.js` → `seedItems()`) at
  add-time; `price` a number; `currency` one of `USD | CAD | EUR`; `added` an
  ISO timestamp set when the row is created.

## Interactions & business rules

- `openVendorItems()` (on the Vendors ribbon's Item button) resolves the
  selected vendor (`selNo` or a single checked row), loads its rows, and sets
  `module: 'purchasing', page: 'Vendor Purchase Items'` — a page id not present
  in the sidebar's module page lists, so it's only reachable via this button.
  `vItemsBack()` navigates back to `purchasing / Vendors` the normal way.
- An item can only appear once per vendor's list (enforced client-side on add).
- No editing of an existing row's price in this iteration — remove and re-add
  to correct a mistake.

## Persistence

**Phase 2 (2026-10-18):** this screen is now a vendor-filtered view over the Purchase prices store `shelfree.purchasePrices.v1` (docs/purchase-prices). The old per-vendor keys are read once for migration and no longer written. Columns: Item no. · Description · UoM · From qty · Price ₹ · Starts · Ends · Status · remove (with Undo). Add row: item search (tiers allowed, so items aren't excluded), from qty, price, starts (today), ends; Enter saves, Esc cancels; validation = the register's (overlap, dates, qty). Currency removed (INR only). "Open in Purchase prices" jumps to the register filtered to this vendor.

Rows are read through `vItemsLive()` — orphaned item numbers (item deleted/renamed, or legacy browser data) are ignored and desc/UoM resolve from the item master. Currency defaults to **INR**; options INR / USD / EUR (2026-10-17).

`localStorage` key `shelfree.vendorPurchaseItems.<vendorNo>` — JSON array of
rows, one key per vendor, written on every add/remove. `state.vendorItemsRows`
is just a read-through cache of that per vendor.

## Backend-build notes

- Model as a join table: `vendor_purchase_item { vendor_no, item_no, uom,
  price, currency, created_at }`, unique on `(vendor_no, item_no)`.
- `price`/`currency` here are the "cost from this vendor" — likely the source
  for whichever vendor is chosen as an item's primary supplier
  (`Item.vendor`/`Item.cost` in `prototype/lib/shelfree-data.js`); reconcile if multiple
  vendors can quote the same item (this prototype assumes one open list per
  vendor, no per-item price history yet).
- Add an edit-price interaction and price history before treating this as a
  real costing source.

## React app (2026-11-17)

Ported to `apps/web` at `/purchasing/vendors/$no/items`.

- **Files:** `apps/web/src/features/purchasing/vendor-purchase-items/VendorPurchaseItemsPage.tsx`,
  `apps/web/src/routes/purchasing/vendors/$no_.items.tsx`,
  `apps/web/src/features/purchasing/vendors/tabs/VendorItemsTab.tsx` (*Manage prices* navigates here),
  and `vendorPriceRows` in `apps/web/src/domain/purchase-prices.ts` (+ `purchase-prices.test.ts`).
- **URL:** `/purchasing/vendors/$no/items`.
- **Same as prototype (Phase 2):** vendor-filtered view over `purchasePrices` sorted by item, from qty,
  and start date; header with back button, `Purchase prices — <vendor name>`, vendor no. pill, price
  count, *Open in Purchase prices* (`/purchasing/purchase-prices?vendor=<no>`), and *Add price*;
  inline add row with type-ahead item search (`no` / `desc` dropdown with click and ↑/↓/Enter),
  from qty, price ₹, starts (defaults to today), ends, `Enter` saves / `Esc` cancels, validated by
  `validatePrice` (`domain/purchase-prices.ts`); per-row remove with Undo toast; empty state when the
  vendor has no price rows and no add row open; loading, error, and vendor-not-found states.
- **Deliberate changes:** back button returns to the vendor's profile (`/purchasing/vendors/$no`) rather
  than the Vendors list, and `VendorItemsTab`'s *Manage prices* button links here (which in turn offers
  *Open in Purchase prices* to jump to the full register).
- **Persistence:** `shelfree.v2.purchasePrices`.
- **Backend rules:** `GET /purchase-prices?vendor=:no`, `POST /purchase-prices`, `DELETE /purchase-prices/:no`
  must enforce the same validation and date-overlap exclusion rules as `docs/purchase-prices/README.md`,
  emit audit events on create/delete, and gate writes with `purchasing.prices.edit`; no PII.
- **Tests:** `apps/web/src/domain/purchase-prices.test.ts`, `apps/web/e2e/notes-departments-vpi.spec.ts`.
