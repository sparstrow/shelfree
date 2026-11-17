# Notes — app-wide, append-only

## Overview

Every record in Shelfree has a **notes thread**, not a notes field. Multiple
people add notes to the same purchase order, receipt, BOM, assembly order,
item, vendor or customer over time; each note is permanently stamped with its
author and the date/time it was added.

The defining rule: **a note can never be edited or deleted — by anyone,
including admins and its own author.** That is deliberate. If notes could be
rewritten, an employee could change what was recorded about a situation after
the fact to suit themselves. Instead, a note that turns out to be wrong is
**marked invalid**, once, with a short permanent reason; the original text
stays on the record, struck through, with who invalidated it and why.

Replaces two older patterns: the single free-text `notes` textarea on the PO /
receipt / BOM / assembly-order documents, and the delete-able note list on the
Customer profile.

Surfaces (all live):

| Surface | Where |
|---|---|
| Purchase order editor | notes block where the old textarea was |
| Purchase receipt editor | same |
| BOM editor | same |
| Assembly order editor | same |
| Customer profile | Notes & activity tab |
| Item page | new **Notes** tab |
| Vendor drawer | its own **Notes card** below the vendor card (compose mode `modal`) |
| **Notes page** | new top-level sidebar module — every note in one table |

Tier: Starter base, ungated (per the current Kanalora proof-of-concept working
mode, nothing here is gated). When tiers go live, candidates for Growth would be
retention/export of the full notes log, not the ability to write notes.

## Screens & states

### Record notes block (`prototype/designs/erp/SFNotesBlock.dc.html`)
A shared Design Component mounted via `<dc-import name="SFNotesBlock" nb="…">`;
the parent app supplies the whole view-model from `notesVM(type, no, opts)`.

- **Header** — `NOTES`, a valid-note count pill, and (only when the record has
  invalid notes) a `Show N invalid` / `Hide N invalid` toggle.
- **Composer** — a textarea + `Add note` button. Empty input disables the
  button. `Ctrl/Cmd + Enter` submits. A one-line hint states the append-only
  rule so nobody expects an edit affordance.
- **List** — scrollable (max-height 270px), **newest first**, one row per note:
  author initials avatar, author name, date · time, then the note text.
  Invalid notes are hidden by default; revealed they render greyed and
  struck-through with an `INVALID` badge and a reason line
  (*Marked invalid by X · date · time — reason*).
- **Mark invalid** — a per-row icon button (ban icon, tooltip + aria-label "Mark invalid") at the right end of the author/date row, so it never takes its own line; shown only to users allowed to
  invalidate that note. It opens an inline required-reason field with
  `Mark invalid` (disabled until a reason is typed) and `Cancel`; `Enter`
  confirms.
- **Compose modes** — `notesVM(type, no, { compose })`. Default `inline` =
  the composer above. `compose: 'modal'` (used where space is tight — the
  Vendors preview panel) drops the inline composer; the header gets a **+**
  button that opens the **New note popup**, and the list fills the card's
  remaining height (`rootSt`/`listSt` from the VM) instead of max-height 270px.
  Extra opts: `modalSub` (popup subtitle, e.g. *Vendor · V00001 · Kailash
  Ceramics Works*), `newTitle` (+ tooltip), `emptyText`.
- **New note popup** (app shell, `noteModalVM()`) — centred dialog: title,
  record subtitle, 6-row textarea (auto-focused), *Posted as <me>, stamped
  with the time* + char count, a permanence notice, `Cancel` / `Add note`
  (disabled until text). `Ctrl/Cmd + Enter` adds, `Esc` / backdrop / × close
  and return focus to the opener. Submitting calls the same `noteAdd(type, no,
  text)` path as the inline composer — identical record, audit and toast. The
  draft lives only in `state.noteModalText` (not persisted) and is discarded on close.
