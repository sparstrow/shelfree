# Charges — Purchasing ▸ Charges

## Overview
Master list of **non-stock charges** — freight, packing, transit insurance, loading — that
go on document lines as **Type = Charge** (spec §3.6–3.7,
`docs/superpowers/specs/2026-09-22-freight-charges.md`; plan task 2,
`docs/superpowers/plans/2026-09-22-freight-step1.md`). Each charge posts to a Chart of
accounts account and can be **allocated to landed cost** (spread across received item
lines). Freight is always a Charge line, never a raw G/L line, so GST, landed-cost
allocation and freight reporting work.
Second page on the reference-dataset registry (`chgReg()` in
`prototype/designs/erp/Shelfree App.dc.html`) — grid + shared reference drawer.
Sits under Purchasing, in the setup block below the rule. Tier: parked (POC) — ungated.
Future-pass hint: Starter base (landed-cost allocation itself → likely Growth).

## Screens & states
- **Grid:** Code (frozen, mono) · Description · Direction · Purchase account
  ("5110 · Freight inward") · Sales account (hidden) · GST · HSN/SAC (mono) · Landed cost
  (Allocated to items / Expensed / Not applicable) · Source pill · Status pill · Notes (hidden).
  System views: All charges · Purchase (incl. Both) · Sales (incl. Both) · Landed cost ·
  Custom charges · Inactive. Search, filters, column picker, grouping, export, saved views.
  Row attention dot = inactive, or posting account missing/inactive. Sidebar badge = count.
- **Drawer — view:** code + status + source tags, description, direction · landed cost;
  notice for the system charge and for a broken account reference; notes; details
  (direction, account(s), GST, HSN/SAC, landed cost, source, last changed); activity
  placeholder. Actions: Edit, Duplicate, Delete (locked icon + tooltip on system charge).
- **Drawer — edit / new:** Code · Direction · Description · Purchase account (when
  Purchase/Both) · Sales account (when Sales/Both) · GST · HSN/SAC · Landed cost toggle
  (purchase only) · Notes · Status. Fields appear/disappear with Direction. Account pickers
  list only active accounts of the right type (Expense for purchase, Income for sales).
- **Empty state:** "No charges match your filters."

## Data model
`Charge { no: string(2–12, A–Z 0–9 -, PK), name: string, direction: 'Purchase'|'Sales'|'Both', purchaseAcct: accountCode|'', salesAcct: accountCode|'', gst: 'Goods rate'|'0%'|'5%'|'12%'|'18%'|'28%', sac: string(4/6/8 digits), allocate: boolean, desc: string, system: boolean, active: boolean, createdAt: ISO, updatedAt: ISO }`
- `gst = 'Goods rate'` → composite supply: the line takes the GST rate of the goods on the
  same document (vendor-billed freight/packing).
- Seed (`prototype/lib/shelfree-data.js → seedCharges()`): **FRT-IN** Freight inward → 5110, goods
  rate, SAC 996511, allocate, **system** · **INS** Transit insurance → 5115, 18%, 997136,
  allocate · **LOAD** Loading & unloading → 5115, 18%, 996719, expensed · **PKG** Packing &
  forwarding → 5115, goods rate, 998540, allocate.
- Sales-side **FRT-OUT** (Shipping charge → Freight recovered) is *not* seeded — it lands
  with Sales finance (step 6) together with its income account, per the minimal-CoA rule.

## Interactions & business rules
- Code: 2–12 chars, uppercase letters/digits/hyphens (typed lowercase is uppercased), unique.
- Description required, unique (case-insensitive). HSN/SAC required, 4/6/8 digits.
- Purchase/Both → purchase account required: must exist, be active, type Expense.
  Sales/Both → sales account required: active Income account (none exist yet — the error
  says so and points to Chart of accounts).
- Switching Direction away from purchase turns Landed cost off and clears the purchase
  account on save; switching back turns Landed cost on.
- System charge (FRT-IN): code, direction, account and status locked; can't delete.
  Description, GST, HSN/SAC, landed cost and notes stay editable.
- Duplicate → new custom charge, code `<CODE>-2` (next free), "(copy)" name.
- **Chart of accounts link:** an account a charge posts to can't be deleted, and can't be
  deactivated while an active charge uses it; the account drawer shows "Used by charges".
- Inactive charges keep history but must not be offered on new document lines (enforced
  when the line Type column lands, task 7).
- Keyboard: N new · E edit · Enter view · double-click edit · Ctrl/Cmd+Enter or Ctrl/Cmd+S
  save · Esc cancel/close · right-click row menu · all standard grid keys. Listed in
  Settings ▸ Keyboard shortcuts ("Charges").

## Persistence
`localStorage['shelfree.charges.v1']` = Charge[]. On load, a seeded **system** charge
missing from storage is merged back in (custom seeds the user deleted stay deleted).
Grid prefs use the generic per-dataset grid storage (dataset id `charges`).

## Backend-build notes
- Entity `charges` (tenant_id, code, name, direction, purchase_account_code,
  sales_account_code, gst_mode, gst_rate, hsn_sac, allocate_landed_cost, notes, is_system,
  system_key, is_active, created_at/by, updated_at/by). Unique (tenant_id, code) and
  (tenant_id, lower(name)). FK accounts on both account columns.
- Endpoints: `GET /charges`, `POST /charges`, `PATCH /charges/:code`, `DELETE /charges/:code`,
  `POST /charges/:code/duplicate`.
- Server must enforce: code/name/HSN-SAC format + uniqueness; account type per direction
  and active; system-charge immutability (code, direction, account, active; no delete);
  block delete of a charge used on any document line (return references); block account
  delete/deactivate while referenced (mirrors the CoA rule).
- Freight policies resolve the freight charge by `system_key = 'freight_inward'`, never by
  code. GST on `Goods rate` lines is computed server-side from the document's goods lines.
- Future document lines: `document_lines.type ∈ item|charge|gl_account`, `charge_code` FK.

### Security checklist (per-feature)
- Financial config (posting accounts, tax rates) — tenant-scoped; RBAC
  `purchasing.charges.read/write` (finance role may also need write).
- Audit events: charge create / edit (field diff, esp. account + GST + allocate) / delete /
  duplicate. No PII. Nothing sensitive in localStorage beyond prototype seed data.

### Decisions & deferred-to-backend
- One charge master with a Direction field (Purchase / Sales / Both) and **separate
  purchase and sales accounts**, so a "Both" charge posts to an expense on buys and income
  on sales.
- FRT-OUT deferred to step 6 (no income accounts yet — minimal CoA).
- Landed-cost allocation basis (value / qty / weight) is a workspace setting (task 5), not
  per charge. Actual allocation + postings arrive with vendor bills (step 3).
- No per-charge default amount or unit — amounts come from freight policies or the line.
