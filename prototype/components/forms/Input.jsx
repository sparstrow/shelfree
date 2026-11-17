import { cn } from '../../lib/utils';

/**
 * shadcn/ui Input — real source, wrapped to keep Shelfree's label/prefix/suffix/
 * error/hint affordances. Requires Tailwind + the shadcn theme config on the host.
 * Pass through any native <input> attribute (value, onChange, type, disabled, …).
 */
export function Input({ className, type = 'text', label, error, hint, prefix, suffix, width, ...props }) {
  const control = (
    <div className="relative flex items-center">
      {prefix ? (
        <span className="absolute left-3 flex text-muted-foreground pointer-events-none">{prefix}</span>
      ) : null}
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          prefix ? "pl-9" : "",
          suffix ? "pr-9" : "",
          error ? "border-destructive focus-visible:ring-destructive" : "border-input",
          className
        )}
        {...props}
      />
      {suffix ? (
        <span className="absolute right-3 flex text-muted-foreground pointer-events-none">{suffix}</span>
      ) : null}
    </div>
  );
  if (!label && !error && !hint) return <div style={{ width: width || '100%' }}>{control}</div>;
  return (
    <div className="flex flex-col gap-1.5" style={{ width: width || '100%' }}>
      {label ? <label className="text-sm font-medium text-muted-foreground">{label}</label> : null}
      {control}
      {error || hint ? (
        <p className={cn("text-xs m-0", error ? "text-destructive" : "text-muted-foreground")}>{error || hint}</p>
      ) : null}
    </div>
  );
}

/** Compact search bar with a built-in search icon — toolbar filter rows. */
export function SearchInput({ placeholder = 'Search…', width = '240px', className, ...props }) {
  return (
    <div className="relative inline-flex" style={{ width }}>
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 flex text-muted-foreground pointer-events-none">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
      </span>
      <input
        placeholder={placeholder}
        className={cn("h-8 w-full rounded-md border border-input bg-transparent pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring", className)}
        {...props}
      />
    </div>
  );
}

/** Native <select> with a hidden appearance and a custom chevron. */
export function SelectField({ options = [], label, width, className, children, ...props }) {
  const control = (
    <div className="relative inline-flex w-full">
      <select
        className={cn("h-9 w-full appearance-none rounded-md border border-input bg-transparent pl-3 pr-8 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50", className)}
        {...props}
      >
        {children || options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 flex text-muted-foreground pointer-events-none">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"></path></svg>
      </span>
    </div>
  );
  if (!label) return <div style={{ width: width || '100%' }}>{control}</div>;
  return (
    <div className="flex flex-col gap-1.5" style={{ width: width || '100%' }}>
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      {control}
    </div>
  );
}
