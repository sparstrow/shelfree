/** Privacy / PII masking helpers for grid cells and exports. */

/** Mask a phone number to `'•••• '` + last 4 digits, or `''` when no digits exist. */
export function maskPhone(phone: string | null | undefined): string {
  const digits = String(phone ?? '').replace(/\D/g, '')
  return digits ? '•••• ' + digits.slice(-4) : ''
}

/** Mask an email's local part (e.g. `'o••••@domain.com'`), or `''` when invalid/empty. */
export function maskEmail(email: string | null | undefined): string {
  const s = String(email ?? '').trim()
  const at = s.indexOf('@')
  if (at < 1 || at === s.length - 1) return ''
  const local = s.slice(0, at)
  const domain = s.slice(at + 1)
  return (local.length <= 1 ? '••••@' : `${local[0]}••••@`) + domain
}
