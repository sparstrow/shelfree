/**
 * Record numbering — one format for every auto-numbered series:
 * prefix + 5 digits, no hyphen, steps of 1 (`PO00011`, `V00006`, `GRN00005`).
 * See docs/numbering/README.md. The backend must allocate numbers atomically;
 * this client-side version is only safe for the single-user prototype.
 */
export function nextNo(prefix: string, existing: readonly string[]): string {
  const max = existing.reduce((m, no) => {
    const n = Number.parseInt(String(no).replace(/\D/g, ''), 10) || 0
    return n > m ? n : m
  }, 0)
  return prefix + String(max + 1).padStart(5, '0')
}
