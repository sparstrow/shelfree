# Number sequences

## Overview
Shared document-numbering rules and sequences across Kanalora's modules (`purchasing`, `sales`,
`warehouse`, `production`, `people`). Each document type has at least one active series and
**exactly one default series** that issues sequential formatted numbers (e.g. `PO00011`, `GRN00006`,
`SO00015`, `INV00011`, `ITM00001`, `BOM00010`, `AO00007`, `EMP00022`). Multiple series per document
type (e.g. per financial year, branch/GSTIN, or warehouse) are supported without colliding.

Live since 2026-11-25 (Settings redesign, Phase 1). Purchase orders and goods receipts take their numbers
from the default series; the other document types have series and rules but are not wired yet.

## Screens & states
One section, two places (code: `apps/web/src/features/settings/number-sequences/`):

| Where | URL | Shows |
|---|---|---|
| Module slice | `/purchasing/settings/sequences`, and the same under `/sales`, `/warehouse`, `/production`, `/people`, `/finance` | Only series whose `module` is that module. New pre-fills the module's first document type. |
| Shared list | `/settings/shared/sequences` | Every series, with a **Module** column. Owner and admin only. |

It is a **list** section on `ListPage embedded` (same grid, drawer, keys and undo as every list).
- **Grid:** grouped by document type (a hidden `Document type` column is the group). Columns: **Series**
  (name, frozen), **Module** (shared list only), **Format** (pattern such as `PO#####`, Geist Mono),
  **Next number** (live preview, Geist Mono), **Resets**, **Status** (pill: Default, Active, Inactive).
  Views: All series, Default, Active, Inactive. Filters: document type, series, module, resets, status.
- **Drawer (view):** next number, status, name, document type, and facts Format and Issued. When numbers
  were issued, a notice says the series cannot be deleted. **Set as default** shows for an active
  non-default series (row menu and drawer footer).
- **Drawer (edit / new):** Document type (locked once the series has issued a number), Name, Prefix, Digits,
  Suffix, Next number, Resets, Active, Default, and a live "Next number / Format" preview. New starts with
  5 digits, next 1, never resets, and is the default when its document type has none.
- **Delete** is blocked once a series has issued a number: "Numbers were already issued from this series —
  make it inactive instead." An unused series deletes, with undo.
- **Read-only** (no Manage settings right): no New, Edit, Delete or Set as default; the drawer opens in view
  mode. A module with no document types of its own (Finance today) shows an empty read-only list.
