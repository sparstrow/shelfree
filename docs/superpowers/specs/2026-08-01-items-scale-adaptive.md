# Spec: Items page — scale-adaptive wiring

Wires the existing Settings → Modules & capabilities axis toggles
(`multiWarehouse`, `zones`, `lotBatch`, `expiry`, `serial`, `barcodes`) into the
Items table + Item detail page, which today render every field regardless of
axis state. First page in the audit build order
(`2026-08-01-scale-adaptive-audit.md`).

## Behavior per axis (Starter base = all axes off)

- **multiWarehouse** off → Items grid has no Location column; on-hand is one
  number. On → Location column appears (site name); Item detail "Stock &
  locations" tab shows a per-site table.
- **zones** (requires multiWarehouse) off → per-site rows only. On → rows
  break down further into zone/aisle/bin.
- **lotBatch** off → no Lot/Batch column anywhere, no lot field on the item
  record. On → column appears (blank for items not tracked by lot); Item
  detail edit panel gets a "Tracks lot/batch" checkbox.
- **expiry** off → no Expiry column/field. On → column + item-level "Tracks
  expiry" checkbox; Stock & locations shows nearest expiry per lot when both
  lotBatch and expiry are on.
- **serial** (enterprise) off → no Serial column/field. On → column + item-
  level "Tracks serial numbers" checkbox; Stock & locations lists serials.
- **barcodes** off → no Barcode field/column. On → Barcode text field in the
  item edit panel + column in the grid.

Axis off = fully hidden (not locked/greyed) — no inline upsell on the Items
page itself; the only upgrade prompt lives in Settings → Modules &
capabilities, per the existing gating pattern.

## Data model changes

**Item** gains, all optional/defaulted off:
- `tracksLot: boolean` (default `false`)
- `tracksExpiry: boolean` (default `false`)
- `tracksSerial: boolean` (default `false`)
- `barcode: string` (default `''`; presence implies "has a barcode")

No change to `locs` (stock-by-location) — only its rendering changes.

## Settings surfaces (per CLAUDE.md)

- **Workspace** — none new; reuses the existing Modules & capabilities axis
  toggles (workspace-wide ceiling for whether a capability can appear at all).
- **Configuration** — the *item's own* on/off: the four new fields above,
  editable per-item in the Item edit panel's new "Tracking" section. Section
  itself is hidden entirely unless the matching workspace axis is on (e.g. no
  "Tracks lot/batch" checkbox exists in the UI at all if `lotBatch` axis is off).
- **Terminology** — two new rename-able keys in Settings → Terminology:
  `object.location.singular` / `.plural` (default "Location"/"Locations" —
  a business may prefer "Warehouse"/"Site"), and `field.lotBatch.label`
  (default "Lot/Batch" — some businesses say just "Lot" or just "Batch").
  Resolved via the existing `termGet()` everywhere these words appear
  (column header, Item detail tab label, edit panel field label).
- **User** — Items grid respects the existing My settings → Personal defaults
  → "Default location" (already modeled, currently unused by any page): when
  set and `multiWarehouse` is on, the Items grid pre-filters to that location
  on load; user can clear the filter per-session.

## Interactions & business rules

- Column picker (`cols`) only lists Location/Lot/Batch/Expiry/Serial/Barcode
  columns when their axis is on — they don't exist as hide-able-but-present,
  they're absent from the picker entirely when the axis is off.
- Turning an axis off in Settings after items already have `tracksLot`/etc.
  set to `true` does not clear that data (client-side only in this prototype);
  the field just stops rendering. Backend should preserve stored values the
  same way (soft-hide, not destructive).
- Item edit panel's "Tracking" section order: Lot/Batch → Expiry → Serial →
  Barcode, each its own checkbox (Barcode is a text field, presence = on).

## Persistence

In-memory only, same as current Items behavior (no dedicated Items
localStorage key exists today) — new fields ride along with the existing item
object. Terminology keys persist via the existing
`shelfree.settings.terms.v1` map; user's default location via the existing
`shelfree.settings.user.v1`.

## Decisions & deferred-to-backend

- Item-level tracking flags are additive/nullable columns on the Item table;
  backend must not require them, and must preserve values when a workspace
  downgrades/disables an axis (soft-hide only, never delete on disable).
- Real lot/serial/expiry tracking (actual lot numbers, expiry dates, serial
  instances tied to stock movements) is out of scope for this pass — this spec
  only wires the on/off visibility layer. A follow-up spec is needed once
  Warehouse Receipts/Shipments (currently placeholders) are built, since that's
  where lot/serial/expiry values actually get captured.
- Terminology keys follow the existing display-layer contract: renamed labels
  only, underlying field names (`tracksLot`, etc.) never change.

## Outcome (built 2026-08-01)

Implemented per `docs/superpowers/plans/2026-08-01-items-scale-adaptive.md`.
Deltas from the spec, all deliberate:

- **`axisOn()` is now the app-wide axis resolver** (workspace toggle × plan
  tier, `zones` ⊂ `multiWarehouse`), and `axisDefs()` became a method so the
  Settings page and every consumer share one tier map.
- **Sites got a real model.** `siteDefs()` replaced four hardcoded
  `Main/Assembly/East DC/Returns` arrays and the drifted `BLR-…/MUM-…`
  Default-location options, which never matched the `TVM-Main` default.
- **Tracking columns show tracking state**, not values (`By lot` / `Tracked` /
  `By serial` / `—`), because lot, expiry and serial *values* are captured by
  Warehouse Receipts, which doesn't exist yet. The Stock & locations cards for
  those kinds render their empty state pointing at Receipts rather than
  inventing stock history — same reason the `zones` breakdown currently shows
  one `Unassigned · no bin` row per site.
- **Seed data now carries the new fields** (`lib/shelfree-data.js`): ceramics and
  cones lot-tracked, cones/raw resin expiry-tracked, sellable SKUs given GS1-IN
  `890…` barcodes, nothing serialised — so each axis has something to show.
- **`trackingPatch()` guards writes**: a flag whose axis is off is never written,
  and turning an axis off never clears stored values (the security doc gained a
  matching backend checklist item).

Docs updated: `docs/erp-app/README.md`, `docs/item-page/README.md`,
`docs/settings/README.md`, `docs/security/README.md`.
