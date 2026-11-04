import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import Chips from '../../components/ui/Chips'
import MoneyTiles from '../../components/MoneyTiles'
import EmptyState, { PageHeader } from '../../components/ui/EmptyState'
import { Button, ErrorText, Field, TextInput } from '../../components/ui/form'
import { daysSince, formatAcres, formatDate, formatINR, netClass, todayISO } from '../../lib/format'
import type { DateRange } from '../../lib/period'
import { supabase } from '../../lib/supabase'
import { useRows } from '../../lib/useRows'
import { useFarms } from '../farms/data'
import CropForm from './CropForm'
import CropPage from './CropPage'
import { useCrops, type CropWithStage } from './data'

// A crop is in the date range if its season (sowing / added date → harvest date, or today while growing) overlaps it.
function cropInRange(c: CropWithStage, r: DateRange) {
  const start = (c.sowing_date ?? c.created_at).slice(0, 10)
  const end = (c.harvest_date ?? todayISO()).slice(0, 10)
  return (!r.to || start <= r.to) && (!r.from || end >= r.from)
}

function StageChip({ name }: { name: string | undefined }) {
  return <span className="inline-block max-w-full truncate whitespace-nowrap rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">{name ?? '—'}</span>
}

export default function CropsPage() {
  const farms = useFarms()
  const crops = useCrops()
  // All entries per crop (no period): expense, income, net.
  const money = useRows<{ crop_id: string; expense: number; revenue: number }[]>(() => supabase.from('v_crop_profit').select('crop_id, expense, revenue'), [crops.data])
  const moneyOf = (id: string) => {
    const r = money.data?.find((x) => x.crop_id === id)
    return { expense: Number(r?.expense ?? 0), income: Number(r?.revenue ?? 0) }
  }
  const { cropId } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<'active' | 'closed'>('active')
  // Closed tab only: From / To search (cleared = all closed crops).
  // Default: the last one year (same date last year → today).
  const today = todayISO()
  const yearAgo = `${Number(today.slice(0, 4)) - 1}${today.slice(4)}`
  const [from, setFrom] = useState(yearAgo)
  const [to, setTo] = useState(today)
  const [editing, setEditing] = useState<CropWithStage | null>(null)
  const adding = params.get('new') === '1'

  const list = crops.data ?? []
  const farmById = (id: string) => farms.data?.find((f) => f.id === id)

  // Active (all active crops) / Closed (narrowed by the From / To search).
  const live = list.filter((c) => c.status !== 'closed')
  const closed = list.filter((c) => c.status === 'closed' && cropInRange(c, { from: from || null, to: to || null }))
  const chips = [
    { key: 'active', label: 'Active', count: live.length },
    { key: 'closed', label: 'Closed', count: closed.length },
  ]
  const shown = tab === 'active' ? live : closed

  const selected = cropId ? list.find((c) => c.id === cropId) : undefined
  const knownNames = Array.from(new Set(['Paddy', ...list.map((c) => c.crop_name)]))
  const noFarm = !farms.loading && !farms.data?.length

  const openNew = () => setParams({ new: '1' })
  const closeForm = () => {
    setEditing(null)
    if (adding) setParams({})
  }

  const form = (adding || editing) && farms.data && (
    <CropForm
      crop={editing}
      farms={farms.data}
      knownNames={knownNames}
      onClose={closeForm}
      onSaved={(id) => {
        setEditing(null)
        crops.reload()
        navigate(id ? `/crops/${id}` : '/crops', { replace: true })
      }}
    />
  )

  // Crop page (Summary / Entries / Tasks) replaces the list.
  if (selected) {
    return (
      <>
        <CropPage crop={selected} farm={farmById(selected.farm_id)} onEdit={() => setEditing(selected)} onChanged={crops.reload} />
        {form}
      </>
    )
  }

  return (
    <>
      <PageHeader
        subtitle="One crop = one crop on one farm in one season."
        action={!noFarm && <Button onClick={openNew}><Plus className="h-4 w-4" />Add crop</Button>}
      />
      <ErrorText>{crops.error ?? farms.error}</ErrorText>

      {noFarm ? (
        <EmptyState title="Add a farm first" text="Every crop is grown on a farm." action={<Link to="/farm" className="font-medium text-green-800">Go to Farm →</Link>} />
      ) : crops.loading ? (
        <p className="text-sm text-stone-500">Loading…</p>
      ) : !list.length ? (
        <EmptyState title="No crops yet" text="Add this season's crop. It gets the 8 stages and the paddy checklist as tasks." action={<Button onClick={openNew}><Plus className="h-4 w-4" />Add crop</Button>} />
      ) : (
        <>
          <div className="mb-4"><Chips label="Crop status" chips={chips} value={tab} onChange={(k) => setTab(k as 'active' | 'closed')} /></div>

          {/* Closed crops: search by date range (sowing → harvest overlaps From / To) */}
          {tab === 'closed' && (
            <div className="mb-4 grid grid-cols-2 items-end gap-3 sm:max-w-lg sm:grid-cols-[1fr_1fr_auto]">
              <Field label="From"><TextInput type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></Field>
              <Field label="To"><TextInput type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></Field>
              {(from || to) && <Button tone="secondary" className="col-span-2 sm:col-span-1" onClick={() => { setFrom(''); setTo('') }}>Clear</Button>}
            </div>
          )}

          {!shown.length && <p className="rounded-2xl bg-white p-6 text-center text-sm text-stone-500">{tab === 'active' ? 'No active crops.' : from || to ? 'No closed crops in these dates.' : 'No closed crops.'}</p>}

          {/* Phone: cards */}
          <ul className="space-y-3 md:hidden">
            {shown.map((c) => {
              const age = daysSince(c.sowing_date)
              return (
                <li key={c.id}>
                  <Link to={`/crops/${c.id}`} className="block rounded-2xl border border-stone-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{c.crop_name}{c.variety && <span className="font-normal text-stone-500"> · {c.variety}</span>}</p>
                        <p className="text-sm text-stone-600">{c.season} {c.season_year} · {formatAcres(c.area_acres)}</p>
                      </div>
                      <StageChip name={c.current_stage?.name} />
                    </div>
                    <p className="mt-2 text-xs text-stone-500">{farmById(c.farm_id)?.name} · {age == null ? 'No sowing date' : `${age} days old`}</p>
                    <div className="mt-3"><MoneyTiles {...moneyOf(c.id)} acres={c.area_acres} /></div>
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* Tablet / desktop: table */}
          {shown.length > 0 && (
            <div className="hidden overflow-hidden rounded-2xl border border-stone-200 bg-white md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50 text-stone-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Crop</th>
                    <th className="px-4 py-3 font-medium">Season</th>
                    <th className="hidden px-4 py-3 font-medium lg:table-cell">Farm</th>
                    <th className="hidden px-4 py-3 font-medium lg:table-cell">Area</th>
                    <th className="hidden px-4 py-3 font-medium lg:table-cell">Age</th>
                    <th className="px-4 py-3 font-medium">Stage</th>
                    <th className="hidden px-4 py-3 font-medium xl:table-cell">Sowing date</th>
                    <th className="px-4 py-3 text-right font-medium">Expense</th>
                    <th className="px-4 py-3 text-right font-medium">Income</th>
                    <th className="px-4 py-3 text-right font-medium">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {shown.map((c) => {
                    const age = daysSince(c.sowing_date)
                    const m = moneyOf(c.id)
                    return (
                      <tr key={c.id} onClick={() => navigate(`/crops/${c.id}`)} className={`cursor-pointer hover:bg-stone-50 ${c.id === cropId ? 'bg-green-50' : ''}`}>
                        <td className="px-4 py-3 font-medium">{c.crop_name}{c.variety && <span className="font-normal text-stone-500"> · {c.variety}</span>}</td>
                        <td className="whitespace-nowrap px-4 py-3">{c.season} {c.season_year}<span className="block text-xs text-stone-500 lg:hidden">{formatAcres(c.area_acres)}</span></td>
                        <td className="hidden px-4 py-3 lg:table-cell">{farmById(c.farm_id)?.name}</td>
                        <td className="hidden whitespace-nowrap px-4 py-3 lg:table-cell">{formatAcres(c.area_acres)}</td>
                        <td className="hidden whitespace-nowrap px-4 py-3 lg:table-cell">{age == null ? '—' : `${age} d`}</td>
                        <td className="px-4 py-3"><StageChip name={c.current_stage?.name} /></td>
                        <td className="hidden whitespace-nowrap px-4 py-3 xl:table-cell">{formatDate(c.sowing_date)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-red-700">{formatINR(m.expense)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-green-700">{formatINR(m.income)}</td>
                        <td className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${netClass(m.income - m.expense)}`}>{formatINR(m.income - m.expense)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {form}
    </>
  )
}
