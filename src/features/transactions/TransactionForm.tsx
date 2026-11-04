import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Camera, Paperclip } from 'lucide-react'
import AmountWithPerAcre from '../../components/AmountWithPerAcre'
import Sheet from '../../components/ui/Sheet'
import { Button, ErrorText, Field, FormGrid, NumberInput, Select, TextInput, toNumberOrNull, toTextOrNull } from '../../components/ui/form'
import { formatAcres, formatINR, todayISO } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../app/auth'
import { UNITS, type CropStage, type EntryType, type Scope, type Transaction } from '../../types/domain'
import { dbMessage } from '../farms/data'
import { useEntryLookups } from './data'
import { isOthersStage, useCropStages } from '../crops/data'

export type EntryStart = {
  entryType: EntryType
  scope?: Scope
  cropId?: string
  stageId?: string
  farmId?: string
  machineId?: string
  locked?: boolean // opened from a crop / farm / machine page: hide the type and scope toggles
}

const NEW_ITEM = '__new__'
const OTHERS = '__others__'

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { key: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-stone-100 p-1">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={value === o.key}
          onClick={() => onChange(o.key)}
          className={`min-h-11 rounded-lg px-3 text-sm font-medium ${value === o.key ? 'bg-white text-green-800 shadow-sm' : 'text-stone-600'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// Add or edit one expense / income for a crop (with stage), farm or machine.
export default function TransactionForm({ start, tx, onClose, onSaved }: { start: EntryStart; tx?: Transaction | null; onClose: () => void; onSaved: () => void }) {
  const lookups = useEntryLookups()
  const { session } = useAuth()
  const L = lookups.data

  const [entryType, setEntryType] = useState<EntryType>(tx?.entry_type ?? start.entryType)
  const [scope, setScope] = useState<Scope>(tx?.scope ?? start.scope ?? 'crop')
  const [cropId, setCropId] = useState(tx?.crop_id ?? start.cropId ?? '')
  const [stageId, setStageId] = useState(tx?.crop_stage_id ?? start.stageId ?? '')
  const [farmId, setFarmId] = useState(tx?.farm_id ?? start.farmId ?? '')
  const [machineId, setMachineId] = useState(tx?.machinery_id ?? start.machineId ?? '')
  const [categoryId, setCategoryId] = useState('')
  const [itemId, setItemId] = useState(tx?.item_id ?? '')
  const [newItem, setNewItem] = useState('')
  const [f, setF] = useState({
    quantity: tx?.quantity?.toString() ?? '',
    unit: tx?.unit ?? '',
    rate: tx?.rate?.toString() ?? '',
    amount: tx?.amount?.toString() ?? '',
    govt_support: tx?.govt_support ? tx.govt_support.toString() : '',
    start_date: tx?.start_date ?? todayISO(),
    end_date: tx?.end_date ?? '',
    party: tx?.party ?? '',
    invoice_no: tx?.invoice_no ?? '',
    paid_by: tx?.paid_by ?? '',
    paid_on: tx?.paid_on ?? '',
    remarks: tx?.remarks ?? '',
  })
  const [amountTouched, setAmountTouched] = useState(Boolean(tx))
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }))

  const stages = useCropStages(scope === 'crop' ? cropId : undefined)
  const activeStages: CropStage[] = (stages.data ?? []).filter((s) => s.is_active || s.id === stageId)
  // "Others" (not tied to a stage) is listed last; created on the crop the first time it is used.
  const othersStage = activeStages.find((s) => isOthersStage(s.name))
  const orderedStages = [...activeStages.filter((s) => !isOthersStage(s.name)), ...(othersStage ? [othersStage] : [])]

  // Defaults once lookups arrive: first crop / farm / machine.
  useEffect(() => {
    if (!L) return
    if (!cropId && L.crops[0]) setCropId(L.crops[0].id)
    const firstFarm = L.farms.find((x) => x.is_active) ?? L.farms[0]
    if (!farmId && firstFarm) setFarmId(firstFarm.id)
    if (!machineId && L.machines[0]) setMachineId(L.machines[0].id)
    if (tx && !categoryId) {
      const item = L.items.find((i) => i.id === tx.item_id)
      if (item) setCategoryId(item.category_id)
    }
  }, [L]) // eslint-disable-line react-hooks/exhaustive-deps

  const crop = L?.crops.find((c) => c.id === cropId)
  const machine = L?.machines.find((m) => m.id === machineId)
  const farm = L?.farms.find((x) => x.id === (scope === 'crop' ? crop?.farm_id : scope === 'machinery' ? machine?.farm_id : farmId))
  const acres = scope === 'crop' ? crop?.area_acres : farm?.area_acres
  // Farm picker: farms in use, plus the one already on this entry. (All farms stay in L for crop / machine lookups.)
  const farmOptions = (L?.farms ?? []).filter((x) => x.is_active || x.id === farmId)

  const categories = useMemo(() => (L?.categories ?? []).filter((c) => c.scope === scope && c.entry_type === entryType), [L, scope, entryType])
  const items = useMemo(() => (L?.items ?? []).filter((i) => i.category_id === categoryId), [L, categoryId])

  // Keep category valid for the chosen scope / type.
  useEffect(() => {
    if (!categories.length) return
    if (!categories.some((c) => c.id === categoryId)) {
      // Editing: open on the saved item's category. The lookups effect above sets it in the
      // same commit, so categoryId is still '' here — without this the saved item was cleared.
      const txCategoryId = tx && itemId === tx.item_id ? L?.items.find((i) => i.id === tx.item_id)?.category_id : undefined
      if (txCategoryId && categories.some((c) => c.id === txCategoryId)) {
        setCategoryId(txCategoryId)
        return
      }
      setCategoryId(categories[0].id)
      setItemId('')
    }
  }, [categories]) // eslint-disable-line react-hooks/exhaustive-deps

  // Stage: keep current if valid, else the crop's current stage.
  useEffect(() => {
    if (scope !== 'crop' || !stages.data) return
    if (stageId !== OTHERS && !stages.data.some((s) => s.id === stageId)) setStageId(crop?.current_stage_id ?? stages.data[0]?.id ?? '')
  }, [stages.data]) // eslint-disable-line react-hooks/exhaustive-deps

  function pickItem(id: string) {
    setItemId(id)
    const item = L?.items.find((i) => i.id === id)
    if (!item) return
    if (item.default_unit && !f.unit) setF((p) => ({ ...p, unit: item.default_unit!.toLowerCase() }))
    // Stage stays on the crop's current stage (owner 2026-11-04); the owner changes it if needed.
  }

  const qty = toNumberOrNull(f.quantity)
  const rate = toNumberOrNull(f.rate)
  const calc = qty != null && rate != null ? Math.round(qty * rate * 100) / 100 : null
  useEffect(() => {
    if (!amountTouched && calc != null) setF((p) => ({ ...p, amount: String(calc) }))
  }, [calc, amountTouched])

  const amount = toNumberOrNull(f.amount) ?? 0
  const support = toNumberOrNull(f.govt_support) ?? 0
  const net = entryType === 'expense' ? amount - support : amount + support

  async function save(again: boolean) {
    setError('')
    if (!L) return
    if (scope === 'crop' && !cropId) return setError('Add a crop first.')
    if (scope === 'crop' && !stageId) return setError('Pick a stage.')
    if (scope === 'farm' && !farmId) return setError('Add a farm first.')
    if (scope === 'machinery' && !machineId) return setError('Add a machine first.')
    if (!amount || amount <= 0) return setError('Enter the amount (or quantity × rate).')
    if (support > amount && entryType === 'expense') return setError('Subsidy cannot be more than the amount.')
    if (!f.start_date) return setError('Enter the date.')
    setBusy(true)

    let finalItemId = itemId
    if (itemId === NEW_ITEM || !itemId) {
      const name = newItem.trim()
      if (!name) {
        setBusy(false)
        return setError('Pick an item, or type a new item name.')
      }
      const r = await supabase.from('items').insert({ category_id: categoryId, name, default_unit: toTextOrNull(f.unit) }).select('id').single()
      if (r.error) {
        setBusy(false)
        return setError(dbMessage(r.error.message))
      }
      finalItemId = r.data.id
    }

    let finalStageId = stageId
    if (scope === 'crop' && stageId === OTHERS) {
      const sort = Math.max(0, ...(stages.data ?? []).map((x) => x.sort_order)) + 1
      const r = await supabase.from('crop_stages').insert({ crop_id: cropId, name: 'Others', sort_order: sort }).select('id').single()
      if (r.error) {
        setBusy(false)
        return setError(dbMessage(r.error.message))
      }
      finalStageId = r.data.id
      setStageId(finalStageId)
      stages.reload()
    }

    let bill_path = tx?.bill_path ?? null
    if (file) {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${session?.user.id}/${crypto.randomUUID()}.${ext}`
      const up = await supabase.storage.from('bills').upload(path, file, { contentType: file.type || undefined })
      if (up.error) {
        setBusy(false)
        return setError(`Bill photo upload failed: ${up.error.message}`)
      }
      bill_path = path
    }

    const row = {
      entry_type: entryType,
      scope,
      farm_id: farm?.id ?? farmId,
      crop_id: scope === 'crop' ? cropId : null,
      crop_stage_id: scope === 'crop' ? finalStageId : null,
      machinery_id: scope === 'machinery' ? machineId : null,
      item_id: finalItemId,
      start_date: f.start_date,
      end_date: toTextOrNull(f.end_date),
      quantity: qty,
      unit: toTextOrNull(f.unit),
      rate,
      amount,
      govt_support: support,
      party: toTextOrNull(f.party),
      invoice_no: toTextOrNull(f.invoice_no),
      paid_by: toTextOrNull(f.paid_by),
      paid_on: toTextOrNull(f.paid_on),
      remarks: toTextOrNull(f.remarks),
      bill_path,
    }
    const { error } = tx ? await supabase.from('transactions').update(row).eq('id', tx.id) : await supabase.from('transactions').insert(row)
    setBusy(false)
    if (error) return setError(dbMessage(error.message))
    if (newItem) lookups.reload()
    if (again) {
      setItemId('')
      setNewItem('')
      setFile(null)
      setAmountTouched(false)
      setF((p) => ({ ...p, quantity: '', rate: '', amount: '', govt_support: '', invoice_no: '', remarks: '' }))
      onSaved()
      return
    }
    onSaved()
    onClose()
  }

  async function remove() {
    if (!tx || !window.confirm('Delete this entry?')) return
    setBusy(true)
    const { error } = await supabase.from('transactions').delete().eq('id', tx.id)
    setBusy(false)
    if (error) return setError(dbMessage(error.message))
    onSaved()
    onClose()
  }

  const word = entryType === 'expense' ? 'expense' : 'income'
  const noTargets = L && ((scope === 'crop' && !L.crops.length) || (scope === 'farm' && !farmOptions.length) || (scope === 'machinery' && !L.machines.length))

  return (
    <Sheet
      open
      title={tx ? `Edit ${word}` : `Add ${word}`}
      onClose={onClose}
      footer={
        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-between">
          {tx ? <Button tone="danger" onClick={remove} disabled={busy}>Delete</Button> : <Button tone="secondary" onClick={() => save(true)} disabled={busy || !L}>Save & add more</Button>}
          <div className="contents sm:flex sm:gap-2">
            <span className="hidden sm:inline-flex"><Button tone="secondary" onClick={onClose}>Cancel</Button></span>
            <Button onClick={() => save(false)} disabled={busy || !L}>{busy ? 'Saving…' : `Save ${word}`}</Button>
          </div>
        </div>
      }
    >
      {!L ? (
        <p className="text-sm text-stone-500">{lookups.error ?? 'Loading…'}</p>
      ) : (
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); void save(false) }} className="space-y-5">
          {!start.locked && <FormGrid>
            <Segmented label="Entry type" value={entryType} onChange={setEntryType} options={[{ key: 'expense', label: 'Expense' }, { key: 'income', label: 'Income' }]} />
            <Segmented label="For" value={scope} onChange={setScope} options={[{ key: 'crop', label: 'Crop' }, { key: 'farm', label: 'Farm' }, { key: 'machinery', label: 'Machine' }]} />
          </FormGrid>}

          {noTargets ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Add a {scope === 'machinery' ? 'machine' : scope} first.</p>
          ) : (
            <>
              <FormGrid>
                {scope === 'crop' && (
                  <Field label="Crop *" hint={crop ? `${formatAcres(crop.area_acres)} · per acre uses this` : undefined}>
                    <Select value={cropId} onChange={(e) => setCropId(e.target.value)}>
                      {L.crops.map((c) => <option key={c.id} value={c.id}>{c.crop_name}{c.variety ? ` (${c.variety})` : ''} · {c.season} {c.season_year}</option>)}
                    </Select>
                  </Field>
                )}
                {scope === 'farm' && (
                  <Field label="Farm *">
                    <Select value={farmId} onChange={(e) => setFarmId(e.target.value)}>
                      {farmOptions.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                    </Select>
                  </Field>
                )}
                {scope === 'machinery' && (
                  <Field label="Machine *" hint={farm?.name}>
                    <Select value={machineId} onChange={(e) => setMachineId(e.target.value)}>
                      {L.machines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </Select>
                  </Field>
                )}
                <Field label="Date *"><TextInput type="date" value={f.start_date} onChange={set('start_date')} /></Field>
              </FormGrid>

              <FormGrid>
                {scope === 'crop' && (
                  <Field label="Stage *" hint={crop?.current_stage_id === stageId ? 'Current stage of the crop' : undefined}>
                    <Select value={stageId} onChange={(e) => setStageId(e.target.value)}>
                      {orderedStages.map((s) => <option key={s.id} value={s.id}>{s.name}{s.id === crop?.current_stage_id ? ' (current)' : ''}</option>)}
                      {!othersStage && <option value={OTHERS}>Others</option>}
                    </Select>
                  </Field>
                )}
                <Field label="Category">
                  <Select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setItemId('') }}>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </Field>
              </FormGrid>

              <FormGrid>
                <Field label="Item *" className={itemId === NEW_ITEM ? '' : 'md:col-span-2'}>
                  <Select value={itemId} onChange={(e) => pickItem(e.target.value)}>
                    <option value="">Choose item…</option>
                    {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                    <option value={NEW_ITEM}>+ New item…</option>
                  </Select>
                </Field>
                {itemId === NEW_ITEM && (
                  <Field label="New item name *"><TextInput value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Saved to this category" /></Field>
                )}
              </FormGrid>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Quantity"><NumberInput value={f.quantity} onChange={set('quantity')} /></Field>
                <Field label="Unit">
                  <Select value={f.unit} onChange={set('unit')}>
                    <option value="">—</option>
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                    {f.unit && !(UNITS as readonly string[]).includes(f.unit) && <option value={f.unit}>{f.unit}</option>}
                  </Select>
                </Field>
                <Field label="Rate (₹)"><NumberInput value={f.rate} onChange={set('rate')} /></Field>
              </div>

              <FormGrid>
                <Field label="Amount (₹) *" hint={calc != null ? `Quantity × rate = ${formatINR(calc)}` : 'Type the amount, or fill quantity × rate.'}>
                  <NumberInput value={f.amount} onChange={(e) => { setAmountTouched(true); set('amount')(e) }} />
                </Field>
                <Field label={entryType === 'expense' ? 'Govt subsidy (₹)' : 'Govt bonus (₹)'}>
                  <NumberInput value={f.govt_support} onChange={set('govt_support')} placeholder="0" />
                </Field>
              </FormGrid>

              {/* Live totals with per acre */}
              <div className="grid grid-cols-2 gap-3 rounded-2xl border border-green-200 bg-green-50 p-4" aria-live="polite">
                <div><p className="text-xs text-stone-600">Amount</p><AmountWithPerAcre amount={amount} acres={acres} size="sm" hidePerAcre={scope !== 'crop'} /></div>
                <div><p className="text-xs text-stone-600">Net {word}</p><AmountWithPerAcre amount={net} acres={acres} hidePerAcre={scope !== 'crop'} /></div>
              </div>

              <FormGrid>
                <Field label={entryType === 'expense' ? 'Supplier / source' : 'Buyer / mill'}><TextInput value={f.party} onChange={set('party')} /></Field>
                <Field label="Invoice no."><TextInput value={f.invoice_no} onChange={set('invoice_no')} /></Field>
                <Field label="Paid by"><TextInput value={f.paid_by} onChange={set('paid_by')} placeholder="e.g. Cash, UPI, Bharath" /></Field>
                {entryType === 'income' ? (
                  <Field label="Paid on"><TextInput type="date" value={f.paid_on} onChange={set('paid_on')} /></Field>
                ) : (
                  <Field label="End date" hint="For work over several days"><TextInput type="date" value={f.end_date} onChange={set('end_date')} /></Field>
                )}
                <Field label="Remarks" className="md:col-span-2"><TextInput value={f.remarks} onChange={set('remarks')} /></Field>
              </FormGrid>

              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-stone-300 px-4 py-3 text-sm text-stone-600 hover:bg-stone-50">
                {file || tx?.bill_path ? <Paperclip className="h-5 w-5 text-green-700" /> : <Camera className="h-5 w-5" />}
                <span className="min-w-0 flex-1 truncate">{file ? file.name : tx?.bill_path ? 'Bill attached · tap to replace' : 'Add bill photo (optional)'}</span>
                <input type="file" accept="image/*,application/pdf" capture="environment" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
            </>
          )}
          <ErrorText>{error}</ErrorText>
          <button type="submit" hidden />
        </form>
      )}
    </Sheet>
  )
}
