import React from 'react';

/**
 * shadcn/ui Button (adapted for Shelfree). Styled with Tailwind classes via `cva`;
 * host page must load Tailwind + lib/tailwind-shadcn.js.
 *
 * Use `variant="default"` for the single strongest action, `secondary`/`outline`
 * for alternatives, `ghost` for tertiary, `link` for inline text actions,
 * `destructive` for dangerous actions.
 *
 * @startingPoint section="Components" subtitle="Button — shadcn variants and sizes" viewport="720x240"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  /** shadcn variant. primary/danger/warning are transitional aliases of default/destructive/outline. */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'primary' | 'danger' | 'warning';
  /** shadcn size. md is a transitional alias of default. */
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'md';
  /** Extra Tailwind classes, merged after the variant classes. */
  className?: string;
  /** Optional icon element (SVG) rendered alongside the label. */
  icon?: React.ReactNode;
  /** Whether icon appears before or after the label. */
  iconPosition?: 'start' | 'end';
}
export declare function Button(props: ButtonProps): JSX.Element;

/** cva recipe for Button classes — export mirrors shadcn so consumers can compose. */
export declare const buttonVariants: (props?: { variant?: ButtonProps['variant']; size?: ButtonProps['size']; className?: string }) => string;

/**
 * Square icon-only button (shadcn Button at size="icon"). Renders a single SVG icon
 * with an accessible label.
 */
export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** SVG icon element (or pass as children). */
  icon?: React.ReactNode;
  /** Accessible label — rendered as title + aria-label. */
  label: string;
  variant?: ButtonProps['variant'];
  className?: string;
}
export declare function IconButton(props: IconButtonProps): JSX.Element;
