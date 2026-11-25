# Project memory — Shelfree

Operating rules for **every turn**. This file is *how to work*; the visual/design
spec lives in `prototype/readme.md`. Rule of thumb: a fact about the design →
`prototype/readme.md`; a behaviour to repeat every turn → here.

## Where things live (since 2026-11-15)
- **`apps/web/` — the React frontend. All feature work happens here.**
- **`prototype/` — the frozen Claude Design prototype** (`.dc.html`). It is the
  visual + behavioural reference for pages not yet moved. Never add features to
  it; never edit its generated files (`support.js`, `_ds_bundle.js`,
  `_ds_manifest.json`, `_adherence.oxlintrc.json`).
- **`docs/`** — the functional spec / backend handoff contract (rules below).
- Migration spec: `docs/superpowers/specs/2026-11-15-react-frontend-migration.md`.
  **Page-by-page status: `docs/superpowers/plans/2026-11-15-react-frontend-migration.md`
  — update it in the same turn a page is ported.**
- Sections below that name prototype helpers (`hpH()`, `ipRowFactory()`,
  `shortcutGroups()`, `cntReg()`, `lkOpen()` …) describe the **reference
  behaviour**. When porting, reproduce the behaviour in React; the plan file
  maps each helper to its React home once it exists.

## Frontend stack & rules (`apps/web`)
Vite · React 19 · TypeScript strict · Tailwind v4 · shadcn/ui (Radix) · TanStack
Router / Query / Table / Virtual · React Hook Form + zod · Zustand · Vitest +
Playwright · oxlint. Backend is **not decided yet** (direction: Supabase storage,
separate backend over the network) — don't add backend code or SDKs.

- **The data seam — never break it.** Screens/components must not import seed
  data or touch `localStorage`. They use TanStack Query hooks in
  `src/data/queries/`, which call async functions in `src/data/api/` — the only
  code that talks to storage. When the backend arrives, only `api/` changes.
- **Entity shapes are zod schemas** in `src/data/schemas/`; derive types with
  `z.infer`. Seed data lives in `src/data/seed/` — extend it, don't fork
  parallel data. Every dataset reflects Kanalora (see Product context).
- **Business rules are pure functions in `src/domain/`** (no React, no browser
  APIs) with Vitest tests — numbering, money/GST maths, totals, status
  transitions. The backend will enforce the same rules.
- **shadcn/ui = actual source**: add components with
  `pnpm dlx shadcn@latest add <name>` into `src/components/ui/`; compose with
  `cn()` / `cva` from `src/lib/utils.ts`. Check the shadcn page before authoring
  a new primitive.
- **Styling is Tailwind classes** on theme tokens. No inline `style` except
  genuinely dynamic values (measured sizes, per-record colours).
- **One URL per page** (TanStack Router file routes in `src/routes/`). Page code
  lives in `src/features/<module>/<page>/`. Shareable grid state goes in the URL.
- **Async everywhere:** every screen handles loading, empty and error states.
- **Porting = parity.** Same screens, copy, flows, shortcuts and data as the
  prototype; no redesign while moving. Check each page side by side.

## Page templates — one layout, many pages (since 2026-11-17)
Every screen is built from a shared template. A page **describes** its data;
the template **owns** layout and behaviour. A change to a template reaches every
page that uses it — that is the point, so put shared behaviour in the template.
- **List page** → `src/components/list-page/ListPage.tsx`. A page gives a
  `Dataset` (columns, filters, views, search — `components/data-grid/model.ts`),
  `recordPath`, `preview`, `create`, `remove` (`useCollectionDelete`), extra
  `actions` and `shortcuts`. The template supplies top bar, grid, drawer + its
  footer, view / open / open in new tab / copy number / delete-with-undo.
  Reference lists edited in the drawer (charges, carriers, chart of accounts,
  contacts…) pass `editor` (fields, view, blank, duplicate, validate, save):
  the template adds New / Edit / Duplicate / Save, keys N / E / Ctrl+S / Esc,
  and keeps rows in place between view and edit (`EditableDrawer`).
- **Document page** → `src/components/document/DocumentPage.tsx` (frame, title
  row, footer, loading / error / not-found) with `DocumentCard`, `TotalsCard`,
  `Field`, `Notice` from `components/document/`.
- **Lines inside a document** → `src/components/document/LineGrid.tsx` (select,
  view-only sort, resize, drag reorder, ↑/↓ between inputs marked `data-col`,
  row menu, Add line, line numbers). A document gives `columns` and, for adding
  lines, `renderAddLine`.
