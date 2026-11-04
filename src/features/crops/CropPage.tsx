import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ListChecks, Pencil, Plus, Receipt, Settings2, Wallet, Wheat } from 'lucide-react'
import AmountWithPerAcre from '../../components/AmountWithPerAcre'
import Bars, { groupExpense } from '../../components/ExpenseBars'
import { NetIcon, TILE } from '../../components/MoneyTiles'
import Chips from '../../components/ui/Chips'
import { Button, ErrorText } from '../../components/ui/form'
import { capitalize, daysSince, formatAcres, formatDate } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { useRows } from '../../lib/useRows'
import type { Crop, Farm } from '../../types/domain'
import StageEditor from '../stages/StageEditor'
import { dbMessage } from '../farms/data'
import { useCropStages } from './data'
import EntriesPage from '../transactions/EntriesPage'
import { useCropTransactions } from '../transactions/data'
import TaskItem from '../tasks/TaskItem'
import TaskForm from '../tasks/TaskForm'
import { useTasks, type TaskRow } from '../tasks/data'

type Profit = { revenue: number | null; expense: number | null; profit: number | null }
type Tab = 'summary' | 'entries' | 'tasks'
const TABS: { key: Tab; label: string }[] = [
  { key: 'summary', label: 'Summary' },
  { key: 'entries', label: 'Entries' },
  { key: 'tasks', label: 'Tasks' },
]

