# Shelfree Design System

**Brand:** Shelfree — multi-module ERP for manufacturers & distributors  
**Tenant example used in designs:** NorthDoor Mfg. (sliding barn doors, bypass doors, mirrors, hardware)

## UI baseline: shadcn/ui

Components are built on **actual shadcn/ui source** (`cva` variant maps, `cn()`,
shadcn class strings and `variant`/`size` API), styled with **Tailwind CSS**.

- **How to mount a component:** in `<head>`, load Tailwind then the theme config,
  then `styles.css`:
  ```html
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="lib/tailwind-shadcn.js"></script>
  <link rel="stylesheet" href="styles.css">
  ```
- **Theme:** shadcn colour/radius tokens are HSL-channel vars in `tokens/shadcn.css`
  (`--sh-*`), mapped to Tailwind class names by `lib/tailwind-shadcn.js`. `cn()`/`cva()`
  are in `lib/utils.js`.
- **A-now / B-later:** the frontend runs here on the Tailwind Play CDN (dev-grade).
  A later handoff to Claude Code produces the production repo (Vite + compiled
  Tailwind + npm Radix + backend). Component source is kept faithful so that lift is
  clean — the B repo mainly adds the build toolchain and renames `--sh-*` → `--*`.
- **Preflight:** ON — shadcn components need Tailwind's base reset to normalise
  native form controls. It only affects pages that load `lib/tailwind-shadcn.js`
  (component hosts), not hand-written chrome that links `styles.css` alone.

## Sources
All design context was extracted directly from this project's existing design files:
- `designs/erp/Shelfree App.dc.html` — main ERP shell with all modules
- `designs/erp/SFLocationsWarehouses.dc.html` — Locations & warehouses settings page: site list + 2D/3D structure designer, mounted into the app shell via `<dc-import>`
- `designs/auth/Shelfree Auth.dc.html` — full auth flow (sign in/up/verify/reset)
- `designs/auth/Shelfree Auth Explorations.dc.html` — five auth layout directions
- `designs/erp/Sales - Marketing/SFSalesInvoices.dc.html` — invoices sub-screen (standalone, live)
- `designs/erp/Sales - Marketing/SFCatalog.dc.html` — product catalog (standalone, live)
- `designs/erp/Sales - Marketing/SFSalesOrders.dc.html` — sales orders list/detail (standalone, live)
- `designs/erp/Shelfree Mobile.dc.html` — iOS companion app
- `lib/shelfree-data.js` — full seed data (items, orders, invoices, vendors, products, employees, users)
- `lib/record-nav.js` — shared record-navigation controller (drawer → card → tab)

---

## Product Context

Shelfree is a browser-based ERP covering seven modules:

| Module | Key screens |
|---|---|
| **Home** | Dashboard, KPI cards |
| **Finance** | Chart of accounts, journals, invoices |
| **Sales** | Orders, invoices, catalog, customer records |
| **Purchasing** | POs, vendor records, receipts |
| **Warehouse** | Stock by location, transfers, adjustments |
| **Manufacturing** | Production orders, BOMs, routings, work centres |
| **People** | Users (roles & permissions), Employees (HR directory), time sheets |

The app shell is: **icon rail** (hover-expand) → **submenu sidebar** → **topbar** → **main content area**.

Record navigation follows a universal 3-tier pattern: row click → side drawer preview → "Open card" button → centred modal card → double-click → new full-page tab.

---

## Content Fundamentals

- **Tone:** Direct, professional, no fluff. Enterprise but not stuffy.
- **Casing:** Sentence case on UI labels (`New item`, `Open card`). Title case for module names (`Sales`, `Manufacturing`). UPPER for section heads in sidebars (`INVENTORY`, `PURCHASING`).
- **Numbers:** Always `font-variant-numeric: tabular-nums` for financial/inventory figures.
- **Codes & IDs:** Geist Mono. Pattern: `BD-3684-KO`, `SO00014`, `INV00010`, `PO00011`. Record numbers: prefix + 5-digit running number, no hyphen, steps of 1 (see `docs/numbering/`).
- **Currency:** `$1,234.56` — USD default, right-aligned in tables.
- **Dates:** `Jun 11, 2026` or ISO `2026-06-11` depending on column width.
- **No emoji.** Status is communicated through colour + icon + text badges only.
- **Pagination/counts:** pill chip next to page title — `12` items, not `12 items found`.

