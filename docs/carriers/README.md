# Carriers — Purchasing ▸ Carriers

## Overview
Master list of **who physically moves goods** — couriers, transporters (GTA) and our own
vehicle (spec §3.1, `docs/superpowers/specs/2026-09-22-freight-charges.md`; plan task 3,
`docs/superpowers/plans/2026-09-22-freight-step1.md`). A carrier is picked when the shipment
method is *Carrier* (or *Own vehicle*) on vendor cards (task 6), purchase orders (task 8) and
receipts (step 2). It carries the GST treatment of its freight (reverse vs forward charge)
and a tracking-link template so AWB / LR numbers become clickable.
Third page on the reference-dataset registry (`carrReg()` in
`designs/erp/Shelfree App.dc.html`). Sits under Purchasing, in the setup block below the
rule; Sales gets the same list when sales shipping lands (step 5). Tier: parked (POC) —
ungated. Future-pass hint: Starter base; carrier performance analytics → Growth.

## Screens & states
- **Grid:** Code (frozen, mono) · Name · Type · GSTIN (mono) · GST on freight (Reverse
  charge / Forward charge / Not applicable) · Tracking ref. (AWB / LR no. / —) · Tracking
  link (Set / Not set / Not applicable) · Default service · Contact (hidden — the linked
  contact's name) · Phone (hidden, **masked** `•••• 2876`, from the linked contact) · Status pill · Notes (hidden).
  System views: All carriers · Couriers · Transporters (GTA) · Reverse charge · No tracking
  link · Inactive. Search, filters, column picker, grouping, export, saved views.
  Row attention dot = inactive, or a courier with no tracking link. Sidebar badge = count.
- **Drawer — view:** code + status, name, type · GST treatment; notice for reverse-charge
  GTAs and for couriers without a tracking link; notes; **Test tracking link** button
  (opens the template with a sample number in a new tab); details (type, GSTIN, GST on
  freight, tracking ref., link set, service, contact, full phone, last changed); **Contact** card
  (clickable → opens it in People ▸ Contacts); activity placeholder. Actions: Edit, Duplicate, Delete.
- **Drawer — edit / new:** Code · Type · Name · GSTIN · GST on freight toggle (GTA only) ·
  Tracking link (not for Own vehicle) · Default service · **Contact** (label "Driver" for
  own-vehicle types) — a searchable picker over People ▸ Contacts with inline "Create …"
  (see `docs/contacts/`) · Notes · Status.
  Own vehicle hides GSTIN and tracking link.
- **Empty state:** "No carriers match your filters."

## Data model
`Carrier { no: string(2–12, A–Z 0–9 -, PK), name: string, type: CarrierType.code (see docs/carrier-types), gstin: string(15)|'', rcm: boolean, trackUrl: string|'', service: string, contactId: Contact.no|'', desc: string, active: boolean, createdAt: ISO, updatedAt: ISO }`
- `rcm` = reverse charge: GST on this carrier's freight is paid by us (GTA default).
  Only meaningful for GTA; always `false` for Courier (forward charge) and Own vehicle (n/a).
- `trackUrl` contains a `{tracking}` placeholder — the shipment's AWB / LR no. replaces it.
- `contactId` links to People ▸ Contacts (2026-09-24) — replaces the old inline `contact` /
  `phone` text. Legacy stored carriers are migrated on load (matched by name, or a contact is
  created). The person's phone/email are **personal data** owned by the contact record.
- Seed (`lib/shelfree-data.js → seedCarriers()`): **STC** ST Courier · **PCL** Professional
  Couriers · **DTDC** DTDC Express (couriers) · **ART** Arunachala Road Transport (GTA,
  reverse charge, Tiruvannamalai–Chennai lorry, no link) · **SRL** Sri Ramana Logistics (GTA,
  forward charge) · **OWN** Kanalora van (own vehicle).

## Interactions & business rules
- **Type list is configurable** in Settings ▸ Configuration ▸ Carrier types
  (`docs/carrier-types/README.md`). Each type has a behaviour (courier / gta / own); all rules
  below that say Courier / GTA / Own vehicle mean *types with that behaviour*. Carriers store
  the type code; legacy name values are mapped to codes on load.
- Code: 2–12 chars, uppercase letters/digits/hyphens (typed lowercase is uppercased), unique.
- Name required, unique (case-insensitive).
- GSTIN optional, uppercased; if present must match the 15-char GSTIN pattern and be unique.
  **Forward-charge GTA requires a GSTIN** (it bills GST).
- Switching Type to GTA turns reverse charge **on**; away from GTA turns it off.
- Tracking link optional; if present: `https://…`, no spaces, must contain `{tracking}`.
- Contact optional; must exist; a new carrier can't use an inactive contact. Phone/email
  validation lives on the contact (`docs/contacts/`).
- Own vehicle: GSTIN and tracking link cleared on save.
- Duplicate → code `<CODE>-2` (next free), "(copy)" name.
- Delete: allowed for now (nothing references carriers yet). Once vendors / POs / shipments
  reference a carrier (tasks 6, 8, step 2), delete must be blocked with the references —
  deactivate instead.
- Inactive carriers keep history but must not be offered on new vendors/orders/shipments.
- Keyboard: N new · E edit · Enter view · double-click edit · Ctrl/Cmd+Enter or Ctrl/Cmd+S
  save · Esc cancel/close · right-click row menu · standard grid keys. Listed in
  Settings ▸ Keyboard shortcuts ("Carriers").

## Persistence
`localStorage['shelfree.carriers.v1']` = Carrier[]. No system records, so no seed merge.
Grid prefs use the generic per-dataset grid storage (dataset id `carriers`).

## Settings surfaces (per the scale rule)
- **Configuration ▸ Freight & shipping** (task 5): freight tracking on/off, shipment
  methods list (incl. whether *Carrier* / *Own vehicle* are offered at all).
- **Workspace:** own-vehicles list (vehicle no., description) — task 5; the `OWN` carrier
  becomes the parent for those vehicles.
- **Terminology** (task 5): "Tracking no." / "AWB" / "LR no.", "Carrier" / "Transporter".
  Tracking ref. labels now come from each carrier type's `refLabel`.
- **User-level:** `carriers.manage` permission (write); read for anyone with Purchasing.

## Backend-build notes
- Entity `carriers` (tenant_id, code, name, type_code → carrier_types, gstin, is_reverse_charge,
  tracking_url_template, default_service, contact_id → contacts (via `contact_links`, see docs/contacts), notes, is_active,
  created_at/by, updated_at/by). Unique (tenant_id, code), (tenant_id, lower(name)),
  (tenant_id, gstin) where not null.
- Endpoints: `GET /carriers`, `POST /carriers`, `PATCH /carriers/:code`,
  `DELETE /carriers/:code`, `POST /carriers/:code/duplicate`.
- Server must enforce: formats + uniqueness above; GSTIN pattern + check-digit (client
  checks pattern only); forward-charge GTA ⇒ GSTIN required; `is_reverse_charge` only
  true for GTA; tracking template https + `{tracking}`; delete blocked when referenced by
  vendors / orders / shipments (return references).
- Tracking links are built client-side from the template — **never** store carrier API
  keys client-side; a real tracking integration (status polling) is a server-side job.
- Future FKs: `vendors.default_carrier_code`, `purchase_orders.carrier_code`,
  `shipments.carrier_code`; carrier freight bills → vendor bills with RCM from this flag.

### Security checklist (per-feature)
- Tenant-scoped master data; RBAC `carriers.manage` for write.
- **PII:** contact name + phone — masked in the grid/export default (Phone column hidden and
  masked), full value only in the drawer; include in data-subject export/erasure; retention
  follows the vendor-contact rule.
- Audit events: carrier create / edit (field diff — esp. GSTIN, reverse charge) / delete /
  duplicate.
- Nothing sensitive in localStorage beyond prototype seed data; no secrets/API keys.
- Test tracking link opens with `rel="noopener noreferrer"`; template restricted to https.

### Decisions & deferred-to-backend
- One carriers list with a **Type** field rather than separate courier/transporter lists.
- Reverse charge is a **per-carrier default**; the vendor bill can still override it (step 3).
- GTA GST rate (5% RCM / 12% forward) is decided on the bill, not stored here — deferred to
  step 3 with vendor bills.
- Own vehicle is a carrier row so shipments always have a carrier; the vehicle list itself
  is a workspace setting (task 5).
- Carrier performance (on-time %, transit days, cost/kg) derives from shipment records —
  Freight analysis report, later.
