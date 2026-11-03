// ₹ with Indian digit grouping: 123456.5 → ₹1,23,456.50
const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 })

export function formatINR(value: number | null | undefined): string {
  return inr.format(Number(value ?? 0))
}

export function formatAcres(value: number | null | undefined): string {
  const n = Number(value ?? 0)
  return `${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ${n === 1 ? 'acre' : 'acres'}`
}

// ISO date (YYYY-MM-DD) → DD-MM-YYYY. Parsed from the string to avoid timezone shifts.
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}-${m}-${y}`
}

export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Whole days from an ISO date to today (crop age). Null if no date.
export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const start = Date.UTC(y, m - 1, d)
  const now = new Date()
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.floor((today - start) / 86_400_000)
}

export function capitalize(s: string | null | undefined): string {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Red / green text class for a net amount (loss / profit).
export const netClass = (n: number) => (n < 0 ? 'text-red-700' : 'text-green-700')
