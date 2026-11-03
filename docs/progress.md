# Progress

Update at the end of every session: tick what is done, set the current step, add a dated line to the session log.

**Current step:** Phase 1 — owner review of data model v3 (9 tables).

## Phase 0 — Setup
- [x] Requirements analysis and v1 scope agreed
- [x] Project scaffold: React + TS + Vite + Tailwind + Router + Supabase client
- [x] Claude Code memory: CLAUDE.md, docs/, slash commands
- [ ] Create Supabase project; fill `.env.local`
- [x] Git repository initialised; first commit made locally
- [x] Pushed to GitHub: https://github.com/bharathmit/crop-season-app
- [x] GitHub Pages deploy workflow (.github/workflows/deploy.yml)

## Phase 1 — Data model
- [ ] Design tables, views, RLS in docs/data-model.md
- [ ] Owner review and approval
- [ ] Migration 0001_init.sql
- [ ] Seed: expense categories, paddy crop + stage template + checklist items

## Phase 2 — Masters
- [ ] Auth: email login (single user)
- [ ] Plots CRUD
- [ ] Seasons CRUD
- [ ] Crops + varieties CRUD
- [ ] Stage templates + checklist items editor

## Phase 3 — Crop cycles and entries
- [ ] Crop cycle create / list / detail (current stage from days since sowing)
- [ ] Expense entry (mobile-first) with stage auto-suggest
- [ ] Bill photo upload
- [ ] Harvest, sales and other income entry

## Phase 4 — Checklist
- [ ] Stage checklist per crop cycle (tick, date, note)

## Phase 5 — Reports
- [ ] Crop cycle profit (cash), cost per acre / per quintal
- [ ] Spend per stage chart

## Phase 6 — Release
- [ ] Confirm live deploy on GitHub Pages with Supabase secrets set
- [ ] Use for one season; collect fixes

## Session log
- 2026-11-02 — Requirements agreed; stack chosen (React + Supabase); project scaffold and Claude Code memory files created. Build passes.
- 2026-11-02 — Added GitHub Pages auto-deploy workflow; router basename + Vite base path for Pages.
- 2026-11-02 — Pushed to GitHub. Pending: owner sets Settings → Pages → Source = GitHub Actions, then re-run the deploy workflow.
- 2026-11-03 — Default stage list agreed (Preparation → Sold, editable per crop). Paddy checklist remapped. Data model Part 1 drafted for review.
- 2026-11-03 — Data model redrafted from owner's Excel tracker: category/item + stage on each expense, subsidy, income with govt bonus, harvest moisture, P&L metrics. Expense item seed list added.
- 2026-11-03 — Rule added: per-acre value shown beside every amount, live in entry forms.
- 2026-11-03 — Data model v3: plots → farms; machinery added; crops/seasons/cycles/harvest merged into crops; expenses + incomes merged into transactions (scope crop/farm/machinery). Farm and machinery categories seeded.
