# Requirements — first version

Source: requirements analysis doc https://claude.ai/artifact/7P3uv2edwX6jNvt5dtu9ub

## Goal
See, for each crop cycle, what was spent, what was earned, the cash profit, and which stage cost the most — with a checklist of recommended activities for each stage.

## In scope (v1)
1. **Masters**
   - Plots: name, survey number, area (acres), soil type, water source, owned/leased, lease rent per season
   - Seasons: name (Kuruvai / Samba / Navarai / custom), year, start and end month
   - Crops: name (English + Tamil), varieties, duration in days
   - Stage templates per crop: order, name, day range, checklist items (Do / Watch / Save)
   - Expense categories and sub-categories (seeded, editable)
2. **Crop cycle**: plot + season + crop + variety + area + sowing date; current stage suggested from days since sowing
3. **Expense entry** (fast on a phone): date, crop cycle, stage (auto-suggested, editable), category, sub-category, item, qty, unit, rate, amount, payment mode, vendor, note, optional bill photo. Labour: workers × days × wage.
4. **Harvest and income**: harvest date, yield (kg / bags), moisture %, straw; sales with buyer, qty, rate, deductions, net received; other income (straw, subsidy, insurance)
5. **Stage checklist**: tick recommended activities per crop cycle and stage, with date and note
6. **Reports**
   - Crop cycle profit: total cost, total income, cash profit, cost per acre, cost per quintal
   - Spend per stage: amount and % per stage (bar chart) for a crop cycle

## Expense categories (seed)
Land preparation · Seed and nursery · Labour · Machinery · Manure and nutrients · Bio-inputs · Plant protection · Irrigation · Harvest and post-harvest · Fixed / overhead

## Out of scope for v1 (later)
Stage × category matrix, season comparison, budget vs actual, overspend alerts, vendor rate comparison, trial plots, dues tracking, Tamil UI, offline mode, multi-user.

## Paddy stage template
See `docs/stage-templates/paddy.md` (seed data source).
