import type { ReactNode } from 'react'

export default function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center">
      <h3 className="text-base font-semibold text-stone-900">{title}</h3>
      {text && <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">{text}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

export function PageHeader({ title, subtitle, action }: { title?: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        {title && <h2 className="text-lg font-semibold text-stone-900">{title}</h2>}
        {subtitle && <p className="text-sm text-stone-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