- **Vendor drawer layout** — the drawer is now two stacked cards in a 336px
  column: the vendor card (flex-grows, own scroll) and the Notes card
  (fixed 272px — about two to three notes — shrinking only on short viewports; the card scrolls with a sticky NOTES header). The header is one row: NOTES · count pill · then icon-only buttons — show/hide invalid (eye / eye-off, only when the record has invalid notes; tooltip "Show N invalid"), **View all** (expand icon, once the record has a note) and **+**.
- **Notes popup** (titled "Notes"; app shell, `noteListVM()`, `state.noteListModal`) — centred 640px dialog mounting the same SFNotesBlock in **inline** mode with a taller list (`opts.listMax`, min(52vh, 480px)): full history, inline composer, show/hide invalid, mark invalid. It always opens with **invalid notes shown** (full picture); the Hide toggle is popup-local (`state.noteListShowInvalid`, reset to shown on every open, via `notesVM` opts `showInv`/`toggleInv`) and doesn't change the card's own setting. Esc cancels an in-progress mark-invalid first, then closes; focus returns to the opener. `Shift + V` opens it from the Vendors list for the selected vendor. The
  Notes card hides while the vendor is in inline edit. `Shift + N` on the
  Vendors list with a row selected opens the popup for that vendor.
- **Empty states** — "No notes yet. The first one starts this record's
  history." / when everything on the record is invalid and hidden:
  "No valid notes — N marked invalid."

### Notes page (Notes ▸ Notes)
Top-level sidebar module `notes`. Header shows total notes, how many are
invalid, and the append-only rule. Controls: free-text search (reference,
note text, author, record type), record-type chips, status chips
(All / Valid / Invalid), an author dropdown, and a Clear filters button.

Table columns: **Reference** (the record's own primary key — PO00001,
GRN00005, RM-LID-PWH, CUS00001 — mono, this is the narrowing key), Record
(type label), Note (invalid notes struck through with their reason underneath),
Added by (avatar + name), Date & time, Status pill (Valid / Invalid). Every
header sorts (click again to flip direction); default sort is date/time
descending. Clicking a row opens the record the note belongs to (PO/receipt/BOM/
assembly-order editors, item page, customer profile, or the Vendors grid with
that vendor selected). Invalid notes are visible here by default — this is the
audit view; hiding them per-record is only to declutter the working document.

## Data model

One global collection, `state.notes` (seeded by `seedNotes()` in
`prototype/lib/shelfree-data.js`), **not** arrays embedded on each record — the Notes page
must list everything without scanning every dataset, and new entity types then
cost nothing.

```js
note = {
  id: 'NOTE-00001',                  // append-only, never reused
  entityType: 'purchaseOrder' | 'purchaseReceipt' | 'vendor' | 'item'
            | 'bom' | 'assemblyOrder' | 'customer',
  entityNo: 'PO00001',              // the record's OWN primary key (Reference column)
  text: '…',                         // write-once
  authorId: 'EMP00007', authorName: 'Bhuvaneswari Iyer',   // write-once
  createdAt: '2026-09-14T10:30:00',  // write-once
  status: 'valid' | 'invalid',       // one-way transition only
  invalidReason: null | '…',         // required when invalid, permanent
  invalidatedBy: null | 'EMP00009', invalidatedByName: null | 'Kavitha Elumalai',
  invalidatedAt: null | '2026-09-20T12:00:00',
}
```

`entityType → module/page` mapping lives in `noteTypes()` in the app class; it
drives the Notes page's Record label and the row's open action.

**Seed derivation.** `seedNotes()` reads the legacy `notes` string still present
on seeded PO/PR/BOM/AO rows, and `customer.notes[]`, and turns each into the
opening note of that record's thread (attributed to the buyer / receiver /
creator). The app itself never reads those legacy fields again — grid `notes`
columns are now **Latest note**, derived from the notes collection. The real
backend drops them entirely.

## Interactions & business rules

1. **Create-only.** No edit, no delete, anywhere in the UI or the data layer.
   The only mutation on an existing note is the one-way `valid → invalid`
   transition.
