import { cva, cn } from '../../lib/utils';

/**
 * shadcn/ui Badge — real source, extended with Shelfree's semantic status variants.
 * Requires Tailwind + the shadcn theme config on the host page.
 *
 * shadcn variants: default | secondary | destructive | outline
 * Shelfree status variants: ok | info | warn | bad | neutral (map ERP record states).
 */
export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border font-medium leading-none whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        ok: "border-transparent bg-[var(--ok-bg)] text-[color:var(--ok-fg)]",
        info: "border-transparent bg-[var(--info-bg)] text-[color:var(--info-fg)]",
        warn: "border-transparent bg-[var(--warn-bg)] text-[color:var(--warn-fg)]",
        bad: "border-transparent bg-[var(--bad-bg)] text-[color:var(--bad-fg)]",
        neutral: "border-transparent bg-[var(--neutral-bg)] text-[color:var(--neutral-fg)]",
        primary: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-1.5 py-0.5 text-[11px] rounded-[5px]",
        pill: "px-2.5 py-0.5 text-[11.5px] rounded-full",
      },
    },
    defaultVariants: { variant: "neutral", size: "default" },
  }
);

export function Badge({ className, variant, size, dot = false, children, ...props }) {
  return (
    <span className={cn(badgeVariants({ variant, size, className }))} {...props}>
      {dot ? <span className="inline-block size-1.5 rounded-full bg-current shrink-0" /> : null}
      {children}
    </span>
  );
}

const countChipVariants = cva(
  "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11.5px] font-medium leading-none",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground",
        primary: "bg-primary/15 text-primary",
        bad: "bg-[var(--bad-bg)] text-[color:var(--bad-fg)]",
        warn: "bg-[var(--warn-bg)] text-[color:var(--warn-fg)]",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

export function CountChip({ count, variant, className, ...props }) {
  return (
    <span className={cn(countChipVariants({ variant, className }))} {...props}>
      {count}
    </span>
  );
}
