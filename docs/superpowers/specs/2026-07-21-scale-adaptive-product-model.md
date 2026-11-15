# Spec — Scale-adaptive product model (plans + settings)

**Date:** 2026-07-21
**Status:** Approved
**Topic:** How Shelfree adapts to business scale without overwhelming small users

## Problem

Shelfree targets a wide spectrum of customers — from a local single-location
store to a large multi-warehouse operation. A one-size UI fails both ends: it
either overwhelms the small shop with controls, fields, and tracking it will
never use ("feature noise"), or it under-serves the large operation. We need one
product that scales down as gracefully as it scales up, and a way to monetise the
added depth larger customers need.

## Decision

A **two-layer adaptation model**:

1. **Subscription plan = ceiling.** Three tiers — **Starter / Growth /
   Enterprise** — determine which capabilities *can* be enabled. Deeper control,
   tracking, and features live in higher tiers; this is how depth is monetised.
2. **Settings toggles = within the ceiling.** Inside their plan, users enable/
   disable individual capabilities. An in-plan-but-off feature stays out of the
   daily UI and is only reachable from Settings.
3. **Guided onboarding sets the starting point.** A setup wizard asks about
   business size/shape (locations, tracking needs, team) and pre-enables the
   right toggles and suggests a plan — a new account starts correctly configured,
   not at "everything on." Default posture is **minimal**; complexity is earned.

**Core principle:** avoiding feature noise for small businesses is a primary
design goal, evaluated on every feature. Default experience is minimal.

## Scale axes

Each is an independent capability toggle mapped to a minimum tier:

| Axis | Small → Large |
|---|---|
| Storage structure | single location → multi-warehouse → zones/aisles/bins |
| Item-tracking depth | none → lot/batch, serial numbers, expiry, barcodes |
| Team & permissions | one owner → many roles |
| Purchasing/vendor complexity | basic POs → multi-vendor, approvals |
| Multi-currency / region | single → multi |
| Reporting & analytics | basic → advanced |
| Integrations | none → accounting, e-commerce, EDI |

(Exact tier→axis mapping to be finalised as features are built; record each in
the relevant `docs/<page>/README.md`.)

## Gate UX at the plan boundary

- **Growth-path features** (a natural next step) → shown **locked** with a short
  upgrade prompt.
- **Niche / irrelevant features** → **completely hidden**, no trace.
- **In-plan but toggled off** → hidden from daily UI, available in Settings.

## Prototype scope (now)

Fully mock the model in the frontend: a **plan + business-size switch** to demo
any scale, **locked states**, and **upgrade prompts**. **No real billing.**

## Deferred to backend

- Real subscription/billing, plan enforcement, and entitlement checks.
- Server-side validation that a capability's data is only writable when its tier
  + toggle are active.
- The authoritative tier→feature entitlement matrix (frontend mirrors it for UX
  only; backend enforces).
- Per-account settings persistence (frontend uses localStorage/seed data).

## Success criteria

- A Starter/single-location account sees a clean, minimal UI with no advanced
  controls, fields, or tracking surfaced.
- Advanced capabilities are reachable by upgrading (locked+prompt) or, if in-plan,
  by toggling on in Settings.
- Every feature's tier and default-on/off state is recorded in its page doc.
