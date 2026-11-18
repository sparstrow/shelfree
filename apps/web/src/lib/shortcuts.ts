/**
 * Shared shape of a documented keyboard shortcut. Templates and pages keep
 * their shortcut descriptions as plain data next to the code that handles the
 * key (`shortcut-meta.ts` / `shortcuts.ts`), and the catalogue in
 * `app/shortcuts.ts` imports them — so the Keyboard shortcuts page cannot
 * drift from what the page does.
 */

/** One line of the Keyboard shortcuts page. */
export interface ShortcutEntry {
  combo: string
  desc: string
}

/** A single-key page shortcut — what `ListPage`'s `shortcuts` prop and the catalogue both read. */
export interface ShortcutMeta {
  /** Single key, e.g. `r`. */
  key: string
  /** `true` = needs Shift (⇧P), `false` = only without Shift; omit to ignore Shift. */
  shift?: boolean
  /** Shown on the Keyboard shortcuts page. */
  description: string
}

/** `r` → `R`, `p` + shift → `Shift + P`. */
export function shortcutEntry(meta: ShortcutMeta): ShortcutEntry {
  const key = meta.key.length === 1 ? meta.key.toUpperCase() : meta.key
  return { combo: meta.shift ? `Shift + ${key}` : key, desc: meta.description }
}
