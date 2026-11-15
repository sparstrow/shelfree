# Badge, CountChip

Status badges used throughout ERP list views, table cells, and drawer panels. Five semantic variants map directly to ERP record states.

```jsx
// Table cell — order status
<Badge variant="ok">Shipped</Badge>
<Badge variant="info">In Progress</Badge>
<Badge variant="warn">Low stock</Badge>
<Badge variant="bad">Overdue</Badge>
<Badge variant="neutral">Draft</Badge>

// With dot indicator
<Badge variant="warn" dot>Below reorder point</Badge>

// Pill shape (sidebar nav, tab counts)
<Badge variant="primary" size="pill">Pro plan</Badge>

// Count chip next to page title
<CountChip count={26} />
<CountChip count={3} variant="bad" />
```

## Variant → ERP status mapping
| Variant | Status examples |
|---|---|
| `ok` | Shipped, Paid, Certified, Released, Finished |
| `info` | Open, In Progress, Draft, Released |
| `warn` | Low stock, Approaching due date, Plan-gated |
| `bad` | Overdue, Blocked, Negative qty, Ship-only |
| `neutral` | Default, Draft (secondary), Unset |
| `primary` | Plan tier badges, featured labels |

## Notes
- Use `size="pill"` only for plan badges and sidebar nav count chips — not for table status cells.
- `CountChip` renders as a pill next to page `<h1>` titles; use `variant="bad"` for overdue counts.
