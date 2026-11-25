# Payment terms — Settings ▸ Payment terms (shared list)

## Overview
Default terms offered to customers and agreed with vendors (prototype `cfg-terms`: Code · Name · Net days; NET30,
NET15, COD, EOM). A term can serve **Purchasing, Sales or both**. Tier: parked (POC) — ungated. Future-pass hint:
Growth.

## Screens & states
- **Module slices** — `/purchasing/settings/terms`, `/sales/settings/terms`: terms offered in that module (a term that
  serves both appears in both). Other modules have no payment terms entry. **Shared list** —
  `/settings/shared/terms` with a **Module** column ("Purchasing, Sales").
- Grid: Code · Name · Net days · (Module) · Used by · Status. Views: All, Active, Inactive. Drawer: Code · Name · Net
  days · Purchasing switch · Sales switch · Status; view mode shows who uses it.
- States: loading, error, empty, read-only.

## Data model
`PaymentTerm { code: string(2–12, PK), name: string, days: int 0–365 | null, modules: string[] (≥1 of 'purchasing' | 'sales'), active: boolean }`
- **Several modules per term (decision for G-011):** `modules[]`; a module slice filters by inclusion. The drawer
  edits it as two switches (Purchasing, Sales). `days: null` means no fixed days (end of month); `0` = due on
  delivery.
- Vendors store `paymentTerms` and customers `terms` as **free text** (`NET 30`). A term is "in use" when that text
  matches its code or name ignoring case, spaces and hyphens (`NET 30` = `NET30`).

## Interactions & business rules
- Code 2–12 letters / digits / hyphens, unique, **locked once a vendor or customer uses it**. Name unique
  (case-insensitive). Net days whole 0–365 or blank. At least one module.
- A module can't be switched off while its records use the term (vendors for Purchasing, customers for Sales).
- **Delete blocked while a vendor or customer uses the term** (reason with counts); otherwise confirmed, with undo.
  Inactive terms stay on the records that use them but aren't offered to new ones.
- Keys: N, E, Ctrl+S, Esc, Delete (*Settings › Payment terms*).

## Persistence
`shelfree.v2.paymentTerms` (`api.paymentTerms`, schema `paymentTermSchema`), seeded by `seedPaymentTerms()` (the four
prototype terms, offered to both modules — the seeded vendors use NET 30 / NET 15 and customers NET 15 / NET 30).

## Backend-build notes
- Entities `payment_terms` (tenant_id, code, name, days null, is_active) and `payment_term_modules` (tenant_id, code,
  module). `vendors.payment_term_code` and `customers.payment_term_code` → FK `payment_terms`.
- Endpoints: `GET /payment-terms?module=`, `POST`, `PATCH /:code`, `DELETE /:code`.
- Server enforces: code format / uniqueness / immutability when referenced; name unique; days range; ≥ 1 module;
  can't drop a module still referenced; delete blocked when referenced (counts); inactive terms rejected on new
  vendors / customers. Due dates on bills and invoices derive from `days`.

### React app (2026-11-25)
Code `apps/web/src/features/settings/payment-terms/` + `domain/payment-terms.ts` (+ tests); `ListPage embedded` +
`editor`. Permission: Manage settings for the module (slices), owner / admin (shared). Audit: term create / edit /
activate / delete. Tests: `domain/payment-terms.test.ts`, `e2e/settings-purchasing.spec.ts`.

### Decisions & deferred-to-backend
- **Vendor and customer terms are still free text** (gap **G-015**): the vendor and customer editors don't pick from
  this list yet, so the "in use" match is by text. Converting those fields to a picker (and storing the term code) is
  the follow-up; until then a typo on a vendor won't count as a use.
