import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import Chips from '../../components/ui/Chips'
import EmptyState, { PageHeader } from '../../components/ui/EmptyState'
import { Button, ErrorText } from '../../components/ui/form'
import { capitalize, formatDate, formatINR } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { useRows } from '../../lib/useRows'
import { MACHINE_TYPES, type Machine } from '../../types/domain'
import { useFarms } from '../farms/data'
import MachineForm from './MachineForm'

export default function MachineryPage() {
  const farms = useFarms()
  const machines = useRows<Machine[]>(() => supabase.from('machinery').select('*').order('name'), [])
  const [params, setParams] = useSearchParams()
  const [type, setType] = useState('all')
  const [editing, setEditing] = useState<Machine | null>(null)
  const adding = params.get('new') === '1'

  const list = machines.data ?? []
  const farmName = (id: string) => farms.data?.find((f) => f.id === id)?.name ?? ''
  const chips = useMemo(
    () => [
      { key: 'all', label: 'All', count: list.length },
      ...MACHINE_TYPES.filter((t) => t === 'other' || list.some((m) => m.type === t) || ['tractor', 'power tiller'].includes(t)).map((t) => ({
        key: t,
        label: capitalize(t),
        count: list.filter((m) => m.type === t).length,
      })),
    ],
    [list],
  )
  const shown = type === 'all' ? list : list.filter((m) => m.type === type)

  const openNew = () => setParams({ new: '1' })
  const close = () => {
    setEditing(null)
    if (adding) setParams({})
  }
  const saved = () => {
    close()
    machines.reload()
  }

  const noFarm = !farms.loading && !farms.data?.length

  return (
    <>
      <PageHeader
        subtitle="Owned machines. Their fuel, repairs and hire-out income count in overall profit."
        action={!noFarm && <Button onClick={openNew}><Plus className="h-4 w-4" />Add machine</Button>}
      />
      <ErrorText>{machines.error ?? farms.error}</ErrorText>
      {noFarm ? (
        <EmptyState title="Add a farm first" text="Every machine belongs to a farm." action={<Link to="/farm" className="font-medium text-green-800">Go to Farm →</Link>} />
      ) : machines.loading ? (
        <p className="text-sm text-stone-500">Loading…</p>
      ) : !list.length ? (
        <EmptyState title="No machines yet" text="Add your tractor, power tiller, sprayer or pump set." action={<Button onClick={openNew}><Plus className="h-4 w-4" />Add machine</Button>} />
      ) : (
        <>
          <div className="mb-4"><Chips label="Machine type" chips={chips} value={type} onChange={setType} /></div>

          {/* Phone: cards */}
          <ul className="space-y-3 md:hidden">
            {shown.map((m) => (
              <li key={m.id}>
                <button onClick={() => setEditing(m)} className="w-full rounded-2xl border border-stone-200 bg-white p-4 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold">{m.name}</span>
                    <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">{capitalize(m.type)}</span>
                  </div>
                  <p className="mt-1 text-sm text-stone-600">{farmName(m.farm_id)} · Bought {formatDate(m.purchase_date)}</p>
                  {!m.is_active && <p className="mt-1 text-xs text-amber-700">Not in use</p>}
                </button>
              </li>
            ))}
          </ul>

          {/* Tablet / desktop: table */}
          <div className="hidden overflow-hidden rounded-2xl border border-stone-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-stone-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Farm</th>
                  <th className="px-4 py-3 font-medium">Purchase date</th>
                  <th className="px-4 py-3 text-right font-medium">Purchase cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {shown.map((m) => (
                  <tr key={m.id} onClick={() => setEditing(m)} className="cursor-pointer hover:bg-stone-50">
                    <td className="px-4 py-3 font-medium">{m.name}{!m.is_active && <span className="ml-2 text-xs text-amber-700">Not in use</span>}</td>
                    <td className="px-4 py-3">{capitalize(m.type)}</td>
                    <td className="px-4 py-3">{farmName(m.farm_id)}</td>
                    <td className="px-4 py-3">{formatDate(m.purchase_date)}</td>
                    <td className="px-4 py-3 text-right">{m.purchase_cost == null ? '—' : formatINR(m.purchase_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {(adding || editing) && farms.data && (
        <MachineForm machine={editing} farms={farms.data} onClose={close} onSaved={saved} />
      )}
    </>
  )
}
