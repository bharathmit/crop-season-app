import { supabase } from '../../lib/supabase'
import { useRows } from '../../lib/useRows'
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
