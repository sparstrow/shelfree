/** True when a key event comes from a text field, so single-key shortcuts must not fire. */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el || !el.tagName) return false
  return /^(input|textarea|select)$/i.test(el.tagName) || el.isContentEditable
}
