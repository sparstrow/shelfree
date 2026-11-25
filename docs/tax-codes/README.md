# Tax codes — Settings ▸ Configuration ▸ Tax codes

## Overview
National GST rate codes used by items, charges and (from task 6) document lines. **Rates are
the same in every state** — the document engine decides the split (CGST + SGST same state,
IGST different states, UTGST in UTs without a legislature); users never pick it. Each code
keeps **dated rate rows**, so a government rate change is a new row, never an edit of a rate
already in effect. Spec: `docs/superpowers/specs/2026-09-25-tax-codes-gst.md` §2.1; plan task 1
(`docs/superpowers/plans/2026-09-25-tax-codes-gst.md`). Built in
`prototype/designs/erp/Shelfree App.dc.html` (`taxCodes()`, `taxRateOn()`, `tc*` methods, `tcVM()`).
Tier: parked (POC) — ungated. Future-pass hint: Starter base.

## Screens & states
- **Page** (settings id `cfg-tax`): title + active count pill, **New tax code** (N), split explainer
  (two cards: same state → CGST + SGST half each; different states → IGST full rate — live example on
  ₹1,000 at the current GST5 rate), table, lock note about rate changes.
- **Table:** Code (mono) · Name + Built-in tag + description · Rate (current; amber "→ 18% from …"
  line when a future rate is scheduled; "Follows the goods" for GOODS; "Starts …" if only future rows)
  · Effective from · Applies to · Charges (count using it) · Status · Edit / Delete icons.
  Inactive codes sort last, dimmed. Row hover, double-click = edit, right-click = menu.
