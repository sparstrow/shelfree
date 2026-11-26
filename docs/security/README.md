# Security & compliance — hard gate

## Overview
Shelfree handles multi-tenant business data: inventory/cost/pricing, financials,
and PII for employees, customers, and vendors. Security compliance is a **hard
gate** on every feature we build, per CLAUDE.md — not a later pass. This doc is
the checklist every new page/feature is run against, and the source of truth for
which controls exist today (frontend-only prototype) vs. which are deferred to
the backend build.

Today's app is a frontend-only prototype (localStorage/in-memory seed data, no
real auth or network calls) — so most items below are **not yet enforced**, they
are **modeled in the UI and specified here for the backend to implement**. The
gate this turn applies to is: *never design a feature in a way that would make
the real control impossible or awkward to add later* (e.g. don't hardcode
cross-tenant data access patterns, don't skip an audit-relevant action, don't
store secrets in localStorage).

## Compliance checklist (target state)

### Access & authorization
- [ ] Role-based access control enforced server-side per module (`perms`:
      none/read/write) — the frontend's per-module permission model is UI-only
      today; backend must re-check on every request, not trust the client.
- [ ] Least-privilege defaults — new users start with no access, not full access.
- [ ] SSO (SAML/OIDC) — Enterprise-tier gated.
- [ ] MFA/2FA — modeled today (`User.twoFA`), not actually enforced at login
      (no real login flow yet).
- [ ] Session expiry / idle timeout, server-side session invalidation on
      password reset or role change.

### Data protection
- [ ] TLS 1.2+ in transit for all traffic.
- [ ] AES-256 at rest for the database and backups.
- [ ] Secrets (API keys, DB credentials) never in client code or localStorage —
      today's prototype has no secrets, keep it that way as integrations land.
- [ ] Tenant data isolation enforced at the query layer (every read/write scoped
      to the authenticated tenant) — critical given the scale-adaptive multi-business
      model in CLAUDE.md.

### Audit & logging
- [ ] Immutable audit log for create/edit/delete/duplicate on every record type
      (Items, Customers, Vendors, Purchase Orders, Users, Employees) — who, what,
      when, before/after values. The frontend's row context menu (Edit/Delete/
      Duplicate) and bulk actions must each emit an auditable event once wired
      to a real backend; today they only show a toast. The item detail page's
      Duplicate/Delete/Edit reuse these same flows, so no new audit surface — but
      its cross-referenced Purchase Orders list must be a tenant-scoped read
      (`GET /items/{no}/purchase-orders`), never an unscoped scan.
- [ ] Login/auth events (success, failure, password reset, permission change)
      logged and retained per policy.
- [ ] **Settings changes are audit-relevant** — plan/tier change, role change,
      workspace profile edits, and terminology overrides (workspace-scoped, seen
      by all users) must each emit an audit event (who/what/when/before-after).
      Today they only persist to localStorage. Terminology is a display-only
      label layer — it must **never** rename underlying data keys/ids used by
      reports, exports or the API.
- [ ] **Finance master data** (Chart of accounts, Charges — `docs/chart-of-accounts/`,
      `docs/charges/`): create/edit/delete/duplicate emit audit events with field diffs
      (posting account, GST rate, landed-cost flag are the sensitive fields); write
      access RBAC-gated (`finance.accounts.write`, `purchasing.charges.write`).
- [ ] **Carriers** (`docs/carriers/`): contact name + phone are PII — masked in grid/export,
      full only in the drawer, covered by data-subject export/erasure; GSTIN validated
      server-side (pattern + check digit); edits audited (GSTIN, reverse charge);
      `carriers.manage` RBAC; no carrier tracking API keys client-side.
- [ ] **Contacts** (`docs/contacts/`, 2026-09-24): one record per external person (name,
      phone, email = PII) linked from carriers / vendors / customers via `contact_links`.
      Phone masked in grid/export; data-subject export + erasure (redact person, keep links);
      audit contact edits and every link / unlink / primary change; link endpoints verify
      both sides are in the caller's tenant.
