import { useState } from 'react'
import { Check, Fence, Sprout, Tractor } from 'lucide-react'
import { formatDate, todayISO } from '../../lib/format'
import { setTaskDone, taskPlace, type TaskRow } from './data'

const typeStyle: Record<string, string> = {
  do: 'bg-green-100 text-green-800',
  watch: 'bg-amber-100 text-amber-800',
  save: 'bg-sky-100 text-sky-800',
}

// One task row: big tick target on the left, tap the text to edit.
// Icon per task place (same colours as the Home net tiles).
const scopeIcon = { crop: [Sprout, 'text-lime-700', 'Crop'], farm: [Fence, 'text-orange-700', 'Farm'], machinery: [Tractor, 'text-purple-700', 'Machine'] } as const

// `className` replaces the row background (e.g. coloured rows on Home). `showIcon` puts a crop / farm / machine icon first.
export default function TaskItem({ task, onChanged, onOpen, showPlace = true, className = 'bg-white', showIcon = false }: { task: TaskRow; onChanged: () => void; onOpen: (t: TaskRow) => void; showPlace?: boolean; className?: string; showIcon?: boolean }) {
  const [busy, setBusy] = useState(false)
  const done = task.status === 'done'
  const today = todayISO()
  const overdue = !done && task.due_date != null && task.due_date < today
  const dueToday = !done && task.due_date === today

  async function toggle() {
    setBusy(true)
    await setTaskDone(task.id, !done)
    setBusy(false)
    onChanged()
  }

  return (
    <li className={`flex items-start gap-1 ${className}`}>
      {showIcon && (() => {
        const [Icon, color, label] = scopeIcon[task.scope as keyof typeof scopeIcon] ?? scopeIcon.farm
        return <span className="grid h-12 w-8 shrink-0 place-items-center pl-2" title={label}><Icon aria-label={label} className={`h-5 w-5 ${color}`} /></span>
      })()}
      <button
        onClick={toggle}
        disabled={busy}
        aria-label={done ? `Mark "${task.title}" as open` : `Mark "${task.title}" as done`}
        aria-pressed={done}
        className="grid h-12 w-12 shrink-0 place-items-center"
      >
        <span className={`grid h-6 w-6 place-items-center rounded-md border-2 ${done ? 'border-green-700 bg-green-700 text-white' : 'border-stone-300'}`}>
          {done && <Check className="h-4 w-4" />}
        </span>
      </button>
      <button onClick={() => onOpen(task)} className="min-h-12 min-w-0 flex-1 py-3 pr-3 text-left">
        <span className={`block text-sm ${done ? 'text-stone-400 line-through' : 'text-stone-900'}`}>{task.title}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500">
          {task.type && <span className={`rounded-full px-2 py-0.5 font-medium uppercase ${typeStyle[task.type]}`}>{task.type}</span>}
          {showPlace && <span className="truncate">{taskPlace(task)}</span>}
          {task.due_date && (
            <span className={overdue ? 'font-medium text-red-700' : dueToday ? 'font-medium text-amber-700' : ''}>
              {overdue ? 'Overdue · ' : dueToday ? 'Today · ' : 'Due '}{formatDate(task.due_date)}
            </span>
          )}
          {done && task.done_on && <span>Done {formatDate(task.done_on)}</span>}
        </span>
      </button>
    </li>
  )
}