- **Record page** (profile with tabs: Vendor, Customer, Item) →
  `src/components/record-page/RecordPage.tsx`. A page gives `record` (+ `state`),
  `header(record, draft, editing)`, `titleField`, `tabs` (`{ id, label, badge? }`,
  URL `?tab=`; the route must `validateSearch` `tab`), a tab renderer as the
  children function (`{ record, draft, editing, errors, onChange, goToTab }`), and
  the edit contract `toDraft`, `validate(draft, record)`, `save(draft, record)`
  (returns the toast text), plus optional `normalize`, `onChange(draft, key)`,
  `review` (a warning that needs "Save anyway"), `tabOfField`, `actions`. The
  template owns the header with its mode-stable Edit / Cancel / Save cell, the tab
  bar, edit state, keys `[` `]` `1`–`0` `E` `Ctrl+S` `Esc`, and loading / error /
  not-found. Cards use `RecordCard` and render rows with `FieldRows`
  (`components/record-fields/` — the same rows the editable drawer uses, so
  view ↔ edit never moves a field). Reference build:
  `features/purchasing/vendors/VendorProfilePage.tsx`.
- **Settings section** → `components/settings/` (`SettingsFrame` = navigation +
  breadcrumb, `SettingsPage` = title row with quiet help, loading / error, save
  bar, keys Ctrl+S / Esc / `?`). A section made of label | control rows is a
  `SettingsSection`: give it `saved` + `onSave` (a `useUpdate…` mutation), `groups`
  of `rows` (key, label, control, default, validate / warn / hidden) and a **help
  map** (pure `HelpMap` data, `components/help/`); the template owns dirty
  tracking, the unsaved-changes guard and Save / Discard. A section with its own
  body (a table, a catalogue) uses `SettingsPage` directly. Register a ported
  section with one line in `features/settings/sections.ts`; ids and nav are in
  `components/settings/nav.ts`. **Quiet help is `components/help/HelpTarget`** —
  wrap any label or title in it (hover 400 ms, click pins, touch = sheet); never
  build another tooltip. **Keyboard shortcut catalogue = `src/app/shortcuts.ts`**
  (feeds Settings ▸ Keyboard shortcuts): templates expose their keys as data
  (`shortcut-meta.ts` beside `ListPage`, `DataGrid`, `RecordPage`, `LineGrid`); a
  page's own keys are a `ShortcutMeta` in its `shortcuts.ts`, spread into
  `ListPage`'s `shortcuts` prop; add the page's group to the catalogue in the same
  turn.
- **Exceptions are options, never copies.** A page that must differ switches a
  standard part off or adds its own through the template's props (e.g. Purchase
  Lines omits `remove`/`create`/`preview`; receipt lines pass no `onChange`, so
  add/remove/reorder are off). Comment the exception where it is declared. If
  the option you need doesn't exist, add it to the template (so other pages can
  use it too) rather than forking the template into a page.
- **List template options added for Purchase Prices** (all opt-in, other lists
  unchanged): `column.edit` (in-grid cell editing — click / Enter opens an
  input, Enter or blur saves, Esc cancels, Tab → next editable cell; `commit`
  returns an error string to refuse), `view.sorts`, `initialDraft` (open New
  pre-filled), `topBarExtra`, action/shortcut `run(row, { startNew, startEdit })`,
  shortcut `shift`, editor field type `date` and `step`.
- Never build a list, document or line table from scratch in a feature folder.

## Tokens & colour
- Never hardcode colours/spacing/type. Use Tailwind theme tokens
  (`bg-primary`, `text-muted-foreground`, `border-border`, `bg-panel`,
  `text-ok-fg` …) defined in `apps/web/src/styles/tokens.css` — the prototype's
  CSS variables carried over 1:1, mapped into Tailwind with `@theme`.
- Dark default; light under `[data-theme="light"]`; never pure `#000`/`#fff`.

## Content conventions (full spec in prototype/readme.md)
- Sentence case UI labels; Title case module names; UPPER sidebar section heads.
- `tabular-nums` on all financial/inventory figures; IDs & codes in Geist Mono;
  no emoji; status = colour + icon + text.

