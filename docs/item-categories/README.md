# Item categories

## Overview
**Settings ▸ Item categories** (Warehouse area, `/warehouse/settings/categories`) is the tree of categories items
are classified under: nest to five levels, colour-code, set active / inactive. An item stores the **name** of its
most specific category (`item.category`); the path is derived from the tree. Tier: Starter base, ungated, on by
default. Prototype screen: `prototype/designs/erp/Shelfree App.dc.html` (`catSave`, `catConfirmDel`,
`catFiltered` …) and the updates of 2026-10-15 / 2026-10-17 in `docs/settings/README.md`.

## React app (2026-11-25)
`ItemCategoriesSection` in `apps/web/src/features/settings/item-categories/` — `ListPage embedded` with an
`editor` inside `SettingsPage flush`, rows in tree order (parent, then its children). Rules:
`apps/web/src/domain/item-categories.ts`; commands `data/api/warehouse-settings.ts`; hooks
`data/queries/warehouse-settings.ts`. URL: `/warehouse/settings/categories`. Also under Find a setting.

### Screens & states
- Grid columns Code, Category, Description, Parent, Group (hidden), Items (count includes sub-categories), Status.
  Views: All, Active, Inactive, and one per top-level category. Loading, empty ("No categories match.") and error
  states come from the template. Drawer: Code, Category name, Parent category, Accent colour, Description, Active;
  a live "Shown as" chip previews colour, code and name.
- Quiet help from `item-categories/help.ts` (the prototype's `cat.*` text) on the page title and every field.
- Keys: N, E, Delete, Ctrl+S, Esc, / (listed under Settings › Item categories in Keyboard shortcuts).

### Data model
Collection `itemCategories` (`shelfree.v2.itemCategories`, key `id`), `itemCategorySchema`:
`id, code, name, parent (parent id or ''), color (hex of one of the seven accent colours), desc, active`.
Seeded from the catalogue's own tree (`seedItemCategories()`: Finished Goods ▸ Sambrani Holder / Combo Pack,
Consumables ▸ Sambrani Cones, Accessory, Components ▸ Ceramic Component / Raw Material, Packaging); every
category an item uses exists in it (asserted by a Vitest). `item.category` is unchanged (a name), so items keep working.

### Rules (domain/item-categories.ts, Vitest-tested; the backend enforces the same)
- Code required (letters / digits, up to 8, stored upper-case) and unique; name required and unique (case-insensitive).
- A category can't be its own parent or sit under its own sub-category; nesting deeper than 5 levels is refused.
- **Rename cascades** to every item carrying the old name. (Prototype: items kept the old name and the screen
  re-added it as a new root on next load — a drift this fixes. Deliberate change.)
- **Delete is blocked while an item carries the category's name.** (Prototype only warned and left the name on the
  items. Deliberate change.) Deleting a group lifts its sub-categories to its parent; Undo restores both.
- Inactive categories are left out of the item card's Category picker; an item already in one keeps it (the
  picker still shows the item's current value).
- The item card Category picker, the items grid (Category / Sub-category columns), the items drawer and the item
  profile subtitle read the tree. Sales prices and the units-of-measure usage report still use the built-in
  parent map (G-020).

### Persistence
`localStorage` key `shelfree.v2.itemCategories` (the prototype's `shelfree.cats.v2` is not read).

### Backend-build notes
- `item_categories(id, tenant_id, code UNIQUE per tenant, name UNIQUE per tenant (case-insensitive), parent_id FK
  self NULL, color, description, active)`. The target model is `items.category_id` FK; until then (the prototype
  and this app key items by name) a rename must update items in the same transaction.
- `GET /item-categories`, `PUT /item-categories/{id}`, `DELETE /item-categories/{id}` (409 while items use it;
  children re-parented in the same transaction). Constraints: acyclic, depth ≤ 5.
- **Audit:** create, edit (incl. rename and re-parent) and delete. **Permission:** Warehouse *Manage settings*
  right to write. No personal data.
- Decisions & deferred-to-backend: the prototype's Tree and Flow views are not ported (G-021); posting groups and
  reports that will reference categories are future work.

### Tests
Vitest `domain/item-categories.test.ts`; Playwright `e2e/settings-warehouse.spec.ts` (tree, group view, create,
edit, rename cascade onto items, validation, blocked delete, delete + undo, item-card picker, help, member read-only).
