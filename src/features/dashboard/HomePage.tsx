import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftRight, ArrowRight, Fence, ListTodo, Plus, Receipt, Sprout, Tractor, Wallet } from 'lucide-react'
import MoneyTiles, { NetIcon, TILE } from '../../components/MoneyTiles'
import PeriodFilter from '../../components/PeriodFilter'
import Bars, { groupExpense } from '../../components/ExpenseBars'
import EmptyState from '../../components/ui/EmptyState'
import { Button, ErrorText } from '../../components/ui/form'
import { formatAcres, formatINR, netClass, todayISO } from '../../lib/format'
import { inRange, usePeriod } from '../../lib/period'
import { supabase } from '../../lib/supabase'
import { useRows } from '../../lib/useRows'
import { useFarms } from '../farms/data'
import TaskForm from '../tasks/TaskForm'
import TaskItem from '../tasks/TaskItem'
import { useTasks, type TaskRow } from '../tasks/data'

type Line = {
  crop_id: string | null
  entry_type: 'expense' | 'income'
  scope: 'crop' | 'farm' | 'machinery'
  net_amount: number
  start_date: string
  stage: { name: string; sort_order: number } | null
  item: { category: { name: string } | null } | null
}
type CropProfit = { crop_id: string; crop_name: string; variety: string | null; season: string; season_year: number; area_acres: number; expense: number; revenue: number; profit: number; profit_per_acre: number | null }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const card = 'rounded-2xl border border-stone-200 bg-white p-4'
const tile = 'flex items-start gap-3 rounded-2xl border p-4'

