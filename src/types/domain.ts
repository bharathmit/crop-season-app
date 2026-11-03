// Row shapes as returned by Supabase (column names stay snake_case).
// Kept in sync with supabase/migrations; regenerate with the Supabase MCP
// `generate_typescript_types` if a migration changes these tables.

export type Uuid = string

export interface Farm {
  id: Uuid
  name: string
  location: string | null
  survey_no: string | null
  area_acres: number
  ownership: 'owned' | 'leased' | null
  soil_type: string | null
  water_source: string | null
  is_active: boolean
  created_at: string
}

export const MACHINE_TYPES = ['tractor', 'power tiller', 'sprayer', 'pump set', 'harvester', 'other'] as const
export type MachineType = (typeof MACHINE_TYPES)[number]

export interface Machine {
  id: Uuid
  farm_id: Uuid
  name: string
  type: MachineType | null
  purchase_date: string | null
  purchase_cost: number | null
  is_active: boolean
  created_at: string
}

export const SEASONS = ['Kuruvai', 'Samba', 'Navarai'] as const
export const CROP_STATUSES = ['planned', 'active', 'harvested', 'closed'] as const
export type CropStatus = (typeof CROP_STATUSES)[number]

export interface Crop {
  id: Uuid
  farm_id: Uuid
  crop_name: string
  variety: string | null
  season: string
  season_year: number
  area_acres: number
  sowing_date: string | null
  status: CropStatus
  harvest_date: string | null
  gross_yield_qtl: number | null
  moisture_loss_pct: number
  net_yield_qtl: number | null
  current_stage_id: Uuid | null
  created_at: string
}

export interface CropStage {
  id: Uuid
  crop_id: Uuid
  name: string
  sort_order: number
  start_day: number | null
  end_day: number | null
  is_active: boolean
}

export const DEFAULT_STAGES = [
  'Preparation',
  'Seeding',
  'Transplanting',
  'Growing',
  'Fruiting',
  'Harvesting',
  'Post Harvest',
  'Sold',
] as const

export type Scope = 'crop' | 'farm' | 'machinery'
export type EntryType = 'expense' | 'income'

export interface Category {
  id: Uuid
  scope: Scope
  entry_type: EntryType
  name: string
  sort_order: number
  is_active: boolean
}

export interface Item {
  id: Uuid
  category_id: Uuid
  name: string
  default_stage_name: string | null
  default_unit: string | null
  sort_order: number
  is_active: boolean
}

export interface Transaction {
  id: Uuid
  entry_type: EntryType
  scope: Scope
  farm_id: Uuid
  crop_id: Uuid | null
  crop_stage_id: Uuid | null
  machinery_id: Uuid | null
  item_id: Uuid
  start_date: string
  end_date: string | null
  quantity: number | null
  unit: string | null
  rate: number | null
  amount: number
  govt_support: number
  net_amount: number
  party: string | null
  invoice_no: string | null
  paid_by: string | null
  paid_on: string | null
  remarks: string | null
  bill_path: string | null
  created_at: string
}

export const UNITS = ['kg', 'bag', 'litre', 'quintal', 'ton', 'acre', 'hour', 'day', 'person-day', 'nos', 'lumpsum'] as const
