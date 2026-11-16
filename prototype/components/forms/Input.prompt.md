# Input, SearchInput, SelectField

Form input primitives for all ERP data-entry surfaces. All share the same 36 px height, 8 px radius, and `--input` border token.

```jsx
// Labelled field with prefix icon
<Input
  label="Work email"
  type="email"
  prefix={<MailIcon />}
  placeholder="you@company.com"
  value={email}
  onChange={e => setEmail(e.target.value)}
/>

// Error state
<Input
  label="Quantity"
  value={qty}
  onChange={handleQty}
  error="Must be greater than 0"
/>

// Hint text
<Input label="Lead time" hint="In business days" suffix="days" />

// Toolbar search bar (compact, 32 px)
<SearchInput value={q} onChange={e => setQ(e.target.value)} width="280px" />

// Select / dropdown
<SelectField
  label="Category"
  value={cat}
  onChange={e => setCat(e.target.value)}
  options={[
    { value: 'all', label: 'All categories' },
    { value: 'sambrani-holder', label: 'Sambrani Holder' },
  ]}
/>
```

## Notes
- `Input` is 36 px tall; `SearchInput` is 32 px (matches toolbar height).
- Focus ring: `border-color: var(--ring)` + `box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 20%, transparent)` — apply via `style-focus` in DC templates.
- Always use `label` prop in forms; omit only in inline table-cell editors.
