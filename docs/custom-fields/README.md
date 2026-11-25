# Custom fields — Settings ▸ Custom fields (shared list)

## Overview
Definitions of extra fields a business adds to its records: *Country of origin* and *Hazard class* on items,
*Loyalty tier* on customers (the prototype's three examples, `cfg-fields`), plus Kanalora's *Kiln batch capacity* and
*Licence valid till* on vendors and *Kiln batch ref.* on purchase orders. Tier: parked (POC) — ungated. Future-pass
hint: Enterprise.

The prototype only had a read-only preview (Entity · Field · Type). The React app builds the definitions list; the
values on records are not built (see decisions).

## Screens & states
- **Module slices** — `/purchasing/settings/fields` (vendors, purchase orders), `/warehouse/settings/fields` (items),
  `/production/settings/fields` (BOMs, assembly orders), `/people/settings/fields` (employees),
  `/sales/settings/fields` (customers, sales orders). **Shared list** — `/settings/shared/fields` with a **Module**
  column.
- Grid: Field · (Module) · Type · Choices · Required · Status, grouped by *Added to*. Views: All, Required, Inactive.
  Drawer: Added to · Field · Type · Choices (List only) · Required · Status.
- States: loading, error, empty, read-only.

## Data model
`CustomField { id: 'CF0001'…, entity: 'item'|'vendor'|'purchase-order'|'customer'|'sales-order'|'bom'|'assembly-order'|'employee', module: string, label: string(2–40), type: 'text'|'number'|'date'|'list'|'yesno', options: string[], required: boolean, active: boolean }`
- **One module per field (decision for G-011):** an entity belongs to exactly one module, so the definition carries a
  single `module` derived from `entity`. Slices filter by equality.

## Interactions & business rules
- Label unique per entity (case-insensitive), 2–40 chars. A List field needs at least two distinct choices
  (typed comma-separated; blanks and case-insensitive duplicates dropped, order kept).
- *Added to* is fixed after create. Module derived from the entity. Required and Status are switches.
- Delete: always allowed today — no values are stored (nothing to protect). Keys: N, E, Ctrl+S, Esc, Delete
  (*Settings › Custom fields*).

## Persistence
`shelfree.v2.customFields` (`api.customFields`, schema `customFieldSchema`), seeded by `seedCustomFields()`.

## Backend-build notes
- Entities `custom_field_defs` (as above) and `custom_field_values` (tenant_id, def_id, entity_id, value jsonb).
  Unique (tenant_id, entity, lower(label)).
- Endpoints: `GET /custom-fields?module=&entity=`, `POST`, `PATCH /:id`, `DELETE /:id`.
- Server enforces: enums; unique label per entity; list needs ≥ 2 options; entity immutable; type immutable once
  values exist (or a conversion rule); **delete blocked (or values removed after confirm) while values exist**;
  required fields enforced on the entity's save endpoint.

### React app (2026-11-25)
Code `apps/web/src/features/settings/custom-fields/` + `domain/custom-fields.ts` (+ tests); `ListPage embedded` +
`editor`. Permission: Manage settings for the module (slices), owner / admin (shared). Audit: definition create /
edit / delete. Tests: `domain/custom-fields.test.ts`, `e2e/settings-purchasing.spec.ts`.

### Decisions & deferred-to-backend
- **Values are not captured or shown on records yet** (gap **G-014**): the definitions exist, but no vendor, item,
  customer… page renders them, so *Required* isn't enforced anywhere and delete is never blocked. A record page /
  drawer needs a "Custom fields" card (via `FieldRows`) fed by the definitions for its entity.
- Sales orders, BOMs, assembly orders and employees are listed as entities so the Sales, Production and People
  slices work; Finance has none.
