# Plan — Purchase Prices (spec: ../specs/2026-10-17-purchase-prices.md)

Each phase ships to full craft (states, motion, keyboard, docs) and is reviewed before the next.

1. ✅ **Register page** — `purchasePrices` store + seed-from-POs + legacy migration; Purchasing ▸ Purchase Prices grid (columns, views, inline cell edit, drawer for new/edit, Change price / Add tier / Duplicate to vendor, right-click), *Items with no vendor price* tab, keyboard shortcuts, `docs/purchase-prices/README.md`.
2. ✅ **Vendor surfaces** — Vendor page *Items supplied* + Vendor Purchase Items read/write the new store; tier/date/status columns; "Manage prices" opens the register filtered to the vendor.
3. ✅ (2026-10-22) **PO integration** — `ppResolve()`; vendor-scoped item picker; locked unit cost with tier hint; re-price on qty; below-MOQ / no-price line errors blocking Save/Release on Drafts; vendor change re-resolve + "Remove unpriced lines"; drift pill on Released/Received lines + Purchase Lines column.
4. **Settings & wrap-up** — Configuration ▸ Purchase pricing (lock cost, block below minimum, expiring window), Terminology labels, help text map, security checklist, docs index.
