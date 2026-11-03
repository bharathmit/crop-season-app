import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Plus } from 'lucide-react'
import AmountWithPerAcre from '../../components/AmountWithPerAcre'
import EmptyState from '../../components/ui/EmptyState'
import { Button, ErrorText, Select } from '../../components/ui/form'
import { formatAcres, formatINR, todayISO } from '../../lib/format'
import { perAcre } from '../../lib/perAcre'
import { supabase } from '../../lib/supabase'
import { useRows } from '../../lib/useRows'
import { useFarms } from '../farms/data'
import TaskForm from '../tasks/TaskForm'
import TaskItem from '../tasks/TaskItem'
import { useTasks, type TaskRow } from '../tasks/data'

type Period = 'month' | 'year' | 'all'
type Line = {
  entry_type: 'expense' | 'income'
  scope: 'crop' | 'farm' | 'machinery'
  net_amount: number
  start_date: string
  stage: { name: string; sort_order: number } | null
  item: { category: { name: string } | null } | null
}
type CropProfit = { crop_id: string; crop_name: string; variety: string | null; season: string; season_year: number; area_acres: number; expense: number; revenue: number; profit: number; profit_per_acre: number | null }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function Bars({ rows }: { rows: { label: string; value: number; extra: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  if (!rows.length) return <p className="text-sm text-stone-500">No expenses in this period.</p>
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label} className="text-sm">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate">{r.label}</span>
            <span className="shrink-0"><span className="font-medium">{formatINR(r.value)}</span> <span className="text-xs text-stone-500">{r.extra}</span></span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-stone-100"><div className="h-2 rounded-full bg-red-400" style={{ width: `${(r.value / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  )
}

const card = 'rounded-2xl border border-stone-200 bg-white p-4'

export default function HomePage() {
  const farms = useFarms()
  const [farmPick, setFarmPick] = useState('')
  const farm = farms.data?.find((f) => f.id === farmPick) ?? farms.data?.[0]
  const farmId = farm?.id ?? ''
  const acres = farm?.area_acres ?? 0

  const lines = useRows<Line[]>(
    () => supabase.from('transactions').select('entry_type, scope, net_amount, start_date, stage:crop_stages(name, sort_order), item:items(category:categories(name))').eq('farm_id', farmId).returns<Line[]>(),
    [farmId],
  )
  const crops = useRows<CropProfit[]>(
    () => supabase.from('v_crop_profit').select('crop_id, crop_name, variety, season, season_year, area_acres, expense, revenue, profit, profit_per_acre').eq('farm_id', farmId).order('season_year', { ascending: false }).returns<CropProfit[]>(),
    [farmId],
  )
  const [taskKey, setTaskKey] = useState(0)
  const tasks = useTasks({}, taskKey)
  const [openTask, setOpenTask] = useState<TaskRow | null>(null)

  const [period, setPeriod] = useState<Period>('month')
  const [split, setSplit] = useState<'stage' | 'category'>('stage')
  const today = todayISO()

  const inPeriod = useMemo(() => {
    const all = lines.data ?? []
    if (period === 'all') return all
    const prefix = period === 'month' ? today.slice(0, 7) : today.slice(0, 4)
    return all.filter((l) => l.start_date.startsWith(prefix))
  }, [lines.data, period, today])

  const sum = (rows: Line[], type: 'expense' | 'income') => rows.filter((l) => l.entry_type === type).reduce((a, l) => a + Number(l.net_amount), 0)
  const expense = sum(inPeriod, 'expense')
  const income = sum(inPeriod, 'income')
  const netOf = (scope: Line['scope']) => {
    const rows = inPeriod.filter((l) => l.scope === scope)
    return sum(rows, 'income') - sum(rows, 'expense')
  }

  const split_rows = useMemo(() => {
    const exp = inPeriod.filter((l) => l.entry_type === 'expense' && (split === 'category' || l.scope === 'crop'))
    const total = exp.reduce((a, l) => a + Number(l.net_amount), 0)
    const map = new Map<string, { value: number; order: number }>()
    for (const l of exp) {
      const key = split === 'stage' ? (l.stage?.name ?? '—') : (l.item?.category?.name ?? '—')
      const cur = map.get(key) ?? { value: 0, order: split === 'stage' ? (l.stage?.sort_order ?? 99) : 0 }
      cur.value += Number(l.net_amount)
      map.set(key, cur)
    }
    return [...map.entries()]
      .sort((a, b) => (split === 'stage' ? a[1].order - b[1].order : b[1].value - a[1].value))
      .map(([label, v]) => ({ label, value: v.value, extra: `${total ? Math.round((v.value / total) * 1000) / 10 : 0}%` }))
  }, [inPeriod, split])

  // Last 6 months, expense vs income (all of this farm's entries).
  const months = useMemo(() => {
    const [y, m] = today.split('-').map(Number)
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(Date.UTC(y, m - 1 - (5 - i), 1))
      const key = d.toISOString().slice(0, 7)
      const rows = (lines.data ?? []).filter((l) => l.start_date.startsWith(key))
      return { key, label: MONTHS.at(d.getUTCMonth()) ?? '', expense: sum(rows, 'expense'), income: sum(rows, 'income') }
    })
  }, [lines.data, today]) // eslint-disable-line react-hooks/exhaustive-deps
  const monthMax = Math.max(1, ...months.flatMap((x) => [x.expense, x.income]))

  const farmTasks = (tasks.data ?? []).filter((t) => t.farm_id === farmId && t.status === 'open')
  const overdue = farmTasks.filter((t) => t.due_date && t.due_date < today)
  const dueSoon = farmTasks.filter((t) => t.due_date && t.due_date >= today).slice(0, 5)

  if (!farms.loading && !farms.data?.length) {
    return (
      <EmptyState
        title="Welcome! Start with your farm"
        text="Add your farm, then a crop for this season. Expenses, income and the stage checklist follow from there."
        action={<Link to="/farm" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-green-700 px-4 font-medium text-white">Add farm <ArrowRight className="h-4 w-4" /></Link>}
      />
    )
  }

  return (
    <div className="space-y-4">
      <ErrorText>{farms.error ?? lines.error ?? crops.error}</ErrorText>

      {/* Farm + period */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className={`${card} flex items-center justify-between gap-3 md:min-w-80`}>
          <div className="min-w-0">
            {(farms.data?.length ?? 0) > 1 ? (
              <Select aria-label="Farm" value={farmId} onChange={(e) => setFarmPick(e.target.value)} className="font-semibold">
                {farms.data!.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </Select>
            ) : (
              <p className="truncate font-semibold">{farm?.name}</p>
            )}
            <p className="text-sm text-stone-500">{formatAcres(acres)}</p>
          </div>
          <Link to={`/farm/${farmId}/entries`} aria-label="Farm entries" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-green-50 text-green-800"><ArrowRight className="h-5 w-5" /></Link>
        </div>
        <div role="radiogroup" aria-label="Period" className="grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1 md:w-96">
          {([['month', 'This month'], ['year', 'This year'], ['all', 'All time']] as const).map(([k, label]) => (
            <button key={k} role="radio" aria-checked={period === k} onClick={() => setPeriod(k)} className={`min-h-11 rounded-lg text-sm font-medium ${period === k ? 'bg-white text-green-800 shadow-sm' : 'text-stone-600'}`}>{label}</button>
          ))}
        </div>
      </div>

      {/* Tiles: 2 per row on phone, 4 on desktop */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className={`${card} col-span-2 lg:col-span-1 ${income - expense < 0 ? 'border-red-200' : 'border-green-200'}`}>
          <p className="text-xs text-stone-500">Net profit (crop + farm + machinery)</p>
          <AmountWithPerAcre amount={income - expense} acres={acres} size="lg" />
        </div>
        <div className={`${card} bg-green-50`}><p className="text-xs text-stone-500">Income</p><AmountWithPerAcre amount={income} acres={acres} /></div>
        <div className={`${card} bg-red-50`}><p className="text-xs text-stone-500">Expense</p><AmountWithPerAcre amount={expense} acres={acres} /></div>
        <Link to="/tasks" className={`${card} col-span-2 bg-amber-50 lg:col-span-1`}>
          <p className="text-xs text-stone-500">Open tasks</p>
          <p className="text-xl font-semibold">{farmTasks.length}</p>
          <p className="text-xs text-stone-500"><span className={overdue.length ? 'font-medium text-red-700' : ''}>{overdue.length} overdue</span> · {dueSoon.length} due soon</p>
        </Link>
      </div>

      {/* Overall breakdown */}
      <div className={`${card} grid grid-cols-3 gap-2`}>
        {([['Crops', 'crop'], ['Farm', 'farm'], ['Machinery', 'machinery']] as const).map(([label, s]) => (
          <div key={s}><p className="text-xs text-stone-500">{label} net</p><AmountWithPerAcre amount={netOf(s)} acres={acres} size="sm" /></div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Expense split */}
        <section className={card}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Expense by {split}</h3>
            <div role="radiogroup" aria-label="Split by" className="flex gap-1 rounded-lg bg-stone-100 p-1">
              {(['stage', 'category'] as const).map((k) => (
                <button key={k} role="radio" aria-checked={split === k} onClick={() => setSplit(k)} className={`min-h-9 rounded-md px-3 text-xs font-medium ${split === k ? 'bg-white text-green-800 shadow-sm' : 'text-stone-600'}`}>{k === 'stage' ? 'Stage' : 'Category'}</button>
              ))}
            </div>
          </div>
          <Bars rows={split_rows} />
          {split === 'stage' && <p className="mt-3 text-xs text-stone-500">Crop expenses only. Farm and machinery have no stages.</p>}
        </section>

        {/* Expense vs income by month */}
        <section className={card}>
          <h3 className="mb-3 text-sm font-semibold">Expense vs income · last 6 months</h3>
          <div className="flex h-40 items-end gap-2" role="img" aria-label="Monthly expense and income bars">
            {months.map((mo) => (
              <div key={mo.key} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div className="flex h-32 w-full items-end justify-center gap-1">
                  <div className="w-1/3 max-w-5 rounded-t bg-red-400" style={{ height: `${(mo.expense / monthMax) * 100}%` }} title={`Expense ${formatINR(mo.expense)}`} />
                  <div className="w-1/3 max-w-5 rounded-t bg-green-500" style={{ height: `${(mo.income / monthMax) * 100}%` }} title={`Income ${formatINR(mo.income)}`} />
                </div>
                <span className="text-xs text-stone-500">{mo.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 flex gap-4 text-xs text-stone-600"><span className="flex items-center gap-1"><span className="h-2 w-3 rounded bg-red-400" />Expense</span><span className="flex items-center gap-1"><span className="h-2 w-3 rounded bg-green-500" />Income</span></p>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Crops summary (all time) */}
        <section className={card}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Crops summary</h3>
            <Link to="/crops?new=1" className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-green-800 hover:bg-green-50"><Plus className="h-4 w-4" />Crop</Link>
          </div>
          {!crops.data?.length ? (
            <p className="text-sm text-stone-500">No crops yet.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {crops.data.map((c) => (
                <li key={c.crop_id}>
                  <Link to={`/crops/${c.crop_id}`} className="flex min-h-14 items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{c.crop_name}{c.variety ? ` · ${c.variety}` : ''}</span>
                      <span className="block text-xs text-stone-500">{c.season} {c.season_year} · {formatAcres(c.area_acres)} · exp {formatINR(c.expense)} · inc {formatINR(c.revenue)}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className={`block text-sm font-semibold ${Number(c.profit) < 0 ? 'text-red-700' : 'text-green-700'}`}>{formatINR(c.profit)}</span>
                      <span className="block text-xs text-stone-500">{formatINR(perAcre(c.profit, c.area_acres))}/ac</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Tasks */}
        <section className={card}>
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Tasks: overdue & due soon</h3>
            <Link to="/tasks" className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-green-800 hover:bg-green-50">All tasks →</Link>
          </div>
          {!overdue.length && !dueSoon.length ? (
            <p className="text-sm text-stone-500">Nothing due. Tasks with a due date show here.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {[...overdue, ...dueSoon].slice(0, 6).map((t) => (
                <TaskItem key={t.id} task={t} onChanged={() => setTaskKey((k) => k + 1)} onOpen={setOpenTask} />
              ))}
            </ul>
          )}
        </section>
      </div>

      {openTask && <TaskForm task={openTask} onClose={() => setOpenTask(null)} onSaved={() => setTaskKey((k) => k + 1)} />}
      {expense === 0 && income === 0 && period !== 'all' && (
        <div className="text-center"><Button tone="secondary" onClick={() => setPeriod('all')}>No entries this {period} · show all time</Button></div>
      )}
    </div>
  )
}
