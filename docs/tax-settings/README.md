# Tax settings — Settings ▸ Configuration ▸ Tax settings

## Overview
Workspace-wide GST behaviour: tax calculation method, rupee rounding, default tax codes (workspace + per item category),
line-override and GSTIN-mismatch checks, bill-to ≠ ship-to handling, when input tax credit is
booked (spec Q5) and the value used on branch transfers (spec Q6). Spec
`docs/superpowers/specs/2026-09-25-tax-codes-gst.md` §2.4 (+ §2.6 user preference); plan task 5.
Built in `designs/erp/Shelfree App.dc.html` (`taxSetDefaults()`, `taxSet()`, `tsSet()`, `ts*`
methods, `tsVM()`). Settings id `cfg-taxset`.
Tier: parked (POC) — ungated. Future-pass hint: rounding / defaults / checks = Starter;
bill-to ≠ ship-to + branch transfer value = Growth (multi-registration); ITC 2B hold = Growth.

**What reads these (later tasks):** item create (task 6: default code, category default) · tax
engine + line tag (task 7: tax calculation method, override, mismatch warning, paper-transfer rule) · postings
(task 9: round-off account, ITC booking) · stock transfers (task 12: branch value). Until then the
settings are stored and shown, not yet applied to documents.

## Screens & states
**Redesigned 2026-09-26** from Q&A-style choice cards into a conventional settings page with an
explicit save.
- **Layout:** header (title, description, *Last saved <date> by <user>* / *Using the default
  settings*, link → Tax codes) · sticky left section nav (1–6, active section tracks scroll, a
  primary count badge shows unsaved changes per section) · content column of section cards. Below
  820px of page width the nav becomes a non-sticky row of chips above the cards.
- **Setting rows:** label + help text on the left, control on the right (select for choices, switch
  for on/off). Choice selects show the selected option's explanation under them and mark the default
  option "(default)". No "Recommended" badges.
- **Row states:** *saved = default* (plain) · *saved ≠ default* ("Default: X · Use default") ·
  *unsaved* (primary left bar + tint, "Unsaved · was X · Undo").
- **Sections:** 1 Tax calculation (Calculate tax select + live mixed-rate preview — 3 lines @ 5% +
  2 @ 18%, both methods side by side, the chosen one highlighted, a "Grouped by rate" caption and the
  payable/round-off line; follows the unsaved choice) · 2 Rounding (Round totals switch · Round-off
  account, disabled while rounding is off) · 3 Default tax codes (New
  items start with · By item category table — edits are drafted, dirty rows show an *Unsaved* pill) ·
  4 Document checks (line override switch · GSTIN mismatch switch · Bill-to ≠ ship-to select:
  *Allow with a warning* (default) / *Block the purchase order*) · 5 Input tax credit (*Confirm with
  CA* chip on the row) · 6 Branch transfers (*Confirm with CA*; % row appears for *A share of selling
  price*) · 7 Change history (last 3 saves, "Show all"; each with who/when/optional note and every
  field old → new).
- **Save bar** (sticky at the bottom, appears only when there are unsaved changes): "n unsaved
  changes" + whether any affect existing documents/records · *Discard* (toast with Undo) · *Review
  and save* (Ctrl/Cmd+S).
