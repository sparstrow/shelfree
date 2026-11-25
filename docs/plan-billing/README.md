# Plan & billing (Settings ▸ Workspace)

## Overview
Information only: which plan the workspace is on and what each plan includes. No billing, no upgrade prompts, no
locks — tiers are parked (CLAUDE.md "CURRENT WORKING MODE"). Workspace-level, owner / admin only.

## Screens & states
- `/settings/ws-plan` — custom page on `SettingsPage`: three plan cards (Starter, Growth, Enterprise) with price,
  tagline and what is included; the current plan is outlined and tagged **Current**; below, a *Payment method* row.
  There are no buttons on the cards.
- Quiet help on the page title and the payment row (`features/settings/plan/help.ts`, prototype `q.plan.*` with the
  upgrade wording removed).

## Data model
None stored. `domain/plans.ts` holds the three plan definitions and `CURRENT_PLAN_ID` (`growth`, the prototype's
default). The payment method is a masked sample (`•••• 4242`).

## Interactions & business rules
None. The page is read-only by construction (nothing to save, no form bar).

## Persistence
None (constants in `domain/plans.ts`).

## Backend-build notes
- `GET /billing/plan` → `{ planId, name, price, per, tagline, features[], paymentMethod: { brand, last4 } | null }`;
  the plan catalogue (`GET /billing/plans`) is server data, not a client constant.
- Billing provider webhooks own the plan; a plan change is a provider-hosted flow. The client never holds card data
  (only the provider's masked `last4`). **Audit:** `billing.plan_changed`. Owner only for payment details.

### Decisions & deferred-to-backend
- When subscriptions start: add the plan ceiling (which capabilities can be enabled), upgrade prompts and locked
  states — revisit every feature's tier then (see `docs/modules-capabilities/README.md`).
- The sample card number and the Growth plan are prototype data, not Kanalora's billing.

## React app (2026-11-25)
- **URL:** `/settings/ws-plan` (Workspace, **custom**). Code: `apps/web/src/features/settings/plan/`
  (`PlanBillingSection.tsx`, `help.ts`), data in `domain/plans.ts` (+ `plans.test.ts`).
- **Parity:** same three plans, prices, taglines and feature lists; the current plan highlighted; the Payment method row.
- **Deliberate changes:** no *Upgrade* / *Switch to* buttons and no plan switching (the prototype switched plan
  instantly) — the page is information only.
- **Shortcuts:** group *Settings › Plan & billing* (`?`).
- **Security gate:** no PII; payment details are a masked sample. Owner / admin only (workspace area).
- **Tests:** `domain/plans.test.ts`; `e2e/settings-workspace-b.spec.ts` (three plans, Current on Growth, no buy buttons).
