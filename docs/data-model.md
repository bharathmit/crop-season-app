# Data model

**Status: NOT STARTED — to be designed and approved by the owner before any migration is written.**

Planned contents:
- Tables: plots, seasons, crops, crop_varieties, stage_templates, checklist_items, expense_categories, expense_subcategories, crop_cycles, expenses, harvests, sales, other_income, checklist_ticks
- Views: v_crop_cycle_profit, v_stage_spend
- Row-level security: every user-owned table filtered by `user_id = auth.uid()`
- Storage bucket: `bills` (private) for bill photos
