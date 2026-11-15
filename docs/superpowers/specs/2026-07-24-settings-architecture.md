# Spec — Settings architecture (Workspace · User · Configuration · Terminology)

**Date:** 2026-07-24
**Status:** Approved (2026-07-24) · **Shipped** 2026-07-24 — built in
`designs/erp/Shelfree App.dc.html`; see `docs/settings/README.md`.
**Topic:** How Shelfree organizes settings into four types, who can edit each, and how they map to plan tiers
**Related:** `docs/superpowers/specs/2026-07-21-scale-adaptive-product-model.md` (plan tiers, scale axes, gate UX), `docs/erp-app/README.md` (existing gear settings)

## Problem

Settings today live behind a single gear entry (Units of measure, Item
categories, Locations & warehouses, Keyboard shortcuts) with no organizing
principle. As the product grows we need a settings model that (a) separates
company-level configuration from an individual's personal preferences, (b)
enforces who is allowed to change what, (c) lets a business bend the app to its
own vocabulary, and (d) hangs off the scale-adaptive plan model so small shops
aren't buried in controls they'll never use.

We are defining **four setting types**:

1. **Workspace / Organization** — company-wide business-model configuration.
2. **User** — per-person preferences (owner account included, but as a *user*).
3. **Configuration** — seeded default lists the user can extend (UoM, categories…).
4. **Terminology** — renaming any user-facing string (objects, menus, columns…).

## Decision

### Information architecture — "Two doors" (Approach A)

Two entry points, split by **audience**:

- **Admin Settings** (gear in the topbar, **owner + admins only**) — three
  sections: **Workspace**, **Configuration**, **Terminology**.
- **My settings** (under the **avatar / profile menu**, **every user**) — the
  personal preferences of the signed-in user.

Rationale over the alternatives:

- **B (single role-filtered hub):** one entry, but mixes "my profile" with
  "company tax IDs," and a non-admin opens Settings to find most sections locked.
- **C (contextual/scattered):** discoverable in place, but no single source of
  truth and hard to audit — wrong for an ERP.

Approach A matches the chosen access model structurally (a non-admin never sees
the admin door), keeps a clean "company vs me" mental model, and scales as
sections multiply.

**Migration of today's gear pages:**

| Today (gear) | Moves to |
|---|---|
| Units of measure | Admin Settings → Configuration |
| Item categories | Admin Settings → Configuration |
| Locations & warehouses | Admin Settings → Configuration |
| Keyboard shortcuts | Admin Settings → Workspace (own submenu: "Keyboard shortcuts / hotkeys") |

The old flat gear list is replaced by the Admin Settings hub; the gear now opens
that hub's landing (section nav), not a single page.

### Access model

| Type | Who can edit | Applies to |
|---|---|---|
| Workspace / Org | Owner + admins | Whole workspace |
| Configuration | Owner + admins | Whole workspace |
| Terminology | Owner + admins | **Everyone** (all users see the renamed labels) |
| User | Each user, their own | Only that user |

Enforced client-side in the prototype via the existing `perms` model; real RBAC
is a backend concern (see Backend-build notes).

### Section contents

**Workspace / Organization**
- **Business profile** — name, logo, address, industry, tax IDs.
- **Plan & billing** — Starter / Growth / Enterprise switch (mocked, no real
  billing) + a business-size demo switch, per the scale-adaptive spec.
- **Modules & capabilities** — modules on/off plus the scale-axis capability
  toggles (storage structure, item-tracking depth, purchasing complexity,
  multi-currency, reporting depth, integrations).
- **Regional** — base currency, timezone, number/date formats, fiscal year;
  multi-currency (tiered, see below).
- **Team & roles** — role definitions and per-module permissions. (User/employee
  records themselves stay in the People module; this is where roles are *defined*.
  **Confirmed.**)
- **Keyboard shortcuts / hotkeys** — the existing reference catalogue (living
  per CLAUDE.md), as its own Workspace submenu. **Confirmed** (moved here from
  My settings).

**Configuration** (seeded defaults + user-added entries)
- **Starter base (ungated):** Units of measure, Item categories, Locations &
  warehouses — the three existing pages, moved here unchanged.
- **Later tiers:** payment terms, tax codes, order/PO/invoice statuses & stages,
  number sequences (item/PO/invoice no formats), custom fields on records.

**Terminology**
- Renameable string classes: **object/record names** (Item, Customer, Vendor,
  PO…), **module & menu labels**, **table column headers**, **status/stage
  labels**, **field labels**.
