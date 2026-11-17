/** Display formatting. Kanalora is an Indian business: INR, en-IN digit grouping. */

const EM_DASH = '—'

/** ₹1,23,456.00 */
export function money(n: number | null | undefined): string {
  return (
    '₹' +
    (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  )
}

/** 1,23,456 */
export function int(n: number | null | undefined): string {
  return (n || 0).toLocaleString('en-IN')
}

export function pct(x: number): string {
  return Math.round(x * 100) + '%'
}

/** `Jul 12, 2026`; em dash for empty or invalid input. */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return EM_DASH
  const s = String(iso)
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + 'T00:00:00') : new Date(s)
  return Number.isNaN(d.getTime())
    ? EM_DASH
    : d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Today in the user's own time zone, as YYYY-MM-DD. */
export function todayLocal(): string {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

/** Today as YYYY-MM-DD (UTC, matching the prototype's comparisons). */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export { EM_DASH }
