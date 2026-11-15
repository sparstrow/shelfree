# Plan — Item-tracking-depth gating on the Items page  *(Phase 2 — DEFERRED)*

**Date:** 2026-07-21
**Spec:** `docs/superpowers/specs/2026-07-21-scale-adaptive-product-model.md` (Approved)
**Status:** **Deferred — Phase 2 (scale-up).** Do NOT build yet.

## Why deferred

Per the CLAUDE.md working agreement *"Build order — Starter base first, then
scale up"*: we build the **Starter base** (all core Items functionality every
store needs, ungated, always-on) and lock it end-to-end **before** layering any
tier gating on top. Item-tracking depth (barcode / lot / expiry / serial) is a
*scale-up* capability, so its gating is a Phase-2 activity. This plan is the
Phase-2 target; it activates only once the Starter Items base is settled.

At promotion time, the per-feature decision is the three-way call from CLAUDE.md:
*Starter base (keep ungated) / Growth (locked below Growth) / Enterprise (locked
below Enterprise)* — recorded in `docs/erp-app/README.md` as each is made.

## Prerequisite (Phase 1 — must complete first)

Settle the **Starter Items base**: the Items table, item card/drawer, New/Edit
item form, delete, saved views, filters, columns, export — all working with
**no gating logic**. Everything currently on the Items page is treated as
Starter base / always-on until a capability is explicitly promoted here.
Draft a Starter-base checklist for the Items page before starting Phase 2.

## Proposed tier → capability mapping (item-tracking-depth axis, to confirm at promotion)

| Capability | Proposed tier | Default when in-plan |
|---|---|---|
| Basic stock (on hand / available / committed) | **Starter base** | on (always, ungated) |
| Barcodes (UPC/EAN per item) | Growth | off |
| Lot / batch tracking | Growth | off |
| Expiry dates (implies lot) | Growth | off |
| Serial numbers | Enterprise | off |

Gate UX per spec (applied only at promotion):
- **Growth-path** (barcode/lot/expiry for a Starter account) → **locked** +
  upgrade prompt.
- **Serial for a Growth account** → locked + upgrade prompt.
- **In-plan but toggled off** → out of daily Items UI; reachable from
  Settings › Inventory › Item tracking.
- No fully-hidden caps in this axis (all are plausible next steps).

## Phase-2 tasks (execute only after the Starter base is locked)

1. **`lib/shelfree-plan.js`** — tier ranks, cap→min-tier map, `capState()`
   (`on|off|locked`), default-toggle derivation from `businessSize`. Pure module.
2. **State + persistence** — `plan` / `businessSize` / `trackingToggles` on the
   Component class; `shelfree.plan.v1` localStorage; `plan`/`businessSize` enum
   Tweaks props.
3. **Item data model** — extend `seedItems()` with `barcode`, `lot`, `expiry`,
   `serials[]` (empty/null by default; a few seeded so gating is visible).
4. **Items table columns** — gated columns render only when `capState==='on'`;
   excluded from `defaultCols()`/picker/export otherwise. Locked caps show as
   disabled picker rows with lock + "Upgrade to {tier}".
5. **New/Edit item form** — a "Tracking" field group: field shown when `on`,
   hidden (link to Settings) when `off`, locked upgrade card when `locked`.
   Tokenised colours only — no inline hex.
6. **Item card / drawer** — lot/expiry/serial/barcode rows only when `on`.
7. **Settings › Inventory › Item tracking** — toggles for in-plan caps; locked
   caps rendered with upgrade prompt; writes `trackingToggles`.
8. **Upgrade-prompt component** — one shared locked-state treatment (lock icon,
   "Available on {tier}", CTA) reused by picker, form, settings.
9. **Demo switcher** — topbar plan/business-size control (dev-only styling).
10. **Docs** — update `docs/erp-app/README.md` (tracking fields, confirmed tier
    mapping, toggle persistence, Decisions & deferred-to-backend) in the same
    turn; record each cap's tier + default per spec success criteria.

## Deferred to backend (carry to docs)

- Authoritative tier→feature entitlement matrix + enforcement; frontend mirrors
  for UX only.
- Writes to gated fields rejected unless tier + toggle active.
- Real subscription/billing; `plan`/`businessSize`/`trackingToggles` become
  per-account server state, not localStorage.
- Serial numbers as a real 1-item-many-serials entity (flat array in the mock).

## Out of scope (this plan)

Other scale axes, guided onboarding wizard, billing UI, and — until Phase 1 is
done — any gating build at all.
