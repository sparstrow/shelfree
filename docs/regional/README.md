# Regional & format — Settings ▸ Workspace ▸ Regional & format

## Overview
Workspace-wide regional settings: the base currency, number and date format, time zone, the month the financial
year starts and the first day of the week. Prototype: `prototype/designs/erp/Shelfree App.dc.html` → the *Regional &
format* section (`ws-regional`, fields on `ws`: `currency, timezone, dateFmt, numFmt, fiscalStart, weekStart`).
Each person's own language and locale are personal (Settings ▸ My preferences, not ported yet). Tier: Starter base,
ungated.

## Screens & states
- **Page** `/settings/ws-regional` (area Workspace, owners and admins only; type form) — `SettingsSection` with three
  groups: *Currency & numbers* (Base currency, Number format), *Dates & time* (Time zone, Date format, Week starts on),
  *Financial year* (Fiscal year starts). Quiet: no descriptions inline; ⓘ help on the page, each group and each row
  (`features/settings/regional/help.ts`). Save / Discard bar, Ctrl+S, Esc, unsaved-changes guard come from the template.
- Loading skeleton and error with *Try again* from the template. Read-only mode renders the values as text.

## Data model
`settings.regional` inside the workspace settings document (`shelfree.v2.settings`):
`{ currency, timezone, dateFmt, numFmt, fiscalStart, weekStart }`, all strings from the option lists in
`domain/regional.ts` (`CURRENCY_OPTIONS` INR USD EUR GBP AED SGD AUD CAD; `TIMEZONE_OPTIONS` 8 zones;
`DATE_FORMAT_OPTIONS` DD/MM/YYYY MM/DD/YYYY YYYY-MM-DD DD-MMM-YYYY; `NUMBER_FORMAT_OPTIONS` 12,34,567.89 1,234,567.89
1.234.567,89 1 234 567.89; `FISCAL_START_OPTIONS` January April July October; `WEEK_START_OPTIONS` Monday Sunday).
Defaults (Kanalora): INR, Asia/Kolkata (IST), DD/MM/YYYY, 12,34,567.89, April, Monday. Unknown stored values fall back to
the defaults on read (`normalizeRegional`).

## Interactions & business rules
- Saving writes **only the `regional` block** (`settingsApi.updateRegional`) on top of the latest stored document, never a
  cached copy of the whole document.
- `fiscalYearLabel(date, fiscalStart)` is the one place the financial year is named: `2026-27` when it starts in April
  (25 Nov 2026 and 12 Feb 2027 are both `2026-27`), the calendar year when it starts in January. It already drives the
  invoice-number preview and the invoice-prefix length check on GST registrations (`{FY}`).
- Pure formatters exist for the later wiring: `formatMoneyAs`, `formatNumberAs` (lakh or thousands grouping, `.` / `,` /
  space separators), `formatDateAs` — Vitest-covered.
- **Parity note:** the prototype's *Multi-currency* row (a locked upgrade prompt to Plan & billing) is not shown — tiers
  are parked and the capability belongs to Modules & capabilities.

## Persistence
`localStorage['shelfree.v2.settings'].regional` (see `data/api/settings.ts`). The Business profile's workspace record
also still carries `currency … weekStart` fields — duplicates nobody reads (G-033).

## Backend-build notes
- `GET /workspace/settings`, `PATCH /workspace/regional` (owner / admin). One row per workspace: `currency` (ISO 4217),
  `time_zone` (IANA name — store `Asia/Kolkata`, derive the "(IST)" label), `date_format`, `number_format`,
  `fiscal_year_start_month` (1–12), `week_start` (0/1). Validate each against the lists above.
- Changing the base currency after documents exist must be refused or require a conversion run — the frontend only warns
  in the help text. The fiscal year start affects numbering periods (GST invoice prefixes with `{FY}`) and the closing
  reports; changing it must not renumber issued documents.
- **Audit event:** `workspace.regional.updated` (field diff). **Permission:** workspace settings (owner / admin). No PII.

### Decisions & deferred-to-backend
- **Not applied to the app's display yet (G-029):** `money()`, `int()` and `fmtDate()` in `src/lib/format.ts` still print
  en-IN, ₹ and `Jul 12, 2026`. The prototype's default date format `DD/MM/YYYY` is not the app's current output, so wiring
  the formatters would change every date on screen; do it as its own task with the visible default decided.
- Time zone only affects "today" once the formatters are wired; `todayLocal()` still uses the browser's zone.

## React app (2026-11-25)
Files: `features/settings/regional/{RegionalSection.tsx,help.ts}`, `domain/regional.ts` (+ `regional.test.ts`),
`data/api/settings.ts` (the `regional` block, `updateRegional`), `data/queries/regional-terminology.ts`
(`useUpdateRegionalSettings`), registered in `features/settings/sections.ts`. Keyboard: Ctrl/Cmd+S, Esc (Settings ›
Regional & format in the shortcut catalogue). Tests: Vitest `domain/regional.test.ts`, `data/api/settings-workspace.test.ts`;
Playwright `e2e/settings-workspace-a.spec.ts` (defaults, save / discard / reload, the invoice-number year, help).
