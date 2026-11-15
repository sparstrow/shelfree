# Plan — Freight step 1: freight on the purchase order

**Date:** 2026-09-22
**Spec:** `docs/superpowers/specs/2026-09-22-freight-charges.md` (approved 2026-09-22)
**Status:** In progress — built one page at a time, user reviews each before the next.
**Tiering:** parked (POC for Kanalora) — everything ungated.

## Architecture decision
Small master lists (Chart of accounts, Charges, Carriers, Freight policies) plug into the
existing generic data grid through **one registry** (`refDs(id)` in `Shelfree App.dc.html`)
instead of adding a branch to ~20 dataset accessors per list. Each registry entry owns its
columns, views, filters, cell text, drawer facts, edit schema, validation and delete rules.
One shared **reference drawer** renders view + edit for every registry list. Result: full
grid craft (views, filters, columns, export, right-click, keyboard) for each new list at a
fraction of the code, and a clean pattern for later master lists.

## Tasks (in build order — each = one review checkpoint)
| # | Page / surface | Depends on | Status |
|---|---|---|---|
| 1 | **Chart of accounts** (Finance) — minimal purchase-side CoA + registry + reference drawer | — | ✅ built |
| 2 | **Charges** (Purchasing ▸ setup) — `FRT-IN`, `PKG`, `INS`, `LOAD`; account picker from CoA | 1 | ✅ built |
| 3 | **Carriers** (Purchasing ▸ setup) — type, GSTIN, RCM default, tracking-URL template | 1 (registry) | ✅ built |
| 4 | **Freight policies** (Purchasing ▸ setup) — tier editor (From/To/Actual·Flat·%·Free), effective dates | 1 (registry) | ☐ |
| 5 | **Configuration ▸ Freight & shipping** (Settings) — toggles, methods, nudge window, reason codes, pickup-cost defaults, e-way threshold, dispute tolerance, landed-cost on/off | 2–4 | ☐ |
| 6 | **Vendor card ▸ Shipping** — method, policy, carrier, pickup address, pickup-cost method/rate/distance | 3–5 | ☐ |
| 7 | **PO lines: Type column** (Item / Charge) + Purchase Lines report shows type | 2 | ☐ |
| 8 | **PO editor freight** — header method/policy/carrier; auto `FRT-IN` line (Est. + Actual + variance); tier badge; nudge; override w/ reason; pickup cost (flat ↔ km); totals | 4–7 | ☐ |
| 9 | Shortcuts page, docs, security checklist sweep | all | rolling (each task) |

## Per-task definition of done
- Seed data in `lib/shelfree-data.js`; persistence key noted in the page doc.
- Grid: views, filters, search, column picker, export, right-click, keyboard (↑↓, Enter, N, E, Space, Ctrl/Cmd+A/C).
- Drawer: view + edit + create + validation + empty/locked states; hover + motion on every control.
- Shortcuts added to `shortcutGroups()` the same turn.
- `docs/<page>/README.md` written (five-section shape + Backend-build notes + Decisions & deferred) and indexed in `docs/README.md`.
- Security per-feature checklist run and recorded.

## Out of step 1 (later steps per spec)
Receipt shipment block + tracking + disputes + Shipments tracker (step 2); vendor bills,
postings, landed-cost allocation, G/L line type (step 3); sales mirror (steps 5–6);
pickup trip expenses (future spec).
