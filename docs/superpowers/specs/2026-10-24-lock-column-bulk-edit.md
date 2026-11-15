# Lock column + bulk edit (purchase orders & purchase lines)

Status: **approved in chat 2026-10-24**, built same day. Starter base, ungated.

## Decisions
- **Lock is its own column**, separate from Status. Values: **Open** / **Locked** / **Final**.
  - Draft → Open (always). Issued → Locked, unless reopened (`locked:false`) → Open.
  - Partially received / Received / Closed / Cancelled → Final: never editable, can't be reopened.
- **Reopen stays open** — a reopened order stays Open until the user locks it (so further columns can be edited). No auto re-lock.
- Issuing locks (`locked:true`). Reopen keeps status **Issued** (old model flipped it back to Draft).
- **Bulk edit = one column at a time**, from the selection bar *Edit* or the selection menu *Edit column…*.
  Only user-entered columns; auto-filled ones (description, UoM, unit cost/prices, totals) are never offered.
  - Purchase orders: Expected date, Order date, Receiving location, Buyer.
  - Purchase lines: Qty ordered (lock comes from the line's PO; draft lines re-price via tiers, issued keep agreed cost; qty can't go below received).
- Internal columns follow the same lock rule as everything else (no exemption).
- **Locked rows in the popup**: summary shows editable / locked / final counts. Buttons: *Apply to n* (skips locked) and *Reopen m & apply to n+m* in the same popup. Final rows are always skipped.
- Selection menu/bar also get **Reopen** and **Lock** ops (with "n of N").
- One Undo per bulk action.

## Out of scope
Vendor (re-prices lines + tax — edit per order), resend-to-vendor on re-lock, per-field permissions.