- **States:** loading, error with retry, empty ("No number sequences yet. Add one to issue numbers
  automatically.").
- **Quiet help:** `help.ts` map (page, docType, name, prefix, digits, suffix, next, resets, active, isDefault).
- **On documents:** a new PO or receipt shows a **preview number** (the default series' next number) until it
  is saved or posted, see "Where numbers are issued".

## Data model
`NumberSequence` (`numberSequenceSchema` in `apps/web/src/data/schemas/index.ts`):
- `id`: `string` (`SEQ00001`+)
- `docType`: `'purchase-order' | 'purchase-receipt' | 'sales-order' | 'sales-invoice' | 'item' | 'bom' | 'assembly-order' | 'employee'`
- `module`: `string` — derived from `docType` via `moduleOfDocType()` (`purchase-order` / `purchase-receipt` → `purchasing`, `sales-order` / `sales-invoice` → `sales`, `item` → `warehouse`, `bom` / `assembly-order` → `production`, `employee` → `people`)
- `name`: `string` (Kanalora labels: `Purchase orders`, `Goods receipts`, `Sales orders`, `Sales invoices`, `Items`, `Bills of materials`, `Assembly orders`, `Employees`)
- `prefix`: `string`
- `digits`: `number` (integer `1..10`, minimum zero-pad width — numbers past `10^digits - 1` expand naturally rather than truncating)
- `suffix?`: `string`
- `next`: `number` (integer `>= 1`)
- `resets`: `'never' | 'yearly-apr' | 'yearly-jan'`
- `isDefault`: `boolean`
- `active`: `boolean`
- `issued`: `number` (integer `>= 0` — count of numbers issued by this series)
- `scope?`: `{ warehouseId?: string; gstin?: string }`

## Interactions & business rules
Pure rules in [`apps/web/src/domain/number-sequences.ts`](../../apps/web/src/domain/number-sequences.ts)
(tests in [`number-sequences.test.ts`](../../apps/web/src/domain/number-sequences.test.ts)):
- **Formatting (`formatNumber`, `previewNext`):** `prefix + padStart(n, digits, '0') + suffix`.
- **Validation (`validateSeries`):**
  - `name` is required.
  - `prefix` is required unless `suffix` is non-empty.
  - `digits` must be an integer from `1` to `10`.
  - `next >= issued + 1` and **monotonic**: `next` may never be reduced below its saved value (prevents reusing previously issued numbers).
  - **Unique output per `docType`:** two active series of the same `docType` cannot produce overlapping number strings (prevents duplicate document numbers across active series). Inactive series are excluded so retired series do not block replacements.
  - **One default per `docType`:** each `docType` has exactly one default series, and that default series must remain `active`. Clearing the default flag is refused while no other series of the type is the default, so to retire the default, make another series the default first.
- **Saving a series as default takes the default over.** Saving a series with `isDefault` true (new or edit)
  validates normally, then demotes the type's previous default in the same write (`saveNumberSequence`,
  using `setDefault`). An existing default is not an error.
- **Delete protection (`canDeleteSeries`):** only series with `issued === 0` can be deleted; any series that has already issued numbers must be deactivated (`active: false`) instead.
- **Set as default (`setDefault`, `setDefaultNumberSequence`):** makes the target active series the sole default for its `docType` (refuses inactive targets). Shown in the UI as the **Set as default** action.
- **Issuing (`takeNext`):** formats `series.next` and increments `next` and `issued` by `1` on an active series.
- **Never reuse a number (`nextFree`):** `issueNumber` calls `nextFree(series, existingNos)`. It parses every
  existing document number that matches the series' prefix and suffix and starts at
  `max(series.next, highestExisting + 1)`. While the formatted number still exists, it moves up by one. So a
  stale `next` (behind numbers typed or imported by hand) is skipped, never reused. It then advances `next`
  and `issued` (through `takeNext`) and the series is saved. It throws for an inactive series.
- **`issueNumber(docType)`** (command): reads the type's default active series. With none, it fails with
  "No active number series for <type>. Add one in Settings ▸ Number sequences." It lists the existing numbers
  of that document type (POs, receipts, orders, invoices, items, BOMs, assembly orders; employee ids).
- **Where numbers are issued:**
  - **Purchase order:** on the first save of a new PO (`createPurchaseOrder`), as a draft or issued. The
    editor shows the **preview** (`previewNext` of the default series) until then. The stored number is the
    one `issueNumber` returns, which can differ from the preview if another document took it first. After
    saving, the toast and the list selection use the issued number.
  - **Goods receipt:** a new receipt is numbered on first save (`createPurchaseReceipt`) or, when posted
    straight from the new-receipt screen, on first post (`postPurchaseReceipt(draft, { isNew: true })`). The
    caller says the receipt is new; the command never guesses from the number, because a preview number can
    match a stored receipt when `next` is stale, and that receipt must not be overwritten.
  - **Duplicate purchase orders** (`duplicatePurchaseOrders`): each copy issues its own number from the
    default PO series, one at a time, and is saved as a Draft.
  - Editing, issuing, locking or posting an existing document never issues a new number.
  - Sales orders, sales invoices, items, BOMs, assembly orders and employees are not wired yet: their
    series exist (seeded) but nothing issues from them.
- **`resets` is stored, not applied.** Nothing rolls the counter over at a year end yet.
- **Document type is locked once issued** (the drawer locks it). The command layer does not re-check this;
  the backend must.

## Persistence
- **Collection key:** `shelfree.v2.numberSequences` via `api.numberSequences`
  ([`apps/web/src/data/api/index.ts`](../../apps/web/src/data/api/index.ts)).
- **Seed:** [`seedNumberSequences()`](../../apps/web/src/data/seed/number-sequences.ts) computes one
  default active series per `docType` directly from the existing seed documents (`next` = highest
  existing number matching prefix + `1`, `issued` = count of matching documents; seeded `items` use
  user SKUs rather than `ITM`, so the `item` series starts at `next = 1`, `issued = 0`).
- **Commands & query hooks:** `saveNumberSequence`, `deleteNumberSequence`, `setDefaultNumberSequence`,
  `issueNumber`, `createPurchaseOrder`, `createPurchaseReceipt` (and `duplicatePurchaseOrders`,
  `postPurchaseReceipt`, which now issue numbers) in
  [`apps/web/src/data/api/commands.ts`](../../apps/web/src/data/api/commands.ts);
  `useNumberSequences`, `useSaveNumberSequence`, `useDeleteNumberSequence`, `useSetDefaultNumberSequence`
  in [`apps/web/src/data/queries/number-sequences.ts`](../../apps/web/src/data/queries/number-sequences.ts)
  (re-exported from `data/queries/index.ts`).

## Backend-build notes
- **Endpoints:**
  - `GET /number-sequences` (optional `?module=` filter)
  - `POST /number-sequences` — create series
  - `PUT /number-sequences/:id` — update series
  - `DELETE /number-sequences/:id` — delete unused series (`409 Conflict` when `issued > 0`)
  - `POST /number-sequences/:id/default` — atomically switch default series for `docType` (`400`/`409` if inactive)
  - `POST` / `PUT` with `isDefault: true` demote the previous default in the same transaction.
  - `POST /number-sequences/:docType/issue` — internal only; document create endpoints issue their own
    number (below). The UI does not call it directly once the backend exists.
- **Server-side transactional issuance:** document numbers are **always issued server-side in the same
  database transaction as the document creation** (`SELECT ... FOR UPDATE` on the series row, then
  `UPDATE number_sequences SET next = next + 1, issued = issued + 1 WHERE ... RETURNING`, then insert the
  document). Client previews are display-only and must never be trusted as assigned numbers; the create
  response carries the real number.
- **GST audit rules the backend must enforce:**
  - Gaps and duplicates matter for GST tax audits (sequential invoice/document numbering under GST law).
    Once a number is issued, `issued` increments monotonically, `next` may never move backward, and
    issued series cannot be deleted (deactivate only). Duplicate numbers within a `(tenant_id, doc_type)`
    must be impossible (unique index on `(tenant_id, doc_type, number)` on the issued documents table, plus
    non-overlapping active format validation).
  - Tax invoices and credit notes must be gapless: a rolled-back document transaction rolls back the counter
    too, so no number is burned. A number that was issued and later voided stays on a cancelled document;
    never delete it and never reuse it. Purchase orders and receipts are internal documents: a gap is
    tolerated there, but a number is still never reused.
- **Security checklist (per-feature):**
  - Tenant isolation: every sequence and document number uniqueness check is scoped by `tenant_id`.
  - RBAC: reads require authenticated workspace member with module read access; `POST/PUT/DELETE/default`
    require Workspace admin/owner or `user.settings[module] === true` (`403 Forbidden` otherwise). The shared
    list (all modules) is owner / admin only. The read-only UI is UX only.
  - Audit events: log actor, timestamp, and before/after diff on sequence create, update (especially
    `next` bumps, `active` toggles, format changes), set default, deactivate and delete, plus the sequence
    ID used on every issued document.
  - No PII stored.

### Decisions & deferred-to-backend
- **Atomicity is not real in the frontend.** `issueNumber` and the document upsert are separate writes, so a
  failed document save can burn a number. The backend must do both in one transaction (see above).
- **Stale `next`:** keep the `nextFree` behaviour server-side (skip past the highest existing number that
  matches the series pattern, then rely on the unique index).
- **Yearly resets** (`yearly-apr`, `yearly-jan`) are deferred to the backend transaction / scheduler, keyed by
  document date and financial year with a per-year counter. The format must carry the year (e.g. suffix
  `/26-27`) so numbers stay unique.
- **Deferred:** wiring sales orders, invoices, items, BOMs, assembly orders and employees to issue from their
  series; using `scope` (warehouse, GSTIN) to choose a series; a series picker on documents (only the default
  series is used today); the spec's `modules: string[]` (a series has one `module`).
