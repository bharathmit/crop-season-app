import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ChevronDown, ListChecks, Pencil, Plus, Receipt, Settings2, Wallet, Wheat } from 'lucide-react'
import AmountWithPerAcre from '../../components/AmountWithPerAcre'
import Bars, { groupExpense } from '../../components/ExpenseBars'
import { NetIcon, TILE } from '../../components/MoneyTiles'
import Sheet from '../../components/ui/Sheet'
import { Button, ErrorText, Field, Select } from '../../components/ui/form'
import { daysSince, formatAcres, todayISO } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { useRows } from '../../lib/useRows'
import type { Crop, Farm } from '../../types/domain'
import StageEditor from '../stages/StageEditor'
import { dbMessage } from '../farms/data'
import { isOthersStage, useCropStages } from './data'
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
  // Stage steps: active stages without "Others" (entries only).
  const steps = (stages.data ?? []).filter((s) => s.is_active && !isOthersStage(s.name))
  const idx = steps.findIndex((s) => s.id === crop.current_stage_id)
  const current = (stages.data ?? []).find((s) => s.id === crop.current_stage_id)
  const next = steps[idx + 1]
  const [moving, setMoving] = useState(false)
  const [pick, setPick] = useState('')
  const acres = crop.area_acres

  async function setStage(id: string) {
    setError('')
    setBusy(true)
    const { error } = await supabase.from('crops').update({ current_stage_id: id }).eq('id', crop.id)
    setBusy(false)
    if (error) {
      setError(dbMessage(error.message))
      return false
    }
    onChanged()
    return true
  }

  const exp = useMemo(() => (txs.data ?? []).filter((t) => t.entry_type === 'expense'), [txs.data])
  const byStage = groupExpense(exp, (t) => Number(t.net_amount), (t) => t.stage?.name ?? '—', (t) => t.stage?.sort_order ?? 99)
  const byCategory = groupExpense(exp, (t) => Number(t.net_amount), (t) => t.item?.category?.name ?? '—')

  const tile = 'flex items-start gap-3 rounded-2xl border p-3 sm:p-4'
  const label = 'text-xs font-bold text-stone-800'
  const cash = Number(profit.data?.profit ?? 0)

  return (
    <div className="space-y-4">
      {/* Crop details (key fields) + current stage. Changing stage opens a confirm sheet so a stray tap while scrolling changes nothing. */}
      <section className="rounded-2xl border border-green-100 bg-green-50/60 p-4">
        <p className="text-sm text-stone-700">{crop.season} {crop.season_year} · {formatAcres(acres)} · {age == null ? 'not sown' : `${age} days`}</p>
        <div className="mt-3 flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-green-900">Current stage{idx >= 0 && <span className="ml-1 font-medium text-stone-500">{idx + 1}/{steps.length}</span>}</p>
            <p className="truncate font-semibold text-green-800">{current?.name ?? '—'}</p>
          </div>
          <button onClick={() => { setPick(next?.id ?? current?.id ?? ''); setMoving(true) }} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-green-700 bg-white px-3 text-sm font-medium text-green-800 hover:bg-green-100">
            <ArrowRight className="h-4 w-4" />Change stage
          </button>
          <button onClick={() => setEditStages(true)} aria-label="Edit stages" title="Edit stages" className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-lg border border-green-200 bg-white px-2 text-sm font-medium text-green-800 hover:bg-green-100">
            <Settings2 className="h-4 w-4" /><span className="hidden sm:inline">Edit stages</span>
          </button>
        </div>
      </section>

      {moving && (
        <Sheet open title="Change stage" onClose={() => setMoving(false)}
          footer={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button tone="secondary" onClick={() => setMoving(false)}>Cancel</Button>
              <Button disabled={busy || !pick || pick === crop.current_stage_id} onClick={async () => { if (await setStage(pick)) setMoving(false) }}>
                {busy ? 'Saving…' : `Move to ${steps.find((s) => s.id === pick)?.name ?? '…'}`}
              </Button>
            </div>
          }>
          <p className="mb-3 text-sm text-stone-600">Now: <strong className="text-green-800">{current?.name ?? '—'}</strong></p>
          <Field label="Move to">
            <Select value={pick} onChange={(e) => setPick(e.target.value)}>
              {steps.map((s) => <option key={s.id} value={s.id}>{s.name}{s.id === crop.current_stage_id ? ' (now)' : s.id === next?.id ? ' (next)' : ''}</option>)}
            </Select>
          </Field>
          <ErrorText>{error}</ErrorText>
        </Sheet>
      )}

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

// All tasks of this crop: one collapsible panel per stage (stage order, "Others" last; current stage open),
// inside each: Overdue, Open, Done. Filters: Overdue / Open / Done on row 1, All + Add task on row 2.
type TaskView = 'overdue' | 'open' | 'done' | 'all'
type TaskSection = 'overdue' | 'open' | 'done'
const SECTIONS: { key: TaskSection; label: string; tone: string }[] = [
  { key: 'overdue', label: 'Overdue', tone: 'bg-red-50/70 text-red-800' },
  { key: 'open', label: 'Open', tone: 'bg-amber-50/70 text-amber-900' },
  { key: 'done', label: 'Done', tone: 'bg-stone-50 text-stone-600' },
]

function CropTasks({ crop, tasks, loading, onChanged }: { crop: Crop; tasks: TaskRow[]; loading: boolean; onChanged: () => void }) {
  const [view, setView] = useState<TaskView>('open')
  const [openTask, setOpenTask] = useState<TaskRow | 'new' | null>(null)
  const [flipped, setFlipped] = useState<Set<string>>(() => new Set())
  const today = todayISO()
  const sectionOf = (t: TaskRow): TaskSection => (t.status === 'done' ? 'done' : t.due_date && t.due_date < today ? 'overdue' : 'open')
  // Open = every open task (overdue included); Overdue = only the overdue ones.
  const inView = (t: TaskRow) => view === 'all' || (view === 'open' ? t.status === 'open' : sectionOf(t) === view)
  const counts = {
    overdue: tasks.filter((t) => sectionOf(t) === 'overdue').length,
    open: tasks.filter((t) => t.status === 'open').length,
    done: tasks.filter((t) => t.status === 'done').length,
    all: tasks.length,
  }
  const shown = tasks.filter(inView)

  const groups = useMemo(() => {
    const map = new Map<string, { id: string | null; order: number; rows: TaskRow[] }>()
    for (const t of shown) {
      const key = t.stage?.name ?? 'No stage'
      const order = t.stage && isOthersStage(t.stage.name) ? 9999 : (t.stage?.sort_order ?? 999)
      if (!map.has(key)) map.set(key, { id: t.crop_stage_id, order, rows: [] })
      map.get(key)!.rows.push(t)
    }
    return [...map.entries()].sort((a, b) => a[1].order - b[1].order)
  }, [shown])

  // Overdue / open: due date first (no date last), then checklist order; done: latest first.
  const sortIn = (key: TaskSection, rows: TaskRow[]) =>
    [...rows].sort((a, b) =>
      key === 'done'
        ? (b.done_on ?? '').localeCompare(a.done_on ?? '')
        : (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999') || a.sort_order - b.sort_order,
    )

  const chip = (k: TaskView, label: string, tone = '') => (
    <button key={k} role="tab" aria-selected={view === k} onClick={() => setView(k)}
      className={`flex min-h-11 items-center justify-center gap-1.5 rounded-full border px-3 text-sm font-medium ${view === k ? 'border-green-700 bg-green-700 text-white' : `border-stone-200 bg-white text-stone-700 ${tone}`}`}>
      {label}<span className={`rounded-full px-2 text-xs ${view === k ? 'bg-white/20' : 'bg-stone-100 text-stone-600'}`}>{counts[k]}</span>
    </button>
  )

  return (
    <>
      <div role="tablist" aria-label="Task view" className="mb-3 space-y-2">
        <div className="grid grid-cols-3 gap-2 sm:flex">
          {chip('overdue', 'Overdue', counts.overdue ? 'text-red-700' : '')}
          {chip('open', 'Open')}
          {chip('done', 'Done')}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          {chip('all', 'All')}
          <Button onClick={() => setOpenTask('new')}><Plus className="h-4 w-4" />Add task</Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-stone-500">Loading…</p>
      ) : !shown.length ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-stone-500">No tasks here.</p>
      ) : (
        <div className="space-y-3">
          {groups.map(([name, g]) => {
            const isCurrent = g.id != null && g.id === crop.current_stage_id
            const isOpen = isCurrent !== flipped.has(name)
            const over = g.rows.filter((t) => sectionOf(t) === 'overdue').length
            return (
              <section key={name} className={`overflow-hidden rounded-2xl border bg-white ${isCurrent ? 'border-green-300' : 'border-stone-200'}`}>
                <button aria-expanded={isOpen} onClick={() => setFlipped((p) => { const n = new Set(p); if (n.has(name)) n.delete(name); else n.add(name); return n })}
                  className={`flex min-h-14 w-full items-center gap-2 px-4 py-2 text-left ${isCurrent ? 'bg-green-50' : 'bg-stone-50'}`}>
                  <ChevronDown aria-hidden className={`h-4 w-4 shrink-0 text-stone-500 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                  <span className="min-w-0 flex-1 truncate font-semibold text-stone-900">{name}</span>
                  {isCurrent && <span className="shrink-0 rounded-full bg-green-700 px-2 py-0.5 text-[11px] font-medium text-white">Current</span>}
                  {over > 0 && <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">{over} overdue</span>}
                  <span className="shrink-0 text-xs text-stone-500">{g.rows.length}</span>
                </button>
                {isOpen && (
                  <div className="border-t border-stone-100">
                    {SECTIONS.map(({ key, label, tone }) => {
                      const rows = sortIn(key, g.rows.filter((t) => sectionOf(t) === key))
                      return rows.length ? (
                        <div key={key}>
                          <p className={`px-4 py-1.5 text-xs font-bold ${tone}`}>{label} · {rows.length}</p>
                          <ul className="divide-y divide-stone-100">
                            {rows.map((t) => <TaskItem key={t.id} task={t} showPlace={false} onChanged={onChanged} onOpen={setOpenTask} />)}
                          </ul>
                        </div>
                      ) : null
                    })}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}

      {openTask && (
        <TaskForm
          task={openTask === 'new' ? null : openTask}
          start={{ scope: 'crop', cropId: crop.id, stageId: crop.current_stage_id ?? undefined, farmId: crop.farm_id, lockCrop: true, cropLabel: `${crop.crop_name}${crop.variety ? ` (${crop.variety})` : ''} · ${crop.season} ${crop.season_year}` }}
          onClose={() => setOpenTask(null)}
          onSaved={onChanged}
        />
      )}
    </>
  )
}