- [ ] **Purchasing commands are server-side transactions** (2026-11-16, React app):
  posting a goods receipt (`POST /purchase-receipts/{no}/post`) must re-validate
  outstanding quantities, move stock and update the PO status in one transaction,
  write one audit event, and reject posting twice. Posted receipts can't be deleted
  (the React UI already blocks it; the API must too). PO issue / reopen / lock /
  cancel are audit events; line costs on drafts are re-resolved server-side from the
  price list (never trusted from the client).
- [ ] **Client storage holds demo data only** (React app): `shelfree.v2.*` keys in
  localStorage contain seed/business records and UI preferences, no credentials or
  tokens. When the backend arrives, business records leave localStorage entirely;
  only `shelfree.v2.ui` (non-sensitive preferences) may stay.
- [ ] Audit log itself is append-only / tamper-evident.
- [ ] **Notes are append-only and immutable** (2026-09-20, `docs/notes/README.md`):
      `notes.text / author_id / created_at` must be write-once at the database
      layer and there must be **no delete endpoint**; the only permitted write
      after creation is the one-way `valid → invalid` transition, gated
      server-side by `author_id = current_user OR role IN (admin, manager)` and
      rejected on a second attempt. Both create and invalidate emit audit
      events. Notes are user free text — treat as potential PII in GDPR/CCPA
      export, and satisfy erasure by redacting text while keeping the row (a
      hard delete would break the append-only guarantee the feature exists for).
- [ ] Tax code rate history — rate rows already in effect are immutable
      server-side; every rate append/remove and code activate/deactivate emits
      an audit event with old → new rate and effective date
      (`docs/tax-codes/README.md`). Documents store the resolved rate per line.
- [ ] Tax settings — `PATCH /settings/tax` restricted to `tax.codes.manage`; every change audited
      (old → new); documents snapshot the rounding / ITC / branch-value mode they posted with
      (`docs/tax-settings/README.md`).

- [ ] **Settings write permission (2026-11-25, Settings redesign):** enforced server-side per area on
      every settings write, never trusting the UI. `workspace` and whole shared lists: owner / admin only.
      Module `m`: owner / admin, or `perms[m]` of read / write **and** `settings[m] === true`. Personal: the
      user, own record only. `403` otherwise. Granting `settings[m]` is admin-only. The read-only mode in
      the frontend (no Save, no New / Edit / Delete) is UX only (`docs/settings/README.md`).
- [ ] **Audit event per settings save and per number-series change:** one event for every
      `PUT /settings/<area>/<section>` (actor, area, section, before / after). Number series: create, edit,
      set default, deactivate, delete each emit an event with the before / after diff
      (`docs/number-sequences/README.md`).
- [ ] **Number issuing is atomic and server-side:** the document number is taken from the series (row lock)
      in the same transaction as the document insert; client preview numbers are never trusted; issued
      numbers are never reused and, for tax invoices and credit notes, never skipped on rollback.

### Privacy & regulatory
- [ ] GDPR — data export and right-to-delete for any EU data subject (applies to
      Employee/Customer/Vendor PII: name, email, phone, address).
- [ ] CCPA/CPRA — same rights for California residents.
- [ ] Data processing agreements (DPA) available for enterprise customers.
- [ ] Breach notification process defined (timeline, responsible party).
- [ ] PII minimization — don't collect/display fields we don't need; review
      before adding a new personal-data field to any record.

### Payments (if/when billing or card data is added)
- [ ] PCI DSS — route card data through a tokenizing processor (never store/see
      raw card numbers in our own systems) to stay out of full PCI scope.

### Infrastructure & availability
- [ ] Backups with tested restores; defined RPO/RTO.
- [ ] Vulnerability scanning + dependency updates on a regular cadence.
- [ ] Periodic penetration testing.
- [ ] SOC 2 Type II (Security, Availability, Confidentiality) — the baseline
      expectation for any B2B buyer.
- [ ] ISO 27001 — paired with SOC 2 for larger/global enterprise buyers.

## Tier mapping
Per CLAUDE.md's plan-ceiling model, compliance controls split the same way
features do:
- **Starter base (always on, ungated)**: RBAC enforcement, encryption in transit/
  at rest, basic audit logging, tenant isolation, GDPR/CCPA rights — these are
  table stakes for *any* tenant regardless of size, never paywalled.
