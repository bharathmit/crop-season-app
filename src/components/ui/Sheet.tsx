import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

// Responsive container for forms and detail views (CLAUDE.md › Responsive UI):
//  phone: full-screen sheet · md+: centred modal ("modal") or right side panel ("side").
export default function Sheet({
  open,
  title,
  onClose,
  children,
  footer,
  variant = 'modal',
  headerActions,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  variant?: 'modal' | 'side'
  headerActions?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const frame =
    variant === 'side'
      ? 'md:inset-y-0 md:right-0 md:left-auto md:w-[30rem] md:border-l md:border-stone-200'
      : 'md:inset-auto md:left-1/2 md:top-1/2 md:max-h-[90dvh] md:w-full md:max-w-xl md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl'

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Close" tabIndex={-1} className="absolute inset-0 hidden bg-black/40 md:block" onClick={onClose} />
      <div className={`fixed inset-0 flex flex-col bg-white ${frame}`}>
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-stone-200 px-4 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] md:px-6 md:pt-3">
          <h2 className="truncate text-base font-semibold text-stone-900 md:text-lg">{title}</h2>
          <div className="flex items-center gap-1">
            {headerActions}
            <button onClick={onClose} aria-label="Close" className="grid h-11 w-11 place-items-center rounded-full text-stone-500 hover:bg-stone-100">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-stone-200 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:px-6 md:pb-4">{footer}</div>
        )}
      </div>
    </div>
  )
}
