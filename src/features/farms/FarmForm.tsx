import { useState, type FormEvent } from 'react'
import Sheet from '../../components/ui/Sheet'
import { Button, ErrorText, Field, FormGrid, NumberInput, Select, TextInput, toNumberOrNull, toTextOrNull } from '../../components/ui/form'
import { supabase } from '../../lib/supabase'
import type { Farm } from '../../types/domain'
import { dbMessage } from './data'

export default function FarmForm({ farm, onClose, onSaved }: { farm: Farm | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    name: farm?.name ?? '',
    location: farm?.location ?? '',
    survey_no: farm?.survey_no ?? '',
    area_acres: farm?.area_acres?.toString() ?? '',
    ownership: farm?.ownership ?? 'owned',
    soil_type: farm?.soil_type ?? '',
    water_source: farm?.water_source ?? '',
    is_active: farm?.is_active ?? true,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k: Exclude<keyof typeof f, 'is_active'>) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  async function save(e?: FormEvent) {
    e?.preventDefault()
    const acres = toNumberOrNull(f.area_acres)
    if (!f.name.trim()) return setError('Enter the farm name.')
    if (!acres || acres <= 0) return setError('Enter the area in acres (more than 0).')
    setBusy(true)
    const row = {
      name: f.name.trim(),
      location: toTextOrNull(f.location),
      survey_no: toTextOrNull(f.survey_no),
      area_acres: acres,
      ownership: f.ownership as Farm['ownership'],
      soil_type: toTextOrNull(f.soil_type),
      water_source: toTextOrNull(f.water_source),
      is_active: f.is_active,
    }
    const { error } = farm ? await supabase.from('farms').update(row).eq('id', farm.id) : await supabase.from('farms').insert(row)
    setBusy(false)
    if (error) return setError(dbMessage(error.message))
    onSaved()
  }

  async function remove() {
    if (!farm || !window.confirm(`Delete farm "${farm.name}"?`)) return
    setBusy(true)
    const { error } = await supabase.from('farms').delete().eq('id', farm.id)
    setBusy(false)
    if (error) return setError(dbMessage(error.message))
    onSaved()
  }

  return (
    <Sheet
      open
      title={farm ? 'Edit farm' : 'Add farm'}
      onClose={onClose}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          {farm ? <Button tone="danger" onClick={remove} disabled={busy}>Delete</Button> : <span />}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button tone="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={() => save()} disabled={busy}>{busy ? 'Saving…' : 'Save farm'}</Button>
          </div>
        </div>
      }
    >
      <form onSubmit={save} className="space-y-4">
        <FormGrid>
          <Field label="Farm name *"><TextInput value={f.name} onChange={set('name')} placeholder="e.g. Sorathur farm" /></Field>
          <Field label="Area (acres) *"><NumberInput value={f.area_acres} onChange={set('area_acres')} placeholder="e.g. 10" /></Field>
          <Field label="Location"><TextInput value={f.location} onChange={set('location')} placeholder="Village, taluk" /></Field>
          <Field label="Survey no."><TextInput value={f.survey_no} onChange={set('survey_no')} /></Field>
          <Field label="Ownership">
            <Select value={f.ownership} onChange={set('ownership')}>
              <option value="owned">Owned</option>
              <option value="leased">Leased</option>
            </Select>
          </Field>
          <Field label="Water source"><TextInput value={f.water_source} onChange={set('water_source')} placeholder="Borewell, canal, tank" /></Field>
          <Field label="Soil type"><TextInput value={f.soil_type} onChange={set('soil_type')} placeholder="e.g. Clay loam" /></Field>
          <label className="flex min-h-11 items-center gap-3 self-end">
            <input type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} className="h-5 w-5 accent-green-700" />
            <span className="text-sm text-stone-700">In use (untick to hide it on the Farm page)</span>
          </label>
        </FormGrid>
        <ErrorText>{error}</ErrorText>
        <button type="submit" hidden />
      </form>
    </Sheet>
  )
}
