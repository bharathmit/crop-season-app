# Data model

**Status: DRAFT — awaiting owner review. No migration written yet.** Based on the owner's Excel paddy tracker (expense sheet, income sheet, P&L summary).

Every table has `id uuid pk default gen_random_uuid()`, `user_id uuid not null default auth.uid()`, `created_at timestamptz default now()`, and row-level security `user_id = auth.uid()`. Omitted below for brevity.

**Two dimensions on every expense:** *category / item* = what was bought (Fertilisers → Zinc Sulphate); *stage* = when in the crop (Transplanting). Reports total by either.

## Masters

### crops
| Column | Type | Notes |
| --- | --- | --- |
| name | text not null | e.g. Paddy |
| name_ta | text | Tamil name, optional |
| duration_days | int | optional |

On insert, a trigger copies the 8 default stages into `crop_stages`.

### crop_stages (per crop, user-editable)
| Column | Type | Notes |
| --- | --- | --- |
| crop_id | uuid fk → crops | |
| name | text not null | unique per crop |
| sort_order | int not null | reorder |
| start_day / end_day | int | optional, days from sowing (stage auto-suggest) |
| is_active | boolean default true | hide instead of delete |

Defaults: Preparation, Seeding, Transplanting, Growing, Fruiting, Harvesting, Post Harvest, Sold. Delete only when unused (fk `on delete restrict`), otherwise hide.

### expense_categories
| Column | Type | Notes |
| --- | --- | --- |
| name | text not null | Land Preparation, Seeds & Nursery, Transplanting, Fertilisers & Soil Amendments, Plant Protection, Irrigation, Harvesting & Threshing, Post-Harvest & Storage, Overheads & Miscellaneous |
| sort_order | int | |
| is_active | boolean default true | |

### expense_items (pick list, user can add)
| Column | Type | Notes |
| --- | --- | --- |
| category_id | uuid fk → expense_categories | |
| name | text not null | e.g. Zinc Sulphate (33%) |
| default_stage_name | text | pre-fills stage on entry; matched by name to the cycle's crop stages |
| default_unit | text | kg, litre, bag, hour, acre, person-day |
| is_active | boolean default true | |

Seed list: `docs/seed/expense-items.md`.

### plots, seasons
plots: `name, survey_no, area_acres, soil_type, water_source, ownership (owned/leased)`.
seasons: `name (Kuruvai / Samba / Navarai / custom), year, start_month, end_month`.

## Crop cycle

### crop_cycles
| Column | Type | Notes |
| --- | --- | --- |
| crop_id / plot_id / season_id | uuid fk | |
| variety | text | e.g. White Ponni |
| area_acres | numeric(6,2) not null | divisor for all per-acre figures (5.5 in the Excel sheet) |
| sowing_date | date | |
| status | text | planned / active / closed |

## Expenses (Excel: expense sheet)

### expenses
| Column | Type | Excel column / notes |
| --- | --- | --- |
| crop_cycle_id | uuid fk | |
| crop_stage_id | uuid fk → crop_stages | Plant Stages; must belong to the cycle's crop (trigger) |
| item_id | uuid fk → expense_items | Expense Item (category comes from the item) |
| start_date | date not null | Start Date |
| end_date | date | End Date (for multi-day work) |
| quantity | numeric(10,2) | e.g. 25 (was typed into Remarks) |
| unit | text | kg |
| rate | numeric(12,2) | 90 |
| amount | numeric(12,2) not null | Total Expense; = qty × rate when both given, else typed |
| subsidy | numeric(12,2) default 0 | Govt Subsidy |
| net_amount | numeric(12,2) generated | Net Total = amount − subsidy |
| supplier | text | Supplier / Source |
| invoice_no | text | Invoice No. |
| paid_by | text | Paid By |
| remarks | text | Remarks / Notes |
| bill_path | text | photo in private `bills` bucket (Ref.) |

Per-acre and % of total are **calculated in views**, not stored.

## Harvest and income (Excel: income sheet)

### harvests
| Column | Type | Notes |
| --- | --- | --- |
| crop_cycle_id | uuid fk | |
| harvest_date | date | |
| gross_yield_qtl | numeric(10,2) | Gross Yield at Field |
| moisture_loss_pct | numeric(5,2) | default 5 |
| net_yield_qtl | numeric(10,2) generated | gross × (1 − moisture/100) |

### incomes
| Column | Type | Excel column / notes |
| --- | --- | --- |
| crop_cycle_id | uuid fk | |
| item | text not null | Paddy sale, Straw, Bran / Husk, MSP bonus, Insurance claim, Other |
| unit | text | Quintal, Ton, Lumpsum |
| quantity | numeric(10,2) | Total Qty |
| rate | numeric(12,2) | Rate per unit (MSP / procurement price) |
| amount | numeric(12,2) not null | Total Revenue = qty × rate, else typed |
| govt_bonus | numeric(12,2) default 0 | Govt Bonus |
| net_amount | numeric(12,2) generated | amount + govt_bonus |
| buyer | text | Buyer / Mill |
| invoice_no | text | |
| paid_on | date | |
| remarks | text | |

## Report views

### v_expense_by_stage / v_expense_by_category
Per crop cycle: `name, sort_order, net_total, net_per_acre, share_pct`.

### v_crop_cycle_profit (Excel: P&L summary)
| Metric | Formula |
| --- | --- |
| Total revenue | Σ incomes.net_amount |
| Total expense | Σ expenses.net_amount |
| Net profit / loss | revenue − expense |
| Revenue / expense / profit per acre | ÷ area_acres |
| ROI % | profit ÷ expense × 100 |
| Cost-benefit ratio | revenue ÷ expense |
| Profit per quintal | profit ÷ net yield (qtl) |
| Break-even yield (qtl/acre) | expense per acre ÷ paddy rate per qtl |
| Break-even price (₹/qtl) | expense ÷ net yield (qtl) |
