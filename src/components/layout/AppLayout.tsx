import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { LogOut, Plus, Sprout } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../app/auth'
import QuickAddSheet from './QuickAddSheet'
import { mainNav, settingsNav, titleFor } from './nav'

// Responsive shell (CLAUDE.md › Responsive UI):
//  phone  (< md): top bar + bottom tab bar + floating "+" button
//  tablet (md):   80 px icon sidebar with small labels
//  desktop (lg):  224 px sidebar with icon + label
export default function AppLayout() {
  const { pathname } = useLocation()
  const { session } = useAuth()
  const [addOpen, setAddOpen] = useState(false)
  const title = titleFor(pathname)
  const email = session?.user.email ?? ''
  const SettingsIcon = settingsNav.icon

  const sideLink = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-sm ${
      isActive ? 'bg-green-100 text-green-800' : 'text-stone-600 hover:bg-stone-100'
    }`

  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900 md:pl-20 lg:pl-56">
      {/* Sidebar — tablet and desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-20 flex-col border-r border-stone-200 bg-white px-2 py-4 md:flex lg:w-56 lg:px-3">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 lg:justify-start lg:px-2">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-green-700 text-white">
            <Sprout aria-hidden className="h-5 w-5" />
          </span>
          <span className="hidden text-sm font-semibold leading-tight lg:block">Crop Season<br />Manager</span>
        </Link>
        <button
          onClick={() => setAddOpen(true)}
          className="mb-4 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-green-700 px-3 py-2 font-medium text-white hover:bg-green-800"
        >
          <Plus aria-hidden className="h-5 w-5" />
          <span className="hidden lg:inline">Add</span>
          <span className="sr-only lg:hidden">Add</span>
        </button>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Main">
          {mainNav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={sideLink}>
              <Icon aria-hidden className="h-5 w-5 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <NavLink to={settingsNav.to} className={sideLink}>
          <SettingsIcon aria-hidden className="h-5 w-5 shrink-0" />
          {settingsNav.label}
        </NavLink>
      </aside>

      {/* Top bar — all sizes */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-stone-200 bg-white/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur md:h-16 md:px-6">
        <h1 className="truncate text-lg font-semibold">{title}</h1>
        <div className="flex items-center gap-1">
          {email && <span className="hidden max-w-56 truncate text-sm text-stone-500 sm:block">{email}</span>}
          <NavLink to={settingsNav.to} aria-label="Settings" className="grid h-11 w-11 place-items-center rounded-full text-stone-600 hover:bg-stone-100 md:hidden">
            <SettingsIcon className="h-5 w-5" />
          </NavLink>
          <button
            onClick={() => void supabase.auth.signOut()}
            aria-label="Sign out"
            className="grid h-11 w-11 place-items-center rounded-full text-stone-600 hover:bg-stone-100"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 md:px-6 md:pb-8 md:pt-6">
        <Outlet />
      </main>

      {/* Floating "+" — phone only */}
      <button
        onClick={() => setAddOpen(true)}
        aria-label="Add"
        className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-30 grid h-14 w-14 place-items-center rounded-full bg-green-700 text-white shadow-lg hover:bg-green-800 md:hidden"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Bottom tab bar — phone only */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {mainNav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                isActive ? 'text-green-800' : 'text-stone-500'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`grid h-8 w-12 place-items-center rounded-full ${isActive ? 'bg-green-100' : ''}`}>
                  <Icon aria-hidden className="h-5 w-5" />
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <QuickAddSheet open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
