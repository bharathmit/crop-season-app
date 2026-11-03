import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { quickAdd } from './nav'

// Bottom sheet on phone, centred dialog from md up.
export default function QuickAddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-label="Quick add">
      <button aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full rounded-t-2xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:max-w-md md:rounded-2xl md:p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-stone-900">Add new</h2>
          <button onClick={onClose} aria-label="Close" className="grid h-11 w-11 place-items-center rounded-full text-stone-500 hover:bg-stone-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-3">
          {quickAdd.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                onClick={onClose}
                className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border border-stone-200 p-3 text-sm font-medium text-stone-700 hover:border-green-700 hover:bg-green-50"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-green-100 text-green-800">
                  <Icon aria-hidden className="h-5 w-5" />
                </span>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
