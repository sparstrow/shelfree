# Carrier types — Settings ▸ Configuration ▸ Carrier types

## Overview
User-maintained list behind the **Type** field on Purchasing ▸ Carriers. Ships with three
built-in types — **COURIER** Courier, **GTA** Transporter (GTA), **OWN** Own vehicle — and
lets the business add its own (rail parcel, bus parcel, vendor delivery, …).
Every type picks one of three fixed **behaviours**, because behaviour drives GST treatment and
which carrier fields apply:
- `courier` — *Forward-charge carrier*: bills freight with GST; GSTIN optional; tracking link.
- `gta` — *Goods transport agency (GTA)*: road transporter issuing an LR (lorry receipt);
  carriers of this type default to **reverse charge** (we pay GST on the freight).
- `own` — *Own vehicle*: no GSTIN, GST or tracking link.
Built in `prototype/designs/erp/Shelfree App.dc.html` (`carrTypes()`, `ctVM()`, template
"SETTINGS · CARRIER TYPES"). Tier: parked (POC) — ungated. Future-pass hint: Starter base.

## Screens & states
- **List:** Code (mono) · Type (name + Built-in pill + description) · Behaves as · Tracking
  ref. · Carriers (count using it, tabular) · Status pill · Actions (edit, delete). Inactive
  rows are dimmed. Below: "What each behaviour does" explainer cards.
- **Editor modal (new / edit):** Code (locked after create) · Name · Behaves as (radio cards;
  locked for built-in types and types in use, with the reason) · Tracking ref. label (hidden
  for Own vehicle) · Description · Active switch · form error banner.
- **Delete confirm** dialog; **row context menu** (Edit · Activate/Deactivate · Delete or the
  reason delete is blocked).

## Data model
`CarrierType { code: string(2–12, A–Z 0–9 -, PK), name: string, behavior: 'courier'|'gta'|'own', refLabel: string(≤16)|'', desc: string, active: boolean, system: boolean, createdAt?: ISO, updatedAt?: ISO }`
- `Carrier.type` now stores the **type code** (was the display name). Legacy stored carriers
  holding names are mapped to codes on load (`carrReg().merge`).
- Carriers grid gains a hidden **Behaves as** column/filter; the *Transporters (GTA)* view
  filters on behaviour, so renamed or custom GTA-type types are included.

## Interactions & business rules
- Code: 2–12 uppercase letters/digits/hyphens, unique, **immutable** (carriers reference it).
- Name required, unique (case-insensitive).
- Behaviour is **locked** for built-in types and for any type used by ≥1 carrier — changing it
  would silently flip existing carriers' GST treatment. Create a new type instead.
- Changing behaviour on a draft suggests the ref. label (AWB / LR no. / blank) unless the user
  typed a custom one. Blank ref. label displays as "Tracking no.".
- At least one type must stay active. Inactive types aren't offered on new carriers; carriers
  already using one keep it (shown "(inactive)" in their Type dropdown).
