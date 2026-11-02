import { NavLink, Outlet } from 'react-router-dom'

const links = [
  { to: '/', label: 'Home' },
  { to: '/crop-cycles', label: 'Crops' },
  { to: '/expenses', label: 'Expenses' },
  { to: '/income', label: 'Income' },
  { to: '/checklist', label: 'Checklist' },
  { to: '/reports', label: 'Reports' },
  { to: '/masters', label: 'Masters' },
]

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="bg-green-800 px-4 py-3 text-white">
        <h1 className="text-lg font-semibold">Crop Season Manager</h1>
      </header>
      <nav className="flex gap-1 overflow-x-auto border-b border-stone-200 bg-white px-2">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) =>
              `whitespace-nowrap px-3 py-2 text-sm ${isActive ? 'border-b-2 border-green-700 font-medium text-green-800' : 'text-stone-600'}`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
      <main className="mx-auto max-w-5xl p-4">
        <Outlet />
      </main>
    </div>
  )
}
