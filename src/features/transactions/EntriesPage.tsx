import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown, Layers, Paperclip, Plus } from 'lucide-react'
import AmountWithPerAcre from '../../components/AmountWithPerAcre'
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
import { isOthersStage } from '../crops/data'
import { openBill, TX_SELECT, type TxRow } from './data'

type Target = { name: string; acres: number; back: string; sub: string; currentStageId?: string | null }

function useTarget(scope: Scope, id: string) {
  return useRows<Target>(async () => {
    if (scope === 'crop') {
      const r = await supabase.from('crops').select('crop_name, variety, season, season_year, area_acres, current_stage_id').eq('id', id).single()
      if (r.error) return { data: null, error: r.error }
      const c = r.data
      return { data: { name: `${c.crop_name}${c.variety ? ` · ${c.variety}` : ''}`, acres: c.area_acres, back: `/crops/${id}`, sub: `${c.season} ${c.season_year} · ${formatAcres(c.area_acres)}`, currentStageId: c.current_stage_id }, error: null }
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

  // Crops open on All (stage panels split expense / income); farm / machine on Expenses.
  const [type, setType] = useState<EntryType | 'all'>(scope === 'crop' ? 'all' : 'expense')
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
      if (!keys.some((x) => x.key === k)) keys.push({ key: k, order: scope === 'crop' ? stageOrder(t) : 0 })
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
  const openEntry = (t: TxRow) => setEntry({ start: startFor(t.entry_type), tx: t })

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
        <label className="relative mb-4 block sm:max-w-sm">
          <span className="sr-only">{groupLabel}</span>
          <Layers aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-700" />
          <Select value={activeGroup} onChange={(e) => setGroup(e.target.value)} className="pl-9">
            {chips.map((c) => <option key={c.key} value={c.key}>{c.key === 'all' ? 'All stages' : c.label} · {c.count}</option>)}
          </Select>
        </label>
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
      ) : isCrop ? (
        <StagePanels rows={shown} acres={acres} currentStageId={target.data?.currentStageId ?? null} single={activeGroup !== 'all'} onOpen={openEntry} />
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

// Stage order for crop entries; "Others" always last.
const stageOrder = (t: TxRow) => (t.stage && isOthersStage(t.stage.name) ? 9999 : (t.stage?.sort_order ?? 999))
const byDate = (a: TxRow, b: TxRow) => a.start_date.localeCompare(b.start_date) || a.created_at.localeCompare(b.created_at)

// Crop entries: one collapsible panel per stage (stage order); inside, Expenses then Income, oldest date first.
function StagePanels({ rows, acres, currentStageId, single, onOpen }: { rows: TxRow[]; acres: number; currentStageId: string | null; single: boolean; onOpen: (t: TxRow) => void }) {
  const groups = useMemo(() => {
    const map = new Map<string, { id: string | null; order: number; rows: TxRow[] }>()
    for (const t of rows) {
      const k = t.stage?.name ?? '—'
      if (!map.has(k)) map.set(k, { id: t.crop_stage_id, order: stageOrder(t), rows: [] })
      map.get(k)!.rows.push(t)
    }
    return [...map.entries()].sort((a, b) => a[1].order - b[1].order)
  }, [rows])
  // Open by default: the crop's current stage (or the only stage shown).
  // `flipped` holds panels the owner opened / closed, relative to that default.
  const [flipped, setFlipped] = useState<Set<string>>(() => new Set())
  const toggle = (k: string) => setFlipped((p) => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); return n })
  const total = (r: TxRow[]) => r.reduce((a, t) => a + Number(t.net_amount), 0)

  return (
    <div className="space-y-3">
      {groups.map(([name, g]) => {
        const exp = g.rows.filter((t) => t.entry_type === 'expense').sort(byDate)
        const inc = g.rows.filter((t) => t.entry_type === 'income').sort(byDate)
        const current = g.id != null && g.id === currentStageId
        const isOpen = single || current !== flipped.has(name)
        return (
          <section key={name} className={`overflow-hidden rounded-2xl border bg-white ${current ? 'border-green-300' : 'border-stone-200'}`}>
            <button onClick={() => toggle(name)} aria-expanded={isOpen} className={`flex min-h-14 w-full items-center gap-2 px-4 py-2 text-left ${current ? 'bg-green-50' : 'bg-stone-50'}`}>
              <ChevronDown aria-hidden className={`h-4 w-4 shrink-0 text-stone-500 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate font-semibold text-stone-900">{name}</span>
                  {current && <span className="shrink-0 rounded-full bg-green-700 px-2 py-0.5 text-[11px] font-medium text-white">Current</span>}
                </span>
                <span className="block text-xs text-stone-500">{g.rows.length} {g.rows.length === 1 ? 'entry' : 'entries'}</span>
              </span>
              <span className="shrink-0 text-right text-sm">
                {exp.length > 0 && <span className="block font-semibold text-red-700">{formatINR(total(exp))}</span>}
                {inc.length > 0 && <span className="block font-semibold text-green-700">+{formatINR(total(inc))}</span>}
              </span>
            </button>
            {isOpen && (
              <div className="divide-y divide-stone-100 border-t border-stone-100">
                {([['Expenses', exp, 'text-red-800 bg-red-50/60'], ['Income', inc, 'text-green-800 bg-green-50/60']] as const).map(([label, list, tone]) =>
                  list.length ? (
                    <div key={label}>
                      <p className={`flex justify-between px-4 py-1.5 text-xs font-bold ${tone}`}>
                        <span>{label} · {list.length}</span>
                        <span>{formatINR(total(list))}{acres > 0 && <span className="font-medium text-stone-500"> · {formatINR(perAcre(total(list), acres))}/ac</span>}</span>
                      </p>
                      <ul className="divide-y divide-stone-100">
                        {list.map((t) => <EntryRow key={t.id} t={t} acres={acres} onOpen={onOpen} />)}
                      </ul>
                    </div>
                  ) : null,
                )}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

function EntryRow({ t, acres, onOpen }: { t: TxRow; acres: number; onOpen: (t: TxRow) => void }) {
  const pa = perAcre(t.net_amount, acres)
  const inc = t.entry_type === 'income'
  return (
    <li className="flex items-center">
      <button onClick={() => onOpen(t)} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-4 py-2 text-left hover:bg-stone-50">
        <span className="w-20 shrink-0 text-xs text-stone-500 md:text-sm md:text-stone-700">{formatDate(t.start_date)}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{t.item?.name}</span>
          <span className="block truncate text-xs text-stone-500">
            {t.item?.category?.name ?? ''}
            {t.quantity != null && t.rate != null && <> · {t.quantity} {t.unit ?? ''} × {formatINR(t.rate)}</>}
            {t.party ? ` · ${t.party}` : ''}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className={`block text-sm font-semibold ${inc ? 'text-green-700' : ''}`}>{inc ? '+' : ''}{formatINR(t.net_amount)}</span>
          <span className="block text-xs text-stone-500">{pa == null ? '' : `${formatINR(pa)}/ac`}</span>
        </span>
      </button>
      {t.bill_path && (
        <button aria-label="Open bill" onClick={() => openBill(t.bill_path!)} className="mr-1 grid h-11 w-11 shrink-0 place-items-center rounded-full text-stone-500 hover:bg-stone-100"><Paperclip className="h-4 w-4" /></button>
      )}
    </li>
  )
}
