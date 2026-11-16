# Avatar, Tabs

Two layout/navigation primitives used throughout the ERP shell.

## Avatar

```jsx
// Nav rail user pill
<Avatar name="Avery Chen" size="md" />   // → "AC" terracotta circle

// People module list
<Avatar name="Marcus Lebel" size="lg" />
<Avatar name="Priya Anand" color="oklch(0.6 0.13 155)" size="md" />

// Photo override
<Avatar name="Dana Whitfield" src="/avatars/dana.jpg" size="md" />
```

Colour is auto-derived from the first character of `name` — consistent across sessions. Override with any CSS colour string via `color`.

## Tabs

```jsx
<Tabs
  tabs={[
    { id: 'all',     label: 'All',     count: 10 },
    { id: 'open',    label: 'Open',    count: 6 },
    { id: 'overdue', label: 'Overdue', count: 2 },
    { id: 'paid',    label: 'Paid',    count: 2 },
  ]}
  activeId={activeTab}
  onSelect={setActiveTab}
/>
```

Tabs renders as a compact segmented control — not a full-width tab bar. Place it in the toolbar row between the page title and the search input. Count values are dimmed automatically.

## Notes
- `Tabs` uses the muted pill container (`--muted` bg, `--card` active bg) — the exact pattern used in Sales Invoices and Sales Orders.
- Never use `Tabs` for top-level module navigation — that's the icon rail.
