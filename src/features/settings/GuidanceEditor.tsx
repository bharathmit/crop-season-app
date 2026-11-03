import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button, ErrorText, Field, Select, TextInput } from '../../components/ui/form'
import { supabase } from '../../lib/supabase'
import { useRows } from '../../lib/useRows'
import { DEFAULT_STAGES } from '../../types/domain'
import { dbMessage } from '../farms/data'

type Guidance = { id: string; crop_name: string; stage_name: string; type: 'do' | 'watch' | 'save'; text: string; sort_order: number }

const typeStyle = { do: 'bg-green-100 text-green-800', watch: 'bg-amber-100 text-amber-800', save: 'bg-sky-100 text-sky-800' }

// Stage checklist library. Copied as tasks when a new crop with this name is created.
export default function GuidanceEditor() {
  const rows = useRows<Guidance[]>(() => supabase.from('stage_guidance').select('*').order('stage_name').order('sort_order'), [])
  const cropNames = useMemo(() => Array.from(new Set(['Paddy', ...(rows.data ?? []).map((g) => g.crop_name)])), [rows.data])
  const [crop, setCrop] = useState('Paddy')
  const [newCrop, setNewCrop] = useState('')
  const [draft, setDraft] = useState({ stage: 'Preparation', type: 'do' as Guidance['type'], text: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const list = (rows.data ?? []).filter((g) => g.crop_name.toLowerCase() === crop.toLowerCase())
  const stageNames = [...DEFAULT_STAGES, ...Array.from(new Set(list.map((g) => g.stage_name))).filter((s) => !(DEFAULT_STAGES as readonly string[]).includes(s))]

  async function run(op: PromiseLike<{ error: { message: string } | null }>, after?: () => void) {
    setBusy(true)
    setError('')
    const { error } = await op
    setBusy(false)
    if (error) return setError(dbMessage(error.message))
    after?.()
    rows.reload()
  }

  function add() {
    const text = draft.text.trim()
    if (!text) return
    const sort = Math.max(0, ...list.filter((g) => g.stage_name === draft.stage).map((g) => g.sort_order)) + 1
    void run(supabase.from('stage_guidance').insert({ crop_name: crop, stage_name: draft.stage, type: draft.type, text, sort_order: sort }), () => setDraft({ ...draft, text: '' }))
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">These Do / Watch / Save lines are copied as tasks when you add a new crop with the same name. Crops you already have keep their own tasks.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Crop">
          <Select value={crop} onChange={(e) => setCrop(e.target.value)}>
            {cropNames.map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>
        </Field>
        <Field label="Start a checklist for another crop">
          <div className="flex gap-2">
            <TextInput placeholder="e.g. Groundnut" value={newCrop} onChange={(e) => setNewCrop(e.target.value)} />
            <Button tone="secondary" disabled={!newCrop.trim()} onClick={() => { setCrop(newCrop.trim()); setNewCrop('') }}>Use</Button>
          </div>
        </Field>
      </div>
      <ErrorText>{error || rows.error}</ErrorText>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {stageNames.map((stage) => {
          const lines = list.filter((g) => g.stage_name === stage)
          return (
            <section key={stage} className="rounded-2xl border border-stone-200 bg-white">
              <h3 className="border-b border-stone-100 bg-stone-50 px-4 py-2 text-sm font-semibold">{stage} <span className="font-normal text-stone-500">· {lines.length}</span></h3>
              {!lines.length ? (
                <p className="px-4 py-3 text-sm text-stone-400">No lines.</p>
              ) : (
                <ul className="divide-y divide-stone-100">
                  {lines.map((g) => (
                    <li key={g.id} className="flex flex-wrap items-center gap-2 px-3 py-2 sm:flex-nowrap">
                      <TextInput aria-label="Guidance text" defaultValue={g.text} onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== g.text && run(supabase.from('stage_guidance').update({ text: e.target.value.trim() }).eq('id', g.id))} className="min-w-0 basis-full sm:order-2 sm:basis-0 sm:flex-1" />
                      <div className="w-28 shrink-0 sm:order-1">
                        <Select aria-label="Type" value={g.type} onChange={(e) => run(supabase.from('stage_guidance').update({ type: e.target.value }).eq('id', g.id))} className={`text-xs font-medium uppercase ${typeStyle[g.type]}`}>
                          <option value="do">Do</option>
                          <option value="watch">Watch</option>
                          <option value="save">Save</option>
                        </Select>
                      </div>
                      <button aria-label="Delete line" disabled={busy} onClick={() => window.confirm('Delete this line?') && run(supabase.from('stage_guidance').delete().eq('id', g.id))} className="ml-auto grid h-11 w-11 shrink-0 place-items-center rounded-full text-red-600 hover:bg-red-50 sm:order-3"><Trash2 className="h-4 w-4" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold">Add a line for {crop}</h3>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-[10rem_8rem_1fr_auto]">
          <Select aria-label="Stage" value={draft.stage} onChange={(e) => setDraft({ ...draft, stage: e.target.value })}>
            {stageNames.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select aria-label="Type" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as Guidance['type'] })}>
            <option value="do">Do</option>
            <option value="watch">Watch</option>
            <option value="save">Save</option>
          </Select>
          <TextInput className="col-span-2 md:col-span-1" placeholder="e.g. Apply neem cake before sowing" value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <Button className="col-span-2 md:col-span-1" onClick={add} disabled={busy || !draft.text.trim()}><Plus className="h-4 w-4" />Add</Button>
        </div>
      </div>
    </div>
  )
}
