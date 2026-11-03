import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Paperclip, Plus } from 'lucide-react'
import AmountWithPerAcre from '../../components/AmountWithPerAcre'
import Chips from '../../components/ui/Chips'
import PeriodFilter from '../../components/PeriodFilter'
import EmptyState from '../../components/ui/EmptyState'
import { Button, ErrorText, Select } from '../../components/ui/form'
import { formatAcres, formatDate, formatINR } from '../../lib/format'
import { perAcre } from '../../lib/perAcre'
import { inRange, usePeriod } from '../../lib/period'
import { supabase } from '../../lib/supabase'
import { useRows } from '../../lib/useRows'
import type { EntryType, Scope } from '../../types/domain'
import TransactionForm, { type EntryStart } from './TransactionForm'
import { openBill, TX_SELECT, type TxRow } from './data'

type Target = { name: string; acres: number; back: string; sub: string }

function useTarget(scope: Scope, id: string) {
  return useRows<Target>(async () => {
    if (scope === 'crop') {
      const r = await supabase.from('crops').select('crop_name, variety, season, season_year, area_acres').eq('id', id).single()
      if (r.error) return { data: null, error: r.error }
      const c = r.data
      return { data: { name: `${c.crop_name}${c.variety ? ` · ${c.variety}` : ''}`, acres: c.area_acres, back: `/crops/${id}`, sub: `${c.season} ${c.season_year} · ${formatAcres(c.area_acres)}` }, error: null }
    }
    if (scope === 'farm') {
      const r = await supabase.from('farms').select('name, area_acres').eq('id', id).single()
      if (r.error) return { data: null, error: r.error }
      return { data: { name: r.data.name, acres: r.data.area_acres, back: '/farm', sub: 'Farm entries' }, error: null }
    }
    const r = await supabase.from('machinery').select('name, farm:farms(name, area_acres)').eq('id', id).single<{ name: string; farm: { name: string; area_acres: number } | null }>()
    if (r.error) return { data: null, error: r.error }
    const acres = r.data.farm?.area_acres ?? 0
    return { data: { name: r.data.name, acres, back: '/machinery', sub: r.data.farm?.name ?? '' }, error: null }
  }, [scope, id])
}