export default function HomePage() {
  const farms = useFarms()
  const [farmPick, setFarmPick] = useState('')
  const farmList = farms.data?.filter((f) => f.is_active) ?? []
  const farm = farmList.find((f) => f.id === farmPick) ?? farmList[0] ?? farms.data?.[0]
  const farmId = farm?.id ?? ''
  const acres = farm?.area_acres ?? 0

  const lines = useRows<Line[]>(
    () => supabase.from('transactions').select('crop_id, entry_type, scope, net_amount, start_date, stage:crop_stages(name, sort_order), item:items(category:categories(name))').eq('farm_id', farmId).returns<Line[]>(),
    [farmId],
  )
  const crops = useRows<CropProfit[]>(
    () => supabase.from('v_crop_profit').select('crop_id, crop_name, variety, season, season_year, area_acres, expense, revenue, profit, profit_per_acre').eq('farm_id', farmId).order('season_year', { ascending: false }).returns<CropProfit[]>(),
    [farmId],
  )
  // Crops summary lists active (not closed) crops only.
  const activeIds = useRows<{ id: string; current_stage: { name: string } | null }[]>(
    () => supabase.from('crops').select('id, current_stage:crop_stages!crops_current_stage_id_fkey(name)').eq('farm_id', farmId).neq('status', 'closed').returns<{ id: string; current_stage: { name: string } | null }[]>(),
    [farmId],
  )
  const activeCrops = (crops.data ?? []).filter((c) => activeIds.data?.some((a) => a.id === c.crop_id))
  const stageOf = (id: string) => activeIds.data?.find((a) => a.id === id)?.current_stage?.name
  const [cropPick, setCropPick] = useState('')
  const selCrop = activeCrops.find((c) => c.crop_id === cropPick) ?? activeCrops[0]
  const cropName = selCrop ? `${selCrop.crop_name}${selCrop.variety ? ` · ${selCrop.variety}` : ''}` : ''
  const [taskKey, setTaskKey] = useState(0)
  const tasks = useTasks({}, taskKey)
  const [openTask, setOpenTask] = useState<TaskRow | null>(null)

  const period = usePeriod('year')
  const [split, setSplit] = useState<'stage' | 'category'>('stage')
  const today = todayISO()

  const inPeriod = (lines.data ?? []).filter((l) => inRange(l.start_date, period.range))
  // Charts follow the crop picked in Crops summary (all its entries, no period).
  const cropLines = (lines.data ?? []).filter((l) => l.scope === 'crop' && l.crop_id === selCrop?.crop_id)

  const sum = (rows: Line[], type: 'expense' | 'income') => rows.filter((l) => l.entry_type === type).reduce((a, l) => a + Number(l.net_amount), 0)
  const expense = sum(inPeriod, 'expense')
  const income = sum(inPeriod, 'income')
  const netOf = (scope: Line['scope']) => {
    const rows = inPeriod.filter((l) => l.scope === scope)
    return sum(rows, 'income') - sum(rows, 'expense')
  }

  const split_rows = useMemo(() => {
    const exp = cropLines.filter((l) => l.entry_type === 'expense')
    return split === 'stage'
      ? groupExpense(exp, (l) => Number(l.net_amount), (l) => l.stage?.name ?? '—', (l) => l.stage?.sort_order ?? 99)
      : groupExpense(exp, (l) => Number(l.net_amount), (l) => l.item?.category?.name ?? '—')
  }, [cropLines, split])

  // 6 months of the selected crop, ending at its latest entry month.
  const months = useMemo(() => {
    const last = cropLines.reduce((a, l) => (l.start_date > a ? l.start_date : a), '')
    const [y, m] = (last || today).split('-').map(Number)
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(Date.UTC(y, m - 1 - (5 - i), 1))
      const key = d.toISOString().slice(0, 7)
      const rows = cropLines.filter((l) => l.start_date.startsWith(key))
      return { key, label: MONTHS.at(d.getUTCMonth()) ?? '', expense: sum(rows, 'expense'), income: sum(rows, 'income') }
    })
  }, [cropLines, today]) // eslint-disable-line react-hooks/exhaustive-deps
  // Amount axis: round the top up to a tidy number (1, 2, 2.5, 5 × 10^n).
  const rawMax = Math.max(0, ...months.flatMap((x) => [x.expense, x.income]))
  const monthMax = (() => {
    if (rawMax <= 0) return 1000
    const p = 10 ** Math.floor(Math.log10(rawMax))
    return ([1, 2, 2.5, 5, 10].find((m) => m * p >= rawMax) ?? 10) * p
  })()
  const short = (n: number) => (n >= 1e5 ? `₹${+(n / 1e5).toFixed(1)}L` : n >= 1e3 ? `₹${+(n / 1e3).toFixed(1)}k` : `₹${n}`)

  const farmTasks = (tasks.data ?? []).filter((t) => t.farm_id === farmId && t.status === 'open')
  const overdue = farmTasks.filter((t) => t.due_date && t.due_date < today)
  const dueSoon = farmTasks.filter((t) => t.due_date && t.due_date >= today).sort((a, b) => a.due_date!.localeCompare(b.due_date!)).slice(0, 5)
  // Home list: overdue, then today, then upcoming — oldest date first.
  const dueList = [...overdue, ...dueSoon].sort((a, b) => a.due_date!.localeCompare(b.due_date!)).slice(0, 6)

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
        <div className={`${tile} items-center border-emerald-100 bg-emerald-50 md:min-w-80`}>
          <Fence aria-hidden className="h-5 w-5 shrink-0 text-emerald-700" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{farm?.name}</p>
            <p className="text-sm text-stone-500">{formatAcres(acres)}</p>
          </div>
          {/* Switch farm: the icon opens the phone / browser picker of farms in use. */}
          <label title="Switch farm" className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-emerald-800 shadow-sm ${farmList.length > 1 ? 'cursor-pointer hover:bg-emerald-100' : 'opacity-50'}`}>
            <ArrowLeftRight aria-hidden className="h-5 w-5" />
            <span className="sr-only">Switch farm</span>
            <select value={farmId} onChange={(e) => setFarmPick(e.target.value)} disabled={farmList.length < 2} className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-default">
              {farmList.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </label>
        </div>
        <div className="md:[&>div]:mb-0"><PeriodFilter period={period} /></div>
            </div>

      {/* Tiles: 2 per row on phone, 4 on desktop */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Owner's colours: blue net profit (red / green amount), green income, red expense */}
        <div className={`${tile} col-span-2 lg:col-span-1 ${TILE.net.box}`}>
          <NetIcon net={income - expense} className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1"><p className="text-xs font-bold text-stone-800">Net profit<span className="block text-[11px] font-semibold text-stone-600">(crop + farm + machinery)</span></p><p className={`mt-2 text-xl font-semibold ${netClass(income - expense)}`}>{formatINR(income - expense)}</p></div>
        </div>
        <div className={`${tile} ${TILE.expense.box}`}>
          <Receipt aria-hidden className={`mt-0.5 h-5 w-5 shrink-0 ${TILE.expense.icon}`} />
          <div className="min-w-0 flex-1"><p className="text-xs font-bold text-stone-800">Expense</p><p className="mt-2 truncate text-base font-semibold text-stone-900">{formatINR(expense)}</p></div>
        </div>
        <div className={`${tile} ${TILE.income.box}`}>
          <Wallet aria-hidden className={`mt-0.5 h-5 w-5 shrink-0 ${TILE.income.icon}`} />
          <div className="min-w-0 flex-1"><p className="text-xs font-bold text-stone-800">Income</p><p className="mt-2 truncate text-base font-semibold text-stone-900">{formatINR(income)}</p></div>
        </div>
        <Link to="/tasks" className={`${tile} col-span-2 border-amber-100 bg-amber-50 lg:col-span-1`}>
          <ListTodo aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-stone-800">Open tasks</p>
            <p className="mt-2 text-xl font-semibold">{farmTasks.length}</p>
            <p className="mt-1 text-xs font-bold text-stone-600"><span className={overdue.length ? 'text-red-700' : ''}>{overdue.length} overdue</span> · <span className="text-blue-700">{dueSoon.length} due soon</span></p>
          </div>
        </Link>
      </div>

      {/* Overall breakdown */}
      {/* Each opens its page: Crops list, this farm's entries, Machinery list */}
      <div className={`${card} grid grid-cols-3 gap-2 p-2 sm:p-3`}>
        {([
          ['Crops', 'crop', Sprout, 'border-lime-100 bg-lime-50 hover:border-lime-300', 'text-lime-700', '/crops'],
          ['Farm', 'farm', Fence, 'border-orange-100 bg-orange-50 hover:border-orange-300', 'text-orange-700', `/farm/${farmId}/entries`],
          ['Machinery', 'machinery', Tractor, 'border-purple-100 bg-purple-50 hover:border-purple-300', 'text-purple-700', '/machinery'],
        ] as const).map(([label, s, Icon, box, icon, to]) => (
          <Link key={s} to={to} className={`min-w-0 rounded-xl border px-2 py-2 sm:px-3 ${box}`}>
            <span className="flex items-start gap-1 text-xs font-bold leading-tight text-stone-800"><Icon aria-hidden className={`h-4 w-4 shrink-0 ${icon}`} /><span>{label} net</span></span>
            <span className={`mt-2 block truncate text-sm font-semibold ${netClass(netOf(s))}`}>{formatINR(netOf(s))}</span>
          </Link>
        ))}
      </div>

      <div>
        {/* Crops summary (all time) */}
        <section className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-violet-900"><Sprout aria-hidden className="h-4 w-4 text-violet-700" />Crops summary</h3>
            <Link to="/crops?new=1" className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-green-800 hover:bg-green-50"><Plus className="h-4 w-4" />Crop</Link>
          </div>
          {!activeCrops.length ? (
            <p className="text-sm text-stone-500">No active crops.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              {activeCrops.map((c) => {
                const on = c.crop_id === selCrop?.crop_id
                return (
                  <li key={c.crop_id}>
                    {/* Tap the row to show this crop in the charts; tap Net to open the crop. */}
                    <div role="button" tabIndex={0} aria-pressed={on} onClick={() => setCropPick(c.crop_id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCropPick(c.crop_id) } }}
                      className={`cursor-pointer rounded-xl border p-3 ${on ? 'border-violet-600 bg-white ring-1 ring-violet-600' : 'border-violet-100 bg-white hover:border-violet-300'}`}>
                      <div className="mb-2 flex items-baseline justify-between gap-2">
                        <span className="min-w-0 truncate text-sm font-medium">{c.crop_name}{c.variety ? ` · ${c.variety}` : ''}</span>
                        <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">{stageOf(c.crop_id) ?? '—'}</span>
                      </div>
                      <p className="-mt-1 mb-2 text-xs text-stone-500">{c.season} {c.season_year} · {formatAcres(c.area_acres)}</p>
                      <MoneyTiles expense={Number(c.expense)} income={Number(c.revenue)} acres={Number(c.area_acres)} netHref={`/crops/${c.crop_id}`} spaced />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Expense split */}
        <section className="rounded-2xl border border-teal-100 bg-teal-50/60 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="min-w-0"><h3 className="text-sm font-bold text-teal-900">Expense by {split}</h3>{cropName && <p className="truncate text-xs font-semibold text-teal-700">{cropName}</p>}</div>
            <div role="radiogroup" aria-label="Split by" className="flex gap-1 rounded-lg border border-teal-200 bg-white p-1">
              {(['stage', 'category'] as const).map((k) => (
                <button key={k} role="radio" aria-checked={split === k} onClick={() => setSplit(k)} className={`min-h-9 rounded-md px-3 text-xs font-semibold ${split === k ? 'bg-teal-700 text-white shadow-sm' : 'text-teal-800 hover:bg-teal-50'}`}>{k === 'stage' ? 'Stage' : 'Category'}</button>
              ))}
            </div>
          </div>
          <Bars rows={split_rows} />
          <p className="mt-3 text-xs text-teal-700">{selCrop ? 'All entries of the crop selected in Crops summary.' : 'Add a crop to see its expenses here.'}</p>
        </section>

        {/* Expense vs income by month */}
        <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
          <h3 className="mb-3 truncate text-sm font-bold text-indigo-900">Expense vs income{cropName && <span className="font-semibold text-fuchsia-700"> – {cropName}</span>}</h3>
          <div className="flex gap-2">
          {/* Amount axis */}
          <div className="flex h-32 flex-col justify-between text-right text-[11px] font-semibold text-amber-700" aria-hidden>
            <span className="-mt-1.5">{short(monthMax)}</span><span>{short(monthMax / 2)}</span><span className="-mb-1.5">₹0</span>
          </div>
          <div className="flex min-w-0 flex-1 gap-2 bg-[linear-gradient(to_bottom,theme(colors.stone.100)_1px,transparent_1px)] bg-[length:100%_4rem]" role="img" aria-label="Expense and income amount by month">
            {months.map((mo) => (
              <div key={mo.key} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div className="flex h-32 w-full items-end justify-center gap-1 border-b border-stone-300">
                  <div className="w-1/3 max-w-5 rounded-t bg-red-400" style={{ height: `${(mo.expense / monthMax) * 100}%` }} title={`Expense ${formatINR(mo.expense)}`} />
                  <div className="w-1/3 max-w-5 rounded-t bg-green-500" style={{ height: `${(mo.income / monthMax) * 100}%` }} title={`Income ${formatINR(mo.income)}`} />
                </div>
                <span className="text-xs font-semibold text-sky-700">{mo.label}</span>
              </div>
            ))}
          </div>
          </div>
          <p className="mt-1 text-center text-[11px] font-semibold text-emerald-700">Month · bars show amount (₹)</p>
          <p className="mt-2 flex gap-4 text-xs font-semibold text-stone-700"><span className="flex items-center gap-1"><span className="h-2 w-3 rounded bg-red-400" />Expense</span><span className="flex items-center gap-1"><span className="h-2 w-3 rounded bg-green-500" />Income</span></p>
        </section>
      </div>

      {/* Tasks (end of page) */}
        <section className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-sm font-bold text-amber-900">Tasks: overdue & due soon</h3>
            <Link to="/tasks" className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-green-800 hover:bg-green-50">All tasks →</Link>
          </div>
          {!overdue.length && !dueSoon.length ? (
            <p className="text-sm text-stone-500">Nothing due. Tasks with a due date show here.</p>
          ) : (
            <ul className="space-y-2">
              {/* Overdue rows red, due-soon rows amber */}
              {dueList.map((t) => (
                <TaskItem key={t.id} task={t} onChanged={() => setTaskKey((k) => k + 1)} onOpen={setOpenTask} showIcon
                  className={`rounded-xl border-l-4 ${t.due_date && t.due_date < today ? 'border-red-400 bg-red-50' : 'border-amber-400 bg-white'}`} />
              ))}
            </ul>
          )}
        </section>
      {openTask && <TaskForm task={openTask} onClose={() => setOpenTask(null)} onSaved={() => setTaskKey((k) => k + 1)} />}
      {expense === 0 && income === 0 && period.key !== 'all' && (
        <div className="text-center"><Button tone="secondary" onClick={() => period.setKey('all')}>No entries in this period · show all</Button></div>
      )}
    </div>
  )
}
