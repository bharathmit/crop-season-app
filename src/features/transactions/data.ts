import { supabase } from '../../lib/supabase'
import { useRows } from '../../lib/useRows'
import type { DateRange } from '../../lib/period'
import type { Category, Crop, Farm, Item, Machine, Transaction } from '../../types/domain'

export type EntryLookups = { farms: Farm[]; crops: Crop[]; machines: Machine[]; categories: Category[]; items: Item[] }

// Everything the entry form needs, loaded in parallel.
export function useEntryLookups() {
  return useRows<EntryLookups>(async () => {
    const [farms, crops, machines, categories, items] = await Promise.all([
      supabase.from('farms').select('*').order('created_at'),
      supabase.from('crops').select('*').neq('status', 'closed').order('created_at', { ascending: false }),
      supabase.from('machinery').select('*').eq('is_active', true).order('name'),
      supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('items').select('*').eq('is_active', true).order('sort_order'),
    ])
    const error = farms.error ?? crops.error ?? machines.error ?? categories.error ?? items.error
    if (error) return { data: null, error }
    return {
      data: {
        farms: (farms.data ?? []) as Farm[],
        crops: (crops.data ?? []) as Crop[],
        machines: (machines.data ?? []) as Machine[],
        categories: (categories.data ?? []) as Category[],
        items: (items.data ?? []) as Item[],
      },
      error: null,
    }
  }, [])
}

export type TxRow = Transaction & {
  item: { name: string; category: { name: string } | null } | null
  stage: { name: string; sort_order: number } | null
}

export const TX_SELECT = '*, item:items(name, category:categories(name)), stage:crop_stages(name, sort_order)'

export function useCropTransactions(cropId: string) {
  return useRows<TxRow[]>(
    () =>
      supabase
        .from('transactions')
        .select(TX_SELECT)
        .eq('crop_id', cropId)
        .order('start_date', { ascending: false })
        .order('created_at', { ascending: false })
        .returns<TxRow[]>(),
    [cropId],
  )
}

// Signed link to a bill photo in the private bucket (valid 10 minutes).
export async function openBill(path: string) {
  const { data, error } = await supabase.storage.from('bills').createSignedUrl(path, 600)
  if (!error && data) window.open(data.signedUrl, '_blank', 'noopener')
}

export type Totals = { expense: number; income: number; net: number }

// Expense / income / net per farm (scope farm) or per machine (scope machinery).
// Optional date range (start_date) for the period filter.
export function useScopeTotals(scope: 'farm' | 'machinery', range?: DateRange) {
  const key = scope === 'farm' ? 'farm_id' : 'machinery_id'
  const from = range?.from ?? null
  const to = range?.to ?? null
  const rows = useRows<{ farm_id: string; machinery_id: string | null; entry_type: string; net_amount: number }[]>(
    () => {
      let q = supabase.from('transactions').select('farm_id, machinery_id, entry_type, net_amount').eq('scope', scope)
      if (from) q = q.gte('start_date', from)
      if (to) q = q.lte('start_date', to)
      return q
    },
    [scope, from, to],
  )
  const map: Record<string, Totals> = {}
  for (const r of rows.data ?? []) {
    const id = r[key] as string
    const t = (map[id] ??= { expense: 0, income: 0, net: 0 })
    if (r.entry_type === 'expense') t.expense += Number(r.net_amount)
    else t.income += Number(r.net_amount)
    t.net = t.income - t.expense
  }
  return { totals: map, reload: rows.reload }
}