2. **Who can invalidate** — the note's **own author**, or a user whose role is
   **Admin** or **Manager** (`noteCanInvalidate()`; the prototype also treats
   the workspace Owner/Admin role switch as manager-level). Nobody else sees
   the action at all, so one employee cannot touch another's note.
3. **A reason is required** and is itself permanent — it can't be edited later,
   same rule as the note.
4. **One-way.** An invalidated note cannot be restored to valid (open item: we
   may revisit if a mis-invalidation turns out to be common).
5. **Adding a note requires read access** to the record's module — commenting
   isn't gated behind write access. (Open item if you'd rather write-gate it.)
6. **Ordering** is strictly newest-first on the record; the Notes page defaults
   to the same and lets any column sort.
7. Adding a note never changes the record's own status, totals, or `updatedAt`.
8. Posting/closing a document does **not** close its notes thread — a posted
   receipt or closed order can still be annotated.

### Keyboard
`Ctrl/Cmd + Enter` adds the note being typed (inline or in the New note popup);
`Esc` closes the popup; `Shift + N` opens it from the Vendors list for the
selected vendor; `Enter` in the reason field confirms invalidation. All are catalogued in Settings ▸ General ▸ Keyboard
shortcuts under "Notes (on any record, and the Notes page)".

## Persistence

`localStorage` key `shelfree.notes.v1` — the whole notes array, written on every
add and every invalidation (`notePersist()`); seeded from `seedNotes()` on first
load (`noteLoad(seed)`). Per-record composer text, the show-invalid toggle, the
open invalidate form, and the Notes page's filters/sort are in-memory UI state
only.

## Backend-build notes

- **Table `notes`** (append-only): `id, tenant_id, entity_type, entity_id,
  text, author_id, created_at, status, invalid_reason, invalidated_by,
  invalidated_at`. Index on `(tenant_id, entity_type, entity_id, created_at
  desc)` and on `(tenant_id, created_at desc)` for the Notes page.
- `text`, `author_id`, `created_at` must be **write-once at the database
  layer** (no UPDATE grant on those columns / enforced by trigger), not merely
  absent from the UI. There is **no DELETE endpoint** for notes.
- `POST /notes` (create) and `POST /notes/{id}/invalidate` (status + reason +
  actor + timestamp) are the only two write endpoints. The invalidate endpoint
  re-checks `author_id = current_user OR current_user.role IN ('admin',
  'manager')` server-side and rejects a second invalidation of the same note.
- **Audit events** on both create and invalidate (per
  `docs/security/README.md` — treat invalidate as the "edit" case). The notes
  table is itself part of the tamper-evident audit surface.
- Reads: `GET /notes?entityType=&entityId=` for a record thread;
  `GET /notes?…filters` for the Notes page, filtered **server-side** by the
  requesting user's module read access (a Sales-only user must not receive
  BOM/production notes) and always tenant-scoped. Never a client-side scan.
- Notes are user-authored free text: treat as potentially containing PII, cover
  them in GDPR/CCPA export, and note that right-to-erasure conflicts with
  append-only — the agreed approach is to redact text while keeping the row and
  its audit trail, never a hard delete.
- Pagination + full-text search belong server-side once volume grows; today's
  filters run over the whole in-memory array.

### Decisions & deferred-to-backend

- **Decided (2026-09-20, with the user):** notes on PO, PR, BOM, AO, Customers,
  Vendors and Items now; invalidate allowed for author + Admin/Manager (needs
  real RBAC + an access table in the backend); reason required and permanent;
  invalid notes hidden by default per-record, visible on the Notes page;
  standalone Notes page as a new top-level sidebar item; a Reference column
  keyed on the record's own primary key so notes can be narrowed to one record.
- **Deferred:** real RBAC enforcement and the role/permission table behind
  `noteCanInvalidate()`; audit logging; server-side filtering/pagination;
  attachments or @-mentions on notes (not in scope); Sales Orders / Invoices
  threads, which land with those documents.
- **Open:** whether invalidation should ever be reversible; whether adding a
  note should require write (not read) access.