- **Row menu:** Edit · Add rate change (rate codes only) · Activate/Deactivate · Delete (or the reason
  it can't be deleted).
- **Edit / new popup:** Code (locked after create) · Name · Applies to (Goods / Services / Both
  segmented) · **Rate history** table (Rate % · Effective from · status tag Current / Past / Scheduled /
  New · remove or lock icon) with **Add rate change** · Goods-rate info note instead of history for
  GOODS · Description · Active switch. Field-level errors + form banner.
- **Delete confirm** popup. Toasts: created / updated / "Rate change scheduled · 18% from …" /
  activated / deactivated / deleted / can't deactivate.

## Data model
`TaxCode { code: string(2–12, A–Z 0–9 -, PK), name: string (unique, case-insensitive), kind: 'rate'|'goods',
appliesTo: 'Goods'|'Services'|'Both', rates: { rate: number(0–100, 2dp), from: ISO date }[], desc: string,
active: boolean, system: boolean, createdAt, updatedAt }`
- `kind = 'goods'` (GOODS only): no rates; the line takes the rate of the goods on the same document.
- Seed (`taxCodeDefaults()`): built-in **GST0, GST5, GST18, GST40, GOODS**; non-system inactive **GST3**
  (precious metals), **GST12**, **GST28** (retired by GST 2.0 on 22 Sep 2025 — kept for older documents).
- Lookups: `taxRateOn(code, date)` = latest row with `from ≤ date`; `tcNextRate(t)` = first future row.
- **Used by:** charges today (`charges[].gst` '5%' / 'Goods rate' mapped to GST5 / GOODS until task 6
  moves charges to a `taxCode` ref). Items and document lines join the count in tasks 6–7.

## Interactions & business rules
- Code 2–12 chars, uppercase/digits/hyphens, unique; fixed after create. Name required, unique.
- Rate 0–100, up to 2 decimals. Each rate row needs a start date; no two rows on the same date.
- **Editing an existing code:** rows with `from < today` are **locked** (no edit/delete). A row starting
  **today** stays editable/removable until midnight so a same-day mistake can be fixed. New rows must
  start **today or later** and after the last locked row. **New code:** any dates (lets you enter history).
- System codes: can't delete; code/kind fixed; name, description, applies-to, future rates and active
  editable. GOODS has no rate history.
- Deactivate blocked while an active charge uses the code; delete blocked for system codes and for any
  code a charge uses. Both also blocked while the code is the workspace default or a category default
  in Tax settings (`tsCodeRefs()`, `docs/tax-settings/README.md`).
- Keyboard (listed in Settings ▸ Keyboard shortcuts → "Settings › Tax codes"): N new · double-click
  edit · right-click menu · Alt + R add rate row (in popup) · Ctrl/Cmd + Enter or S save · Enter confirm
  delete · Esc closes menu → confirm → popup.

## Persistence
`localStorage['shelfree.settings.workspace.v1'].taxCodes` = TaxCode[] (via `wsSet`). Missing built-in
codes are merged back on read; deleted non-system seeds stay deleted.

## Backend-build notes
- Tables: `tax_codes` (tenant_id, code, name, kind, applies_to, description, is_system, system_key,
  is_active, created/updated at/by; unique (tenant_id, code), (tenant_id, lower(name))) and
  `tax_code_rates` (tax_code_id FK, rate numeric(5,2), effective_from date; unique (tax_code_id,
  effective_from)).
- Endpoints: `GET /tax-codes`, `POST /tax-codes`, `PATCH /tax-codes/:code`, `DELETE /tax-codes/:code`,
  `POST /tax-codes/:code/rates` (append), `DELETE /tax-codes/:code/rates/:from` (future rows only),
  `GET /tax-codes/:code/rate?on=YYYY-MM-DD`.
- Server must enforce: rate rows with `effective_from < today` immutable; a row starting today is
  mutable only until the first posted document references it (then immutable); appends must be `≥ today` and after the latest existing row; system-code
  immutability (code, kind, no delete); referential integrity (charges, items, document lines).
- **Documents must store the resolved rate + code on each line at posting** — never re-read the rate
  later. Rate lookup uses the document date.

### Security checklist (per-feature)
- Financial config, tenant-scoped. RBAC `tax.codes.manage` (finance admin); read for all users.
- Audit events: tax code create / edit (field diff) / activate / deactivate / delete; **rate row
  append / remove (with old → new rate and date)**. No PII. Nothing sensitive in localStorage.

### Decisions & deferred-to-backend
- Rate-level codes; split computed per line (spec Option A). Rates national, not per state.
- GST 2.0 slabs seeded (0 / 5 / 18 / 40); 12% and 28% kept as inactive retired codes for old documents.
- Cess not modelled (spec: reserved, off). Special rates 1.5% / 0.25% not seeded — add as codes if needed.
- Holder HSN 6913 @ 5% is a seed assumption pending CA confirmation (spec Q3).

## Quiet help (2026-10-15 · CLAUDE.md "Quiet pages")
- Page subtitle, the "You never pick the split" note, the rate-lock footnote, the edit popup's *Applies to* description, code hint, rate-history note and the "Ctrl/Cmd + Enter to save · Esc to close" hint are hidden by default. They show inline only with **Descriptions** on (header button or `?`; per-user `me.showSetHelp`, shared with Tax settings).
- ⓘ + hover help on: page title; grid columns *Rate*, *Effective from*, *Applies to*, *Charges*; edit popup fields *Code*, *Applies to*, *Rate history*. The rate-lock footnote now lives in the *Rate* ⓘ.
- The Same state / Different states explainer cards collapse behind a **How GST splits** link (`tcSplitOpen`, session only).
- Help-text map: `tcHelpText()`; VM: `tcHelpVM()` on top of the shared `hpCommonVM()` / `hpH()` (same helpers as Tax settings). The popover now renders once at app level (z-index 80, above the edit popup).
- Per device: mouse — column/field ⓘ fades in on hover; touch — always visible, 44 px, bottom sheet; keyboard — focusable ⓘ with `aria-label` + `aria-expanded`.
- Backend: no new data beyond the shared per-user `settings_show_descriptions` boolean.
- 2026-10-15: removed the header **Descriptions** button (redundant with ⓘ + hover). Inline descriptions remain available via the `?` shortcut only.


## Update 2026-10-15 — inline descriptions retired
The `?` "show every description inline" mode is removed from this page: no description text renders under the page title, section titles, settings/fields or options under any setting — the ⓘ + hover popover is the only place descriptions live. The `?` shortcut no longer applies here and is removed from Keyboard shortcuts. (Tax codes also drops the inline "Ctrl/Cmd + Enter to save · Esc to close" hint in the edit popup — it stays listed in Keyboard shortcuts.)

## React app (2026-11-25)

**Settings ▸ Finance ▸ Tax codes** is ported as a list section (Phase 2 run 2.3): **`/finance/settings/tax-codes`** and
**`/settings/shared/tax-codes`** (legacy `/settings/cfg-tax` redirects). `TaxCodesSection` in
`apps/web/src/features/settings/tax-codes/` is a `ListPage embedded` with an `editor` inside `SettingsPage flush`: list + drawer,
view and edit show the same rows (N / E / Ctrl+S / Esc, delete with undo). The **rate history** is the drawer's `extra` /
`extraEdit` (`RateHistory.tsx`: Rate · Effective from · Current / Past / Scheduled / New · lock or remove, *Add rate change*).
Rules: `apps/web/src/domain/tax-codes.ts` (Vitest). Tier: Starter base, ungated, on by default.

### One module or many (follows G-011)
**Finance only, no `module` field.** A tax code is a national rate used by charges, items and documents in every module, so the
Finance slice and Shared lists ▸ Tax codes are the **same rows** (no Module column to filter by). Number sequences, statuses and
custom fields carry one `module`; payment terms carry `modules[]`; tax codes carry none.

### What reads tax codes today (and what doesn't)
GST rates lived only on **charges** (`charge.gst` = `Goods rate` / `0%` / `5%` / `12%` / `18%` / `28%`, `CHARGE_GST_RATES` in
`domain/charges.ts`) — items, price lists and document lines carry no GST rate in the app yet. This run introduces the `taxCodes`
collection **seeded with the same rates** and leaves every calculation and the charge editor's list untouched (a test proves every
charge rate maps to a seeded code with that rate). "Charges" counts charges whose `gst` maps to the code (`chargeTaxCode`: `Goods
rate` → GOODS, `5%` → GST5). Delete and deactivate are blocked on that count. **Gap G-023:** charges, items and document lines
should store a tax-code reference (and the charge editor should offer the active codes), so "used by" also covers items, prices
and documents and rate lookup uses the document date.

