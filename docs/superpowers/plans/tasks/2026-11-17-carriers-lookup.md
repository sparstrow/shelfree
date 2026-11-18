# Task brief — Shared contact picker (lookup field), Carriers page, Vendor Contacts tab

Branch `feat/carriers-lookup`. Three other runs work in parallel, so stay inside the files listed here.

## Read first
1. `CLAUDE.md` — "Contacts — one person, many links", "Page templates", "Edit in place", "Quiet pages".
2. `apps/web/src/components/record-fields/FieldRows.tsx` + `model.ts` (field types),
   `components/record-drawer/EditableDrawer.tsx`, `components/list-page/ListPage.tsx` (`ListEditor`).
3. Reference editable-list page to copy: `apps/web/src/features/purchasing/charges/ChargesPage.tsx`,
   `domain/charges.ts`, `routes/purchasing/charges/index.tsx`, `e2e/charges.spec.ts`;
   and the Contacts page: `features/people/contacts/ContactsPage.tsx`, `domain/contacts.ts`.
4. `apps/web/src/features/purchasing/vendors/VendorProfilePage.tsx` and `RecordPage.tsx`.
5. `apps/web/src/data/schemas/index.ts` → `carrierSchema`, `contactSchema`, `contactLinkSchema`,
   `vendorSchema.contacts`; `src/data/api/settings.ts`.
6. `docs/superpowers/plans/tasks/2026-11-17-carriers-lookup.reference.md` — prototype: `carrReg`
   (columns, views, filters, fields, validate, view, delete rule) and carrier types
   (`carrTypes`, `carrTypeDefaults`, Settings › Carrier types markup); the lookup picker (`lk*`
   helpers + markup); the vendor Contacts tab markup and `vendContact*` helpers.
7. `docs/carriers/README.md`, `docs/contacts/README.md`.

## Build
| File | What |
|---|---|
| `apps/web/src/components/lookup/ContactPicker.tsx` | the shared picker popover from `lk*`: search, ↑/↓/Enter/Esc, mouse, inline "Create …" (name / phone / email) that creates the contact through `useUpsert('contacts')` and selects it. Radix Popover (shadcn). One component for the whole app |
| `apps/web/src/components/record-fields/FieldRows.tsx` + `model.ts` | add an OPTIONAL field type `'lookup'` with `source: 'contacts'`: view shows the contact's name (+ phone, full), edit shows a trigger that opens `ContactPicker`; existing types unchanged |
| `apps/web/src/domain/carriers.ts` + test | rules from `carrReg` |
| `apps/web/src/features/purchasing/carriers/CarriersPage.tsx` | `ListPage` + `editor`, contact through the new `lookup` field (`contactId`) |
| `apps/web/src/routes/purchasing/carriers/index.tsx` | route (`sel`) |
| `apps/web/src/features/purchasing/vendors/tabs/VendorContactsTab.tsx` | Contacts tab: linked contacts (role, primary), add link via `ContactPicker`, set primary, unlink (unlink ≠ delete), shared-edit warning as the prototype |
| `apps/web/src/domain/contacts.ts` + test | ONLY add link helpers you need (add / unlink / set primary — pure) and register carriers in `contactLinks` if not already |
| `apps/web/src/features/purchasing/vendors/VendorProfilePage.tsx` | ONLY add the `contacts` `case` branch (other runs add other cases) |
| `apps/web/e2e/carriers.spec.ts`, `apps/web/e2e/vendor-contacts.spec.ts` | tests |

## Rules
- Carrier types: if workspace settings has no carrier-types field, use `carrTypeDefaults` from
  `domain/carriers.ts` and note the Settings page as deferred.
- Phone / email masked in the Carriers grid and export; full in the drawer and picker.
- Contacts page "Linked to" must show carriers (check `contactLinks`).

## Acceptance
typecheck / lint / test pass. `carriers.spec.ts`: seeded count; phone masked in grid; create a
carrier picking an existing contact with the keyboard (type, ↓, Enter), save, see the name in view
mode; create one with "Create …" a new contact; delete rule as the prototype. `vendor-contacts.spec.ts`:
V00001's Contacts tab lists its links with Primary; link another contact, set it primary, unlink it.

## How to work (tool rules — breaking these stops the run)
- Read and search with your built-in file tools only. No shell commands to read
  or search files.
- The only shell commands you may run, with the working directory set to
  `apps/web` (use the tool's working-directory parameter; never `cd`, `&&`,
  `|` or redirection): `pnpm typecheck`, `pnpm lint`, `pnpm test`.
- Do not run Playwright / e2e tests or builds; the reviewer does.
- Do NOT commit, push or switch branches. Only touch the files this brief lists.

## Always
- Read `CLAUDE.md` first ("Frontend stack & rules", "Page templates", "Edit in
  place", "Quiet pages", "Tokens & colour", "Contacts").
- Use the templates; never copy them. If you need a template option that
  doesn't exist, add it as an OPTIONAL, backward-compatible prop and say so in
  your summary.
- Data only through `@/data/queries` hooks. No seed imports in features, no
  localStorage, no `any`, Tailwind theme tokens only, `money()`/`int()`/
  `fmtDate()` from `@/lib/format`, status as a pill.
- Phone and email are personal data: masked in grids and exports
  (`maskPhone` in `@/lib/privacy`; add `maskEmail` there if you need it, with a
  test), full in the drawer.
- Use `getByLabel('…', { exact: true })` in Playwright tests (labels also have
  "About …" help buttons).
- Update the page's `docs/<page>/README.md` with a `## React app (2026-11-17)`
  section (files, URL, same-as-prototype, deliberate changes, persistence key
  `shelfree.v2.<collection>`, backend rules, tests) and add your page(s) to the
  status table in `docs/superpowers/plans/2026-11-15-react-frontend-migration.md`.

## When you finish
Print a short summary: files changed, template options added, anything you
could not do or verify, open questions.