- **Interface:** a searchable list of rows, each showing the **Original name
  (always visible)** and an editable **Custom name** field. Objects track
  **singular + plural** forms. Per-row **Reset to default** and a global
  **Reset all**. Search/filter across every renameable string.
- **Cosmetic only:** overrides are a display layer over stable data keys —
  automations, reports, exports, and the API keep the original keys (the
  Salesforce / HubSpot / GoHighLevel pattern).

**My settings** (per user)
- **Profile** — name, avatar, email, phone.
- **Appearance** — theme, corners, density, accent (the existing runtime tweaks,
  promoted to a real per-user setting).
- **Notifications.**
- **Language / locale** preference.
- **Personal defaults** — default location, landing page, grid density.
- **Security** — password, 2FA, active sessions.


### Tier mapping

Honors the CLAUDE.md build order (**Starter base first, ungated**) while
recording the eventual gate per the scale-adaptive spec (locked + upgrade
prompt for Growth-path features; hidden for niche ones).

| Setting | Tier | Default |
|---|---|---|
| Business profile | Starter | on |
| Plan & billing switch | Starter | on |
| Regional — single currency, formats, fiscal | Starter | on |
| Regional — **multi-currency / region** | Growth+ | locked below Growth |
| Modules on/off | Starter | on |
| Scale-axis toggles | per axis (see scale-adaptive spec) | mostly off |
| Team & roles — single owner | Starter | on |
| Team & roles — **multi-role permissions** | Growth+ | locked below Growth |
| Configuration — UoM / categories / locations (single location) | Starter | on |
| Configuration — **multi-warehouse structure** | Growth+ | locked below Growth |
| Configuration — payment terms, tax codes, statuses | Growth+ | locked below Growth |
| Configuration — **custom fields, number sequences** | Enterprise | locked below Enterprise |
| **Terminology (whole section)** | **Growth+** | locked below Growth |
| Integrations (accounting, e-commerce, EDI) | Growth / Enterprise | locked |
| All of **My settings** | Starter | on (universal, never gated) |

**Terminology is deliberately a Growth+ capability:** relabeling the app is a
depth feature that monetizes well and small single-location shops rarely need —
gating it keeps the Starter UI minimal and reserves customization depth for
paying tiers.

## Scope of the eventual build (NOT this turn)

This turn produces the spec only. When approved and planned, the build will:

- Add the Admin Settings hub (gear → Workspace / Configuration / Terminology
  section nav) and the My settings surface (avatar menu).
- Move the three existing Configuration pages + Keyboard shortcuts, no behaviour
  change.
- Build Starter-base sections fully (production craft: empty/loading/error
  states, motion, keyboard nav, right-click, a11y) — ungated.
- Mock Growth/Enterprise sections as **locked cards with upgrade prompts**
  driven by the plan switch; no real billing or enforcement.
- Wire Terminology as a live display layer (overrides resolve through a
  `label(key)` lookup wherever strings render) behind the Growth lock.

## Deferred to backend

- Real RBAC: who is owner/admin, and server-side enforcement of the access
  table above (client `perms` is UX only).
- Subscription/billing and authoritative tier→setting entitlement (frontend
  mirrors for UX; backend enforces) — inherited from the scale-adaptive spec.
- Per-account persistence of every setting (frontend uses localStorage/seed):
  workspace settings are workspace-scoped; user settings are user-scoped;
  terminology overrides are workspace-scoped but read by all users.
- Terminology as a real i18n/label-override table keyed by stable string keys,
  with singular/plural and (future) locale variants — must never rename the
  underlying data keys used by reports/exports/API.
- Referential integrity on Configuration lists (can't delete a UoM/category/
  location/term still referenced) — extends the existing rule.

## Open items

- ~~Keyboard shortcuts placement~~ — **resolved:** Workspace, own submenu.
- ~~Roles vs user records~~ — **resolved:** roles defined in Workspace → Team &
  roles; user/employee records stay in People.
- Exact scale-axis → tier mapping is finalized per-feature as each is built
  (per scale-adaptive spec), recorded in the relevant `docs/<page>/README.md`.

## Success criteria

- A Starter/single-location account sees only: Workspace (profile, plan,
  single-currency regional, modules), the three Configuration lists, and full
  My settings — no Terminology, no multi-* controls, no integrations surfaced
  as anything but a locked upgrade prompt.
- Admins reach Workspace/Configuration/Terminology via the gear; every user
  reaches their own preferences via the avatar menu; non-admins cannot open the
  admin door.
- Terminology overrides change every visible occurrence of a label while the
  original name stays shown in the editor and the data keys are untouched.
- Every setting's tier and default-on/off state is recorded here and, at build
  time, in the relevant page doc.
