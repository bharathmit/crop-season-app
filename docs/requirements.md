# Requirements — first version

Source: requirements analysis doc https://claude.ai/artifact/7P3uv2edwX6jNvt5dtu9ub

## Goal
See, for each crop cycle, what was spent, what was earned, the cash profit, and which stage cost the most — with a checklist of recommended activities for each stage.

## In scope (v1)
1. **Masters**
   - Plots: name, survey number, area (acres), soil type, water source, owned/leased, lease rent per season
   - Seasons: name (Kuruvai / Samba / Navarai / custom), year, start and end month
   - Crops: name (English + Tamil), varieties, duration in days
   - Stages per crop: order, name, optional day range, checklist items (Do / Watch / Save)
     - Default stages copied to every new crop: Preparation, Seeding, Transplanting, Growing, Fruiting, Harvesting, Post Harvest, Sold
     - User can add a missing stage, rename, reorder, or deactivate one (e.g. no Transplanting for groundnut)
     - A stage that already has expenses cannot be deleted, only deactivated
   - Expense categories and sub-categories (seeded, editable)
2. **Crop cycle**: plot + season + crop + variety + area + sowing date; current stage suggested from days since sowing
3. **Expense entry** (fast on a phone): date, crop cycle, stage (auto-suggested, editable), category, sub-category, item, qty, unit, rate, amount, payment mode, vendor, note, optional bill photo. Labour: workers × days × wage.
4. **Harvest and income**: harvest date, yield (kg / bags), moisture %, straw; sales with buyer, qty, rate, deductions, net received; other income (straw, subsidy, insurance)
5. **Stage checklist**: tick recommended activities per crop cycle and stage, with date and note
6. **Reports**
   - Crop cycle profit: total cost, total income, cash profit, cost per acre, cost per quintal
   - Spend per stage: amount and % per stage (bar chart) for a crop cycle

## Per-acre display (all screens)
- Every amount for a crop cycle shows its per-acre value next to it: amount ÷ the cycle's acres.
- **While entering** an expense or income, per-acre updates live under the amount field (e.g. 6 acres, ₹9,000 → ₹1,500 / acre). Same for quantity × rate totals, subsidy and net.
- Lists, stage totals, category totals, profit summary: show both total and per acre.

## Expense categories (seed)
Land preparation · Seed and nursery · Labour · Machinery · Manure and nutrients · Bio-inputs · Plant protection · Irrigation · Harvest and post-harvest · Fixed / overhead

## Out of scope for v1 (later)
Stage × category matrix, season comparison, budget vs actual, overspend alerts, vendor rate comparison, trial plots, dues tracking, Tamil UI, offline mode, multi-user.

## Paddy stage template
See `docs/stage-templates/paddy.md` (seed data source).