## Working in Claude Code
- **Run the app:** `pnpm dev` (root) → `http://localhost:5174`. In Claude Code,
  `.claude/launch.json` has `web` (React, 5174) and `prototype` (static server,
  5173 → `/prototype/designs/erp/Shelfree%20App.dc.html`).
- **Verify in the browser after every change** — open the page, click through
  what you touched, check the console. Then `pnpm typecheck`, `pnpm lint`,
  `pnpm test`. A change isn't done until it has been seen working.
- **Git:** repo `github.com/sparstrow/shelfree`. Never commit to `main` directly:
  work on a branch, small commits (one feature/fix each), open a PR, enable
  auto-merge (the user asked for PRs to auto-merge). Push/PR when the task plan
  says so or the user asks. After a merge: switch to `main`, `git pull --ff-only`,
  delete the branch locally (`git branch -d`) and on GitHub.
- **CI:** `.github/workflows/ci.yml` runs on every PR and push to `main` — job
  *Type check, lint, unit tests* (typecheck, lint, Vitest, production build) and
  job *Browser tests* (Playwright, Chromium). Auto-merge waits for them. Run the
  same locally before pushing: `pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm test:e2e`.
  A failing run uploads the Playwright report as an artifact.
- **Staging/production** will be the user's Coolify on a Hostinger VPS — not
  wired up yet; don't deploy without being asked.


## Product context: Kanalora (the company this ERP is built for)
Shelfree is being built out as the ERP for **Kanalora**, a small manufacturer
based in **Tiruvannamalai, Tamil Nadu**. Every mock dataset, workflow, and
example in this project should reflect this business, not a generic one.

- **Product:** a Tiruvannamalai (Arunachala hill)-shaped ceramic sambrani/dhoop
  holder — a 2-piece design (ceramic "mountain" lid + base/ash-catcher tray)
  that twist-locks together (~15° turn, bayonet-style tabs/slots) and vents
  incense smoke through a small hole at the peak. Sold in glaze finishes
  (Pearl White / Terracotta / Charcoal Black), standalone or as a combo with
  dhoop cone packs.
- **Model:** Kanalora designs + assembles; the ceramic lid/base components are
  molded and fired by a ceramics vendor, cones/packaging from other vendors —
  Kanalora does final assembly, QC, and packing in-house.
- **Customers:** pooja/religious stores, souvenir & tourist gift shops,
  temple-adjacent stalls near the Girivalam path, and hotel/homestay gift
  counters, concentrated in and around Tiruvannamalai town.
- **Market driver:** Tiruvannamalai's Girivalam (circumambulation of the hill),
  monthly full-moon (Pournami) pilgrim nights, and Karthigai Deepam draw heavy
  tourist/pilgrim footfall — this is the core demand seasonality for the
  product, and sample sales data should reflect spikes around those dates.
- **Seed data:** `prototype/lib/shelfree-data.js` — items, vendors, customers, employees,
  orders, invoices, and purchase orders are all modeled on this business (see
  file header comment). Company/workspace identity (`wsDefaults()` /
  `meDefaults()` in `prototype/designs/erp/Shelfree App.dc.html`) is set to Kanalora,
  Tiruvannamalai, Tamil Nadu.

## Scale-adaptive by design (Shelfree's core product principle)
Shelfree serves a spectrum — a local single-location store up to a large
multi-warehouse operation — so **every feature must scale down as gracefully as
it scales up**. The default experience is *minimal*; complexity is earned, never
imposed. A small business must never wade through controls, fields, or tracking
it will never use — **avoiding feature noise for small businesses is a primary
design goal**, weighed on every feature.

**Two-layer adaptation model — plan sets the ceiling, settings toggle within it:**
- **Plan = ceiling.** Three tiers — **Starter / Growth / Enterprise** — decide
  which capabilities *can* be enabled. More control/tracking/features live in
  higher tiers; that's how we monetise depth.
- **Settings = within the ceiling.** Inside their plan, users turn individual
  capabilities on/off. An in-plan-but-off feature stays out of the daily UI and
  is only found in Settings.
- **Onboarding decides the starting point.** A guided setup wizard asks about
  business size/shape (locations, tracking needs, team) and pre-enables the
  right toggles + suggests a plan, so a new account starts correctly configured
  rather than at "everything on."

**Scale axes** — each an independent capability toggle mapped to a minimum tier:
storage structure (single location → multi-warehouse → zones/aisles/bins);
item-tracking depth (lot/batch, serial numbers, expiry, barcodes); team &
permissions (one owner → many roles); purchasing/vendor complexity;
multi-currency/region; reporting & analytics depth; integrations (accounting,
e-commerce, EDI).

