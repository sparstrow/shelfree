# Plan — Tax codes & GST

Spec: `docs/superpowers/specs/2026-09-25-tax-codes-gst.md` (approved 2026-09-25; §2.7 added 2026-09-26 as task 4, later tasks renumbered +1).
Build one task at a time; each task ends click-through-able in `prototype/designs/erp/Shelfree App.dc.html`
and updates its `docs/<page>/README.md` + Keyboard shortcuts page in the same turn.

| # | Task | Where to click | Status |
|---|---|---|---|
| 1 | **Tax codes page** — national codes, dated rate history, Goods-rate system code, retired 12%/28% kept inactive, split explainer, edit/new modal, right-click menu, delete rules | Settings ▸ Configuration ▸ Tax codes | ✅ built 2026-09-25 |
| 2 | **States & territories** — read-only GST state-code list (38 + 96/97), UT-without-legislature → UTGST flag; state dropdowns read it | Settings ▸ Configuration ▸ States & territories | ✅ built 2026-09-25 |
| 3 | **GST registrations** — replace single GSTIN with a list (GSTIN → state, scheme, filing frequency, e-invoice, series prefix, primary); single-registration UI hides pickers | Settings ▸ Workspace ▸ GST registrations | ✅ built 2026-09-25 |
| 4 | **Locations ↔ registrations** (spec §2.7) — one location registry for every screen (retire `siteDefs()`, TVM-RET folds into Main, item stock re-keyed by warehouse id); state = required GST dropdown; place-of-business status + declare action; 3PL operator = vendor link; registration card location rows; Locations page GSTIN chip, gap warning, derived registration line; vendor Supplies field + demo 3PL vendor; location contacts → Contacts links | Settings ▸ Workspace ▸ GST registrations · Configuration ▸ Locations & warehouses · Items stock | ✅ built 2026-09-26 |
| 5 | **Tax settings** — rounding, category default codes, line override, mismatch warning, paper-transfer handling, ITC booking (Q5), branch transfer value (Q6) | Settings ▸ Configuration ▸ Tax settings | ✅ built 2026-09-26 |
| 6 | **Master data fields** ← next — item HSN/tax code/treatment, category default, vendor/customer regType + derived state (GSTIN locks it), charges `gst` → `taxCode` ref (drop 12%/28%) | Items, Vendors, Customers, Charges | ☐ |
| 7 | **Tax engine + line tag** — registration from ship-to/ship-from, treatment, dated rate, split, RCM; tag + "how it was decided" hover card; override with reason | PO lines | ☐ |
| 8 | **Receipts & vendor bills tax** — tax lines carried through; RCM self-assessment on GTA freight | Purchase receipts / bills | ☐ |
| 9 | **Finance postings** — §5 postings, registration dimension, new accounts only as needed | Chart of accounts / GL | ☐ |
| 10 | **ITC register + RCM register + GST summary** | Finance ▸ Tax | ☐ |
| 11 | **2B / IMS reconciliation** — upload (mock), match statuses, accept/reject/pending | Finance ▸ Tax ▸ Reconciliation | ☐ |
| 12 | **Stock transfer order + branch invoice** | Warehouse ▸ Stock transfers | ☐ |
| 13 | **Demo KA registration + Bengaluru warehouse seed** (after Q4) | — | ☐ blocked on Q4 |

Verification per task: open the page, create/edit/delete, keyboard + right-click paths, empty/error states, reload persists.