// Expense / income list for one crop, farm or machine (CLAUDE.md: cards on phone, table from md).
// `embedded` (crop page Entries tab): no back arrow / title, only the Expense / Income buttons.
export default function EntriesPage({ scope, embedded = false, onSaved }: { scope: Scope; embedded?: boolean; onSaved?: () => void }) {
  const params = useParams()
  const id = (scope === 'crop' ? params.cropId : scope === 'farm' ? params.farmId : params.machineId) ?? ''
  const target = useTarget(scope, id)
  const txs = useRows<TxRow[]>(() => {
    let q = supabase.from('transactions').select(TX_SELECT)
    q = scope === 'crop' ? q.eq('crop_id', id) : scope === 'farm' ? q.eq('farm_id', id).eq('scope', 'farm') : q.eq('machinery_id', id)
    return q.order('start_date', { ascending: false }).order('created_at', { ascending: false }).returns<TxRow[]>()
  }, [scope, id])

  const [type, setType] = useState<EntryType | 'all'>('expense')
  const [group, setGroup] = useState('all')
  const [entry, setEntry] = useState<{ start: EntryStart; tx: TxRow | null } | null>(null)

  // Per acre and grouping by stage are for crops only; farm / machine get a period filter.
  const isCrop = scope === 'crop'
  const period = usePeriod()
  const acres = isCrop ? (target.data?.acres ?? 0) : 0
  const all = (txs.data ?? []).filter((t) => isCrop || inRange(t.start_date, period.range))
  const groupOf = (t: TxRow) => (scope === 'crop' ? (t.stage?.name ?? '—') : (t.item?.category?.name ?? '—'))
  const byType = type === 'all' ? all : all.filter((t) => t.entry_type === type)
  const sum = (rows: TxRow[]) => rows.reduce((a, t) => a + Number(t.net_amount) * (type === 'all' && t.entry_type === 'expense' ? -1 : 1), 0)

  const chips = useMemo(() => {
    const keys: { key: string; order: number }[] = []
    for (const t of byType) {
      const k = groupOf(t)
      if (!keys.some((x) => x.key === k)) keys.push({ key: k, order: scope === 'crop' ? (t.stage?.sort_order ?? 99) : 0 })
    }
    keys.sort((a, b) => a.order - b.order || a.key.localeCompare(b.key))
    return [
      { key: 'all', label: 'All', count: formatINR(sum(byType)) },
      ...keys.map(({ key }) => {
        const rows = byType.filter((t) => groupOf(t) === key)
        const total = sum(rows)
        const pa = isCrop ? perAcre(total, acres) : null
        return { key, label: key, count: `${formatINR(total)}${pa == null ? '' : ` · ${formatINR(pa)}/ac`}` }
      }),
    ]
  }, [byType, acres]) // eslint-disable-line react-hooks/exhaustive-deps

  // A category with no entries in the chosen period falls back to All.
  const activeGroup = chips.some((c) => c.key === group) ? group : 'all'
  const shown = activeGroup === 'all' ? byType : byType.filter((t) => groupOf(t) === activeGroup)
  const expense = all.filter((t) => t.entry_type === 'expense').reduce((a, t) => a + Number(t.net_amount), 0)
  const income = all.filter((t) => t.entry_type === 'income').reduce((a, t) => a + Number(t.net_amount), 0)

  const startFor = (entryType: EntryType): EntryStart => ({
    entryType,
    scope,
    cropId: scope === 'crop' ? id : undefined,
    farmId: scope === 'farm' ? id : undefined,
    machineId: scope === 'machinery' ? id : undefined,
    locked: true,
  })
  const groupLabel = scope === 'crop' ? 'Stage' : 'Category'

  return (
    <>
      <div className={`mb-4 flex flex-wrap items-center gap-3 ${embedded ? 'justify-end' : 'justify-between'}`}>
        {!embedded && <div className="flex min-w-0 items-center gap-2">
          <Link to={target.data?.back ?? '/'} aria-label="Back" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-stone-600 hover:bg-stone-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{target.data?.name ?? '…'}</h2>
            <p className="truncate text-sm text-stone-500">{target.data?.sub}</p>
          </div>
        </div>}
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <Button onClick={() => setEntry({ start: startFor('expense'), tx: null })}><Plus className="h-4 w-4" />Expense</Button>
          <Button tone="secondary" onClick={() => setEntry({ start: startFor('income'), tx: null })}><Plus className="h-4 w-4" />Income</Button>
        </div>
      </div>
      <ErrorText>{target.error ?? txs.error}</ErrorText>

      {!isCrop && <PeriodFilter period={period} />}

      {/* Totals: 2 per row on phone, 3 from md */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-red-100 bg-red-50 p-3"><p className="text-xs text-stone-600">Expense</p><AmountWithPerAcre amount={expense} acres={acres} hidePerAcre={!isCrop} /></div>
        <div className="rounded-2xl border border-green-100 bg-green-50 p-3"><p className="text-xs text-stone-600">Income</p><AmountWithPerAcre amount={income} acres={acres} hidePerAcre={!isCrop} /></div>
        <div className="col-span-2 rounded-2xl border border-stone-200 bg-white p-3 md:col-span-1"><p className="text-xs text-stone-600">Net (income − expense)</p><AmountWithPerAcre amount={income - expense} acres={acres} hidePerAcre={!isCrop} /></div>
      </div>

      <div className="mb-3 flex gap-1 rounded-xl bg-stone-100 p-1 sm:inline-flex" role="radiogroup" aria-label="Entry type">
        {(['expense', 'income', 'all'] as const).map((k) => (
          <button key={k} role="radio" aria-checked={type === k} onClick={() => { setType(k); setGroup('all') }} className={`min-h-11 flex-1 rounded-lg px-4 text-sm font-medium sm:flex-none ${type === k ? 'bg-white text-green-800 shadow-sm' : 'text-stone-600'}`}>
            {k === 'expense' ? 'Expenses' : k === 'income' ? 'Income' : 'All'}
          </button>
        ))}
      </div>
      {isCrop ? (
        <div className="mb-4"><Chips label={groupLabel} chips={chips} value={activeGroup} onChange={setGroup} /></div>
      ) : (
        <label className="mb-4 block sm:max-w-sm">
          <span className="sr-only">{groupLabel}</span>
          <Select value={activeGroup} onChange={(e) => setGroup(e.target.value)}>
            {chips.map((c) => <option key={c.key} value={c.key}>{c.key === 'all' ? 'All categories' : c.label} · {c.count}</option>)}
          </Select>
        </label>
      )}

      {txs.loading ? (
        <p className="text-sm text-stone-500">Loading…</p>
      ) : !shown.length ? (
        <EmptyState title="No entries here" text="Use the Expense or Income button to add one." />
      ) : (
        <>
          {/* Phone: cards */}
          <ul className="space-y-2 md:hidden">
            {shown.map((t) => {
              const pa = isCrop ? perAcre(t.net_amount, acres) : null
              const inc = t.entry_type === 'income'
              return (
                <li key={t.id} className="flex items-center rounded-2xl border border-stone-200 bg-white">
                  <button onClick={() => setEntry({ start: startFor(t.entry_type), tx: t })} className="flex min-h-16 min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{t.item?.name}</span>
                      <span className="block truncate text-xs text-stone-500">{formatDate(t.start_date)} · {groupOf(t)}{t.party ? ` · ${t.party}` : ''}</span>
                      {t.quantity != null && t.rate != null && <span className="block text-xs text-stone-500">{t.quantity} {t.unit ?? ''} × {formatINR(t.rate)}</span>}
                    </span>
                    <span className="shrink-0 text-right">
                      <span className={`block font-semibold ${inc ? 'text-green-700' : ''}`}>{inc ? '+' : ''}{formatINR(t.net_amount)}</span>
                      <span className="block text-xs text-stone-500">{pa == null ? '' : `${formatINR(pa)}/ac`}</span>
                    </span>
                  </button>
                  {t.bill_path && (
                    <button aria-label="Open bill" onClick={() => openBill(t.bill_path!)} className="mr-1 grid h-11 w-11 shrink-0 place-items-center rounded-full text-stone-500 hover:bg-stone-100"><Paperclip className="h-4 w-4" /></button>
                  )}
                </li>
              )
            })}
          </ul>

          {/* Tablet / desktop: table */}
          <div className="hidden overflow-hidden rounded-2xl border border-stone-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-stone-600">
                <tr>
                  <th className="px-3 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">Item</th>
                  <th className="px-3 py-3 font-medium">{groupLabel}</th>
                  <th className="hidden px-3 py-3 font-medium lg:table-cell">Qty × rate</th>
                  <th className="hidden px-3 py-3 text-right font-medium lg:table-cell">Subsidy / bonus</th>
                  <th className="px-3 py-3 text-right font-medium">Net</th>
                  {isCrop && <th className="px-3 py-3 text-right font-medium">Per acre</th>}
                  <th className="hidden px-3 py-3 font-medium lg:table-cell">Party</th>
                  <th className="w-12 px-1 py-3"><span className="sr-only">Bill</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {shown.map((t) => {
                  const pa = isCrop ? perAcre(t.net_amount, acres) : null
                  const inc = t.entry_type === 'income'
                  return (
                    <tr key={t.id} onClick={() => setEntry({ start: startFor(t.entry_type), tx: t })} className="cursor-pointer hover:bg-stone-50">
                      <td className="whitespace-nowrap px-3 py-3">{formatDate(t.start_date)}</td>
                      <td className="px-3 py-3 font-medium">{t.item?.name}{t.remarks && <span className="block text-xs font-normal text-stone-500">{t.remarks}</span>}</td>
                      <td className="px-3 py-3"><span className="whitespace-nowrap rounded-full bg-stone-100 px-2 py-0.5 text-xs">{groupOf(t)}</span></td>
                      <td className="hidden whitespace-nowrap px-3 py-3 lg:table-cell">{t.quantity != null && t.rate != null ? `${t.quantity} ${t.unit ?? ''} × ${formatINR(t.rate)}` : '—'}</td>
                      <td className="hidden px-3 py-3 text-right lg:table-cell">{t.govt_support ? formatINR(t.govt_support) : '—'}</td>
                      <td className={`whitespace-nowrap px-3 py-3 text-right font-semibold ${inc ? 'text-green-700' : ''}`}>{inc ? '+' : ''}{formatINR(t.net_amount)}</td>
                      {isCrop && <td className="whitespace-nowrap px-3 py-3 text-right text-stone-600">{pa == null ? '—' : formatINR(pa)}</td>}
                      <td className="hidden px-3 py-3 lg:table-cell">{t.party ?? '—'}</td>
                      <td className="px-1 py-1">
                        {t.bill_path && (
                          <button aria-label="Open bill" onClick={(e) => { e.stopPropagation(); void openBill(t.bill_path!) }} className="grid h-11 w-11 place-items-center rounded-full text-stone-500 hover:bg-stone-100"><Paperclip className="h-4 w-4" /></button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {entry && (
        <TransactionForm start={entry.start} tx={entry.tx} onClose={() => setEntry(null)} onSaved={() => { txs.reload(); onSaved?.() }} />
      )}
    </>
  )
}
