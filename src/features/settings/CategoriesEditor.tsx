import { useState } from 'react'
import { ChevronDown, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import { Button, ErrorText, Select, TextInput } from '../../components/ui/form'
import { supabase } from '../../lib/supabase'
import { useRows } from '../../lib/useRows'
import { DEFAULT_STAGES, UNITS, type Category, type EntryType, type Item, type Scope } from '../../types/domain'
import { dbMessage } from '../farms/data'

const iconBtn = 'grid h-11 w-11 shrink-0 place-items-center rounded-full text-stone-600 hover:bg-stone-100 disabled:opacity-30'

// Edit the category and item pick lists used in expense / income entry.
export default function CategoriesEditor() {
  const [scope, setScope] = useState<Scope>('crop')
  const [type, setType] = useState<EntryType>('expense')
  const cats = useRows<Category[]>(() => supabase.from('categories').select('*').eq('scope', scope).eq('entry_type', type).order('sort_order'), [scope, type])
  const items = useRows<Item[]>(() => supabase.from('items').select('*').order('sort_order'), [])
  const [open, setOpen] = useState<string | null>(null)
  const [newCat, setNewCat] = useState('')
  const [newItem, setNewItem] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function run(op: PromiseLike<{ error: { message: string } | null }>, after: () => void) {
    setBusy(true)
    setError('')
    const { error } = await op
    setBusy(false)
    if (error) return setError(dbMessage(error.message))
    after()
  }

  const reloadAll = () => {
    cats.reload()
    items.reload()
  }

  function addCategory() {
    const name = newCat.trim()
    if (!name) return
    const sort = Math.max(0, ...(cats.data ?? []).map((c) => c.sort_order)) + 1
    void run(supabase.from('categories').insert({ scope, entry_type: type, name, sort_order: sort }), () => {
      setNewCat('')
      cats.reload()
    })
  }

  function addItem(categoryId: string) {
    const name = (newItem[categoryId] ?? '').trim()
    if (!name) return
    const sort = Math.max(0, ...(items.data ?? []).filter((i) => i.category_id === categoryId).map((i) => i.sort_order)) + 1
    void run(supabase.from('items').insert({ category_id: categoryId, name, sort_order: sort }), () => {
      setNewItem({ ...newItem, [categoryId]: '' })
      items.reload()
    })
  }

  const update = (table: 'categories' | 'items', id: string, patch: Record<string, unknown>) => run(supabase.from(table).update(patch).eq('id', id), reloadAll)
  const remove = (table: 'categories' | 'items', id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? If entries use it, hide it instead.`)) return
    void run(supabase.from(table).delete().eq('id', id), reloadAll)
  }

  const seg = (active: boolean) => `min-h-11 rounded-lg px-3 text-sm font-medium ${active ? 'bg-white text-green-800 shadow-sm' : 'text-stone-600'}`

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div role="radiogroup" aria-label="For" className="grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1">
          {([['crop', 'Crop'], ['farm', 'Farm'], ['machinery', 'Machine']] as const).map(([k, l]) => (
            <button key={k} role="radio" aria-checked={scope === k} onClick={() => { setScope(k); setOpen(null) }} className={seg(scope === k)}>{l}</button>
          ))}
        </div>
        <div role="radiogroup" aria-label="Type" className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1">
          {([['expense', 'Expense'], ['income', 'Income']] as const).map(([k, l]) => (
            <button key={k} role="radio" aria-checked={type === k} onClick={() => { setType(k); setOpen(null) }} className={seg(type === k)}>{l}</button>
          ))}
        </div>
      </div>
      <ErrorText>{error || cats.error}</ErrorText>

      <ul className="space-y-2">
        {(cats.data ?? []).map((c) => {
          const its = (items.data ?? []).filter((i) => i.category_id === c.id)
          const isOpen = open === c.id
          return (
            <li key={c.id} className={`overflow-hidden rounded-2xl border ${c.is_active ? 'border-stone-200 bg-white' : 'border-dashed border-stone-300 bg-stone-50'}`}>
              <div className="flex items-center gap-1 p-2">
                <button onClick={() => setOpen(isOpen ? null : c.id)} aria-expanded={isOpen} aria-label={`${isOpen ? 'Close' : 'Open'} ${c.name}`} className={iconBtn}>
                  <ChevronDown className={`h-4 w-4 transition ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <TextInput
                  aria-label="Category name"
                  defaultValue={c.name}
                  onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== c.name && update('categories', c.id, { name: e.target.value.trim() })}
                  className={`min-w-0 flex-1 font-medium ${c.is_active ? '' : 'text-stone-400 line-through'}`}
                />
                <span className="hidden shrink-0 px-2 text-xs text-stone-500 sm:block">{its.length} items</span>
                <button aria-label={c.is_active ? 'Hide category' : 'Show category'} disabled={busy} onClick={() => update('categories', c.id, { is_active: !c.is_active })} className={iconBtn}>
                  {c.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button aria-label="Delete category" disabled={busy} onClick={() => remove('categories', c.id, c.name)} className={`${iconBtn} text-red-600`}><Trash2 className="h-4 w-4" /></button>
              </div>

              {isOpen && (
                <div className="border-t border-stone-100 bg-stone-50 p-3">
                  <ul className="space-y-2">
                    {its.map((i) => (
                      <li key={i.id} className={`grid grid-cols-[1fr_auto_auto] items-center gap-1 rounded-xl border bg-white p-2 md:grid-cols-[1fr_10rem_8rem_auto_auto] ${i.is_active ? 'border-stone-200' : 'border-dashed border-stone-300 opacity-60'}`}>
                        <TextInput aria-label="Item name" defaultValue={i.name} onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== i.name && update('items', i.id, { name: e.target.value.trim() })} className="min-w-0" />
                        {scope === 'crop' ? (
                          <Select aria-label="Usual stage" value={i.default_stage_name ?? ''} onChange={(e) => update('items', i.id, { default_stage_name: e.target.value || null })} className="order-last col-span-3 md:order-none md:col-span-1">
                            <option value="">Usual stage: none</option>
                            {DEFAULT_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </Select>
                        ) : (
                          <span className="hidden md:block" />
                        )}
                        <Select aria-label="Default unit" value={i.default_unit?.toLowerCase() ?? ''} onChange={(e) => update('items', i.id, { default_unit: e.target.value || null })} className="order-last col-span-3 md:order-none md:col-span-1">
                          <option value="">Unit: —</option>
                          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                        </Select>
                        <button aria-label={i.is_active ? 'Hide item' : 'Show item'} disabled={busy} onClick={() => update('items', i.id, { is_active: !i.is_active })} className={iconBtn}>
                          {i.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                        <button aria-label="Delete item" disabled={busy} onClick={() => remove('items', i.id, i.name)} className={`${iconBtn} text-red-600`}><Trash2 className="h-4 w-4" /></button>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex gap-2">
                    <TextInput placeholder="New item" value={newItem[c.id] ?? ''} onChange={(e) => setNewItem({ ...newItem, [c.id]: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addItem(c.id)} />
                    <Button onClick={() => addItem(c.id)} disabled={busy || !(newItem[c.id] ?? '').trim()}><Plus className="h-4 w-4" />Item</Button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <div className="flex gap-2">
        <TextInput placeholder={`New ${scope === 'machinery' ? 'machine' : scope} ${type} category`} value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCategory()} />
        <Button onClick={addCategory} disabled={busy || !newCat.trim()}><Plus className="h-4 w-4" />Category</Button>
      </div>
      <p className="text-xs text-stone-500">Hidden categories and items keep their past entries but don't show in entry. Delete works only when nothing uses them.</p>
    </div>
  )
}