- **Growth**: expanded audit log retention/export, DPA on request.
- **Enterprise**: SSO/SAML, SCIM provisioning, IP allowlisting, data residency
  choice, custom DPA/BAA, dedicated audit log export/SIEM integration, ISO 27001
  attestation sharing.

## Per-feature build checklist (run this every turn a feature/page is added or changed)
1. Does this feature touch PII, financial data, or cross-tenant data? If yes,
   note it in the page's `docs/<page>/README.md` Backend-build notes.
2. Does this feature create/edit/delete a record? If yes, the corresponding
   backend endpoint must emit an audit event (spec it in that page's doc even
   though the frontend can't emit one yet).
3. Does this feature introduce a new personal-data field? If yes, justify why
   it's needed (PII minimization) before adding it to the seed data model.
4. Does this feature bypass or hardcode around per-module permissions (`perms`)
   instead of respecting them? If yes, fix before shipping.
5. Does this feature store anything sensitive in localStorage? It shouldn't —
   today's localStorage use is limited to UI preferences and non-sensitive seed
   data; keep it that way.
7. Does the feature hide fields or actions behind a plan tier / capability axis?
   If yes, the backend must enforce the same ceiling — an axis-off field must be
   rejected on write, not merely hidden in the UI (first case: the Item tracking
   flags `tracksLot` / `tracksExpiry` / `tracksSerial` / `barcode`, 2026-08-01).
   Disabling an axis must never delete stored values (soft-hide only).

8. Is this a settings page or a document number? Settings writes need the per-area permission check and an
   audit event per save (above); numbers must be issued in the document's transaction. A read-only UI is
   never the control.

## Backend-build notes
None of the checklist above is implemented server-side today — there is no
backend yet. This doc is the spec the backend build must satisfy; treat every
unchecked box as a requirement, not a suggestion. When the backend lands,
promote implemented items to checked and add the concrete mechanism (e.g. which
audit log table, which auth provider) next to each.

- [ ] **GST registrations** (2026-09-25): audit create/edit/make-primary/cancel/reactivate/delete;
  enforce `tax.registrations.manage`; tenant-scoped IDs; never store GST portal / GSP / e-invoice
  (IRP) credentials client-side.

- [ ] **Locations ↔ registrations** (2026-09-26): audit location create/edit/delete, status, state,
  place-of-business (declare / make principal) and 3PL-operator changes; enforce `locations.manage`;
  reject state change while open documents reference the location; no PII added (site manager is an
  employee link; the free-typed contact phone/email fields were removed).

- [ ] **Vendor GST registration (2026-09-28):** audit event `vendor.gst_registration.updated` on every type/GSTIN change; permission `vendors.tax.edit`; GSTIN is business identity (not PII) — unregistered individual vendors' personal details stay in Contacts.

- [ ] **Personal settings — profile PII (2026-11-26, run 2.6):** name, email and phone on the profile are personal
  data (`PATCH /me/settings`, the user comes from the session, never the body). Audit `user.profile.updated` with
  before / after for name and email (phone masked in the event); a changed email re-verifies before it becomes the
  sign-in. Email and phone are masked in lists and shown in full only to the user and to admins; erased with the
  user on a GDPR / CCPA request. The same details are mirrored to the People ▸ Users record in one transaction.
- [ ] **Personal settings — password, 2FA and sessions (2026-11-26, run 2.6):** the Security page is UI only. The
  password is posted once over TLS to the auth service (`POST /me/password`: current + new), checked against the
  current hash and the password policy (min 10 characters, mixed case, a digit, not reused), hashed server-side
  (argon2id / bcrypt), never logged, echoed, or kept in client storage; success ends the user's other sessions.
  Turning 2FA off requires re-authentication and emits `auth.2fa.disabled`; enrolling uses an authenticator app with
  recovery codes shown once. Sessions come from the server (`GET /me/sessions`, `DELETE /me/sessions?except=current`);
  every password change, 2FA change and session sign-out is an auth audit event (actor, IP, device, time).
  Rate-limit password attempts. Personal preferences (theme, density, notification flags, formats, defaults) hold
  no secrets and may live in the user's settings row; they are scoped to the session user and never readable by others.
