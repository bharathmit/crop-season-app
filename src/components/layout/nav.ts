import { ChartColumn, Fence, House, ListTodo, Receipt, Settings, Sprout, Tractor, Wallet, type LucideIcon } from 'lucide-react'

export type NavItem = { to: string; label: string; icon: LucideIcon }

// Main sections: bottom bar on phone, sidebar from md up.
export const mainNav: NavItem[] = [
  { to: '/', label: 'Home', icon: House },
  { to: '/crops', label: 'Crops', icon: Sprout },
  { to: '/farm', label: 'Farm', icon: Fence },
  { to: '/machinery', label: 'Machinery', icon: Tractor },
  { to: '/reports', label: 'Reports', icon: ChartColumn },
]

// Sidebar-only extras (phone reaches Tasks from Home and the crop panel).
export const sideExtraNav: NavItem[] = [{ to: '/tasks', label: 'Tasks', icon: ListTodo }]

export const settingsNav: NavItem = { to: '/settings', label: 'Settings', icon: Settings }

// "+" quick-add actions.
export const quickAdd: NavItem[] = [
  { to: '/add/expense', label: 'Expense', icon: Receipt },
  { to: '/add/income', label: 'Income', icon: Wallet },
  { to: '/add/task', label: 'Task', icon: ListTodo },
  { to: '/crops?new=1', label: 'Crop', icon: Sprout },
  { to: '/machinery?new=1', label: 'Machine', icon: Tractor },
]

export function titleFor(pathname: string): string {
  if (pathname.startsWith('/add/')) {
    const item = quickAdd.find((q) => q.to === pathname)
    return item ? `Add ${item.label.toLowerCase()}` : 'Add'
  }
  const all = [...mainNav, ...sideExtraNav, settingsNav]
  const match = all
    .filter((n) => (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to)))
    .sort((a, b) => b.to.length - a.to.length)[0]
  return match?.label ?? 'Crop Season Manager'
}
