# Contacts — People ▸ Contacts

## Overview
One shared directory of the **external people** Kanalora deals with — vendor owners and
accounts desks, customer buyers and receiving desks, carrier branch contacts and drivers.
Before this, each table kept its own inline copy of name / phone / email (carriers had flat
`contact`/`phone`; vendors and customers had private `contacts[]` arrays), so the same person
could exist three times with three phone numbers.

Now **a person exists once**, in People ▸ Contacts, and every other record **links** to them
by contact no. Today's links: Carriers (one contact / driver), Vendors and Customers (a list
with a per-link role and one primary). Future tables (employees' emergency contact,
transporters on shipments, bank relationship managers…) add a link field — never their own
name/phone columns.

Fourth page on the reference-dataset registry (`cntReg()` in
`prototype/designs/erp/Shelfree App.dc.html`). Sits under **People** (Users · Employees · **Contacts** ·
Time Sheets). Tier: parked (POC) — ungated. Future-pass hint: Starter base.

## Screens & states
- **Grid (People ▸ Contacts):** Contact no. (frozen, mono) · Name · Phone (mono, **masked**
  `•••• 0290`) · Email · Linked to (first record + "+N") · Linked as (Vendor / Customer /
  Carrier / Unlinked) · Links (count) · Roles (hidden) · Status pill · Notes (hidden).
  System views: All contacts · Vendor contacts · Customer contacts · Carrier contacts ·
  Unlinked · Inactive. Search covers name, masked phone, email, linked record names and roles.
  Attention dot = inactive.
- **Drawer — view:** contact no. + status, name, "Linked as · roles"; notices (unlinked /
  inactive-but-linked / shared by N records); notes; details (full phone, email, linked count,
  last changed); **Linked to** list — one clickable row per link (kind pill, `NO · Name`,
  role · Primary) that jumps to the vendor / customer profile or the carrier.
  Delete is disabled while any link exists (tooltip says why).
