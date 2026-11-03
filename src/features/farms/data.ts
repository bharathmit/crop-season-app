import { supabase } from '../../lib/supabase'
import { useRows } from '../../lib/useRows'
import type { Farm } from '../../types/domain'

export function useFarms() {
  return useRows<Farm[]>(() => supabase.from('farms').select('*').order('created_at'), [])
}

// Friendly text for common database refusals.
export function dbMessage(message: string): string {
  if (message.includes('violates foreign key') || message.includes('RESTRICT')) {
    return 'This is still in use (crops, machines or entries). Remove those first, or hide it instead.'
  }
  if (message.includes('duplicate key')) return 'That name is already used.'
  return message
}