---

## Visual Foundations

### Colors
Two themes ship side by side. **Dark is the default.** Toggle via `data-theme="light"` on the root element.

Primary brand colour is a warm **terracotta / amber** — `oklch(0.72 0.13 58)` (dark) / `oklch(0.62 0.14 50)` (light). Neutrals are zinc-toned near-blacks and near-whites; avoid pure `#000`/`#fff`.

Status palette uses consistent chroma `~0.13–0.16` across four semantic hues:

| Semantic | Hue | Use |
|---|---|---|
| **OK / success** | 155 (green) | Shipped, Paid, Certified, Released |
| **Info / neutral-active** | 245 (blue) | In Progress, Open, Draft |
| **Warning** | 70 (amber) | Overdue-approaching, Low stock, plan gate |
| **Danger / bad** | 25 (red) | Overdue, Blocked, negative qty |
| **Neutral** | — | Default, count chips, muted tags |

### Typography
- **Display / UI:** Geist (Google Fonts) — 400/500/600/700
- **Code / IDs / numbers:** Geist Mono — 400/500/600
- Letter spacing for headings: `−0.02em`
- Minimum label size: `11.5px` (section headers, column headers)
- Minimum body size: `12.5px` (cell content)
- Page title: `18px / 700`

### Spacing
4 px base grid. Common increments: 4, 6, 8, 10, 12, 14, 16, 20, 24, 32.

### Border Radius
| Token | Value | Used on |
|---|---|---|
| `--radius-xs` | 6px | Small badges, tiny chips |
| `--radius-sm` | 8px | Inputs, toolbar buttons, table cells |
| `--radius-md` | 10px | Cards, panels, dropdowns, column pickers |
| `--radius-lg` | 16px | Modals, auth cards |
| `--radius-full` | 999px | Pill badges, count chips, avatar |

### Shadows
- **Base:** `0 1px 2px rgb(0 0 0 / .4)` — primary buttons, small elevated elements
- **Hover lift:** `0 4px 12px -3px rgb(0 0 0 / .28)` — interactive hover state
- **Large:** `0 18px 44px -14px rgb(0 0 0 / .65)` — drawers, modals, dropdowns

### Hover / Active States
Every clickable element:  
```
transition: background .14s ease, color .14s ease, transform .14s ease, box-shadow .14s ease;
```
On hover: `transform: translateY(-1px)` + lift shadow + tinted background  
(`color-mix(in oklab, var(--foreground) 10%, transparent)` for ghost/nav items).  
Primary buttons get `var(--primary-hover)` instead.

Focus ring: `box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 20%, transparent)` + `border-color: var(--ring)`.

### Icons
Lucide-style inline SVGs only — no icon font, no filled icons.  
`stroke-width: 1.9` for nav/content icons, `2` for small/inline.  
All icons at 17–19 px in nav; 14 px in toolbar/table; 12 px in badges.

### Animations
| Keyframe | Effect | Used for |
|---|---|---|
| `sfFade` | opacity 0→1 + translateY(6px)→0 | Section/page entrance |
| `sfPop` | opacity 0→1 + scale(.97)→1 + translateY(5px)→0 | Dropdowns, drawers |
| `sfToast` | slide up from bottom | Notification toasts |

Duration: 150–200 ms. Easing: `ease` throughout. No spring/bounce.

### Surfaces & Backgrounds
No gradients in app chrome. No textures in UI shell (auth hero used a subtle `radial-gradient` dot-grid on the marketing side panel only).

Dark stack (deepest → lightest): `#08080a` (rail) → `#0c0c0e` (main bg) → `#161618` (panel/card) → `#1e1e22` (muted/hover).  
Light stack: `#fff` (bg) → `#fafafa` (panel/sidebar) → `#f4f4f5` (muted).

### Cards & Panels
`border-radius: 10px`, `border: 1px solid var(--border)`, `background: var(--card)`. No outer drop-shadow on data panels — border only. Large flyout panels and modals get `var(--shadow-lg)`.

Tables have a sticky header at `background: var(--panel)` and `border-bottom: 1px solid var(--border)`.

---

## Iconography

Lucide (stroke, weight 1.9–2) is the icon set used throughout. Icons are inlined as `<svg>` — never an icon font or sprite. Key icons by context:

