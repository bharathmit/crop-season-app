import { useState } from 'react'
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import Sheet from '../../components/ui/Sheet'
import { Button, ErrorText, TextInput } from '../../components/ui/form'
import { supabase } from '../../lib/supabase'
import type { CropStage } from '../../types/domain'
import { dbMessage } from '../farms/data'

// Add, rename, reorder, hide or delete a crop's stages.
export default function StageEditor({ cropId, stages, onClose, onChanged }: { cropId: string; stages: CropStage[]; onClose: () => void; onChanged: () => void }) {
  const [names, setNames] = useState<Record<string, string>>(() => Object.fromEntries(stages.map((s) => [s.id, s.name])))
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function run(op: PromiseLike<{ error: { message: string } | null }>) {
    setBusy(true)
    setError('')
    const { error } = await op
    setBusy(false)
    if (error) {
      setError(dbMessage(error.message))
      return false
    }
    onChanged()
    return true
  }

  async function rename(s: CropStage) {
    const name = (names[s.id] ?? '').trim()
    if (!name || name === s.name) return setNames({ ...names, [s.id]: s.name })
    const ok = await run(supabase.from('crop_stages').update({ name }).eq('id', s.id))
    if (!ok) setNames({ ...names, [s.id]: s.name })
  }

  async function move(i: number, dir: -1 | 1) {
    const a = stages[i]
    const b = stages[i + dir]
    if (!a || !b) return
    setBusy(true)
    const r1 = await supabase.from('crop_stages').update({ sort_order: b.sort_order }).eq('id', a.id)
    const r2 = await supabase.from('crop_stages').update({ sort_order: a.sort_order }).eq('id', b.id)
    setBusy(false)
    setError(r1.error || r2.error ? dbMessage((r1.error ?? r2.error)!.message) : '')
    onChanged()
  }

  async function add() {
    const name = newName.trim()
    if (!name) return
    const sort = Math.max(0, ...stages.map((s) => s.sort_order)) + 1
    if (await run(supabase.from('crop_stages').insert({ crop_id: cropId, name, sort_order: sort }))) setNewName('')
  }

  async function remove(s: CropStage) {
    if (!window.confirm(`Delete stage "${s.name}"? Its tasks are deleted too. A stage with expenses can only be hidden.`)) return
    await run(supabase.from('crop_stages').delete().eq('id', s.id))
  }

  const iconBtn = 'grid h-11 w-11 shrink-0 place-items-center rounded-full text-stone-600 hover:bg-stone-100 disabled:opacity-30'

  return (
    <Sheet open title="Edit stages" onClose={onClose} footer={<Button className="w-full sm:ml-auto sm:flex sm:w-auto" onClick={onClose}>Done</Button>}>
      <p className="mb-3 text-sm text-stone-500">Rename, reorder or hide stages for this crop. Hidden stages keep their expenses but disappear from entry.</p>
      <ErrorText>{error}</ErrorText>
      <ol className="mt-2 space-y-2">
        {stages.map((s, i) => (
          <li key={s.id} className={`flex flex-wrap items-center gap-1 rounded-xl border p-2 sm:flex-nowrap ${s.is_active ? 'border-stone-200 bg-white' : 'border-dashed border-stone-300 bg-stone-50'}`}>
            <span className="w-6 shrink-0 text-center text-sm text-stone-400">{i + 1}</span>
            <TextInput
              aria-label={`Stage ${i + 1} name`}
              value={names[s.id] ?? s.name}
              onChange={(e) => setNames({ ...names, [s.id]: e.target.value })}
              onBlur={() => rename(s)}
              className={`min-w-0 flex-1 basis-[calc(100%-2rem)] sm:basis-0 ${s.is_active ? '' : 'text-stone-400 line-through'}`}
            />
            <div className="ml-auto flex">
            <button aria-label="Move up" className={iconBtn} disabled={busy || i === 0} onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></button>
            <button aria-label="Move down" className={iconBtn} disabled={busy || i === stages.length - 1} onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></button>
            <button
              aria-label={s.is_active ? 'Hide stage' : 'Show stage'}
              className={iconBtn}
              disabled={busy}
              onClick={() => run(supabase.from('crop_stages').update({ is_active: !s.is_active }).eq('id', s.id))}
            >
              {s.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
            <button aria-label="Delete stage" className={`${iconBtn} text-red-600`} disabled={busy} onClick={() => remove(s)}><Trash2 className="h-4 w-4" /></button>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex gap-2">
        <TextInput placeholder="Add a stage, e.g. Nursery" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <Button onClick={add} disabled={busy || !newName.trim()}><Plus className="h-4 w-4" />Add</Button>
      </div>
    </Sheet>
  )
}
