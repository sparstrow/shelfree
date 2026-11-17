# Chart of accounts — Finance ▸ Chart of Accounts

## Overview
Minimal, **purchase-side** chart of accounts for Kanalora, introduced in freight step 1
(spec `docs/superpowers/specs/2026-09-22-freight-charges.md`, plan
`docs/superpowers/plans/2026-09-22-freight-step1.md`). It exists so Charges (next page)
can point at real posting accounts. Per CLAUDE.md the CoA **grows stage by stage** —
production/WIP accounts arrive with production finance, revenue/AR with sales finance.
Tier: parked (POC) — ungated. Future-pass hint: Starter base.

It is the first page built on the **reference-dataset registry** (`refDs()` in
`prototype/designs/erp/Shelfree App.dc.html`): a registry entry gives a master list the full
generic data grid plus the shared reference drawer (view / edit / create).

## Screens & states
- **Grid** (standard data grid): Code (frozen, mono) · Account name · Type · Group ·
  Normal balance · Posting · Source pill (System/Custom) · Status pill · Description (hidden).
  System views: All accounts · Assets · Liabilities · Expenses · Custom accounts · Inactive.
  Search, filters, column picker, grouping, export, saved views all work as on every grid.
  Row attention dot = inactive account. Sidebar badge = account count.
- **Drawer — view:** code + status + source tags, name, type · group; lock notice on system
  accounts; description; details (type, group, normal balance, posting, source, last
  changed, used by charges); activity placeholder ("No postings yet"). Actions: Edit, Duplicate, Delete
  (replaced by a locked icon with tooltip for system accounts).
- **Drawer — edit / new:** Code (mono) · Type · Account name · Group (options follow type) ·
  Description · Posting toggle · Status toggle. Inline field errors + footer summary.
  New account pre-fills the next free code for the chosen type/group (auto until the user
  types a code). System accounts: code, type, group, posting and status are locked.
- **Empty state:** generic grid "No accounts match your filters."

## Data model
`Account { no: string(4 digits, PK), name: string, type: 'Asset'|'Liability'|'Equity'|'Income'|'Expense', group: string, desc: string, system: boolean, active: boolean, directPosting: boolean, createdAt: ISO, updatedAt: ISO }`
- Derived: `normal` = Debit for Asset/Expense, Credit otherwise.
- Groups by type: Asset → Current / Non-current assets · Liability → Current / Non-current
  liabilities · Equity → Equity · Income → Revenue from operations / Other income ·
  Expense → Direct expenses (COGS) / Indirect expenses.
- Code ranges: 1xxx Asset · 2xxx Liability · 3xxx Equity · 4xxx Income · 5xxx Direct / 6xxx Indirect expense.
- Seed (`prototype/lib/shelfree-data.js → seedAccounts()`, all system): 1300 Inventory · 1410/1411/1412
  GST input CGST/SGST/IGST · 2100 Accounts payable — vendors · 2110 Freight inward clearing ·
  2320 GST payable — reverse charge · 5110 Freight inward · 5115 Other purchase charges ·
  6190 Round off (added 2026-09-26 with Tax settings — rupee rounding on bill/invoice totals).
  Only 5110/5115 allow manual posting; the rest are control accounts (documents only).

## Interactions & business rules
- Code: exactly 4 digits, unique, first digit must match the type range.
- Name: required, unique (case-insensitive). Group must belong to the type.
- Changing type resets group to that type's first group.
- System accounts can't be deleted or deactivated; only name + description editable.
  Bulk delete skips system accounts and reports how many were kept.
- **Charges link** (task 2): an account a charge posts to can't be deleted, and can't be
  deactivated while an active charge uses it. The drawer shows a "Used by charges" fact.
- Duplicate copies into a new **custom** account with the next free code and "(copy)" name.
- Inactive accounts stay in history but must not be offered on new documents (enforced
  when Charges/documents pick accounts).
- Keyboard: N new · E edit · Enter view · double-click edit · Ctrl/Cmd+Enter or Ctrl/Cmd+S
  save · Esc cancel/close · right-click row menu · all standard grid keys. Listed in
  Settings ▸ Keyboard shortcuts ("Chart of accounts").

