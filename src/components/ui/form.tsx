import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, ButtonHTMLAttributes } from 'react'

// Inputs use text-base (16 px) so iOS does not zoom; min height 44 px for touch.
const control =
  'w-full min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-700/20 disabled:bg-stone-100'

export function Field({ label, hint, children, className = '' }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-stone-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-stone-500">{hint}</span>}
    </label>
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${control} ${props.className ?? ''}`} />
}

// Decimal keypad on phones.
export function NumberInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="text" inputMode="decimal" autoComplete="off" {...props} className={`${control} ${props.className ?? ''}`} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${control} ${props.className ?? ''}`} />
}

// Two columns from md up, one on phone.
export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
}

type Tone = 'primary' | 'secondary' | 'danger'
const tones: Record<Tone, string> = {
  primary: 'bg-green-700 text-white hover:bg-green-800',
  secondary: 'border border-stone-300 bg-white text-stone-700 hover:bg-stone-50',
  danger: 'border border-red-200 bg-white text-red-700 hover:bg-red-50',
}

export function Button({ tone = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60 ${tones[tone]} ${className}`}
    />
  )
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null
  return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{children}</p>
}

// Turns '' into null and numeric strings into numbers for Supabase writes.
export function toNumberOrNull(v: string): number | null {
  const t = v.trim().replace(/,/g, '')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export function toTextOrNull(v: string): string | null {
  const t = v.trim()
  return t === '' ? null : t
}
