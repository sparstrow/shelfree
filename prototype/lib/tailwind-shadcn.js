/* Shelfree × shadcn/ui — Tailwind (Play CDN) theme config.
 *
 * Load AFTER <script src="https://cdn.tailwindcss.com"></script> in any page/card
 * that mounts a design-system component. Maps shadcn utility classes onto Shelfree's
 * brand via the HSL-channel vars in tokens/shadcn.css (--sh-*).
 *
 * preflight is ON — shadcn components rely on Tailwind's base reset to normalise
 * native form controls (button/input backgrounds, etc.). It only affects pages that
 * load THIS file (component hosts), not hand-written app chrome that links styles.css
 * alone. The Claude Code (B) handoff replaces this with a real compiled Tailwind build.
 */
tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--sh-border) / <alpha-value>)',
        input: 'hsl(var(--sh-input) / <alpha-value>)',
        ring: 'hsl(var(--sh-ring) / <alpha-value>)',
        background: 'hsl(var(--sh-background) / <alpha-value>)',
        foreground: 'hsl(var(--sh-foreground) / <alpha-value>)',
        primary: {
          DEFAULT: 'hsl(var(--sh-primary) / <alpha-value>)',
          foreground: 'hsl(var(--sh-primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--sh-secondary) / <alpha-value>)',
          foreground: 'hsl(var(--sh-secondary-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'hsl(var(--sh-destructive) / <alpha-value>)',
          foreground: 'hsl(var(--sh-destructive-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--sh-muted) / <alpha-value>)',
          foreground: 'hsl(var(--sh-muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--sh-accent) / <alpha-value>)',
          foreground: 'hsl(var(--sh-accent-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'hsl(var(--sh-popover) / <alpha-value>)',
          foreground: 'hsl(var(--sh-popover-foreground) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'hsl(var(--sh-card) / <alpha-value>)',
          foreground: 'hsl(var(--sh-card-foreground) / <alpha-value>)',
        },
      },
      borderRadius: {
        lg: 'var(--sh-radius)',
        md: 'calc(var(--sh-radius) - 2px)',
        sm: 'calc(var(--sh-radius) - 4px)',
      },
    },
  },
};
