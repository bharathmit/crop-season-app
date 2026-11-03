# Data model

**Status: APPROVED v3 (2026-11-03). Implemented in `supabase/migrations/0001_init.sql` + `0002_seed_defaults.sql` + `0003_tasks.sql`; tested with `npm run test:db`.** 9 tables + 4 views + 1 storage bucket.

Changes from v2 (owner review 2026-11-03):
- `plots` → **`farms`**, with its own expense and income entries.
- **`machinery`** added, with its own expense and income entries (fuel, repair, hire-out income).
- `crops` + `seasons` + `crop_cycles` (+ `harvests`) **merged into one `crops` table**: one row = one crop grown on one farm in one season.
- `expenses` + `incomes` **merged into one `transactions` table** with `entry_type` (expense / income) and `scope` (crop / farm / machinery). Overall profit = one sum.
- `checklist_items` + `checklist_ticks` → `stage_guidance` (library) + **`tasks`** (guidance copied per crop stage, plus own tasks for crop stage / farm / machinery).

Every table has `id uuid pk default gen_random_uuid()`, `user_id uuid not null default auth.uid()`, `created_at timestamptz default now()`, and row-level security `user_id = auth.uid()`. Omitted below.

## Money flows
```
Overall profit = Crop profit (all crops) + Farm net + Machinery net
each = Σ income.net_amount − Σ expense.net_amount
```

## Tables

### 1. farms
| Column | Type | Notes |
| --- | --- | --- |
| name | text not null | e.g. Villupuram wetland |
| location | text | village / taluk |
| survey_no | text | |
| area_acres | numeric(6,2) not null | per-acre basis for farm and machinery entries |
| ownership | text | owned / leased |
| soil_type, water_source | text | |

### 2. machinery
| Column | Type | Notes |
| --- | --- | --- |
| farm_id | uuid fk → farms | |
| name | text not null | e.g. Mahindra 575 tractor |
| type | text | tractor, power tiller, sprayer, pump set, harvester, other |
| purchase_date | date | |
| purchase_cost | numeric(12,2) | recorded as a machinery expense transaction too |
| is_active | boolean default true | |

### 3. crops (merged: crop + season + cycle + harvest)
| Column | Type | Notes |
| --- | --- | --- |
| farm_id | uuid fk → farms | |
| crop_name | text not null | Paddy, Groundnut… (dropdown of names used before + free text) |
| variety | text | White Ponni |
| season | text not null | Kuruvai / Samba / Navarai / custom |
| season_year | int not null | 2026 |
| area_acres | numeric(6,2) not null | per-acre basis for this crop |
| sowing_date | date | stage auto-suggest |
| status | text | planned / active / harvested / closed |
| harvest_date | date | |
| gross_yield_qtl | numeric(10,2) | |
| moisture_loss_pct | numeric(5,2) default 5 | |
| net_yield_qtl | numeric(10,2) generated | gross × (1 − moisture / 100) |

On insert: copy the 8 default stages into `crop_stages`, and matching `stage_guidance` rows into `tasks` (source = guidance).

### 4. crop_stages (per crop row, user-editable)
| Column | Type | Notes |
| --- | --- | --- |
| crop_id | uuid fk → crops | |
| name | text not null | unique per crop |
| sort_order | int not null | |
| start_day / end_day | int | optional, days from sowing |
| is_active | boolean default true | hide; delete only if unused |

Defaults: Preparation, Seeding, Transplanting, Growing, Fruiting, Harvesting, Post Harvest, Sold.

### 5. categories
| Column | Type | Notes |
| --- | --- | --- |
| scope | text not null | crop / farm / machinery |
| entry_type | text not null | expense / income |
| name | text not null | |
| sort_order, is_active | | |

### 6. items (pick list)
| Column | Type | Notes |
| --- | --- | --- |
| category_id | uuid fk → categories | |
| name | text not null | |
| default_stage_name | text | crop items only; pre-fills stage |
| default_unit | text | |
| is_active | boolean default true | |

Seed: `docs/seed/expense-items.md`.

### 7. transactions (every expense and income)
| Column | Type | Notes |
| --- | --- | --- |
| entry_type | text not null | expense / income |
| scope | text not null | crop / farm / machinery |
| farm_id | uuid fk → farms not null | always set (crop and machine carry their farm) |
| crop_id | uuid fk → crops | required when scope = crop |
| crop_stage_id | uuid fk → crop_stages | required when scope = crop |
| machinery_id | uuid fk → machinery | required when scope = machinery |
| item_id | uuid fk → items | category comes from item |
| start_date | date not null | |
| end_date | date | |
| quantity, unit, rate | numeric / text / numeric(12,2) | |
| amount | numeric(12,2) not null | qty × rate when both given, else typed |
| govt_support | numeric(12,2) default 0 | expense: subsidy · income: govt bonus |
| net_amount | numeric(12,2) generated | expense: amount − support · income: amount + support |
| party | text | supplier (expense) / buyer, mill (income) |
| invoice_no | text | |
| paid_by | text | free text (who paid or how) |
| paid_on | date | |
| remarks | text | |
| bill_path | text | photo in private `bills` bucket |

Check constraints enforce the required ids per scope; a trigger checks the stage belongs to the crop.

### 8. stage_guidance (checklist library)
| Column | Type | Notes |
| --- | --- | --- |
| crop_name | text not null | Paddy |
| stage_name | text not null | Growing |
| type | text | do / watch / save |
| text | text not null | |
| sort_order | int | |

Seed: `docs/stage-templates/paddy.md`.

### 9. tasks (crop stage, farm or machinery; replaces crop_checklist — migration 0003)
| Column | Type | Notes |
| --- | --- | --- |
| scope | text not null | crop / farm / machinery |
| farm_id | uuid fk → farms not null | filled from crop / machine by trigger |
| crop_id, crop_stage_id | uuid fk | required when scope = crop |
| machinery_id | uuid fk | required when scope = machinery |
| title | text not null | e.g. Weed at ~15 days, Service power tiller |
| notes | text | |
| due_date | date | dashboard: due today / overdue |
| status | text | open / done |
| done_on | date | stamped by trigger when done |
| source | text | guidance (copied from stage_guidance on crop insert) / manual |
| type | text | do / watch / save (guidance tasks) |
| sort_order | int | |

## Report views
| View | Shows |
| --- | --- |
| v_crop_stage_summary | per crop and stage: expense net, per acre, % share |
| v_category_summary | per scope (crop / farm / machinery) and category: net, per acre, % share |
| v_crop_profit | per crop: revenue, expense, profit, per acre, ROI %, cost-benefit ratio, profit / qtl, break-even yield and price |
| v_overall_profit | per farm and year (or season): crop profit + farm net + machinery net = overall profit, per acre |

Per-acre basis: crop → `crops.area_acres`; farm and machinery → `farms.area_acres`.
