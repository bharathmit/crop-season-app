import { useEffect, useState } from 'react'
import Sheet from '../../components/ui/Sheet'
import { Button, ErrorText, Field, FormGrid, Select, TextInput, toTextOrNull } from '../../components/ui/form'
import { supabase } from '../../lib/supabase'
import type { Scope } from '../../types/domain'
import { useCropStages } from '../crops/data'
import { dbMessage } from '../farms/data'
import { useEntryLookups } from '../transactions/data'
import type { TaskRow } from './data'

export type TaskStart = { scope?: Scope; cropId?: string; stageId?: string; farmId?: string; machineId?: string }

// Add or edit a task on a crop stage, a farm or a machine.
export default function TaskForm({ task, start = {}, onClose, onSaved }: { task?: TaskRow | null; start?: TaskStart; onClose: () => void; onSaved: () => void }) {
  const lookups = useEntryLookups()
  const L = lookups.data
  const [scope, setScope] = useState<Scope>(task?.scope ?? start.scope ?? 'crop')
  const [cropId, setCropId] = useState(task?.crop_id ?? start.cropId ?? '')
  const [stageId, setStageId] = useState(task?.crop_stage_id ?? start.stageId ?? '')
  const [farmId, setFarmId] = useState(task?.farm_id ?? start.farmId ?? '')
  const [machineId, setMachineId] = useState(task?.machinery_id ?? start.machineId ?? '')
  const [title, setTitle] = useState(task?.title ?? '')
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [due, setDue] = useState(task?.due_date ?? '')
  const [done, setDone] = useState(task?.status === 'done')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const stages = useCropStages(scope === 'crop' ? cropId : undefined)

  useEffect(() => {
    if (!L) return
    if (!cropId && L.crops[0]) setCropId(L.crops[0].id)
    if (!farmId && L.farms[0]) setFarmId(L.farms[0].id)
    if (!machineId && L.machines[0]) setMachineId(L.machines[0].id)
  }, [L]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (scope !== 'crop' || !stages.data) return
    if (!stages.data.some((s) => s.id === stageId)) {
      const crop = L?.crops.find((c) => c.id === cropId)
      setStageId(crop?.current_stage_id ?? stages.data[0]?.id ?? '')
    }
  }, [stages.data]) // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    setError('')
    if (!title.trim()) return setError('Enter what needs to be done.')
    if (scope === 'crop' && (!cropId || !stageId)) return setError('Pick the crop and stage.')
    if (scope === 'machinery' && !machineId) return setError('Add a machine first.')
    if (scope === 'farm' && !farmId) return setError('Add a farm first.')
    const crop = L?.crops.find((c) => c.id === cropId)
    const machine = L?.machines.find((m) => m.id === machineId)
    const row = {
      scope,
      farm_id: scope === 'crop' ? crop!.farm_id : scope === 'machinery' ? machine!.farm_id : farmId,
      crop_id: scope === 'crop' ? cropId : null,
      crop_stage_id: scope === 'crop' ? stageId : null,
      machinery_id: scope === 'machinery' ? machineId : null,
      title: title.trim(),
      notes: toTextOrNull(notes),
      due_date: toTextOrNull(due),
      status: done ? 'done' : 'open',
    }
    setBusy(true)
    const { error } = task ? await supabase.from('tasks').update(row).eq('id', task.id) : await supabase.from('tasks').insert(row)
    setBusy(false)
    if (error) return setError(dbMessage(error.message))
    onSaved()
    onClose()
  }

  async function remove() {
    if (!task || !window.confirm('Delete this task?')) return
    setBusy(true)
    const { error } = await supabase.from('tasks').delete().eq('id', task.id)
    setBusy(false)
    if (error) return setError(dbMessage(error.message))
    onSaved()
    onClose()
  }

  const scopes: { key: Scope; label: string }[] = [{ key: 'crop', label: 'Crop stage' }, { key: 'farm', label: 'Farm' }, { key: 'machinery', label: 'Machine' }]

  return (
    <Sheet
      open
      title={task ? 'Edit task' : 'Add task'}
      onClose={onClose}
      footer={
        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-between">
          {task ? <Button tone="danger" onClick={remove} disabled={busy}>Delete</Button> : <span className="hidden sm:block" />}
          <div className={`flex gap-2 ${task ? '' : 'col-span-2'}`}>
            <span className="hidden sm:inline-flex"><Button tone="secondary" onClick={onClose}>Cancel</Button></span>
            <Button className="flex-1 sm:flex-none" onClick={save} disabled={busy || !L}>{busy ? 'Saving…' : 'Save task'}</Button>
          </div>
        </div>
      }
    >
      {!L ? (
        <p className="text-sm text-stone-500">{lookups.error ?? 'Loading…'}</p>
      ) : (
        <div className="space-y-4">
          <div role="radiogroup" aria-label="Task for" className="grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1">
            {scopes.map((s) => (
              <button key={s.key} role="radio" aria-checked={scope === s.key} onClick={() => setScope(s.key)} className={`min-h-11 rounded-lg text-sm font-medium ${scope === s.key ? 'bg-white text-green-800 shadow-sm' : 'text-stone-600'}`}>
                {s.label}
              </button>
            ))}
          </div>
          <FormGrid>
            {scope === 'crop' && (
              <>
                <Field label="Crop *">
                  <Select value={cropId} onChange={(e) => setCropId(e.target.value)}>
                    {L.crops.map((c) => <option key={c.id} value={c.id}>{c.crop_name}{c.variety ? ` (${c.variety})` : ''} · {c.season} {c.season_year}</option>)}
                  </Select>
                </Field>
                <Field label="Stage *">
                  <Select value={stageId} onChange={(e) => setStageId(e.target.value)}>
                    {(stages.data ?? []).filter((s) => s.is_active || s.id === stageId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                </Field>
              </>
            )}
            {scope === 'farm' && (
              <Field label="Farm *">
                <Select value={farmId} onChange={(e) => setFarmId(e.target.value)}>
                  {L.farms.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </Select>
              </Field>
            )}
            {scope === 'machinery' && (
              <Field label="Machine *">
                <Select value={machineId} onChange={(e) => setMachineId(e.target.value)}>
                  {L.machines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </Select>
              </Field>
            )}
            <Field label="Task *" className="md:col-span-2"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Book transplanting labour" /></Field>
            <Field label="Due date"><TextInput type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
            <label className="flex min-h-11 items-center gap-3 self-end">
              <input type="checkbox" checked={done} onChange={(e) => setDone(e.target.checked)} className="h-5 w-5 accent-green-700" />
              <span className="text-sm text-stone-700">Done</span>
            </label>
            <Field label="Notes" className="md:col-span-2"><TextInput value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          </FormGrid>
          <ErrorText>{error}</ErrorText>
        </div>
      )}
    </Sheet>
  )
}
