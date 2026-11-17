/** Privacy / PII masking helpers for grid cells and exports. */

/** Mask a phone number to `'•••• '` + last 4 digits, or `''` when no digits exist. */
export function maskPhone(phone: string | null | undefined): string {
  const digits = String(phone ?? '').replace(/\D/g, '')
  return digits ? '•••• ' + digits.slice(-4) : ''
}
