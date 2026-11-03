# Data model

**Status: DRAFT — Part 1 (crops, stages, crop cycles, expenses) awaiting owner review. No migration written yet.**

Every table has `id uuid pk default gen_random_uuid()`, `user_id uuid not null default auth.uid()`, `created_at timestamptz default now()`, and row-level security `user_id = auth.uid()`. Omitted below for brevity.

## Part 1 — Crops, stages, expenses

### crops
| Column | Type | Notes |
| --- | --- | --- |
| name | text not null | e.g. Paddy |
| name_ta | text | Tamil name, optional |
| duration_days | int | typical duration, optional |

On insert, a trigger copies the 8 default stages into `crop_stages` for the new crop.

### crop_stages (per crop, user-editable)
| Column | Type | Notes |
| --- | --- | --- |
| crop_id | uuid fk → crops | |
| name | text not null | unique per crop |
| sort_order | int not null | drag to reorder |
| start_day / end_day | int | optional, days from sowing; used to auto-suggest the stage |
| is_active | boolean default true | hide instead of delete |

Default list: Preparation, Seeding, Transplanting, Growing, Fruiting, Harvesting, Post Harvest, Sold.
- **Add** a missing stage, **rename**, **reorder**, **deactivate** — all from the crop screen.
- **Delete** allowed only when no expenses use the stage (fk `on delete restrict`); otherwise deactivate.

### crop_cycles
| Column | Type | Notes |
| --- | --- | --- |
| crop_id | uuid fk → crops | |
| plot_id | uuid fk → plots | Part 2 |
| season_id | uuid fk → seasons | Part 2 |
| variety | text | |
| area_acres | numeric(6,2) not null | |
| sowing_date | date | |
| status | text | planned / active / closed |

### expenses
| Column | Type | Notes |
| --- | --- | --- |
| crop_cycle_id | uuid fk → crop_cycles | |
| crop_stage_id | uuid fk → crop_stages | must belong to the cycle's crop (checked by trigger) |
| expense_date | date not null | |
| category | text not null | from expense_categories (seeded list, Part 2) |
| item | text | e.g. Tractor ploughing, Seed ADT 53 |
| quantity | numeric(10,2) | optional |
| unit | text | kg, litre, bag, hour, acre, person-day |
| rate | numeric(12,2) | optional |
| amount | numeric(12,2) not null | = quantity × rate when both given, else typed |
| payment_mode | text | cash / UPI / credit |
| vendor | text | |
| note | text | |
| bill_path | text | Storage path in private `bills` bucket |

### View: v_stage_spend
Per crop cycle and stage: `crop_cycle_id, stage_name, sort_order, total_amount, share_pct` — drives the "amount spent per stage" report.

## Part 2 — to design next
plots, seasons, expense_categories, harvests, sales, other_income, checklist_items, checklist_ticks, v_crop_cycle_profit.
