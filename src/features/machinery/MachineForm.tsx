import { useState, type FormEvent } from 'react'
import Sheet from '../../components/ui/Sheet'
import { Button, ErrorText, Field, FormGrid, NumberInput, Select, TextInput, toNumberOrNull, toTextOrNull } from '../../components/ui/form'
import { capitalize } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { MACHINE_TYPES, type Farm, type Machine } from '../../types/domain'
import { dbMessage } from '../farms/data'

export default function MachineForm({ machine, farms, onClose, onSaved }: { machine: Machine | null; farms: Farm[]; onClose: () => void; onSaved: () => void }) {
  // Farm picker: farms in use, plus the machine's saved farm.
  const farmOptions = farms.filter((x) => x.is_active || x.id === machine?.farm_id)
  const [f, setF] = useState({
    farm_id: machine?.farm_id ?? farmOptions[0]?.id ?? '',
    name: machine?.name ?? '',
    type: machine?.type ?? 'tractor',
    purchase_date: machine?.purchase_date ?? '',
    purchase_cost: machine?.purchase_cost?.toString() ?? '',
    is_active: machine?.is_active ?? true,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k: 'farm_id' | 'name' | 'type' | 'purchase_date' | 'purchase_cost') => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  async function save(e?: FormEvent) {
    e?.preventDefault()
    if (!f.farm_id) return setError('Add a farm first.')
    if (!f.name.trim()) return setError('Enter the machine name.')
    setBusy(true)
    const row = {
      farm_id: f.farm_id,
      name: f.name.trim(),
      type: f.type as Machine['type'],
      purchase_date: toTextOrNull(f.purchase_date),
      purchase_cost: toNumberOrNull(f.purchase_cost),
      is_active: f.is_active,
    }
    const { error } = machine ? await supabase.from('machinery').update(row).eq('id', machine.id) : await supabase.from('machinery').insert(row)
    setBusy(false)
    if (error) return setError(dbMessage(error.message))
    onSaved()
  }

  async function remove() {
    if (!machine || !window.confirm(`Delete "${machine.name}"?`)) return
    setBusy(true)
    const { error } = await supabase.from('machinery').delete().eq('id', machine.id)
    setBusy(false)
    if (error) return setError(dbMessage(error.message))
    onSaved()
  }

  return (
    <Sheet
      open
      title={machine ? 'Edit machine' : 'Add machine'}
      onClose={onClose}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          {machine ? <Button tone="danger" onClick={remove} disabled={busy}>Delete</Button> : <span />}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button tone="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={() => save()} disabled={busy}>{busy ? 'Saving…' : 'Save machine'}</Button>
          </div>
        </div>
      }
    >
      <form onSubmit={save} className="space-y-4">
        <FormGrid>
          <Field label="Name *"><TextInput value={f.name} onChange={set('name')} placeholder="e.g. Power tiller" /></Field>
          <Field label="Type">
            <Select value={f.type} onChange={set('type')}>
              {MACHINE_TYPES.map((t) => <option key={t} value={t}>{capitalize(t)}</option>)}
            </Select>
          </Field>
          <Field label="Farm *">
            <Select value={f.farm_id} onChange={set('farm_id')}>
              {farmOptions.map((farm) => <option key={farm.id} value={farm.id}>{farm.name}</option>)}
            </Select>
          </Field>
          <Field label="Purchase date"><TextInput type="date" value={f.purchase_date} onChange={set('purchase_date')} /></Field>
          <Field label="Purchase cost (₹)" hint="Add the payment itself as a machinery expense later.">
            <NumberInput value={f.purchase_cost} onChange={set('purchase_cost')} />
          </Field>
          <label className="flex min-h-11 items-center gap-3 self-end">
            <input type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} className="h-5 w-5 accent-green-700" />
            <span className="text-sm text-stone-700">In use</span>
          </label>
        </FormGrid>
        <ErrorText>{error}</ErrorText>
        <button type="submit" hidden />
      </form>
    </Sheet>
  )
}
