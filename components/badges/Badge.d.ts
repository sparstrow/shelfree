import React from 'react';

/**
 * shadcn/ui Badge extended with Shelfree's semantic status palette. Styled with
 * Tailwind via `cva`; host page must load Tailwind + lib/tailwind-shadcn.js.
 *
 * Map ERP statuses to variants:
 *   Shipped/Paid/Certified → ok    Open/In Progress/Draft → info
 *   Low stock/Overdue-approaching → warn    Overdue/Blocked/Negative → bad
 *   Default/count chips → neutral
 *
 * @startingPoint section="Components" subtitle="Badge — shadcn + Shelfree status variants" viewport="720x180"
 */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
  /** shadcn (default/secondary/destructive/outline) or Shelfree status (ok/info/warn/bad/neutral) variant. */
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ok' | 'info' | 'warn' | 'bad' | 'neutral' | 'primary';
  /** Size / shape. */
  size?: 'default' | 'sm' | 'pill';
  /** Prepend a filled circle dot in the current colour. */
  dot?: boolean;
  className?: string;
}
export declare function Badge(props: BadgeProps): JSX.Element;

/** cva recipe for Badge classes. */
export declare const badgeVariants: (props?: { variant?: BadgeProps['variant']; size?: BadgeProps['size']; className?: string }) => string;

/** Small pill chip for counts — next to page titles and sidebar nav labels. */
export interface CountChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  count: number | string;
  variant?: 'neutral' | 'primary' | 'bad' | 'warn';
  className?: string;
}
export declare function CountChip(props: CountChipProps): JSX.Element;
