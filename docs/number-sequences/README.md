# Number sequences

## Overview
Shared document-numbering rules and sequences across Kanalora's modules (`purchasing`, `sales`,
`warehouse`, `production`, `people`). Each document type has at least one active series and
**exactly one default series** that issues sequential formatted numbers (e.g. `PO00011`, `GRN00006`,
`SO00015`, `INV00011`, `ITM00001`, `BOM00010`, `AO00007`, `EMP00022`). Multiple series per document
type (e.g. per financial year, branch/GSTIN, or warehouse) are supported without colliding.

## Screens & states
- **Data layer ready (2026-11-25):** schema, seed, domain rules, transactional commands, and query
  hooks are implemented. The Settings UI section (`NumberSequencesSection` at
  `/settings/shared/sequences` and `/<module>/settings/sequences`) ships in a follow-up task.

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
  - **One default per `docType`:** each `docType` has exactly one default series, and that default series must remain `active`.
- **Delete protection (`canDeleteSeries`):** only series with `issued === 0` can be deleted; any series that has already issued numbers must be deactivated (`active: false`) instead.
- **Default switching (`setDefault`):** atomically makes the target active series the sole default for its `docType` (refuses inactive targets).
- **Issuing (`takeNext`):** formats `series.next` and increments `next` and `issued` by `1` on an active series.

## Persistence
- **Collection key:** `shelfree.v2.numberSequences` via `api.numberSequences`
  ([`apps/web/src/data/api/index.ts`](../../apps/web/src/data/api/index.ts)).
- **Seed:** [`seedNumberSequences()`](../../apps/web/src/data/seed/number-sequences.ts) computes one
  default active series per `docType` directly from the existing seed documents (`next` = highest
  existing number matching prefix + `1`, `issued` = count of matching documents; seeded `items` use
  user SKUs rather than `ITM`, so the `item` series starts at `next = 1`, `issued = 0`).
- **Commands & query hooks:** `saveNumberSequence`, `deleteNumberSequence`, `setDefaultNumberSequence`
  in [`apps/web/src/data/api/commands.ts`](../../apps/web/src/data/api/commands.ts);
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
- **Server-side transactional issuance:** document numbers are **always issued server-side in the same
  database transaction as the document creation** (`SELECT ... FOR UPDATE` / `UPDATE number_sequences
  SET next = next + 1, issued = issued + 1 WHERE ... RETURNING`). Client previews are display-only and
  must never be trusted as authoritative assigned numbers.
- **GST audit rules the backend must enforce:**
  - Gaps and duplicates matter for GST tax audits (sequential invoice/document numbering under GST law).
    Once a number is issued, `issued` increments monotonically, `next` may never move backward, and
    issued series cannot be deleted (deactivate only). Rolled-back document transactions may leave gaps
    without reusing numbers; duplicate numbers within a `(tenant_id, doc_type)` must be impossible
    (enforced with a unique index on `(tenant_id, doc_type, number)` on the issued documents table and
    non-overlapping active format validation).
- **Security checklist (per-feature):**
  - Tenant isolation: every sequence and document number uniqueness check is scoped by `tenant_id`.
  - RBAC: reads require authenticated workspace member with module read access; `POST/PUT/DELETE/default`
    require Workspace admin/owner or `user.settings[module] === true` (`403 Forbidden` otherwise).
  - Audit events: log actor, timestamp, and before/after diff on sequence create, update (especially
    `next` bumps, `active` toggles, format changes), delete, and `default` changes, plus sequence ID
    used on every issued document.
  - No PII stored.

### Decisions & deferred-to-backend
- Number sequence issuance wiring for Purchase Orders / Purchase Receipts and the embedded list UI
  screen ship in Task 9.
- Automated period rollovers for `yearly-apr` (Indian fiscal year) and `yearly-jan` resets are
  deferred to the backend transaction / scheduler (keyed by document date & financial year counter).
