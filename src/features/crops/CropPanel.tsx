import { useState } from 'react'
import { ListChecks, Pencil, Receipt, Settings2, Wallet, Wheat } from 'lucide-react'
import AmountWithPerAcre from '../../components/AmountWithPerAcre'
import Sheet from '../../components/ui/Sheet'
import { ErrorText } from '../../components/ui/form'
import { capitalize, daysSince, formatAcres, formatDate } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { useRows } from '../../lib/useRows'
import type { Crop, Farm } from '../../types/domain'
import StageEditor from '../stages/StageEditor'
import { dbMessage } from '../farms/data'
import { useCropStages } from './data'
import TransactionForm, { type EntryStart } from '../transactions/TransactionForm'
import { EntryList, StageSpend } from '../transactions/CropEntries'
import { useCropTransactions, type TxRow } from '../transactions/data'

type Profit = { revenue: number | null; expense: number | null; profit: number | null }
type TaskCount = { status: string }

// Crop detail: full screen on phone, right side panel from md up.
export default function CropPanel({ crop, farm, onClose, onEdit, onChanged }: { crop: Crop; farm: Farm | undefined; onClose: () => void; onEdit: () => void; onChanged: () => void }) {
  const stages = useCropStages(crop.id)
  const profit = useRows<Profit>(() => supabase.from('v_crop_profit').select('revenue, expense, profit').eq('crop_id', crop.id).maybeSingle(), [crop.id])
  const tasks = useRows<TaskCount[]>(() => supabase.from('tasks').select('status').eq('crop_id', crop.id), [crop.id])
  const txs = useCropTransactions(crop.id)
  const [entry, setEntry] = useState<{ start: EntryStart; tx: TxRow | null } | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [editStages, setEditStages] = useState(false)
  const refreshMoney = () => {
    txs.reload()
    profit.reload()
    setRefreshKey((k) => k + 1)
  }
  const [error, setError] = useState('')

  const age = daysSince(crop.sowing_date)
  const open = tasks.data?.filter((t) => t.status === 'open').length ?? 0
  const done = tasks.data?.filter((t) => t.status === 'done').length ?? 0
  const active = (stages.data ?? []).filter((s) => s.is_active)

  async function setStage(id: string) {
    setError('')
    const { error } = await supabase.from('crops').update({ current_stage_id: id }).eq('id', crop.id)
    if (error) setError(dbMessage(error.message))
    else onChanged()
  }

  const tile = 'flex items-start gap-3 rounded-2xl border p-3'

  return (
    <>
      <Sheet
        open
        variant="side"
        title={`${crop.crop_name}${crop.variety ? ` · ${crop.variety}` : ''}`}
        onClose={onClose}
        headerActions={
          <button aria-label="Edit crop" onClick={onEdit} className="grid h-11 w-11 place-items-center rounded-full text-stone-500 hover:bg-stone-100">
            <Pencil className="h-4 w-4" />
          </button>
        }
      >
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl bg-stone-50 p-4 text-sm">
          <div><dt className="text-xs text-stone-500">Season</dt><dd className="font-medium">{crop.season} {crop.season_year}</dd></div>
          <div><dt className="text-xs text-stone-500">Farm</dt><dd className="truncate font-medium">{farm?.name ?? '—'}</dd></div>
          <div><dt className="text-xs text-stone-500">Area</dt><dd className="font-medium">{formatAcres(crop.area_acres)}</dd></div>
          <div><dt className="text-xs text-stone-500">Crop age</dt><dd className="font-medium">{age == null ? '—' : `${age} days`}</dd></div>
          <div><dt className="text-xs text-stone-500">Sowing date</dt><dd className="font-medium">{formatDate(crop.sowing_date)}</dd></div>
          <div><dt className="text-xs text-stone-500">Status</dt><dd className="font-medium">{capitalize(crop.status)}</dd></div>
        </dl>

        <section className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-800">Current stage</h3>
            <button onClick={() => setEditStages(true)} className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-green-800 hover:bg-green-50">
              <Settings2 className="h-4 w-4" />Edit stages
            </button>
          </div>
          <ErrorText>{error}</ErrorText>
          <div className="flex flex-wrap gap-2">
            {active.map((s) => {
              const on = s.id === crop.current_stage_id
              return (
                <button
                  key={s.id}
                  onClick={() => !on && setStage(s.id)}
                  aria-pressed={on}
                  className={`min-h-11 rounded-full border px-4 text-sm font-medium ${on ? 'border-green-700 bg-green-700 text-white' : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'}`}
                >
                  {s.name}
                </button>
              )
            })}
          </div>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3">
          <div className={`${tile} border-red-100 bg-red-50`}>
            <Receipt aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
            <div><p className="text-xs text-stone-600">Expense</p><AmountWithPerAcre amount={profit.data?.expense} acres={crop.area_acres} /></div>
          </div>
          <div className={`${tile} border-green-100 bg-green-50`}>
            <Wallet aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
            <div><p className="text-xs text-stone-600">Income</p><AmountWithPerAcre amount={profit.data?.revenue} acres={crop.area_acres} /></div>
          </div>
          <div className={`${tile} border-amber-100 bg-amber-50`}>
            <ListChecks aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div className="text-sm"><p className="text-xs text-stone-600">Tasks</p><p><strong>{open}</strong> open · <strong>{done}</strong> done</p></div>
          </div>
          <div className={`${tile} border-sky-100 bg-sky-50`}>
            <Wheat aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" />
            <div className="text-sm"><p className="text-xs text-stone-600">Net yield</p><p className="font-semibold">{crop.net_yield_qtl == null ? '—' : `${crop.net_yield_qtl} qtl`}</p></div>
          </div>
        </section>

        <div className="mt-4 rounded-2xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500">Cash profit</p>
          <AmountWithPerAcre amount={profit.data?.profit} acres={crop.area_acres} size="lg" />
        </div>

        <section className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-stone-800">Expense by stage</h3>
          <StageSpend cropId={crop.id} refreshKey={refreshKey} />
        </section>

        <section className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-stone-800">Entries</h3>
          <EntryList
            rows={txs.data ?? []}
            acres={crop.area_acres}
            onAdd={(type) => setEntry({ start: { entryType: type, scope: 'crop', cropId: crop.id, stageId: crop.current_stage_id ?? undefined }, tx: null })}
            onOpen={(tx) => setEntry({ start: { entryType: tx.entry_type, scope: 'crop', cropId: crop.id }, tx })}
          />
        </section>
      </Sheet>

      {entry && (
        <TransactionForm start={entry.start} tx={entry.tx} onClose={() => setEntry(null)} onSaved={refreshMoney} />
      )}
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
    </>
  )
}