**Gate UX at the plan boundary:**
- *Growth-path features* (a natural next step) → shown **locked** with a short
  upgrade prompt.
- *Niche/irrelevant features* → **completely hidden**, no trace.
- *In-plan but toggled off* → hidden from daily UI, available in Settings.

**Prototype scope (now):** fully mock the model — a plan + business-size switch
to demo any scale, locked states, and upgrade prompts — with **no real billing**.
Document the tier→feature matrix and defer enforcement/billing to the backend
per the `docs/` rule below. When building or changing any feature, state which
tier it belongs to and whether it's on by default, and record it in the relevant
`docs/<page>/README.md`.

**⚠️ CURRENT WORKING MODE — tiers are parked (as of 2026-09-19).** We are
building this app **completely for Kanalora as a proof of concept**. Do **not**
gate anything, do **not** build locked/upgrade states, and do **not** stop to
decide a feature's tier. Build the whole feature, well, for this one business.
The tier model below (Starter / Growth / Enterprise, the scale axes, gate UX)
stays documented because it becomes live work **when we go to market and start
subscriptions** — at that point we revisit every feature and assign it a tier.
Until then it is background context only. Existing axis toggles already in the
app keep working; just don't add new gating. Page docs may still note "this
would likely be Growth" as a hint for that future pass, but nothing in the UI
enforces it.

**Build order — Starter base first, then scale up (current working agreement):**
Build the **Starter plan as the base** first — i.e. all the core functionality
*every* store/business needs, regardless of size, with **no gating logic yet**.
Get that base locked and working end-to-end before layering tiers on top. Only
once the Starter base is complete do we **scale it up toward Enterprise**, and
*during that scaling* decide, feature by feature, whether each added capability
belongs to **Growth** or **Enterprise** — that per-feature tier assignment is
what each plan then toggles on/off. Rationale: the minimal, universal experience
is the foundation and the hardest thing to get right; tiers are additive on top
of it, so gating is a later, cleaner layer rather than something threaded through
from the start. Practical implications:
- Treat anything in the Starter base as **always-on, ungated** until we
  explicitly promote a capability into Growth/Enterprise during the scale-up.
- When scaling, the decision for each feature is a three-way: *Starter base
  (keep ungated) / Growth (locked below Growth) / Enterprise (locked below
  Enterprise)* — record the choice + default on/off in the page doc as it's made.
- Don't pre-build tier gates on features that are still part of settling the
  Starter base; add the gate at promotion time.

**Module sequence — follow the business flow, and build finance alongside each
stage.** Within the Starter base, modules ship in the order money and goods
actually move through Kanalora, and **each operational stage is immediately
followed by its finance counterpart** — finance is never deferred to one big
module at the end:

1. **Purchase** — Vendors, Purchase Orders, goods-in receipts. *(in progress)*
2. **Finance for purchase** — vendor bills / purchase invoices (AP), vendor
   payments, GST input tax credit + reverse charge, and the ledger foundation
   those postings need.
3. **Production & assembly** — BOMs, assembly orders, consumption/output.
4. **Finance for production** — production cost postings: material consumption,
   labour + overhead absorption, WIP, finished-goods valuation, variances.
5. **Sales** — Sales Orders, fulfilment, Sales Invoices.
6. **Finance for sales** — customer receipts (AR), GST output tax + returns,
   credit notes, aging, then the closing reports (P&L, balance sheet, trial
   balance, cash flow).

Practical implications:
- **Don't build a Finance module in one lump.** Each finance slice is scoped to
  the stage it serves and ships in that stage's wake, so every posting has a
  real document behind it.
- **Build only the finance foundation the current stage needs.** The chart of
  accounts, posting engine and tax setup grow stage by stage — purchase-side
  accounts first, production/WIP accounts when production lands, revenue/AR
  accounts when sales lands. Never seed the whole CoA speculatively.
- **A stage isn't done until its finance counterpart is.** Finish the
  operational screens *and* their postings before moving to the next stage.
- Cross-cutting finance surfaces (Chart of Accounts, General Ledger, Bank &
  cash) are **created at step 2 and extended** at steps 4 and 6 rather than
  rebuilt.
- Same docs rule applies: each finance slice updates its own
  `docs/<page>/README.md` and records which accounts/postings it introduced.

