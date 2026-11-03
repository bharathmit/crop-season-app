import { useState } from 'react'
import { MapPin, Pencil, Plus } from 'lucide-react'
import EmptyState, { PageHeader } from '../../components/ui/EmptyState'
import { Button, ErrorText } from '../../components/ui/form'
import { capitalize, formatAcres } from '../../lib/format'
import type { Farm } from '../../types/domain'
import FarmForm from './FarmForm'
import { useFarms } from './data'

export default function FarmsPage() {
  const { data: farms, error, loading, reload } = useFarms()
  const [editing, setEditing] = useState<Farm | null | 'new'>(null)

  const close = () => setEditing(null)
  const saved = () => {
    setEditing(null)
    reload()
  }

  return (
    <>
      <PageHeader
        subtitle="Your land holdings. Farm expenses and income (borewell, fencing, lease, tax) are added here next."
        action={<Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" />Add farm</Button>}
      />
      <ErrorText>{error}</ErrorText>
      {loading ? (
        <p className="text-sm text-stone-500">Loading…</p>
      ) : !farms?.length ? (
        <EmptyState
          title="Add your first farm"
          text="Crops and machines belong to a farm. Its acres are used for farm and machinery per-acre figures."
          action={<Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" />Add farm</Button>}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {farms.map((farm) => (
            <li key={farm.id} className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-stone-900">{farm.name}</h3>
                  <p className="text-sm text-stone-600">{formatAcres(farm.area_acres)} · {capitalize(farm.ownership)}</p>
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
            </li>
          ))}
        </ul>
      )}
      {editing && <FarmForm farm={editing === 'new' ? null : editing} onClose={close} onSaved={saved} />}
    </>
  )
}