- Delete blocked for built-in types and types in use (reason shown); otherwise confirmed.
- Carrier drawer: Type dropdown lists active types (+ the carrier's current one); switching to
  a GTA-behaviour type turns reverse charge on; courier-behaviour carriers without a link are
  flagged.
- Keyboard: N new type · double-click row edit · right-click row menu · Ctrl/Cmd+Enter or
  Ctrl/Cmd+S save · Enter confirms delete · Esc closes menu/dialog/editor. Listed in
  Settings ▸ Keyboard shortcuts ("Settings › Carrier types").

## Persistence
Workspace record `localStorage['shelfree.settings.workspace.v1'].carrierTypes` =
CarrierType[]. Absent → built-in defaults; built-ins missing from a saved list are merged back.

## Settings surfaces (per the scale rule)
- **Configuration:** this page.
- **Terminology:** type names and ref. labels are user-editable here, so no separate
  Terminology keys are needed for them.
- **User-level:** `carriers.manage` (or `settings.configure`) to edit; read for Purchasing users.

## Backend-build notes
- Entity `carrier_types` (tenant_id, code, name, behavior enum, ref_label, description,
  is_active, is_system, created_at/by, updated_at/by). Unique (tenant_id, code),
  (tenant_id, lower(name)). `carriers.type_code` → FK `carrier_types(tenant_id, code)`.
- Endpoints: `GET /carrier-types`, `POST /carrier-types`, `PATCH /carrier-types/:code`,
  `DELETE /carrier-types/:code`. Seed the three system rows per tenant.
- Server must enforce: code format/uniqueness/immutability; behaviour immutable when
  `is_system` or referenced by any carrier; ≥1 active type; delete blocked when system or
  referenced (return count); inactive types rejected on carrier create.
- GST logic keys off `behavior`, never the type name.

### Security checklist
- Tenant-scoped config; no PII. Audit events: type create / edit (field diff) / activate /
  deactivate / delete. Nothing sensitive in localStorage.

### Decisions & deferred-to-backend
- Behaviours are a fixed code-level enum (not user-definable) because they carry tax rules.
- Types live on the workspace settings record in the prototype; a real table in the backend.
- Reassigning carriers in bulk from one type to another is deferred (edit carriers one by one).

## React app (2026-11-25)
- **URL:** `/purchasing/settings/carrier-types` (Purchasing ▸ Settings, section type **list**; the old
  `/settings/carrier-types` redirects). Code: `apps/web/src/features/settings/carrier-types/`
  (`CarrierTypesSection.tsx`, `dataset.ts`, `help.ts`), rules in `domain/carrier-types.ts`
  (+ `carrier-types.test.ts`). Built on `ListPage embedded` with an `editor`: edit in place in the drawer.
- **Parity:** same three built-in types, behaviours, code / name / behaviour / ref. label / description / active
  fields, and the same validation and lock rules: code immutable, behaviour locked for built-in and in-use types, at
  least one active type, delete blocked for built-in and in-use types, ref. label suggested from the behaviour unless
  the user typed one. The quiet help in `help.ts` carries the explainer text (the three behaviours are the options of
  *Behaves as*).
- **Deliberate changes:** the prototype's "What each behaviour does" cards below the list are now the quiet help
  options on *Behaves as* (no inline description). The editor is the shared drawer, not a modal. There is no separate
  Activate / Deactivate menu item: *Status* is a switch in the drawer.
- **Data model:** `carrierTypeSchema` in `data/schemas` (`code` PK, `name`, `behavior`, `refLabel`, `desc`, `active`,
  `system`, `createdAt?`, `updatedAt?`). The grid adds a derived **Carriers** count (never stored).
- **Persistence:** collection `shelfree.v2.carrierTypes` (`api.carrierTypes`), seeded by `seedCarrierTypes()` from the
  three built-ins. Carriers already stored the type **code** (`Carrier.type`); Purchasing ▸ Carriers now reads the
  types from this collection (Type dropdown, behaviour, tracking ref., GST treatment, filters) instead of the
  built-in constants. The constants stay only as the fallback while the list loads.
- **Shortcuts:** group *Settings › Carrier types* in `src/app/shortcuts.ts` (N, E, Ctrl+S, Esc, Delete, list keys).
- **Permissions:** Purchasing ▸ Settings needs the Manage settings right for Purchasing (owner / admin always);
  other users see the list view-only. UX only; the backend enforces.
- **Audit (backend):** type create / edit (field diff) / activate / deactivate / delete. No PII, nothing sensitive in
  localStorage.
- **Tests:** `domain/carrier-types.test.ts`; `e2e/settings-purchasing.spec.ts` (list, create + validation, offered on
  Carriers, delete, built-in lock, member view-only).
- **Backend:** as in Backend-build notes above (`carriers.type_code` FK, same rules).