**Every feature is built for the whole size range, not just today's slice.**
Shelfree's customers span a single-employee/single-vendor/single-storage-unit
shop up to a large retailer with many employees, many products, many locations
— everything multiplied. "Starter base first" sequences *when* a capability
ships, but whenever you build or modify a feature you must still design it
against that full small→large range, not just the small case in front of you:
data model, UI, and copy should hold up whether there's 1 of something or
1,000. Concretely, building/changing a feature means also creating its
matching settings surfaces:
- **Workspace-level settings** — org/business-wide config for the feature.
- **Configuration** — the feature's own on/off + parameters (the toggle it
  will need when it's later promoted into Growth/Enterprise gating).
- **Terminology** — labels that should adapt to business shape (e.g. a
  "location"/"warehouse"/"store" naming choice) rather than being hardcoded
  to one scale's vocabulary.
- **User-level** — per-user preferences/permissions the feature needs.
Don't defer these settings surfaces to a later pass — they ship in the same
turn as the feature, same as motion/hover/keyboard-input per the craft rule
below. Record where each lives (Settings page/section) in the feature's
`docs/&lt;page&gt;/README.md`.

**"Starter first" scopes FEATURES, not CRAFT.** Building the Starter base first
is about *which capabilities* exist yet — it is **never** licence to ship a
lesser version of anything we do build. Every feature, even the smallest one in
the Starter base, is built to full production craft from day one:
- **Minimal ≠ unfinished.** "Minimal" is a design goal (no feature noise for
  small businesses) — a deliberate, refined restraint, not a rough draft. A
  single button gets the same polish as the whole app.
- **Full frontend, always:** complete visual design and layout, empty/loading/
  error states, responsive behaviour, and the interactive hover states below.
- **Motion from day one:** transitions and animations (enter/exit, state
  changes, micro-interactions) are part of the first build, not a later pass.
- **Full input model:** keyboard navigation and shortcuts, mouse right-click /
  context menus, focus management, and accessibility are built in from the
  start for every interactive surface.
Do not defer any of the above to "later / when we scale up" — only *additional
tiered capabilities* are deferred, never the quality of what already exists.

## Contacts — one person, many links (People ▸ Contacts)
Any external person (vendor owner, customer buyer, carrier driver, a future
bank manager, emergency contact…) lives **once** in People ▸ Contacts
(`cntReg()` in the ERP app, seed `seedContacts()`, spec `docs/contacts/README.md`).
When a new feature needs a person:
- **Link, never copy.** Add a `contactId` (single) or `contacts[]` of
  `{ id, contactId, role, isPrimary }` (many) to the owning record. Never add
  new name/phone/email columns to it.
- **Role & primary belong to the link**, not the person.
- **Pick with the shared picker** — `lkOpen(ev, { source: 'contacts', … })` / a
  ref-schema field `type: 'lookup', source: 'contacts'`. Don't build another
  dropdown; it already has search, keyboard nav and inline "Create …".
- **Register the link** in `cntLinks()` (one line) so the Contacts page shows it,
  its "Linked to" list jumps to it, and delete stays blocked while linked.
- If the record shows flat contact fields (grids, documents), keep them as a
  **read mirror** of the primary link (`cntMirror`) — never an independent source.
- Unlink ≠ delete. Edits to name/phone/email are shared across all links — say so in the UI.
- Phone/email are PII: masked in grids, full in drawer; update
  `docs/contacts/README.md` (link table + entity_type) and the security doc.

## Quiet pages — guidance on demand, not on the page
Every page we build (settings especially, but also forms, drawers, config
screens) ships **quiet by default**: show only names, labels and controls. Most
users already know what a setting does; help is there for the one they're unsure
of, not printed for all of them. Reference build: Settings › Tax settings in
`prototype/designs/erp/Shelfree App.dc.html` (`hpH()`, `tsHelpText()`, `tsHelpVM()`), spec
in `docs/tax-settings/README.md` → "Quiet help".
- **No descriptive text inline by default** — no page/section subtitles, no
  per-field descriptions, no "what this option means" text under selects, no
  keyboard-hint paragraphs, no "Default: X · Use default" lines, no footnotes.
  Keep only *state* inline (unsaved/undo, errors, conditional warnings that
  apply right now).
