// Horizontal chip row (the only element allowed to scroll sideways).
export type Chip = { key: string; label: string; count?: number | string }

export default function Chips({ chips, value, onChange, label }: { chips: Chip[]; value: string; onChange: (key: string) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0">
      {chips.map((c) => {
        const active = c.key === value
        return (
          <button
            key={c.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(c.key)}
            className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium ${
              active ? 'border-green-700 bg-green-700 text-white' : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
            }`}
          >
            {c.label}
            {c.count !== undefined && (
              <span className={`rounded-full px-2 text-xs ${active ? 'bg-white/20' : 'bg-stone-100 text-stone-600'}`}>{c.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
