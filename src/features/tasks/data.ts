import { supabase } from '../../lib/supabase'
import { useRows } from '../../lib/useRows'
import type { Scope, Uuid } from '../../types/domain'

export interface TaskRow {
  id: Uuid
  scope: Scope
  farm_id: Uuid
  crop_id: Uuid | null
  crop_stage_id: Uuid | null
  machinery_id: Uuid | null
  title: string
  notes: string | null
  due_date: string | null
  status: 'open' | 'done'
  done_on: string | null
  source: 'guidance' | 'manual'
  type: 'do' | 'watch' | 'save' | null
  sort_order: number
  crop: { crop_name: string; variety: string | null; current_stage_id: string | null } | null
  stage: { name: string; sort_order: number } | null
  machine: { name: string } | null
  farm: { name: string } | null
}

const SELECT =
  '*, crop:crops(crop_name, variety, current_stage_id), stage:crop_stages(name, sort_order), machine:machinery(name), farm:farms(name)'

export function useTasks(filter: { cropId?: string } = {}, refreshKey = 0) {
  return useRows<TaskRow[]>(() => {
    let q = supabase.from('tasks').select(SELECT)
    if (filter.cropId) q = q.eq('crop_id', filter.cropId)
    return q.order('due_date', { ascending: true, nullsFirst: false }).order('sort_order').returns<TaskRow[]>()
  }, [filter.cropId, refreshKey])
}

export async function setTaskDone(id: string, done: boolean) {
  return supabase.from('tasks').update({ status: done ? 'done' : 'open', done_on: null }).eq('id', id)
}

// Where a task belongs, in words: "Paddy (White Ponni) › Growing", "Sorathur Farm", "Power Tiller".
export function taskPlace(t: TaskRow): string {
  if (t.scope === 'crop') return `${t.crop?.crop_name ?? 'Crop'}${t.crop?.variety ? ` (${t.crop.variety})` : ''} › ${t.stage?.name ?? ''}`
  if (t.scope === 'machinery') return t.machine?.name ?? 'Machine'
  return t.farm?.name ?? 'Farm'
}
