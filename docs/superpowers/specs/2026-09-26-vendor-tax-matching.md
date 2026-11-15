# Vendor tax matching — spec

Status: **draft v2** (2026-09-26) — part A **approved and built 2026-09-26** (vendor card Tax calculation card, PO stamp + stale-draft prompt); part B **parked** until the vendor
bill design (task 8). v1's tolerance, blocking, override permission,
line allocation and nudge were dropped as premature — revisit only if real mismatches show up.
Part A lands with task 6/7 (vendor master + tax engine), part B with task 8 (vendor bills).

## Principle
The vendor's printed invoice is what ITC and GSTR-2B follow. Match the vendor's method up front so
bills agree; allow a manual correction for the rare bill that doesn't.

## A. Vendor card — Tax calculation
- **Use workspace settings** — checkbox, on by default; follows Settings ▸ Tax settings.
- Unchecked shows: **Calculate tax** (On each line / On each tax-rate total) and **Round total to the
  rupee** (Yes / No), prefilled from the workspace values.
- Purchase side only. Round-off account stays workspace-only.
- A PO stamps the method it used; receipts and bills follow the PO. Vendor-card changes apply to new
  POs only.

## B. Vendor bill — manual edit — **PARKED** (decide when vendor bills are built, task 8)
- Bill fills from the PO / receipt with our calculated figures.
- **Every field on the bill is manually editable** — header, lines (qty, rate, discount, taxable
  value), tax amounts (CGST / SGST / IGST), charges, round-off and total — so the bill can match the
  vendor's printed invoice exactly. No special mode, no partial unlock.
- What's entered is what posts. Fields changed from the calculated value show a small *Edited* mark.
- Audit: each edited field (calculated → entered, who, when).

## Data model (proposed)
- `vendor.taxCalcOverride: boolean` (false) · `vendor.taxCalc: 'line'|'rate'` · `vendor.roundTotal: boolean`.
- PO / receipt / bill: `taxCalc`, `roundTotal`, `taxCalcSrc: 'workspace'|'vendor'`.
- Bill: `edited: [{ field, lineId?, calculated, entered }]` — which fields differ from the calculation.

## Out of scope (until needed)
Tolerances, posting blocks, override permissions, line allocation of differences, auto-suggestions,
GSTR-2B reconciliation (task 10).
