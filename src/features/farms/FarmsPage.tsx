import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Pencil, Plus } from 'lucide-react'
import MoneyTiles from '../../components/MoneyTiles'
import Chips from '../../components/ui/Chips'
import { periodRange } from '../../lib/period'
import { useScopeTotals } from '../transactions/data'
import EmptyState, { PageHeader } from '../../components/ui/EmptyState'
import { Button, ErrorText } from '../../components/ui/form'
import { capitalize, formatAcres } from '../../lib/format'
import type { Farm } from '../../types/domain'
import FarmForm from './FarmForm'
import { useFarms } from './data'

export default function FarmsPage() {
  const { data: farms, error, loading, reload } = useFarms()
  const yearRange = periodRange('year', '', '')
  const year = yearRange.from?.slice(0, 4)
  const { totals } = useScopeTotals('farm', yearRange) // current year
  const [editing, setEditing] = useState<Farm | null | 'new'>(null)
  // Tabs like Machinery: In use (default) / Not in use.
  const [status, setStatus] = useState<'active' | 'inactive'>('active')
  const chips = [
    { key: 'active', label: 'In use', count: farms?.filter((x) => x.is_active).length ?? 0 },
    { key: 'inactive', label: 'Not in use', count: farms?.filter((x) => !x.is_active).length ?? 0 },
  ]
  const shown = farms?.filter((x) => x.is_active === (status === 'active')) ?? []

  const close = () => setEditing(null)
  const saved = () => {
    setEditing(null)
    reload()
  }

  return (
    <>
      <PageHeader
        subtitle="Your land holdings. Open a farm's expenses & income for borewell, fencing, lease, tax and more."
        action={<Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" />Add farm</Button>}
      />
      <ErrorText>{error}</ErrorText>
      {loading ? (
        <p className="text-sm text-stone-500">Loading…</p>
      ) : !farms?.length ? (
        <EmptyState
          title="Add your first farm"
          text="Crops and machines belong to a farm. Add its acres, survey no., water and soil details."
          action={<Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" />Add farm</Button>}
        />
      ) : (
        <>
        <div className="mb-4"><Chips label="Farm status" chips={chips} value={status} onChange={(k) => setStatus(k as 'active' | 'inactive')} /></div>
        {!shown.length && <p className="text-sm text-stone-500">{status === 'active' ? 'No farms in use.' : 'No farms marked not in use.'}</p>}
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {shown.map((farm) => (
            <li key={farm.id} className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-stone-900">{farm.name}</h3>
                  <p className="text-sm text-stone-600">{formatAcres(farm.area_acres)} · {capitalize(farm.ownership)}{!farm.is_active && <span className="ml-2 text-xs text-amber-700">Not in use</span>}</p>
                </div>
                <button aria-label={`Edit ${farm.name}`} onClick={() => setEditing(farm)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-stone-500 hover:bg-stone-100">
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                {farm.location && (
                  <div className="col-span-2 flex items-center gap-1 text-stone-600"><MapPin className="h-4 w-4 shrink-0" /><span className="truncate">{farm.location}</span></div>
                )}
                <div><dt className="text-xs text-stone-500">Survey no.</dt><dd className="truncate">{farm.survey_no ?? '—'}</dd></div>
                <div><dt className="text-xs text-stone-500">Water</dt><dd className="truncate">{farm.water_source ?? '—'}</dd></div>
                <div className="col-span-2"><dt className="text-xs text-stone-500">Soil</dt><dd className="truncate">{farm.soil_type ?? '—'}</dd></div>
              </dl>
              <div className="mt-4"><MoneyTiles expense={totals[farm.id]?.expense ?? 0} income={totals[farm.id]?.income ?? 0} suffix={`(${year})`} /></div>
              <Link to={`/farm/${farm.id}/entries`} className="mt-3 flex min-h-11 items-center justify-center rounded-lg border border-stone-300 text-sm font-medium text-green-800 hover:bg-green-50">
                Farm expenses & income →
              </Link>
            </li>
          ))}
        </ul>
        </>
      )}
      {editing && <FarmForm farm={editing === 'new' ? null : editing} onClose={close} onSaved={saved} />}
    </>
  )
}
