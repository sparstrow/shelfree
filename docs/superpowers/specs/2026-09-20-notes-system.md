# Spec — Generic multi-note system

Status: **approved and built** (2026-09-20). Implementation and the backend
contract live in [`../../notes/README.md`](../../notes/README.md).

## Problem

Today "Notes" is a single free-text field embedded on each document (Purchase
Order, Purchase Receipt, BOM, Assembly Order) — one note, overwritable by
whoever edits the record. Customers already deviate from this: `customer.notes`
is a list of `{id, at, by, text}` entries with an inline delete button.

Real usage needs: multiple people add notes to the same record over time, each
note permanently attributed to its author with a timestamp, nothing editable or
deletable (so a note can't be quietly rewritten to change what happened), plus
a system-wide place to review notes across every record. This replaces both the
single-string pattern and the customer list-with-delete pattern with one
consistent model used everywhere.

## Scope (this pass)

Entities gaining the new notes system now: **Purchase Orders, Purchase
Receipts, BOMs, Assembly Orders, Customers, Vendors, Items**. Sales Orders/
Invoices get it when those documents are built (Sales stage, per CLAUDE.md
module sequence) — the model below is generic per `{entityType, entityId}` so
that's additive, not a rework.

## Data model

Single global collection, not embedded per-record (embedding would force the
standalone Notes page to scan every dataset):

```js
note = {
  id: 'N-' + timestamp,
  entityType: 'purchaseOrder' | 'purchaseReceipt' | 'bom' | 'assemblyOrder'
            | 'customer' | 'vendor' | 'item',
  entityNo: '<the record's .no>',   // e.g. 'PO00001'
  text: '...',
  authorId: employeeId, authorName: '...',   // denormalized for display
  createdAt: ISO datetime,                    // never changes
  status: 'valid' | 'invalid',                // default 'valid'
  invalidReason: '...' | null,
  invalidatedBy: employeeId | null, invalidatedByName: '...' | null,
  invalidatedAt: ISO datetime | null,
}
```

Stored as `state.notes: []` (seed data in `prototype/lib/shelfree-data.js`). Migration:
existing free-text `notes` strings on PO/PR/BOM/AO seed records become one
initial note each (authored by the record's creator, `createdAt` = record's
creation date), then the string field is dropped from those records. Existing
`customer.notes[]` entries migrate into the global collection the same way,
dropping the per-customer array and its delete button.

## Rules (immutability)

- **Create-only.** No edit, no delete, by anyone, ever — including admins.
  This is the entire point: a note is what was actually said, with an
  attribution and a timestamp that can't be revised after the fact.
- **Invalidate, don't delete.** A note can transition `valid → invalid` exactly
  once. This is one-way — an invalidated note cannot be restored to valid
  (keeps the audit trail unambiguous; flag if you'd rather allow reversal).
- **Who can invalidate:** the note's own author, or a user with role **Admin**
  or **Manager** (existing `pplRoles()` roles — no new role needed; the real
  backend needs an RBAC/access table behind this check). Anyone
  else (including other non-admin employees) cannot touch another user's note
  at all, matching the "employees can't rewrite each other's notes" goal.
- Invalidating **requires a short reason**, itself permanent/unfaked once
  entered — same append-only treatment as the note text.
- Adding a note only requires read access to that record's module (communicating
  shouldn't be gated behind write access) — flag if you want it write-gated
  instead.

## Per-record UI (e.g. the PO editor notes block in the screenshot)

Replaces the single `<textarea>` with:
- An "Add a note…" input + Add button (same visual pattern as the Customer
  page's note composer today).
- A **scrollable list**, max-height so it doesn't push page layout (~260px,
  `overflow-y:auto`), **newest first**.
- Each row: **author name + date/time** on one line, note text below (per
  your requested order), no delete/edit affordance anywhere.
- Invalid notes are **hidden by default**; a small "Show N invalid note(s)"
  toggle reveals them, greyed out with an "Invalid" badge and the reason shown
  on hover/expand.
- Rows belonging to entities the current user can invalidate get a small
  "Mark invalid" action (author or Admin/Manager only) opening a one-field
  reason prompt; everyone else sees no action at all.

## Standalone Notes page

New top-level sidebar item **"Notes"**. A table (same grid conventions as the
rest of the app — toolbar, column picker, density, export) listing every note
system-wide:

Columns: Entity type, Entity (clickable, opens that record in a new tab),
Note (truncated, full text on hover/expand), Author, Date/time, Status
(Valid/Invalid pill). Filters: entity type, author, status, date range, text
search. Invalid notes visible here by default (this is the audit view — the
per-record hide is about decluttering the working document, not concealment).

Visibility: a user only sees notes for entity types they have at least read
access to in the existing per-module `perms` matrix (a Sales-only user
shouldn't see BOM/production notes here).

## Open items

- Reversing an invalidation: currently one-way. Confirm before build.
- Should invalidating require write (not just read) access to the module, on
  top of the author/Admin/Manager rule? Currently: author/Admin/Manager only,
  independent of module perms.
- Item and Vendor detail pages don't have a notes block today — this adds one,
  same pattern as Customer's "Notes & activity" tab.

## Decisions from Q&A (2026-09-20)

- Scope confirmed: PO, PR, BOM, AO, Customers, Vendors, Items.
- Invalidate = the note's author + Admin/Manager; needs a real RBAC/access
  table in the backend build.
- Reason required, and the reason itself is permanent (no later edits).
- Invalid notes hidden by default on the record, revealed by a toggle; visible
  by default on the Notes page (audit view).
- Notes page is a new top-level sidebar item.
- Every note carries the record's own primary key (order no / item no / BOM
  no …) as its Reference, shown as the Notes page's first column, so notes can
  be narrowed to one record.

## Backend-build notes

- New table `notes` (append-only): `id, entity_type, entity_id, tenant_id,
  text, author_id, created_at, status, invalid_reason, invalidated_by,
  invalidated_at`. No `updated_at` on `text` — the row's text/author/
  created_at are write-once at the DB layer, not just the UI.
- The `invalid` transition is the **only** permitted UPDATE, scoped to
  `status/invalid_reason/invalidated_by/invalidated_at`, gated server-side by
  `author_id == current_user OR current_user.role IN (admin, manager)` — the
  frontend check is not sufficient on its own.
- Audit log: emit an audit event on note create and on invalidate (per
  `docs/security/README.md`'s "create/edit/delete" audit requirement — treat
  invalidate as the "edit" case here since text itself never changes).
- Notes list queries must be tenant + entity scoped
  (`GET /notes?entityType=&entityId=`), and the standalone page's query filtered
  server-side by the requesting user's module read access — never an unscoped
  client-side scan.
- Per-page docs to update at build time: `docs/purchase-orders/`,
  `docs/purchase-lines/` (receipts), `docs/boms-assembly-production-orders/`,
  `docs/customer-page/`, plus new `docs/notes/README.md` for the standalone
  page, and new `docs/item-page/` / vendor doc entries for their new notes tab.
