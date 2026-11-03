import { useState, type FormEvent } from 'react'
import Sheet from '../../components/ui/Sheet'
import { Button, ErrorText, Field, FormGrid, NumberInput, Select, TextInput, toNumberOrNull, toTextOrNull } from '../../components/ui/form'
import { capitalize, formatAcres } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { CROP_STATUSES, SEASONS, type Crop, type Farm } from '../../types/domain'
import { dbMessage } from '../farms/data'

export default function CropForm({
  crop,
  farms,
  knownNames,
  onClose,
  onSaved,
}: {
  crop: Crop | null
  farms: Farm[]
  knownNames: string[]
  onClose: () => void
  onSaved: (id: string) => void
}) {
  const firstFarm = farms[0]
  const isCustomSeason = crop ? !(SEASONS as readonly string[]).includes(crop.season) : false
  const [f, setF] = useState({
    farm_id: crop?.farm_id ?? firstFarm?.id ?? '',
    crop_name: crop?.crop_name ?? 'Paddy',
    variety: crop?.variety ?? '',
    season: isCustomSeason ? 'custom' : (crop?.season ?? 'Samba'),
    custom_season: isCustomSeason ? (crop?.season ?? '') : '',
    season_year: (crop?.season_year ?? new Date().getFullYear()).toString(),
    area_acres: crop?.area_acres?.toString() ?? firstFarm?.area_acres?.toString() ?? '',
    sowing_date: crop?.sowing_date ?? '',
    status: crop?.status ?? 'active',
    harvest_date: crop?.harvest_date ?? '',
    gross_yield_qtl: crop?.gross_yield_qtl?.toString() ?? '',
    moisture_loss_pct: (crop?.moisture_loss_pct ?? 5).toString(),
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  type K = keyof typeof f
  const set = (k: K) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  const farm = farms.find((x) => x.id === f.farm_id)
  const gross = toNumberOrNull(f.gross_yield_qtl)
  const moisture = toNumberOrNull(f.moisture_loss_pct) ?? 0
  const netYield = gross == null ? null : Math.round(gross * (1 - moisture / 100) * 100) / 100

  async function save(e?: FormEvent) {
    e?.preventDefault()
    const acres = toNumberOrNull(f.area_acres)
    const year = toNumberOrNull(f.season_year)
    const season = f.season === 'custom' ? f.custom_season.trim() : f.season
    if (!f.farm_id) return setError('Add a farm first.')
    if (!f.crop_name.trim()) return setError('Enter the crop name.')
    if (!season) return setError('Enter the season name.')
    if (!year || year < 2000 || year > 2100) return setError('Enter a valid year.')
    if (!acres || acres <= 0) return setError('Enter the crop area in acres.')
    setBusy(true)
    const row = {
      farm_id: f.farm_id,
      crop_name: f.crop_name.trim(),
      variety: toTextOrNull(f.variety),
      season,
      season_year: year,
      area_acres: acres,
      sowing_date: toTextOrNull(f.sowing_date),
      status: f.status as Crop['status'],
      harvest_date: toTextOrNull(f.harvest_date),
      gross_yield_qtl: gross,
      moisture_loss_pct: moisture,
    }
    const res = crop
      ? await supabase.from('crops').update(row).eq('id', crop.id).select('id').single()
      : await supabase.from('crops').insert(row).select('id').single()
    setBusy(false)
    if (res.error) return setError(dbMessage(res.error.message))
    onSaved(res.data.id)
  }

  async function remove() {
    if (!crop || !window.confirm(`Delete "${crop.crop_name}" (${crop.season} ${crop.season_year}) with its stages and tasks?`)) return
    setBusy(true)
    const { error } = await supabase.from('crops').delete().eq('id', crop.id)
    setBusy(false)
    if (error) return setError(dbMessage(error.message))
    onSaved('')
  }

  return (
    <Sheet
      open
      title={crop ? 'Edit crop' : 'Add crop'}
      onClose={onClose}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          {crop ? <Button tone="danger" onClick={remove} disabled={busy}>Delete</Button> : <span />}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button tone="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={() => save()} disabled={busy}>{busy ? 'Saving…' : 'Save crop'}</Button>
          </div>
        </div>
      }
    >
      <form onSubmit={save} className="space-y-4">
        <FormGrid>
          <Field label="Crop *" hint={!crop ? 'Paddy gets the paddy checklist as tasks.' : undefined}>
            <TextInput list="crop-names" value={f.crop_name} onChange={set('crop_name')} />
            <datalist id="crop-names">
              {knownNames.map((n) => <option key={n} value={n} />)}
            </datalist>
          </Field>
          <Field label="Variety"><TextInput value={f.variety} onChange={set('variety')} placeholder="e.g. White Ponni" /></Field>
          <Field label="Season *">
            <Select value={f.season} onChange={set('season')}>
              {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
              <option value="custom">Other…</option>
            </Select>
          </Field>
          {f.season === 'custom' && <Field label="Season name *"><TextInput value={f.custom_season} onChange={set('custom_season')} /></Field>}
          <Field label="Year *"><NumberInput inputMode="numeric" value={f.season_year} onChange={set('season_year')} /></Field>
          <Field label="Farm *">
            <Select value={f.farm_id} onChange={set('farm_id')}>
              {farms.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </Select>
          </Field>
          <Field label="Area (acres) *" hint={farm ? `Farm size: ${formatAcres(farm.area_acres)}. Used for all per-acre figures.` : undefined}>
            <NumberInput value={f.area_acres} onChange={set('area_acres')} />
          </Field>
          <Field label="Sowing date" hint="Used for crop age."><TextInput type="date" value={f.sowing_date} onChange={set('sowing_date')} /></Field>
          <Field label="Status">
            <Select value={f.status} onChange={set('status')}>
              {CROP_STATUSES.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
            </Select>
          </Field>
        </FormGrid>

        {crop && (
          <fieldset className="rounded-xl border border-stone-200 p-4">
            <legend className="px-1 text-sm font-semibold text-stone-800">Harvest</legend>
            <FormGrid>
              <Field label="Harvest date"><TextInput type="date" value={f.harvest_date} onChange={set('harvest_date')} /></Field>
              <Field label="Gross yield (quintal)"><NumberInput value={f.gross_yield_qtl} onChange={set('gross_yield_qtl')} /></Field>
              <Field label="Moisture loss (%)"><NumberInput value={f.moisture_loss_pct} onChange={set('moisture_loss_pct')} /></Field>
              <div className="self-end rounded-lg bg-green-50 px-3 py-2 text-sm text-green-900">
                Net yield: <strong>{netYield == null ? '—' : `${netYield} qtl`}</strong>
              </div>
            </FormGrid>
          </fieldset>
        )}
        <ErrorText>{error}</ErrorText>
        <button type="submit" hidden />
      </form>
    </Sheet>
  )
}
