import { formatINR, netClass } from '../lib/format'
import { perAcre } from '../lib/perAcre'

// Expense / Income / Net as three coloured mini tiles (same colours as the crop panel).
// `suffix` labels the period, e.g. "(2026)". `acres` adds a per-acre line (crops only).
export default function MoneyTiles({ expense, income, suffix = '', acres }: { expense: number; income: number; suffix?: string; acres?: number }) {
  const net = income - expense
  const pa = (v: number) => {
    if (acres == null) return null
    const x = perAcre(v, acres)
    return x == null ? null : <span className="block text-[11px] text-stone-500">{formatINR(x)}/ac</span>
  }
  const label = (t: string) => <span className="block text-[11px] leading-tight text-stone-600">{t}{suffix ? <> <span className="whitespace-nowrap">{suffix}</span></> : null}</span>
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="min-w-0 rounded-xl border border-red-100 bg-red-50 px-2.5 py-2">{label('Expense')}<span className="block truncate text-sm font-semibold text-red-700">{formatINR(expense)}</span>{pa(expense)}</div>
      <div className="min-w-0 rounded-xl border border-green-100 bg-green-50 px-2.5 py-2">{label('Income')}<span className="block truncate text-sm font-semibold text-green-700">{formatINR(income)}</span>{pa(income)}</div>
      <div className="min-w-0 rounded-xl border border-stone-200 bg-white px-2.5 py-2">{label('Net')}<span className={`block truncate text-sm font-semibold ${netClass(net)}`}>{formatINR(net)}</span>{pa(net)}</div>
    </div>
  )
}