- **Review dialog:** every change as *Section › Setting*, old (struck) → new, a pill *Affects
  existing* (warn) or *Going forward*, and a plain-language impact line with live counts (e.g. "4
  open purchase orders will recalculate tax … Posted receipts and bills keep their amounts").
  Optional note for the change log (≤280 chars). *Keep editing* / *Save n changes* (Ctrl/Cmd+Enter).
- **Leave guard:** navigating to another settings page or closing Settings with unsaved changes opens
  *Unsaved tax settings* — Stay (Esc) / Discard and leave / Review and save (Enter → review →
  *Save and continue* completes the navigation).
- **Category row menu** (right-click): Inherit from parent · Make sub-categories inherit this ·
  Open Item categories — all drafted, not saved.
- **My settings ▸ Personal defaults ▸ Documents:** *Show tax split columns on document lines* (user
  preference, saves immediately — not part of this page's draft).

## Data model
`ws.taxSettings = { taxCalc: 'line'|'rate', roundTotal: boolean, roundOffAcct: string (CoA no),
defaultItemCode: string (tax code or ''), lineOverride: boolean, mismatchWarn: boolean,
paperTransfer: 'warn'|'block', itcBooking: 'onBill'|'on2bMatch', branchValue: 'landed'|'purchase'|'pctSell',
branchPct: number (1–100, 2dp), updatedAt, updatedBy, log: [{ at, by, note, changes: [{ key, label, from, to }] }] (newest first, last 25) }`
- **Migration (2026-09-26):** the field was `rounding: 'line'|'document'`; `taxSet()` maps a stored
  `rounding` to `taxCalc` (`document` → `rate`) and drops the old key on next save.
- **Draft (UI state only, not persisted):** `tsDraft` (changed setting keys → new value), `tsCatDraft` (category id → code, '' = inherit), `tsPctRaw`, `tsReview`, `tsLeave`, `tsNote`.
Defaults: `line, true, '6190', 'GST5', true, true, 'warn', 'onBill', 'landed', 90`.
- **Item category:** new field `taxCode: string` ('' = inherit). Resolution: own code → nearest
  ancestor with a code → `defaultItemCode`. Category edit modal preserves it.
- **User:** `me.showTaxSplit: boolean` (default false).
- **New CoA account:** `6190 Round off` (Expense · Indirect expenses, system, documents only).

## Interactions & business rules
- **Tax calculation (2026-09-26 — renamed from "Tax rounding / Round once per document").** The
  setting chooses *where* tax is calculated; rounding itself is fixed and not configurable:
  - *On each line* (default): per line, per component (CGST/SGST/IGST): taxable × component rate,
    rounded to 2 dp; document tax = sum of rounded line taxes. Matches e-invoice / GSTR-1 line data.
  - *On each tax-rate total*: lines are **grouped by tax rate** (never mixed across rates); per group,
    per component: group taxable × component rate, rounded to 2 dp. Line-level tax is then allocated
    back to lines (backend: largest-remainder, so lines sum to the group total).
  - Rounding rule for both: 2 dp, round half up, each component separately (CGST = SGST always).
    Line taxable = qty × rate − discount + line-allocated charges, before tax.
  - Rupee rounding (section 2) runs after, on the grand total only; its amount maps to the e-invoice
    `RndOffAmt` field. GST amounts and ITC stay at paise figures — round-off is not tax.
  - Example (preview): 5% lines 1,234.50 / 89.30 / 415.75 → per line CGST 30.86 + 2.23 + 10.39 =
    43.48; per rate 1,739.55 × 2.5% = 43.48875 → 43.49. 18% lines 449.15 / 312.30 → 68.53 either way.
- Category/default codes list only **active rate codes that apply to Goods or Both** (not GOODS).
- A tax code set as the workspace default or a category default **can't be deactivated or deleted**
  (Tax codes page shows "Set as … in Tax settings — change it there first").
- **Nothing applies until Save.** Every control edits a draft; setting a value back to the saved one
  clears it from the draft. Save writes all drafted fields + category codes in one go and appends one
  log entry.
- **Impact classes** (shown in review): *Affects existing* — rounding / round-to-rupee (open POs:
  Draft, Issued, Partially received recalculate on next edit or receipt; posted docs untouched),
  line override off (no new overrides; existing stay), GSTIN mismatch warning (display only),
  bill-to ≠ ship-to → block (only with ≥2 registrations). *Going forward* — round-off account, default
  item code, category codes (with count of existing items that keep their code), ITC booking, branch
  transfer value/%.
- % field commits to the draft on blur/Enter; clamped 1–100; empty/0 reverts with a toast.
- ITC booking change applies to bills posted after the change; posted bills keep their treatment.
- Paper-transfer rule only matters with ≥2 active Normal registrations (note shown otherwise).
- Keyboard (Settings ▸ Keyboard shortcuts → "Settings › Tax settings"): 1–6 jump + focus · Ctrl/Cmd+S
  review · Ctrl/Cmd+Enter save in review · Enter in leave prompt → review · Space toggles a switch ·
  right-click category row · Enter applies % · Esc closes menu/review/prompt. Digit keys ignored while
  typing in a field.

## Persistence
`localStorage['shelfree.settings.workspace.v1'].taxSettings` (via `wsSet`) · category `taxCode` on
`shelfree` category store (`catPersist`) · `localStorage['shelfree.settings.user.v1'].showTaxSplit` ·
6190 via `seedAccounts()` merged into `shelfree.coa.v1`.

## Backend-build notes
- Table `tax_settings` (tenant_id PK, tax_calc_method (line|rate), round_total, round_off_account_id FK accounts,
  default_item_tax_code_id FK, allow_line_override, warn_gstin_state_mismatch, paper_transfer_mode,
  itc_booking_mode, branch_transfer_value_mode, branch_transfer_pct numeric(5,2), updated_at/by).
  `item_categories.tax_code_id` nullable FK (null = inherit). `user_preferences.show_tax_split`.
- Endpoints: `GET /settings/tax`, `POST /settings/tax/preview-impact { patch, categoryCodes }` (returns
  the per-change impact + live counts the review dialog shows), `PATCH /settings/tax { patch,
  categoryCodes, note, expectedVersion }` — one transaction for settings + category codes, optimistic
  concurrency (409 if another admin saved since load), `PATCH /item-categories/:id { taxCodeId }`,
  `POST /item-categories/:id/clear-descendant-tax-codes`, `GET /item-categories/:id/effective-tax-code`.
- Validate: round-off account active and Income/Expense; tax codes active, kind rate, applies to
  Goods/Both; pct 1–100; enums. Block tax-code deactivate/delete while referenced here.
- **Tax maths must use exact decimal arithmetic** (e.g. NUMERIC / BigDecimal), never floating
  point — the prototype preview uses JS floats, which can mis-round exact half-paise (1.005).
- **Documents snapshot** the settings they used (tax calculation method, ITC mode, branch value basis) at
  posting — never re-read later. `itcBooking` changes take effect for bills posted after the change;
  backend should warn (or block, pending CA) when changed mid return period.
- `on2bMatch` needs account `1420 GST input — awaiting 2B match` — create it with finance postings
  (task 9) when this mode is first chosen.

### Security checklist (per-feature)
- Financial config, tenant-scoped; no PII. RBAC: `tax.codes.manage` edits this page (finance
  admin); `tax.line.override` governs the override switch's effect per user; read for all users.
- Audit events: one `tax_settings.updated` event per save with every field old → new, who, when and
  the optional note (the in-app Change history is a view of these; the localStorage `log` is a
  prototype stand-in); category tax code set/clear
  (incl. bulk "sub-categories inherit"). Nothing sensitive in localStorage.

### Decisions & deferred-to-backend
- **Tax calculation split from rounding (2026-09-26):** "Round once per document" implied adding
  lines of different rates together; it actually taxes each rate group once. Renamed to *Calculate
  tax: On each line / On each tax-rate total*, moved into its own section; rounding to the paisa is
  fixed (not a setting). Default stays *On each line* (industry norm, matches e-invoice line data).
- **Vendor override (built 2026-09-26):** vendors inherit *Calculate tax* + *Round totals* unless their card
  unticks *Use workspace settings* (`docs/vendor-page/`); POs stamp the resolved method. **Parked:** every vendor-bill field is manually editable to match
  the vendor invoice (no tolerance/blocking). See `docs/superpowers/specs/2026-09-26-vendor-tax-matching.md`. Not built.
- **Explicit save with review (2026-09-26):** these settings change how open documents calculate,
  so autosave was replaced by draft → review (impact per change) → save. The backend must compute
  impact counts server-side and re-validate at save; open documents recalculate lazily on next
  edit/receipt, never in a bulk rewrite.
- Defaults = recommended options for open CA questions Q5 (book on bill) and Q6 (landed cost);
  both are changeable settings, so the build isn't blocked.
- Category tax defaults are edited here (inherit model); the Item categories grid gets its Tax code
  column in task 6.
- Line override reason is always required (not a setting) — audit trail requirement.
- % of selling price default 90 reflects the GST valuation rule for related-party transfers —
  to confirm with CA.

## Vendor GST registration settings (2026-09-28 · spec `2026-09-28-vendor-gst-registration.md`)
- Section 3 renamed **Defaults** (nav + heading). New row **New vendors start as** (`newVendorReg`: `regular` default | `unregistered`). Impact: only vendors set up from now on.
- Section 4 **Document checks** new row **Composition vendor in another state** (`compInterState`: `warn` default | `block`). Shown only when a composition vendor exists, the business has ≥2 registrations, or it's set to Block. Impact counts open POs that break the rule; Block stops issuing (drafts still save).
- Both go through the existing review-before-save + change history. Stored on `ws.taxSettings`. Backend: two columns on `tax_settings`; enforcement of `compInterState` on PO issue server-side.

## Category tax codes retired (2026-09-28)
- Removed the **By item category** table from section 3 (Defaults), its right-click menu (Inherit from parent / Make sub-categories inherit / Open Item categories) and the category rows in the review list.
- Item categories no longer store or inherit a tax code (`cats[].taxCode` dropped; category save no longer writes it). Rationale: GST follows HSN, not operational grouping — one category can hold items at different rates, and a second tax layer caused confusion. No data loss: every category inherited the workspace default.
- ~~*New items start with* stays for now as a plain pre-fill~~ — superseded, see below.
- Backend: drop `item_categories.tax_code`; no category-level tax resolution anywhere in the engine.

## Removed "New items start with" (2026-10-15 · spec `2026-09-28-tax-classifications.md` Q1)
- Section 3 **Defaults** briefly held only *New vendors start as* — then removed entirely, see below.
- `defaultItemCode` dropped from `ws.taxSettings` (defaults + stripped on read from stored settings). Removed its review-impact text, nav count and the "default for new items" block on deactivating a tax code.
- Old change-history entries for this setting still render with their label.
- Rationale: items get tax only through Item → Classification → Tax code; a default item tax code would be a control that nothing reads. *Default classification for new items* is parked (classifications spec D5).
- Backend: drop `tax_settings.default_item_tax_code`; there is no item-level tax-code default anywhere.

## Removed section 3 "Defaults" / "New vendors start as" (2026-10-15)
- The *Defaults* section is gone. Sections are now 1 Tax calculation · 2 Rounding · 3 Document checks · 4 Input tax credit · 5 Branch transfers · 6 Change history; keyboard jump is **1–6** (shortcut page updated).
- `newVendorReg` dropped from `ws.taxSettings` (defaults + stripped on read). New vendors always start as **Registered — regular**, which is hardcoded in the vendor edit, where "(default)" marks Regular.
- Rationale: **vendor creation templates** (one for each vendor type, each carrying its own GST registration) are planned and will replace this setting. Removing it now avoids a one-row section that would be migrated later. Parked: vendor templates + a *Default vendor template* setting.
- Old change-history entries still render their labels (`tsMeta`/`tsOpts` keep the keys for history only).
- Backend: drop `tax_settings.new_vendor_reg`; vendor create defaults `gst_type = 'regular'` until templates exist.

## Quiet help — shipped in the app (2026-10-15 · prototype `designs/erp/Tax Settings Quiet.dc.html`)
Live in `Shelfree App.dc.html` (Tax settings). Goal: cut settings-page text noise; guidance on demand. App specifics: preference stored as `me.showSetHelp` (boolean, default false) in `localStorage['shelfree.settings.user.v1']` via `meSet`; popover state `hp` / `hpTouch` (generic — reusable by other settings pages via `hpH(key)` + a help-text map like `tsHelpText()`); preview open state `tsPrevOpen` (session only). "Default: X · Use default" lines now show only with Descriptions on; otherwise the default + Use default live in the popover. Option labels keep their "(default)" suffix in the dropdown.
- **Default = quiet.** Page, section and setting descriptions, option explanations, the "Press 1–6" hint and the preview footnote are hidden. Each title/label shows only its name + an ⓘ button.
- **Help on demand.** Hover a label or ⓘ (350 ms delay) → popover with the description, every option's explanation (current marked, default tagged) or the default value, plus the CA note where flagged. Click ⓘ pins it (close ✕, click outside, Esc). Focus on ⓘ opens it for keyboard users.
- **Descriptions toggle** (header, `?`) shows every description inline for users who want the full guidance. User-level preference (prototype: `localStorage['sf.proto.taxSettingsQuiet.v1'].showHelp`; real: user settings).
- **Preview** under *Calculate tax* collapsed behind a "Preview" link; grouping footnote moved into its ⓘ.
- Nav: no number chips; unsaved count kept. "Confirm with CA" chip shortened to "CA" (full text in title + popover).
- Right-click a setting row → Explain this setting · Reset to default · Copy link to setting.
- Shortcuts: 1–6 jump · ? descriptions · Ctrl S save · Esc close. Shortcuts popover from the header keyboard button. If adopted, add `?` + right-click menu to `shortcutGroups()`.
- Backend: none new beyond a per-user `settings_show_descriptions` boolean. Help copy should become a content map keyed by setting key so every settings page can reuse the pattern.
- **Per-device triggers (2026-10-15).** ⓘ is the primary trigger on every device; name-hover is a mouse-only shortcut.
  - *Mouse* (`(hover:hover)`): ⓘ on rows/section titles fades in only on row hover, on keyboard focus, or while its popover is open. Page-title ⓘ always visible.
  - *Touch* (`(hover:none), (pointer:coarse)`): ⓘ always visible with a 44 px hit area; hover is ignored; tapping ⓘ opens help as a bottom sheet with backdrop (tap backdrop / ✕ / Esc to close).
  - *Keyboard / screen reader*: ⓘ is a real button (`aria-label="About …"`, `aria-expanded`); focus opens help.
  - Prototype tweak `inputMode` (auto | mouse | touch) forces either mode for review.
- 2026-10-15: removed the header **Descriptions** button (redundant with ⓘ + hover). Inline descriptions remain available via the `?` shortcut only.


## Update 2026-10-15 — inline descriptions retired
The `?` "show every description inline" mode is removed from this page: no description text renders under the page title, section titles, settings/fields or options under any setting — the ⓘ + hover popover is the only place descriptions live. The `?` shortcut no longer applies here and is removed from Keyboard shortcuts. (Tax codes also drops the inline "Ctrl/Cmd + Enter to save · Esc to close" hint in the edit popup — it stays listed in Keyboard shortcuts.)
