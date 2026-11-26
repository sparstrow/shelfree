import type { ShortcutEntry } from '@/lib/shortcuts'

/**
 * What every step wizard (`Wizard.tsx`) does with the keyboard, for the Keyboard shortcuts page.
 * Keep in step with the key handler in `Wizard.tsx`.
 */
export const WIZARD_SHORTCUTS: readonly ShortcutEntry[] = [
  { combo: 'Enter (in a field)', desc: 'Continue to the next step, or finish on the last one — a step with a missing answer stays and shows what is missing.' },
  { combo: 'Ctrl/Cmd + Enter', desc: 'Continue or finish from anywhere in the wizard, including a notes box.' },
  { combo: 'Alt + → / Alt + ←', desc: 'Next step / previous step. Going back keeps what you entered.' },
  { combo: 'Esc', desc: 'Close the wizard. If you entered anything, it asks before discarding.' },
  { combo: 'Click a step dot', desc: 'Jump back to a step you have already visited.' },
]
