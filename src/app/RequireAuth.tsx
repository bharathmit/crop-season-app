import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './auth'

// Dev-only: VITE_UI_PREVIEW=1 skips login so layouts can be screenshot-tested.
const uiPreview = import.meta.env.DEV && import.meta.env.VITE_UI_PREVIEW === '1'

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (uiPreview) return <>{children}</>
  if (loading) {
    return <div className="grid min-h-dvh place-items-center text-stone-500">Loading…</div>
  }
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <>{children}</>
}
