# Record numbering

## Overview
Every auto-numbered record uses one format: **PREFIX + 5-digit zero-padded running
number, no hyphen, steps of 1** — e.g. `V00001`, `CUS00012`, `PO00011`.
Padding is a minimum, not a cap: after `99999` the series continues as `100000`.
Starter base, always on. Applies at every scale (1 record or 100,000+).

Why no hyphen: one consistent format across series; IDs select whole on
double-click, type faster, and survive Excel / barcode / EDI exports intact.
The letters already mark where the number starts.

## Series
| Series | Prefix | Generator (Shelfree App) |
|---|---|---|
| Vendor | `V` | seed only (creation not wired yet) |
| Customer | `CUS` | seed only (creation not wired yet) |
| Contact | `CON` | `cntNextNo()` |
| Employee | `EMP` | `empSave()` |
| User | `USR` | `inviteSave()` |
| Item (suggested code) | `ITM` | `itemNextNo()` — items may also use free SKU codes (`ASH-PWH-18`); those are user codes, not a series |
| Purchase order | `PO` | `poNextNo()` |
| Purchase receipt (GRN) | `GRN` | `prNextNo()` |
| Purchase price | `PP` | `ppNextNo()` |
| Customer price | `CP` | `cpNewId()` |
| Bill of materials | `BOM` | `bomNextNo()` |
| Assembly order | `AO` | `aoNextNo()` |
| Sales order | `SO` | Mobile: new order |
| Sales invoice | `INV` | Mobile: post invoice |

Not series (unchanged): location/warehouse codes (`TVM-MAIN`), item SKUs, GST
registration ids (`REG-TN`), vendor document numbers, GST invoice-number prefixes
(per registration, see `gst-registrations/`).

## Interactions & business rules
- Next number = highest existing numeric suffix in the series + 1.
- Numbers are never reused, even after a record is deleted.

## Persistence
- **Migration (2026-10-24)** — `migrateNoFormat()` in `prototype/lib/shelfree-data.js`, run once on
  app load (flag `shelfree.noFormat.v2`). Rewrites every `PREFIX-n` in all
  `shelfree.*` localStorage stores. Series that stepped by 10 or had gaps
  (V, CUS, SO, INV, GRN, BOM, AO, CP) are renumbered 1, 2, 3… in their original
  order (old seed numbers ∪ stored numbers, sorted) so references stay consistent
  with the renumbered seeds; already-contiguous series (CON, EMP, USR, PP, ITM) just drop the hyphen.
  Earlier PO-only migration: `poNoMigrateStore()` (flag `shelfree.poNoFormat.v1`).

## Backend-build notes
- One `number_series` table per tenant: `series` (prefix), `next_value`, `pad` (5), `step` (1).
- Allocate atomically inside the create transaction (`UPDATE … RETURNING`); unique
  index on (tenant, series, number). Gaps allowed (rolled-back creates), reuse never.
- Server is the source of truth; the client-side `*NextNo()` values are previews only.

### Decisions & deferred-to-backend
- 2026-10-24: hyphen dropped everywhere; steps of 1; 5-digit padding for all series
  (matches PO). User-configurable patterns (Settings ▸ Configuration ▸ Number
  sequences) are deferred.
- GST tax-invoice numbers keep their own per-registration format (≤16 chars, may
  contain `/` and `-` per GST rules) — separate from these record numbers.
