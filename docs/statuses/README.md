# Statuses & stages — Settings ▸ Statuses & stages (shared list)

## Overview
The status list of each document flow: purchase order, goods receipt, sales order, sales invoice, bill of
materials and assembly order. **System** statuses are the ones the app's own rules move documents through (locked);
**custom** statuses are the business's own stages (Kanalora examples: a *Packed* stage on sales orders, *Awaiting QC*
on purchase orders). Each status has a **Type** (Open / Closed), a **Colour** (tone) and an **Order** in its flow.

The prototype only had a read-only preview of this page (`cfg-statuses`: Flow · Status · Type, four example rows,
"Custom statuses for orders, POs and invoices"). The React app builds it as a real list from that model.
Tier: parked (POC) — ungated. Future-pass hint: Growth.

## Screens & states
- **Module slices** — `/purchasing/settings/statuses`, `/sales/settings/statuses`, `/production/settings/statuses`:
  only that module's documents, grouped by document. Other modules have no statuses entry.
- **Shared list** — `/settings/shared/statuses` (owner / admin): every status, with a **Module** column.
- Grid: Status · (Module) · Type · Colour · Order · Source (System / Custom), grouped by Document. Views: All, Open,
  Closed, Custom. Drawer: Document · Status · Type · Colour · Order. System rows open view-only with the reason.
- States: loading, error with retry, empty ("No statuses match."; "No document in this module uses statuses yet."),
  read-only (View only line, no New / Edit / Delete).

## Data model
`StatusDef { id: 'STS0001'…, flow: 'purchase-order'|'purchase-receipt'|'sales-order'|'sales-invoice'|'bom'|'assembly-order', module: string, name: string(2–24), category: 'open'|'closed', tone: 'neutral'|'info'|'warn'|'ok'|'bad', order: int ≥1, system: boolean }`
- **One module per status (decision for gap G-011):** a status belongs to one flow and a flow to exactly one module,
  so the record carries a single `module` derived from `flow` (never chosen). Slices filter by equality.

## Interactions & business rules
- Name unique within its flow (case-insensitive), 2–24 characters; whole-number order from 1; New defaults to the
  next order in the flow. Document is fixed after create. Module is derived from the document.
- System statuses can't be edited or deleted (reason shown). Custom statuses can be edited and deleted.
- Keyboard: N new · E edit · Ctrl+S save · Esc · Delete (listed in *Settings › Statuses & stages*).

## Persistence
`shelfree.v2.statuses` (`api.statuses`, schema `statusDefSchema`), seeded by `seedStatuses()` from today's
hard-coded document statuses (tones follow `domain/status.ts`) plus two custom examples.

## Backend-build notes
- Entity `status_defs` (tenant_id, id, flow enum, name, category, tone, sort_order, is_system, created/updated by/at).
  Unique (tenant_id, flow, lower(name)). System rows seeded per tenant and immutable.
- Endpoints: `GET /statuses?module=&flow=`, `POST /statuses`, `PATCH /statuses/:id`, `DELETE /statuses/:id`.
- Server enforces: flow / category / tone enums; unique name per flow; system rows can't be changed or deleted;
  **delete blocked while any document is in that status** (count returned) — the frontend has no document that can
  hold a custom status yet; module is derived from flow.
- Documents' status transitions (draft → issued → …) stay in code (`domain/purchase-order.ts` etc.); a custom stage
  needs a rule for where it sits between system statuses (the Open / Closed type decides pending counts).

### React app (2026-11-25)
URLs above; code `apps/web/src/features/settings/statuses/` + `domain/statuses.ts` (+ tests); built on `ListPage
embedded` + `editor`. Shortcuts group *Settings › Statuses & stages*. Permission: Manage settings for the module
(slices), owner / admin (shared). Audit: status create / edit / delete (before → after). Tests:
`domain/statuses.test.ts`, `e2e/settings-purchasing.spec.ts`.

### Decisions & deferred-to-backend
- **Documents do not read this list yet.** Purchase orders, receipts, sales orders / invoices, BOMs and assembly
  orders still use their hard-coded status enums (`PO_STATUSES`, …); a custom status is listed here but can't be
  chosen on a document. Rewiring each document's status field to this list is gap **G-013** (each stage as it touches
  that document).
- The prototype preview had no colour or order; they were added so the list is useful (status always shows colour
  and text).
