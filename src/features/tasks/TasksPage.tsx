import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, X } from 'lucide-react'
import Chips from '../../components/ui/Chips'
import EmptyState, { PageHeader } from '../../components/ui/EmptyState'
import { Button, ErrorText } from '../../components/ui/form'
import { todayISO } from '../../lib/format'
import TaskForm from './TaskForm'
import TaskItem from './TaskItem'
import { taskPlace, useTasks, type TaskRow } from './data'

type View = 'open' | 'overdue' | 'today' | 'week' | 'done'

function addDays(iso: string, n: number) {
  const [y, m, d] = iso.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + n))
  return t.toISOString().slice(0, 10)
}

// All tasks for crop stages, farms and machines. ?crop=<id> narrows to one crop.
export default function TasksPage() {
  const [params, setParams] = useSearchParams()
  const cropId = params.get('crop') ?? undefined
  const tasks = useTasks({ cropId })
  const [view, setView] = useState<View>('open')
  const [scope, setScope] = useState('all')
  const [editing, setEditing] = useState<TaskRow | null | 'new'>(null)

  const today = todayISO()
  const week = addDays(today, 7)
  const all = tasks.data ?? []
  const inScope = scope === 'all' ? all : all.filter((t) => t.scope === scope)
  const match: Record<View, (t: TaskRow) => boolean> = {
    open: (t) => t.status === 'open',
    overdue: (t) => t.status === 'open' && !!t.due_date && t.due_date < today,
    today: (t) => t.status === 'open' && t.due_date === today,
    week: (t) => t.status === 'open' && !!t.due_date && t.due_date >= today && t.due_date <= week,
    done: (t) => t.status === 'done',
  }
  const chips = (Object.keys(match) as View[]).map((k) => ({
    key: k,
    label: { open: 'Open', overdue: 'Overdue', today: 'Due today', week: 'Next 7 days', done: 'Done' }[k],
    count: inScope.filter(match[k]).length,
  }))
  const shown = inScope.filter(match[view])

  // Group by place: crop › stage (in stage order), farm, machine.
  const groups = useMemo(() => {
    const map = new Map<string, { order: string; rows: TaskRow[] }>()
    for (const t of shown) {
      const key = taskPlace(t)
      const order = `${t.scope === 'crop' ? '0' : t.scope === 'farm' ? '1' : '2'}${t.crop?.crop_name ?? ''}${String(t.stage?.sort_order ?? 0).padStart(3, '0')}${key}`
      if (!map.has(key)) map.set(key, { order, rows: [] })
      map.get(key)!.rows.push(t)
    }
    return [...map.entries()].sort((a, b) => a[1].order.localeCompare(b[1].order))
  }, [shown])

  const cropName = cropId ? all[0]?.crop?.crop_name : undefined

  return (
    <>
      <PageHeader
        subtitle="Crop stage checklist (Do / Watch / Save) and your own tasks for crops, farm and machines."
        action={<Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" />Add task</Button>}
      />
      {cropId && (
        <div className="mb-3 flex items-center gap-2 text-sm">
          <span className="rounded-full bg-green-100 px-3 py-1 font-medium text-green-800">Crop: {cropName ?? '…'}</span>
          <button onClick={() => setParams({})} aria-label="Show all crops" className="grid h-11 w-11 place-items-center rounded-full text-stone-500 hover:bg-stone-100"><X className="h-4 w-4" /></button>
        </div>
      )}
      <ErrorText>{tasks.error}</ErrorText>

      <div className="mb-3"><Chips label="Task view" chips={chips} value={view} onChange={(k) => setView(k as View)} /></div>
      {!cropId && (
        <div className="mb-4 grid grid-cols-4 gap-1 rounded-xl bg-stone-100 p-1 sm:inline-grid" role="radiogroup" aria-label="Task for">
          {[['all', 'All'], ['crop', 'Crops'], ['farm', 'Farm'], ['machinery', 'Machines']].map(([k, label]) => (
            <button key={k} role="radio" aria-checked={scope === k} onClick={() => setScope(k)} className={`min-h-11 rounded-lg px-3 text-sm font-medium ${scope === k ? 'bg-white text-green-800 shadow-sm' : 'text-stone-600'}`}>{label}</button>
          ))}
        </div>
      )}

      {tasks.loading ? (
        <p className="text-sm text-stone-500">Loading…</p>
      ) : !all.length ? (
        <EmptyState title="No tasks yet" text="Paddy crops get the stage checklist automatically. Add your own tasks any time." action={<Link to="/crops" className="font-medium text-green-800">Go to Crops →</Link>} />
      ) : !shown.length ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-stone-500">Nothing here.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {groups.map(([place, g]) => (
            <section key={place} className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
              <h3 className="border-b border-stone-100 bg-stone-50 px-4 py-2 text-sm font-semibold text-stone-800">{place} <span className="font-normal text-stone-500">· {g.rows.length}</span></h3>
              <ul className="divide-y divide-stone-100">
                {g.rows.map((t) => <TaskItem key={t.id} task={t} showPlace={false} onChanged={tasks.reload} onOpen={setEditing} />)}
              </ul>
            </section>
          ))}
        </div>
      )}

      {editing && (
        <TaskForm task={editing === 'new' ? null : editing} start={{ cropId }} onClose={() => setEditing(null)} onSaved={tasks.reload} />
      )}
    </>
  )
}
