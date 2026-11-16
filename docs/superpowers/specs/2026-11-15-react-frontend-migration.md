# Spec — move the prototype to a production React frontend

**Date:** 2026-11-15 · **Status:** approved (user, in chat, 2026-11-15) ·
**Supersedes:** `plans/2026-11-15-split-app-file.md` (splitting the `.dc.html`
in place would have been redone at backend time).

## Why

The Claude Design prototype (`prototype/designs/erp/Shelfree App.dc.html`,
18.5k lines) is one template + one class with 1,123 methods, 4,456 inline
styles, 819 `setState` calls and ~50 direct `localStorage` reads/writes. None
of that shape survives a production build. The user's requirement: **no
rework** — when the prototype is feature-complete, the backend gets written and
connected to the same frontend. So the frontend moves to its production shape
now, and every remaining feature is built there.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Scope now | **Frontend only.** Backend stack is deliberately undecided. | User wants to finish prototype features first, then choose. Direction noted: Supabase for storage, frontend and backend separate, talking over the network. |
| Data today | Dummy seed data + browser `localStorage`, exactly as the prototype. | It is demo data; nothing real to protect yet. |
| The one hard rule | **Screens never read seed data or `localStorage` directly.** They call `src/data/api/*` (async functions) through TanStack Query hooks. | This is the only seam the backend needs. Later only the inside of those functions changes (to HTTP); screens don't. |
| Entity shapes | zod schema per entity in `src/data/schemas/`, TypeScript types inferred from them. | Validates forms today; becomes the starting point of the API contract. |
| Repo layout | `apps/web` (React), `prototype/` (frozen reference), `docs/` (unchanged contract). pnpm workspace. | `apps/api` + shared packages can be added later without reshuffling. |
| Behaviour | **Parity port.** Same screens, flows, copy, shortcuts, seed data. No redesign during the move. | Keeps the move verifiable: every page is checked side by side against the prototype. |
| Styling | Tailwind v4 theme tokens + real shadcn/ui (Radix). Prototype colour/shadow tokens carried over 1:1 as CSS variables. | Matches the standing CLAUDE.md rule (shadcn source + Tailwind), now with real npm packages. |

## Stack (`apps/web`)

Vite · React 19 · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui + Radix ·
TanStack Router (file-based, real URLs) · TanStack Query · TanStack Table +
Virtual · React Hook Form + zod · Zustand (UI state: workspace tabs, sidebar,
preferences) · Vitest (rules) + Playwright (screens) · oxlint.

## Structure

```
apps/web/src/
  routes/                 file-based routes — one URL per page
  app/                    shell: sidebar, top bar, workspace tabs, nav registry, shortcuts
  components/ui/          shadcn components (added with the shadcn CLI)
  components/             shared app components (data grid, drawer, status pill, help popover…)
  features/<module>/<page>/   page components + page-specific logic
  data/
    schemas/              zod schemas → types
    seed/                 typed seed data (ported from prototype/lib/shelfree-data.js)
    store/                localStorage-backed collections (the mock "database")
    api/                  async entity APIs — THE seam: list/get/create/update/remove
    queries/              TanStack Query hooks over api/
  domain/                 pure business rules (numbering, money, GST, PO totals/status…) + tests
  lib/                    cn(), formatting helpers
  styles/                 tokens.css (theme), globals
```

`domain/` is pure TypeScript with no React/browser imports so it can be shared
with (or mirrored by) a backend later.

## Rules for the port

1. **URL per page.** `/purchasing/purchase-orders`, `/purchasing/purchase-orders/PO00011`,
   `/settings/tax-codes` … Grid filter/sort state that users share goes in the URL.
2. **Workspace tabs** stay (browser-style tabs inside the app): each tab remembers
   its URL; switching tabs navigates.
3. **State:** server-ish data via TanStack Query; UI-only state in Zustand or
   component state. No app-wide god object.
4. **Loading / empty / error states are real** — `api/` is async with a small
   simulated latency, so every screen handles pending and failure from day one.
5. **Storage keys** are versioned `shelfree.v2.<collection>`; the prototype's keys
   are not reused (no migration of demo data).
6. **Craft rules carry over unchanged** — hover feedback, motion, keyboard
   shortcuts + the Keyboard shortcuts page, quiet pages (ⓘ help), in-place
   editing, contacts link model, docs in the same turn, security checklist.
7. **Tiers stay parked** (CLAUDE.md working mode): no new gating; existing axis
   toggles are ported as they are.
8. **Unported pages** render a "Not moved yet" placeholder naming the prototype
   page, so navigation is complete from day one and progress is visible.

## Order

Foundation → app shell → modules in business-flow order: **Purchasing**
(reference module; sets the patterns) → Production → Warehouse/Items → Sales →
Finance (CoA) → People/Contacts → Notes → Settings / My settings. Progress is
tracked page by page in `plans/2026-11-15-react-frontend-migration.md`.

After a module is ported and checked, its prototype screen is frozen: new
features for it go into `apps/web` only. New feature work resumes module by
module as each lands.

## Verification

Per page: side-by-side against the prototype (layout, copy, data, states,
shortcuts, right-click, light/dark), no console errors, `pnpm typecheck`,
`pnpm lint`, `pnpm test`. Domain rules get unit tests as they are extracted.

## Backend implications (for the later decision)

- Each `data/api/<entity>.ts` function is one future endpoint; signatures are
  already async and return plain JSON-serialisable data.
- zod schemas are the request/response shape proposals.
- `domain/` holds the rules the backend must enforce server-side too
  (numbering, totals, status transitions, posting rules) — a client-only check
  is never sufficient.
- Auth, tenancy, RBAC enforcement and audit logging remain specified in each
  `docs/<page>/README.md` and `docs/security/README.md`; nothing in the React app
  is built in a way that precludes them (no secrets client-side; "view as role"
  stays a demo switch).

## Out of scope

Backend, auth, deployment (Coolify), the standalone Sales screens / Mobile /
Auth prototypes (legacy NorthDoor data — rebuilt at the Sales stage), any
redesign.
