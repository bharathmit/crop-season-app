import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Sprout } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../app/auth'

type Mode = 'signin' | 'signup'

export default function LoginPage() {
  const { session } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  if (session) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    const redirect = window.location.origin + import.meta.env.BASE_URL
    const { error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirect } })
    setBusy(false)
    if (error) return setError(error.message)
    if (mode === 'signup') {
      setInfo('Account created. Check your email and tap the confirmation link, then sign in.')
      setMode('signin')
    }
  }

  const input =
    'w-full rounded-lg border border-stone-300 bg-white px-3 py-3 text-base outline-none focus:border-green-700 focus:ring-2 focus:ring-green-700/20'

  return (
    <div className="flex min-h-dvh items-center justify-center bg-stone-50 px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-green-700 text-white">
            <Sprout aria-hidden className="h-6 w-6" />
          </span>
          <h1 className="text-xl font-semibold text-stone-900">Crop Season Manager</h1>
          <p className="text-sm text-stone-500">
            {mode === 'signin' ? 'Sign in to your farm' : 'Create your account'}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={input}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">Password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={input}
            />
          </label>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {info && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{info}</p>}

          <button
            type="submit"
            disabled={busy}
            className="min-h-11 w-full rounded-lg bg-green-700 px-4 py-3 font-medium text-white hover:bg-green-800 disabled:opacity-60"
          >
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setError('')
          }}
          className="mt-4 min-h-11 w-full text-sm font-medium text-green-800"
        >
          {mode === 'signin' ? 'First time? Create account' : 'Have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}
