import { supabase } from '../../lib/supabase'
import { useRows } from '../../lib/useRows'
import type { Crop, CropStage } from '../../types/domain'

export type CropWithStage = Crop & { current_stage: { name: string; sort_order: number } | null }

export function useCrops() {
  return useRows<CropWithStage[]>(
    () =>
      supabase
        .from('crops')
        .select('*, current_stage:crop_stages!crops_current_stage_id_fkey(name, sort_order)')
        .order('created_at', { ascending: false })
        .returns<CropWithStage[]>(),
    [],
  )
}

export function useCropStages(cropId: string | undefined) {
  return useRows<CropStage[]>(
    () => supabase.from('crop_stages').select('*').eq('crop_id', cropId ?? '').order('sort_order'),
    [cropId],
  )
}

// "Others": a catch-all stage for entries not tied to a crop stage. Listed last, skipped when moving stages.
export const isOthersStage = (name: string) => name.trim().toLowerCase() === 'others'