### Parity and deliberate changes
- **Ported:** the eight seeded codes (GST0, GST5, GST18, GST40, GOODS built-in; GST3, GST12, GST28 inactive); columns Code · Name ·
  Rate (current, or `5% → 18% from …`, `Follows the goods`, `Starts …`) · Effective from · Applies to · Source · Charges · Status;
  views All / Active / Inactive; create / edit / delete; every rule below.
- **Changed:** Applies to is a select (was a segmented control); the *Built-in* tag is a Source column and a drawer tag; the "How
  GST splits" explainer, the "Rate change scheduled …" toast and Alt+R are not ported (the generic save toast is used; the button
  is in the drawer). Inactive codes sort after active ones but are not dimmed. Missing built-in codes are not merged back on read
  (built-in codes can't be deleted, so they can't go missing).

### Data model
Collection `taxCodes` (`shelfree.v2.taxCodes`, key `code`), schema `taxCodeSchema`: `code (2–12, A–Z 0–9 -), name, kind
'rate'|'goods', appliesTo 'Goods'|'Services'|'Both', rates [{ rate 0–100, from ISO date }], desc, active, system, createdAt,
updatedAt` — the prototype's `TaxCode`.

### Rules (`domain/tax-codes.ts`; the backend enforces the same)
- Code 2–12 chars, unique, fixed after create; name required, unique (case-insensitive).
- Rates 0–100, up to 2 decimals, one per date. **Editing a saved code:** rows that started before today are locked (shown, not
  editable); a row starting today stays editable; new rows must start today or later and after the last locked row. **A new code**
  may enter any dates (its history).
- Built-in codes can't be deleted (code and kind fixed; name, description, applies-to, future rates and status editable).
- **Delete** is blocked for built-in codes and any code a charge uses; **deactivate** is blocked while an *active* charge uses it.
- `taxRateOn(code, date)` = latest row with `from ≤ date`; GOODS has none.

### Backend-build notes
As above (tables `tax_codes` and `tax_code_rates`, endpoints, immutability of started rates, documents store the resolved rate and
code at posting). **Permissions:** Finance *Manage settings* to write; Finance read access to view (read-only mode: no New / Edit /
Delete). **Audit:** code create / edit (field diff) / activate / deactivate / delete and every rate-row append / remove with old →
new and the date. No personal data. Referential integrity must cover charges, items, price lists and document lines (G-023).

### Tests
Vitest `domain/tax-codes.test.ts` (seed, charge-rate mapping, rate lookup and status, usage and blocks, validation of code / name /
rate rows / locks / deactivate, drafts and the stored record). Playwright `e2e/settings-finance.spec.ts` (list, shared copy, create /
edit in place / scheduled rate / delete + undo, validation, locked history, blocks, help, view-only member).