- **Nav rail:** Home, landmark (Finance), tag (Sales), cart (Purchasing), box (Warehouse), factory (Manufacturing), users (People)
- **Actions:** plus, pencil, trash-2, x, check, chevron-right, chevron-down
- **Status:** circle-check, circle-alert, triangle-alert, info, lock
- **Data:** search, filter, columns, calendar, arrow-up-down
- **Record nav:** external-link, panel-right, maximize-2

No emoji. Unicode characters are not used as decorative icons.

---

## File Index

```
styles.css                     ← CSS entry point; @import only
tokens/
  colors.css                   ← --background, --primary, --ok-fg, etc.
  typography.css               ← --font-sans, --font-mono + @font-face note
  spacing.css                  ← --radius-*, --shadow-*, --transition-base
guidelines/
  colors-surface.card.html     ← Dark surface stack swatches
  colors-fg.card.html          ← Foreground & muted text colours
  colors-primary.card.html     ← Brand primary + ring
  colors-status.card.html      ← 5 status badge colours
  colors-light.card.html       ← Light mode surface swatches
  type-scale.card.html         ← Heading & body type specimens
  type-mono.card.html          ← Geist Mono specimens
  spacing.card.html            ← 4px grid spacing scale
  radii.card.html              ← Border radius tokens
  shadows.card.html            ← Shadow tokens
  motion.card.html             ← Animation keyframes demo
  borders.card.html            ← Border & divider styles
components/
  buttons/
    Button.jsx                 ← Button, IconButton
    Button.d.ts
    Button.prompt.md
    buttons.card.html
  badges/
    Badge.jsx                  ← Badge (status variants)
    Badge.d.ts
    Badge.prompt.md
    badges.card.html
  forms/
    Input.jsx                  ← Input, SearchInput, SelectField
    Input.d.ts
    Input.prompt.md
    forms.card.html
  layout/
    Avatar.jsx                 ← Avatar (initials + colour) + Tabs (segmented control)
    Avatar.d.ts                ← props for both Avatar and Tabs
    Avatar.prompt.md
    layout.card.html
lib/
  shelfree-data.js             ← seed data: items, orders, invoices, vendors, products, employees, users
  record-nav.js                ← shared 3-tier record-navigation controller
designs/
  auth/
    Shelfree Auth.dc.html              ← full auth flow: sign in / create account / onboarding, live
    Shelfree Auth Explorations.dc.html ← five auth layout directions
    auth.card.html                     ← preview card — auth flow
    auth-explorations.card.html        ← preview card — auth explorations
  erp/
    Shelfree App.dc.html       ← flagship ERP app — "the app", all modules, live
    erp-app.card.html          ← Design-System-tab preview card for the app
    SFLocationsWarehouses.dc.html ← Locations & warehouses settings page (site list + 2D/3D structure designer), dc-imported by the app shell
    locations-warehouses.card.html ← preview card — locations & warehouses
    Shelfree Mobile.dc.html    ← iOS companion app (home / sales / items / vendors), live
    mobile.card.html           ← preview card — mobile
    ios-frame.jsx              ← iOS device bezel used by the mobile surface
    support.js                 ← DC runtime that boots the app
    Sales - Marketing/
      SFCatalog.dc.html        ← product catalog: grid/list, quick-view, product editor, live
      SFSalesOrders.dc.html    ← sales orders: status tabs, order lines, status advance, live
      SFSalesInvoices.dc.html  ← sales invoices: status tabs, outstanding, payment actions, live
      catalog.card.html        ← preview card — catalog
      orders.card.html         ← preview card — orders
      invoices.card.html       ← preview card — invoices
assets/
  logo.svg                     ← "S" wordmark mark
SKILL.md
readme.md                      ← this file
```

---

## Getting Started (new designs)

1. Link `styles.css` at the top of your HTML head.
2. Load Geist + Geist Mono from Google Fonts (see `tokens/typography.css` for the link tag).
3. Put `data-theme="light"` on the root element if you need light mode; omit for dark (default).
4. Use CSS custom properties (`var(--primary)`, `var(--foreground)`, etc.) for all colour values.
5. For components, load `_ds_bundle.js` and mount via `window.ShelfreeDesignSystem_0318eb` — e.g. `const { Button, Badge } = window.ShelfreeDesignSystem_0318eb`.

---

> **Set this project's file type to Design System** in the Share menu so others in your org can find and consume it.
