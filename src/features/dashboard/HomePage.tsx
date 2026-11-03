import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Plus } from 'lucide-react'
import PeriodFilter from '../../components/PeriodFilter'
import EmptyState from '../../components/ui/EmptyState'
import { Button, ErrorText, Select } from '../../components/ui/form'
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
    () => supabase.from('transactions').select('crop_id, entry_type, scope, net_amount, start_date, stage:crop_stages(name, sort_order), item:items(category:categories(name))').eq('farm_id', farmId).returns<Line[]>(),
    [farmId],
  )
  const crops = useRows<CropProfit[]>(
    () => supabase.from('v_crop_profit').select('crop_id, crop_name, variety, season, season_year, area_acres, expense, revenue, profit, profit_per_acre').eq('farm_id', farmId).order('season_year', { ascending: false }).returns<CropProfit[]>(),
    [farmId],
  )
  // Crops summary lists active (not closed) crops only.
  const activeIds = useRows<{ id: string }[]>(() => supabase.from('crops').select('id').eq('farm_id', farmId).neq('status', 'closed'), [farmId])
  const activeCrops = (crops.data ?? []).filter((c) => activeIds.data?.some((a) => a.id === c.crop_id))
  const [cropPick, setCropPick] = useState('')
  const selCrop = activeCrops.find((c) => c.crop_id === cropPick) ?? activeCrops[0]
  const cropName = selCrop ? `${selCrop.crop_name}${selCrop.variety ? ` · ${selCrop.variety}` : ''}` : ''
  const [taskKey, setTaskKey] = useState(0)
  const tasks = useTasks({}, taskKey)
  const [openTask, setOpenTask] = useState<TaskRow | null>(null)

  const period = usePeriod('month')
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
        <div className="md:[&>div]:mb-0"><PeriodFilter period={period} /></div>
            </div>

      {/* Tiles: 2 per row on phone, 4 on desktop */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className={`${card} col-span-2 lg:col-span-1 ${income - expense < 0 ? 'border-red-200' : 'border-green-200'}`}>
          <p className="text-xs text-stone-500">Net profit (crop + farm + machinery)</p>
          <p className={`text-xl font-semibold ${netClass(income - expense)}`}>{formatINR(income - expense)}</p>
        </div>
        <div className={`${card} border-green-100 bg-green-50`}><p className="text-xs text-stone-500">Income</p><p className="text-base font-semibold text-green-700">{formatINR(income)}</p></div>
        <div className={`${card} border-red-100 bg-red-50`}><p className="text-xs text-stone-500">Expense</p><p className="text-base font-semibold text-red-700">{formatINR(expense)}</p></div>
        <Link to="/tasks" className={`${card} col-span-2 bg-amber-50 lg:col-span-1`}>
          <p className="text-xs text-stone-500">Open tasks</p>
          <p className="text-xl font-semibold">{farmTasks.length}</p>
          <p className="text-xs text-stone-500"><span className={overdue.length ? 'font-medium text-red-700' : ''}>{overdue.length} overdue</span> · {dueSoon.length} due soon</p>
        </Link>
      </div>

      {/* Overall breakdown */}
      <div className={`${card} grid grid-cols-3 gap-2`}>
        {([['Crops', 'crop'], ['Farm', 'farm'], ['Machinery', 'machinery']] as const).map(([label, s]) => (
          <div key={s}><p className="text-xs text-stone-500">{label} net</p><p className={`text-sm font-semibold ${netClass(netOf(s))}`}>{formatINR(netOf(s))}</p></div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Crops summary (all time) */}
        <section className={card}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Crops summary</h3>
            <Link to="/crops?new=1" className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-green-800 hover:bg-green-50"><Plus className="h-4 w-4" />Crop</Link>
          </div>
          {!activeCrops.length ? (
            <p className="text-sm text-stone-500">No active crops.</p>
          ) : (
            <ul className="space-y-2">
              {activeCrops.map((c) => {
                const on = c.crop_id === selCrop?.crop_id
                return (
                  <li key={c.crop_id}>
                    {/* Tap the row to show this crop in the charts; tap Net to open the crop. */}
                    <div role="button" tabIndex={0} aria-pressed={on} onClick={() => setCropPick(c.crop_id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCropPick(c.crop_id) } }}
                      className={`cursor-pointer rounded-xl border p-3 ${on ? 'border-green-600 bg-green-50/40 ring-1 ring-green-600' : 'border-stone-200 hover:bg-stone-50'}`}>
                      <div className="mb-2 flex items-baseline justify-between gap-2">
                        <span className="min-w-0 truncate text-sm font-medium">{c.crop_name}{c.variety ? ` · ${c.variety}` : ''}</span>
                        <span className="shrink-0 text-xs text-stone-500">{c.season} {c.season_year} · {formatAcres(c.area_acres)}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="min-w-0 rounded-lg bg-red-50 px-2 py-1.5"><span className="block text-[11px] text-stone-600">Expense</span><span className="block truncate text-sm font-semibold text-red-700">{formatINR(c.expense)}</span></div>
                        <div className="min-w-0 rounded-lg bg-green-50 px-2 py-1.5"><span className="block text-[11px] text-stone-600">Income</span><span className="block truncate text-sm font-semibold text-green-700">{formatINR(c.revenue)}</span></div>
                        <Link to={`/crops/${c.crop_id}`} onClick={(e) => e.stopPropagation()} aria-label={`Open ${c.crop_name}`} className="min-w-0 rounded-lg border border-stone-200 bg-white px-2 py-1.5 hover:border-green-600">
                          <span className="block text-[11px] text-stone-600">Net profit →</span><span className={`block truncate text-sm font-semibold underline-offset-2 hover:underline ${netClass(Number(c.profit))}`}>{formatINR(c.profit)}</span>
                        </Link>
                      </div>
                    </div>
                  </li>
                )
              })}
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Expense split */}
        <section className={card}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="min-w-0"><h3 className="text-sm font-semibold">Expense by {split}</h3>{cropName && <p className="truncate text-xs text-stone-500">{cropName}</p>}</div>
            <div role="radiogroup" aria-label="Split by" className="flex gap-1 rounded-lg bg-stone-100 p-1">
              {(['stage', 'category'] as const).map((k) => (
                <button key={k} role="radio" aria-checked={split === k} onClick={() => setSplit(k)} className={`min-h-9 rounded-md px-3 text-xs font-medium ${split === k ? 'bg-white text-green-800 shadow-sm' : 'text-stone-600'}`}>{k === 'stage' ? 'Stage' : 'Category'}</button>
              ))}
            </div>
          </div>
          <Bars rows={split_rows} />
          <p className="mt-3 text-xs text-stone-500">{selCrop ? 'All entries of the crop selected in Crops summary.' : 'Add a crop to see its expenses here.'}</p>
        </section>

        {/* Expense vs income by month */}
        <section className={card}>
          <h3 className="mb-3 truncate text-sm font-semibold">Expense vs income{cropName ? ` – ${cropName}` : ''}</h3>
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

      {openTask && <TaskForm task={openTask} onClose={() => setOpenTask(null)} onSaved={() => setTaskKey((k) => k + 1)} />}
      {expense === 0 && income === 0 && period.key !== 'all' && (
        <div className="text-center"><Button tone="secondary" onClick={() => period.setKey('all')}>No entries in this period · show all</Button></div>
      )}
    </div>
  )
}
