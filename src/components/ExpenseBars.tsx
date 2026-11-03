import { formatINR } from '../lib/format'

// Distinct colour per row (text + bar), in order. Shared by Home and the crop Summary tab.
export const PALETTE = [
  ['text-red-700', 'bg-red-400'], ['text-orange-700', 'bg-orange-400'], ['text-amber-700', 'bg-amber-400'], ['text-lime-700', 'bg-lime-500'],
  ['text-emerald-700', 'bg-emerald-500'], ['text-teal-700', 'bg-teal-500'], ['text-sky-700', 'bg-sky-500'], ['text-indigo-700', 'bg-indigo-400'],
  ['text-violet-700', 'bg-violet-400'], ['text-pink-700', 'bg-pink-400'],
] as const

export type BarRow = { label: string; value: number; extra: string }

export default function ExpenseBars({ rows, empty = 'No expenses in this period.' }: { rows: BarRow[]; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  if (!rows.length) return <p className="text-sm text-stone-500">{empty}</p>
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => {
        const [text, bar] = PALETTE[i % PALETTE.length]
        return (
          <li key={r.label} className="text-sm">
            <div className="flex items-baseline justify-between gap-2">
              <span className={`truncate font-medium ${text}`}>{r.label}</span>
              <span className="shrink-0"><span className={`font-semibold ${text}`}>{formatINR(r.value)}</span> <span className="text-xs text-stone-500">{r.extra}</span></span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-white/80"><div className={`h-2 rounded-full ${bar}`} style={{ width: `${(r.value / max) * 100}%` }} /></div>
          </li>
        )
      })}
    </ul>
  )
}

// Group expense rows by a key; `order` sorts (stage order), else by amount high → low.
export function groupExpense<T>(rows: T[], amount: (r: T) => number, key: (r: T) => string, order?: (r: T) => number, acres?: number): BarRow[] {
  const total = rows.reduce((a, r) => a + amount(r), 0)
  const map = new Map<string, { value: number; order: number }>()
  for (const r of rows) {
    const k = key(r)
    const cur = map.get(k) ?? { value: 0, order: order ? order(r) : 0 }
    cur.value += amount(r)
    map.set(k, cur)
  }
  return [...map.entries()]
    .sort((a, b) => (order ? a[1].order - b[1].order : b[1].value - a[1].value))
    .map(([label, v]) => {
      const pct = `${total ? Math.round((v.value / total) * 1000) / 10 : 0}%`
      const pa = acres && acres > 0 ? `${formatINR(Math.round((v.value / acres) * 100) / 100)}/ac · ` : ''
      return { label, value: v.value, extra: `${pa}${pct}` }
    })
}
