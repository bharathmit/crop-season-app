import type { PeriodKey, PeriodState } from '../lib/period'
import { Field, TextInput } from './ui/form'

const OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: 'month', label: 'This month' },
  { key: 'year', label: 'This year' },
  { key: 'custom', label: 'Custom' },
  { key: 'all', label: 'All' },
]

// Period picker for farm / machinery totals. Custom shows a from–to date range.
export default function PeriodFilter({ period }: { period: PeriodState }) {
  return (
    <div className="mb-4 space-y-3">
      <div role="radiogroup" aria-label="Period" className="grid grid-cols-4 gap-1 rounded-xl bg-stone-100 p-1 sm:inline-grid">
        {OPTIONS.map((o) => (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={period.key === o.key}
            onClick={() => period.setKey(o.key)}
            className={`min-h-11 whitespace-nowrap rounded-lg px-1 text-[13px] font-medium sm:px-4 sm:text-sm ${period.key === o.key ? 'bg-white text-green-800 shadow-sm' : 'text-stone-600'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {period.key === 'custom' && (
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <Field label="From"><TextInput type="date" value={period.from} max={period.to || undefined} onChange={(e) => period.setFrom(e.target.value)} /></Field>
          <Field label="To"><TextInput type="date" value={period.to} min={period.from || undefined} onChange={(e) => period.setTo(e.target.value)} /></Field>
        </div>
      )}
    </div>
  )
}
