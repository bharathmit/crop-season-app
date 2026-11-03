import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type AuthState = { session: Session | null; loading: boolean }

const AuthContext = createContext<AuthState>({ session: null, loading: true })

let seeded = false

// Loads the default categories, items and stage guidance once per page load.
// seed_my_defaults() does nothing if the user already has them.
function seedDefaultsOnce() {
  if (seeded) return
  seeded = true
  void supabase.rpc('seed_my_defaults').then(({ error }) => {
    if (error) {
      seeded = false
      console.error('seed_my_defaults failed', error)
    }
  })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: true })

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, loading: false })
      // Supabase advises not to call other supabase methods inside this callback directly.
      if (session) setTimeout(seedDefaultsOnce, 0)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
