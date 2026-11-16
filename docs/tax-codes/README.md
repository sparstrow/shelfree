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