- **ⓘ + hover for every titled thing.** Page title, section titles and each
  setting/field label get an ⓘ button; hovering the label or ⓘ (~400 ms delay)
  opens a popover with the description, each option's explanation (current
  marked, default tagged), the default value + "Use default", and any
  CA/compliance note. Click ⓘ pins it; Esc / ✕ / click-outside closes.
  Reuse the shared `hp*` helpers + a per-page help-text map — don't build a new
  tooltip system.
- **Per device:** ⓘ is the primary trigger everywhere; label-hover is a
  mouse-only shortcut. Mouse: ⓘ fades in on row hover/focus. Touch
  (`(hover:none),(pointer:coarse)`): ⓘ always visible, 44 px hit area, opens as a
  bottom sheet. Keyboard/screen reader: ⓘ is a real focusable button with
  `aria-label="About …"` + `aria-expanded`; focus opens it.
- **No "Descriptions" button on the page** — ⓘ + hover already cover it. The
  `?` shortcut alone toggles all help inline for users who want it (per-user
  `me.showSetHelp`, off by default), listed in Keyboard shortcuts.
- Secondary visuals (previews, examples, explainers) collapse behind a small
  disclosure link.
- Popovers must stay on-screen: open on the side with more room, cap height to
  the available space, scroll inside.
- Add `?` and the ⓘ behaviour to the page's entry in Keyboard shortcuts, and note
  the help-text map in the page's `docs/<page>/README.md`.

## Edit in place — nothing moves, nothing hides
Every record page, drawer and card with a view/edit toggle uses **in-place
editing**. Reference build: Vendor page (Overview ▸ Details / Tax, Contact &
address) in `prototype/designs/erp/Shelfree App.dc.html`; shared helpers `ipRowFactory()`
(row VM) + `ipModeVM()` (header buttons); spec in `docs/vendor-page/README.md`.
- **Same rows, same order, same position** in view and edit. Never render a
  separate edit form or a "read-only facts + form below" split. Clicking Edit
  only swaps each editable value for its input/select **in the same box** (view
  text sits in a transparent-bordered 32 px box at the exact x/y the control's
  text will occupy). Value cells are left-aligned in a fixed label|value grid.
- **Read-only fields stay as text** in the same row (e.g. Last order, Vendor
  since, Open orders, IDs, Currency) — they don't move or disappear.
- **No edit-only fields or options.** Anything editable is visible in view mode
  too (show its current value, "—" or "Not added"). Edit-only checkboxes become a
  visible row (e.g. *Tax rules: Workspace settings / Vendor-specific*); combined
  view values are split into the rows the editor uses (Address line 1/2, City,
  State, PIN). Dependent fields (e.g. Calculate tax while inheriting) stay as
  read-only text in edit until their switch is flipped, then become controls in
  place.
- **Header is mode-stable:** the name uses the same box in both modes, and the
  view/edit button groups share one grid cell (inactive group
  `visibility:hidden` + `inert`) so header height/width never changes.
- Only *state* messages (validation errors, warnings, confirms) may appear
  below rows; put edit-only footnotes at the very bottom of the card.

## Interaction / hover states
All clickable elements (sidebar buttons especially, plus toolbar/header/action/icon buttons, table rows, etc.) must have polished interactive hover feedback: a smooth transition with at least one of — subtle elevation shadow, color transition, slight scale, or a small positional nudge. Hover feedback should clearly communicate clickability and feel aligned with modern application design standards. Apply this convention to any new interactive elements as well. (shadcn components already encode this via their `hover:` classes — keep them.)

## Security & compliance — hard gate
Every feature/page we build must pass the checklist in `docs/security/README.md`
before it's considered done — this is a **hard gate**, same weight as the
Superpowers spec gate below, not an afterthought. On every turn that adds or
changes a feature:
- Run the "Per-feature build checklist" in that doc (PII/financial/cross-tenant
  data touched? record create/edit/delete needing an audit event? new personal-
  data field? bypassing `perms`? anything sensitive landing in localStorage?).
- Never design around a control in a way that makes it hard to add later —
  no hardcoded cross-tenant access patterns, no skipped audit-relevant actions,
  no secrets in client code or localStorage.
- Since this is a frontend-only prototype, most controls (RBAC enforcement,
  audit logging, encryption, tenant isolation) aren't implemented server-side
  yet — that's expected. The gate is about *specifying* them correctly in the
  page's `docs/<page>/README.md` Backend-build notes and not building the UI in
  a way that precludes them, not about implementing a backend here.
