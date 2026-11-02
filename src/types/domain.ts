// Shared domain types. Kept in sync with supabase/migrations once the data model is approved.
// Draft only — fields are finalised in docs/data-model.md.

export type Uuid = string

export interface CropCycle {
  id: Uuid
  plotId: Uuid
  seasonId: Uuid
  cropId: Uuid
  variety: string
  areaAcres: number
  sowingDate: string // ISO date
}