- **Drawer — edit / new:** Contact no. (auto, locked) · Status · Name · Phone · Email · Notes.
- **Contact picker (shared popover, `lkOpen` / `lkVM`):** used by the carrier **Contact /
  Driver** field and the vendor & customer **Contacts** tabs' "Add contact" button.
  Search box (name, phone, email, contact no., linked company) · result rows (initials,
  name, no., phone · email, where they're linked, ✓ on the current value) · "No contact"
  (clear) when a value is set · **Create "…"** row → quick-create form (Name, Phone, Email)
  that saves to Contacts and links in one step. Opens below the trigger, flips above when
  there's no room. Already-linked contacts are excluded on vendor/customer tabs. Inactive
  contacts are hidden (except the current value).
- **Empty states:** grid "No contacts match your filters."; picker "No contacts match "q"."
  (with the Create row still offered).

## Data model
`Contact { no: 'CON00001' (PK, auto), name: string, phone: string (digits, optional leading +), email: string (lowercased), desc: string, active: boolean, createdAt: ISO, updatedAt: ISO }`

Links live on the owning record:
- `Carrier.contactId: Contact.no | ''` (replaces `contact` + `phone`).
- `Vendor.contacts[]` / `Customer.contacts[]` = `{ id, contactId, role, isPrimary }` —
  **role and primary belong to the link** ("Accounts at Kailash Ceramics"), not the person.
- Vendor / Customer flat `contact`, `phone`, `email` are kept as a **read mirror of the
  primary linked contact** (grids, drawers, PO headers use them). They are recomputed
  whenever a contact or link changes (`cntMirror` / `cntSyncParties`) — never an
  independent source.

Seed (`prototype/lib/shelfree-data.js → seedContacts()`): derived from the carrier, vendor and customer
seeds (in that order, deduped by name) so ids are stable across loads; the party seeds carry
the matching `contactId`s.

## Interactions & business rules
- Name required. Phone optional: 10-digit mobile (±`+91`) or 11-digit landline with STD code.
  Email optional, must look like an address.
- **Duplicate guard:** same name (case-insensitive) and same last-10 phone digits (or either
  phone blank) as an existing contact ⇒ blocked with "Looks like CON-xxxx … link that contact
  instead". Same name with a *different* phone is allowed (two "Front desk"s).
- **Edits are shared.** Changing name / phone / email — on this page, from a vendor/customer
  Contacts-tab edit, or via the vendor/customer "Contact person / Phone / Email" edit boxes
  (which now write to the primary linked contact) — updates every record linked to it. The
  edit form says how many records share the contact.
- **Unlink ≠ delete.** Removing a contact from a vendor/customer only drops the link; the
  person stays in Contacts. If the primary is unlinked, the next link becomes primary.
- Delete is blocked while linked anywhere — unlink first or mark inactive.
- Inactive: stays on existing links (shown "(inactive)"), can't be picked for new links;
  a *new* carrier can't be saved with an inactive contact.
- Editing a vendor/customer's flat contact fields when it has **no** linked contact finds a
  contact by name or creates one, and links it as primary (role Owner).
- **Legacy migration (`cntReconcile`, on load):** any carrier with a text `contact` and no
  `contactId`, or any vendor/customer contact entry without `contactId`, is matched to a
  contact by name or a new contact is created, then linked. Idempotent.
- Keyboard: grid N / E / Enter / double-click / Ctrl-Cmd+S / Esc / right-click like every
  registry page. Picker: click, ↓ or F4 opens; typing a letter on the field opens pre-searched;
  ↑/↓ PgUp/PgDn move; Enter picks (or opens quick-create); Enter in quick-create saves & links;
  Esc backs out then closes (focus returns to the trigger); Tab / outside click closes.
  All listed in Settings ▸ Keyboard shortcuts ("People › Contacts", "Contact picker").

## Persistence
`localStorage['shelfree.contacts.v1']` = Contact[]. Seed contacts are merged back in by no.
(the seed vendors/customers/carriers link to them). Carriers persist `contactId` in
`shelfree.carriers.v1`. Vendors/customers aren't persisted in the prototype — their links
come from the seed each load and mirrors are recomputed from the stored contacts.

## Settings surfaces (per the scale rule)
- **Workspace:** none yet. Candidate: "Require email on customer contacts" (for e-invoicing).
- **Configuration:** duplicate-guard strictness (name+phone vs name only) — deferred; today fixed.
- **Terminology:** "Contact" label renameable via the existing module/page terminology layer
  (People module rename applies).
- **User-level:** `people.contacts.read` / `people.contacts.write`. Anyone who can edit a
  vendor, customer or carrier may *link* existing contacts; creating / editing the person
  needs `contacts.write` (UI doesn't enforce yet).

## Backend-build notes
- Entity `contacts` (tenant_id, contact_no, name, phone_e164, email, notes, is_active,
  created_at/by, updated_at/by). Unique (tenant_id, contact_no). Soft duplicate check on
  (tenant_id, lower(name), right(phone,10)).
- Join table `contact_links` (tenant_id, contact_id → contacts, entity_type
  ∈ {carrier, vendor, customer, …}, entity_id, role, is_primary, sort). Unique
  (entity_type, entity_id, contact_id); at most one `is_primary` per (entity_type, entity_id)
  for multi-contact entities; carriers allow one link. The frontend stores links on the owner
  records (`contactId`, `contacts[]`) purely for prototype convenience — map them to this table.
- Vendor / customer `contact_name/phone/email` columns become **views** over the primary
  link (or are dropped); documents (PO, invoice) snapshot the contact at posting time.
- Endpoints: `GET /contacts?q=&linked=vendor|customer|carrier|none&active=`,
  `POST /contacts`, `PATCH /contacts/:no`, `DELETE /contacts/:no` (409 with link list if linked),
  `GET /contacts/:no/links`, `POST /:entity/:id/contacts` (link), `PATCH …/contacts/:linkId`
  (role, primary), `DELETE …/contacts/:linkId` (unlink). Picker search must be server-side,
  paginated, and exclude already-linked ids.
- Server enforces: name required; phone/email formats; duplicate guard; delete blocked when
  linked; inactive can't be newly linked; single primary; tenant isolation on both sides of a link.

### Security checklist (per-feature)
- **PII:** name, phone, email of external people. Phone masked in grid + default export; full
  only in drawer / picker for users with read access. Included in data-subject export and
  erasure (erasure = redact the person; links remain to keep document history).
- One record per person *reduces* PII sprawl (was up to 3 copies).
- Audit events: contact create / edit (field diff) / delete / activate-deactivate; link /
  unlink / role change / primary change on the owning entity.
- Tenant-scoped; link endpoints must verify both contact and entity belong to the tenant.
- Nothing sensitive in localStorage beyond prototype seed data.

### Decisions & deferred-to-backend
- **Links on the owner, person in Contacts** (not a contact → company field): one person can
  represent several records (a transporter who is also a vendor's dispatch contact).
- Role is per link, not a job title on the person.
- Flat vendor/customer contact fields kept as mirrors so existing grids, drawers and PO
  headers keep working unchanged; backend may replace with a view.
- Contacts page is a registry page (grid + drawer), not a full profile page — a contact
  profile with activity (calls, emails) is later CRM scope.
- Linking from the Contacts page itself (pick a vendor to attach to) is deferred; links are
  made from the owning record, where the role makes sense.
