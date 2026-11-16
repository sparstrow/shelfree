# Button, IconButton

Shelfree's primary action surface. `Button` handles all labelled CTAs; `IconButton` wraps a single SVG for toolbar/header actions.

```jsx
// Primary CTA
<Button variant="primary" onClick={save}>New item</Button>

// With leading icon
<Button variant="secondary" icon={<PlusIcon />}>Add line</Button>

// Destructive
<Button variant="danger" size="sm">Delete</Button>

// Icon-only
<IconButton icon={<BellIcon />} label="Notifications" />
<IconButton icon={<XIcon />} label="Close" variant="secondary" size="sm" />
```

## Variants
| variant | When to use |
|---|---|
| `primary` | Single strongest action per surface (New item, Save, Sign in) |
| `secondary` | Alternate actions in toolbar rows (Columns, Export, Filter) |
| `ghost` | Tertiary / low-emphasis (Cancel, icon-adjacent labels) |
| `danger` | Destructive confirmation (Delete, Void, Archive) |
| `warning` | Caution actions (Override, Force-release) |

## Sizes
- `sm` 28 px — compact toolbar or inline table actions
- `md` 32 px — standard toolbar (default)
- `lg` 40 px — page-level hero CTAs, auth screens

## Notes
- Hover state is handled in the host DC — add `style-hover="transform:translateY(-1px); box-shadow:var(--shadow-hover)"` on the rendered element for the Shelfree lift effect.
- Always pair `variant="primary"` with exactly one per toolbar or form; multiple primaries signal unclear hierarchy.
