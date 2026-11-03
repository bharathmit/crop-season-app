import { Paperclip, Plus } from 'lucide-react'
import { Button } from '../../components/ui/form'
import { formatDate, formatINR } from '../../lib/format'
import { perAcre } from '../../lib/perAcre'
import { supabase } from '../../lib/supabase'
import { useRows } from '../../lib/useRows'
import { openBill, type TxRow } from './data'

type StageSpend = { crop_stage_id: string; stage_name: string; sort_order: number; expense_net: number; expense_per_acre: number; share_pct: number | null }

// Spend per stage (bars) + latest entries for one crop. Used inside the crop panel.
export function StageSpend({ cropId, refreshKey }: { cropId: string; refreshKey: number }) {
  const rows = useRows<StageSpend[]>(
    () => supabase.from('v_crop_stage_summary').select('crop_stage_id, stage_name, sort_order, expense_net, expense_per_acre, share_pct').eq('crop_id', cropId).order('sort_order'),
    [cropId, refreshKey],
  )
  const list = rows.data ?? []
  const max = Math.max(1, ...list.map((r) => Number(r.expense_net)))
  if (!list.some((r) => Number(r.expense_net) > 0)) return <p className="text-sm text-stone-500">No expenses yet.</p>
  return (
    <ul className="space-y-2">
      {list.map((r) => (
        <li key={r.crop_stage_id} className="text-sm">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-stone-700">{r.stage_name}</span>
            <span className="shrink-0 text-right">
              <span className="font-medium">{formatINR(r.expense_net)}</span>
              <span className="ml-2 text-xs text-stone-500">{formatINR(r.expense_per_acre)}/ac · {r.share_pct ?? 0}%</span>
            </span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-stone-100">
            <div className="h-2 rounded-full bg-red-400" style={{ width: `${(Number(r.expense_net) / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function EntryList({ rows, acres, onAdd, onOpen }: { rows: TxRow[]; acres: number; onAdd: (type: 'expense' | 'income') => void; onOpen: (tx: TxRow) => void }) {
  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <Button onClick={() => onAdd('expense')}><Plus className="h-4 w-4" />Expense</Button>
        <Button tone="secondary" onClick={() => onAdd('income')}><Plus className="h-4 w-4" />Income</Button>
      </div>
      {!rows.length ? (
        <p className="text-sm text-stone-500">No entries yet.</p>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200">
          {rows.map((t) => {
            const pa = perAcre(t.net_amount, acres)
            const income = t.entry_type === 'income'
            return (
              <li key={t.id} className="flex items-center gap-2 px-3">
                <button onClick={() => onOpen(t)} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2 text-left">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{t.item?.name ?? 'Item'}</span>
                    <span className="block truncate text-xs text-stone-500">{formatDate(t.start_date)} · {t.stage?.name ?? ''} · {t.item?.category?.name ?? ''}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className={`block text-sm font-semibold ${income ? 'text-green-700' : 'text-stone-900'}`}>{income ? '+' : ''}{formatINR(t.net_amount)}</span>
                    <span className="block text-xs text-stone-500">{pa == null ? '' : `${formatINR(pa)}/ac`}</span>
                  </span>
                </button>
                {t.bill_path && (
                  <button aria-label="Open bill" onClick={() => openBill(t.bill_path!)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-stone-500 hover:bg-stone-100">
                    <Paperclip className="h-4 w-4" />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
