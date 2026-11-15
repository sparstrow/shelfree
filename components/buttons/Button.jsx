import { cva, cn } from '../../lib/utils';

/**
 * shadcn/ui Button — real source, adapted for Shelfree.
 * Faithful cva variant map + shadcn class strings. Requires Tailwind + the
 * shadcn theme config on the host page (see CLAUDE.md → UI baseline).
 *
 * Variants: default | destructive | outline | secondary | ghost | link
 * Transitional aliases (primary/danger/warning, size md) keep legacy call sites
 * working during migration — remove once callers move to shadcn names.
 */
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        primary: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        danger: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        warning: "border border-input bg-background text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
        md: "h-9 px-4 py-2",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export function Button({ className, variant, size, asChild = false, icon, iconPosition = 'start', children, ...props }) {
  return (
    <button className={cn(buttonVariants({ variant, size, className }))} {...props}>
      {icon && iconPosition === 'start' ? icon : null}
      {children}
      {icon && iconPosition === 'end' ? icon : null}
    </button>
  );
}

export function IconButton({ label, icon, children, className, variant = 'ghost', ...props }) {
  return (
    <button
      className={cn(buttonVariants({ variant, size: 'icon', className }))}
      title={label}
      aria-label={label}
      {...props}
    >
      {icon || children}
    </button>
  );
}