## Persistence
`localStorage['shelfree.coa.v1']` = Account[]. On load, any seeded system account missing
from storage is merged back in (so later stages can add system accounts without wiping
user edits). Grid view/column prefs use the generic per-dataset grid storage (dataset id `coa`).

## Backend-build notes
- Entity `accounts` (tenant_id, code, name, type, group, description, is_system, is_active,
  allow_manual_posting, created_at/by, updated_at/by). Unique (tenant_id, code) and
  (tenant_id, lower(name)).
- Endpoints: `GET /accounts`, `POST /accounts`, `PATCH /accounts/:code`,
  `DELETE /accounts/:code`, `POST /accounts/:code/duplicate`.
- Server must enforce: code format + type range; system-account immutability (code, type,
  group, posting, status; no delete); block delete of any account with postings or referenced
  by a charge/tax/config row (return the references); block deactivation when referenced as a
  default posting account.
- System accounts are provisioned per tenant by migrations, keyed by a stable `system_key`
  (e.g. `inventory`, `freight_inward`, `freight_inward_clearing`) — postings resolve by
  `system_key`, never by code, so a tenant can renumber later if we ever allow it.
- Balances/activity come from the future General Ledger (`journal_lines.account_code`).

### Security checklist (per-feature)
- Financial data: yes (chart of accounts) — tenant-scoped; RBAC `finance.accounts.read/write`.
- Audit events required: account create / edit (field diff) / delete / duplicate.
- No PII. Nothing sensitive in localStorage beyond prototype seed data.

### Decisions & deferred-to-backend
- **Minimal CoA now** (user decision 2026-09-22): only purchase-side accounts; others added by
  the stage that needs them.
- **G/L account line type deferred** until postings exist (step 3); `directPosting` is stored
  now so that line type can respect it.
- One `Freight inward` account (no separate variance account): residual balance after
  landed-cost allocation = variance; reports split it by source.
- No parent/child account hierarchy, opening balances, or multi-currency yet — add when the
  General Ledger and reports need them.

## React app (2026-11-17)

Ported to `apps/web` at `/finance/chart-of-accounts` (`?sel=5110` opens an account).
Uses the List template's **editor** option (records edited in the drawer) — see
`docs/erp-app/README.md` → Page templates.

- **Files:** `features/finance/chart-of-accounts/ChartOfAccountsPage.tsx` (dataset + field list),
  rules `domain/chart-of-accounts.ts` (+ tests), route `routes/finance/chart-of-accounts/index.tsx`.
- **Same as the prototype:** columns (Code, Account name, Type, Group, Normal balance, Posting,
  Source pill, Status pill, hidden Description), views (All accounts, Assets, Liabilities,
  Expenses, Custom accounts, Inactive), filters, field list, validation messages, system-account
  locks (code, type, group, posting, status — only name and description editable), auto-proposed
  next code per type/group while creating until the code is manually edited, duplicate as `CODE`
  next free slot + `(copy)` name, "Used by charges" fact, and delete/deactivation blocked for
  system accounts and accounts referenced by charges.
- **Changed to follow the project rules (deliberate):**
  - *Edit in place* — editing swaps values for controls in the same rows; the
    prototype opened a separate form.
  - *Quiet pages* — field hints moved from under each control into an ⓘ tooltip
    on the label.
- **Shortcuts:** N new, E edit, Enter / double-click edit, Ctrl/Cmd+S or
  Ctrl/Cmd+Enter save, Esc cancel then close.
- **Persistence:** `shelfree.v2.accounts`; `createdAt` / `updatedAt` stamped on save.
- **Backend:** `PUT /accounts/{code}` must re-run the same validation (4-digit
  code + type prefix range + uniqueness, case-insensitive name uniqueness, valid
  group for type, block deactivation while an active charge uses the account) and
  reject edits to locked fields of system accounts; `DELETE` rejected for system
  accounts and accounts referenced by any charge.
- **Tests:** `apps/web/e2e/chart-of-accounts.spec.ts`, `src/domain/chart-of-accounts.test.ts`.