// Crop page: Summary (details, stage, money, expense split) · Entries · Tasks. Tab kept in ?tab=.
export default function CropPage({ crop, farm, onEdit, onChanged }: { crop: Crop; farm: Farm | undefined; onEdit: () => void; onChanged: () => void }) {
  const [params, setParams] = useSearchParams()
  const tab = (TABS.find((t) => t.key === params.get('tab'))?.key ?? 'summary') as Tab
  const [taskKey, setTaskKey] = useState(0)
  const tasks = useTasks({ cropId: crop.id }, taskKey)
  const [moneyKey, setMoneyKey] = useState(0)

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Link to="/crops" aria-label="Back to crops" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-stone-600 hover:bg-stone-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{crop.crop_name}{crop.variety ? ` · ${crop.variety}` : ''}</h2>
            <p className="truncate text-sm text-stone-500">{crop.season} {crop.season_year} · {formatAcres(crop.area_acres)}{farm ? ` · ${farm.name}` : ''}</p>
          </div>
        </div>
        <button aria-label="Edit crop" onClick={onEdit} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-stone-500 hover:bg-stone-100">
          <Pencil className="h-4 w-4" />
        </button>
      </div>

      <div role="tablist" aria-label="Crop sections" className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1 sm:inline-grid">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setParams(t.key === 'summary' ? {} : { tab: t.key }, { replace: true })}
            className={`min-h-11 rounded-lg px-4 text-sm font-medium sm:px-6 ${tab === t.key ? 'bg-white text-green-800 shadow-sm' : 'text-stone-600'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'summary' && <Summary crop={crop} tasks={tasks.data ?? []} moneyKey={moneyKey} onChanged={onChanged} />}
      {tab === 'entries' && <EntriesPage scope="crop" embedded onSaved={() => setMoneyKey((k) => k + 1)} />}
      {tab === 'tasks' && <CropTasks crop={crop} tasks={tasks.data ?? []} loading={tasks.loading} onChanged={() => setTaskKey((k) => k + 1)} />}
    </>
  )
}

function Summary({ crop, tasks, moneyKey, onChanged }: { crop: Crop; tasks: TaskRow[]; moneyKey: number; onChanged: () => void }) {
  const stages = useCropStages(crop.id)
  const profit = useRows<Profit>(() => supabase.from('v_crop_profit').select('revenue, expense, profit').eq('crop_id', crop.id).maybeSingle(), [crop.id, moneyKey])
  const txs = useCropTransactions(crop.id)
  const [editStages, setEditStages] = useState(false)
  const [split, setSplit] = useState<'stage' | 'category'>('stage')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const age = daysSince(crop.sowing_date)
  const open = tasks.filter((t) => t.status === 'open').length
  const done = tasks.filter((t) => t.status === 'done').length
  const active = (stages.data ?? []).filter((s) => s.is_active)
  const idx = active.findIndex((s) => s.id === crop.current_stage_id)
  const current = active[idx]
  const next = active[idx + 1]
  const acres = crop.area_acres

  async function setStage(id: string) {
    setError('')
    setBusy(true)
    const { error } = await supabase.from('crops').update({ current_stage_id: id }).eq('id', crop.id)
    setBusy(false)
    if (error) setError(dbMessage(error.message))
    else onChanged()
  }

  const exp = useMemo(() => (txs.data ?? []).filter((t) => t.entry_type === 'expense'), [txs.data])
  const byStage = groupExpense(exp, (t) => Number(t.net_amount), (t) => t.stage?.name ?? '—', (t) => t.stage?.sort_order ?? 99)
  const byCategory = groupExpense(exp, (t) => Number(t.net_amount), (t) => t.item?.category?.name ?? '—')

  const tile = 'flex items-start gap-3 rounded-2xl border p-3 sm:p-4'
  const label = 'text-xs font-bold text-stone-800'
  const cash = Number(profit.data?.profit ?? 0)

  return (
    <div className="space-y-4">
      {/* Crop details (key fields) + current stage on one line: move to next stage, edit stages */}
      <section className="rounded-2xl border border-green-100 bg-green-50/60 p-4">
        <p className="text-sm text-stone-700">
          {crop.season} {crop.season_year} · {formatAcres(acres)} · {age == null ? 'not sown' : `${age} days`} · <span className="whitespace-nowrap">Sown {formatDate(crop.sowing_date)}</span>
          <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-stone-600">{capitalize(crop.status)}</span>
        </p>
        <div className="mt-3 flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-green-900">Current stage{idx >= 0 && <span className="ml-1 font-medium text-stone-500">{idx + 1}/{active.length}</span>}</p>
            <p className="truncate font-semibold text-green-800">{current?.name ?? '—'}</p>
          </div>
          {next && (
            <Button onClick={() => setStage(next.id)} disabled={busy} className="shrink-0 px-3">
              <span><span className="hidden sm:inline">Move to </span>{next.name}</span><ArrowRight className="h-4 w-4" />
            </Button>
          )}
          <button onClick={() => setEditStages(true)} aria-label="Edit stages" title="Edit stages" className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-lg border border-green-200 bg-white px-2 text-sm font-medium text-green-800 hover:bg-green-100">
            <Settings2 className="h-4 w-4" /><span className="hidden sm:inline">Edit stages</span>
          </button>
        </div>
        <ErrorText>{error}</ErrorText>
      </section>

      {/* Money tiles: 2 per row on phone, 5 on desktop */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <div className={`${tile} ${TILE.expense.box}`}>
          <Receipt aria-hidden className={`mt-0.5 h-5 w-5 shrink-0 ${TILE.expense.icon}`} />
          <div className="min-w-0 flex-1"><p className={label}>Expense</p><AmountWithPerAcre amount={profit.data?.expense} acres={acres} className="mt-2" /></div>
        </div>
        <div className={`${tile} ${TILE.income.box}`}>
          <Wallet aria-hidden className={`mt-0.5 h-5 w-5 shrink-0 ${TILE.income.icon}`} />
          <div className="min-w-0 flex-1"><p className={label}>Income</p><AmountWithPerAcre amount={profit.data?.revenue} acres={acres} className="mt-2" /></div>
        </div>
        <Link to="?tab=tasks" replace className={`${tile} border-amber-100 bg-amber-50 hover:border-amber-300`}>
          <ListChecks aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div className="min-w-0 flex-1"><p className={label}>Tasks</p><p className="mt-2 whitespace-nowrap text-[13px] sm:text-sm"><strong>{open}</strong> open · <strong>{done}</strong> done</p></div>
        </Link>
        <div className={`${tile} border-violet-100 bg-violet-50`}>
          <Wheat aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-violet-700" />
          <div className="min-w-0 flex-1"><p className={label}>Net yield</p><p className="mt-2 text-base font-semibold">{crop.net_yield_qtl == null ? '—' : `${crop.net_yield_qtl} qtl`}</p></div>
        </div>
        <div className={`${tile} col-span-2 md:col-span-1 ${TILE.net.box}`}>
          <NetIcon net={cash} className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1"><p className={label}>Cash profit</p><AmountWithPerAcre amount={profit.data?.profit} acres={acres} className={`mt-2 ${cash < 0 ? 'text-red-700' : 'text-green-700'}`} /></div>
        </div>
      </section>

      {/* Expense by stage / category: same card as Home (toggle, amount and %) */}
      <section className="rounded-2xl border border-teal-100 bg-teal-50/60 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0"><h3 className="text-sm font-bold text-teal-900">Expense by {split}</h3><p className="truncate text-xs font-semibold text-teal-700">{crop.crop_name}{crop.variety ? ` · ${crop.variety}` : ''}</p></div>
          <div role="radiogroup" aria-label="Split by" className="flex gap-1 rounded-lg border border-teal-200 bg-white p-1">
            {(['stage', 'category'] as const).map((k) => (
              <button key={k} role="radio" aria-checked={split === k} onClick={() => setSplit(k)} className={`min-h-9 rounded-md px-3 text-xs font-semibold ${split === k ? 'bg-teal-700 text-white shadow-sm' : 'text-teal-800 hover:bg-teal-50'}`}>{k === 'stage' ? 'Stage' : 'Category'}</button>
            ))}
          </div>
        </div>
        <Bars rows={split === 'stage' ? byStage : byCategory} empty="No expenses yet." />
      </section>

      {editStages && stages.data && (
        <StageEditor
          cropId={crop.id}
          stages={stages.data}
          onClose={() => setEditStages(false)}
          onChanged={() => {
            stages.reload()
            onChanged()
          }}
        />
      )}
    </div>
  )
}

// All tasks of this crop, grouped by stage in stage order.
function CropTasks({ crop, tasks, loading, onChanged }: { crop: Crop; tasks: TaskRow[]; loading: boolean; onChanged: () => void }) {
  const [view, setView] = useState<'open' | 'done' | 'all'>('open')
  const [openTask, setOpenTask] = useState<TaskRow | 'new' | null>(null)
  const counts = { open: tasks.filter((t) => t.status === 'open').length, done: tasks.filter((t) => t.status === 'done').length, all: tasks.length }
  const shown = view === 'all' ? tasks : tasks.filter((t) => t.status === view)

  const groups = useMemo(() => {
    const map = new Map<string, { id: string | null; order: number; rows: TaskRow[] }>()
    for (const t of shown) {
      const key = t.stage?.name ?? 'No stage'
      if (!map.has(key)) map.set(key, { id: t.crop_stage_id, order: t.stage?.sort_order ?? 999, rows: [] })
      map.get(key)!.rows.push(t)
    }
    return [...map.entries()].sort((a, b) => a[1].order - b[1].order)
  }, [shown])

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Chips label="Task view" value={view} onChange={(k) => setView(k as typeof view)}
          chips={[{ key: 'open', label: 'Open', count: counts.open }, { key: 'done', label: 'Done', count: counts.done }, { key: 'all', label: 'All', count: counts.all }]} />
        <Button onClick={() => setOpenTask('new')}><Plus className="h-4 w-4" />Add task</Button>
      </div>

      {loading ? (
        <p className="text-sm text-stone-500">Loading…</p>
      ) : !shown.length ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-stone-500">No tasks here.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {groups.map(([name, g]) => {
            const isCurrent = g.id != null && g.id === crop.current_stage_id
            return (
              <section key={name} className={`overflow-hidden rounded-2xl border bg-white ${isCurrent ? 'border-green-300' : 'border-stone-200'}`}>
                <h3 className={`flex items-center gap-2 border-b px-4 py-2 text-sm font-semibold ${isCurrent ? 'border-green-100 bg-green-50 text-green-900' : 'border-stone-100 bg-stone-50 text-stone-800'}`}>
                  {name} <span className="font-normal text-stone-500">· {g.rows.length}</span>
                  {isCurrent && <span className="ml-auto rounded-full bg-green-700 px-2 py-0.5 text-[11px] font-medium text-white">Current stage</span>}
                </h3>
                <ul className="divide-y divide-stone-100">
                  {g.rows.map((t) => <TaskItem key={t.id} task={t} showPlace={false} onChanged={onChanged} onOpen={setOpenTask} />)}
                </ul>
              </section>
            )
          })}
        </div>
      )}

      {openTask && (
        <TaskForm
          task={openTask === 'new' ? null : openTask}
          start={{ scope: 'crop', cropId: crop.id, stageId: crop.current_stage_id ?? undefined }}
          onClose={() => setOpenTask(null)}
          onSaved={onChanged}
        />
      )}
    </>
  )
}