- Keep `docs/security/README.md` current: check off items as the real backend
  implements them, and add new checklist items when a feature introduces a new
  compliance surface (e.g. a new PII field, a new payment flow).

## Keyboard shortcuts — build them in, document them live
Per the "full input model from day one" rule, every interactive surface gets real
keyboard shortcuts and mouse gestures (right-click menus, drag) as it's built —
never bolted on later. Two standing obligations that apply on **every turn that
adds or changes one**:
- **Build the shortcut for real** — wire it in the component's keydown handler /
  context-menu / drag logic, scoped so it doesn't fire while typing in a field or
  with an unrelated modal open (follow the existing `onGrid`/`typing` guard
  pattern in the ERP app shell).
- **Add it to the in-app Keyboard Shortcuts page in the same turn.** Every live
  page's shortcuts are catalogued in Settings → General → Keyboard shortcuts
  (`prototype/designs/erp/Shelfree App.dc.html`, `shortcutGroups()` — one array entry per
  shortcut, grouped by where it applies). This page is the single source of
  truth for the user; a shortcut that isn't listed there doesn't count as
  shipped. When a page/prototype outside that app shell grows its own shortcuts,
  give it the equivalent page and keep it current the same way.

## Brainstorming → spec → plan (Superpowers workflow)
When the user is brainstorming or floating an idea (cues: "let's brainstorm", "I
have an idea", "what if we…", exploring a feature before building), follow the
adapted Superpowers flow in [`docs/superpowers/README.md`]: explore context →
ask focused questions → propose 2–3 approaches → present the design in sections
for sign-off → **write a spec to `docs/superpowers/specs/YYYY-MM-DD-<topic>.md`**
and get approval. **Hard gate: do NOT build anything (components, `.dc.html`,
scaffolding) until a spec is written and approved.** When a spec is approved and
the user says to plan, write a task-by-task plan to
`docs/superpowers/plans/YYYY-MM-DD-<feature>.md`. Reference skills live in
`docs/superpowers/reference/`. These specs/plans are the in-flight lane; shipped
outcomes still fold into the per-page `docs/<page>/README.md` per the rule below.

## Known gaps — `docs/gaps.md` (since 2026-11-25)
`docs/gaps.md` lists caveats, gaps and future problems that could not be fixed
in the task that found them. Every task (and every delegated brief):
- **Before starting:** read it; if an open gap touches the area you're working
  in, fix it in this task and move it to **Closed** (date + PR).
- **While working:** fix a gap you find when you can. If you can't now (out of
  scope, needs the backend, needs a later stage), add it under **Open** in the
  same turn with an id (`G-0NN`), where, what, why it was left and *Fix by*.
- Review findings from agents that aren't fixed go here too — never only in a
  chat message or a PR body.

## Keep `docs/` in sync — always
**This app is a frontend-only prototype. The plan is to export the full
prototype later and build a real backend against these docs — so `docs/` is the
handoff contract, not a nicety.** Every app page/screen MUST have its own
`docs/<page>/README.md`, and it must be written for a backend engineer who has
never seen the UI: it is the source of truth they will implement against. It
must also carry our **decisions and open items** — what we deliberately deferred
to the backend, the business logic and rules that aren't (or only partially are)
implemented in the frontend, and why — so nothing agreed in chat is lost at
handoff. Add a **Decisions & deferred-to-backend** subsection (under
Backend-build notes) capturing: decisions made and their rationale, business
rules/validation the backend must enforce, and anything left to build later.

`docs/` (one subfolder per page/feature, e.g. `docs/warehouse/`, `docs/Sales/`) is the living functional spec of this prototype — written for a future backend/handoff team, not just a code comment. **Any turn that adds a feature, changes behavior, adds/changes a data field, or adds a new page/screen must update the matching `docs/<page>/README.md` in the same turn** (or add a new subfolder + entry in `docs/README.md`'s index if it's a new page). Cover: what changed, any new/changed data model fields, new interactions/business rules, persistence (localStorage key or API), and backend implications — following the existing five-section shape (Overview / Screens & states / Data model / Interactions & business rules / Persistence / Backend-build notes) used by every doc in that folder. Whenever the current persistence is client-side (localStorage, in-memory seed data), the **Backend-build notes** section must spell out the real backend equivalent — the API endpoints, entities/tables, relationships, and validation rules the export will need. Do not skip this even for small tweaks — a one-line addition to the relevant doc is enough; silently drifting the docs from the code is the failure mode this rule exists to prevent.
