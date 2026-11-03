# Progress

Update at the end of every session: tick what is done, set the current step, add a dated line to the session log.

**Current step:** Phase 2 — Farms, Machinery, Crops screens (+ stage editor).

## Phase 0 — Setup
- [x] Requirements analysis and v1 scope agreed
- [x] Project scaffold: React + TS + Vite + Tailwind + Router + Supabase client
- [x] Claude Code memory: CLAUDE.md, docs/, slash commands
- [x] Supabase project `crop-season-app` (ref pwplyirgvgcnzugutirc, ap-southeast-1); migrations 0001 + 0002 applied; security advisor clean
- [x] Owner added GitHub secrets VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY
- [x] UI plan from reference app (docs/ui-plan.md) — awaiting owner approval
- [x] Git repository initialised; first commit made locally
- [x] Pushed to GitHub: https://github.com/bharathmit/crop-season-app
- [x] GitHub Pages deploy workflow (.github/workflows/deploy.yml)

## Phase 1 — Data model
- [x] Design tables, views, RLS in docs/data-model.md
- [x] Owner review and approval (v3)
- [x] Migration 0001_init.sql (tested locally: npm run test:db)
- [x] Seed: 0002_seed_defaults.sql — 26 categories, 105 items, 34 paddy guidance lines

## Phase 2 — Masters
- [x] Auth: email + password login / create account (src/pages/LoginPage.tsx, app/auth.tsx, RequireAuth)
- [x] Call seed_my_defaults() after login (once per page load; idempotent)
- [x] Responsive app shell: bottom bar + floating + (phone), icon sidebar (md), labelled sidebar (lg), quick-add sheet — checked at 360 / 768 / 1280
- [ ] Owner: set Supabase Auth Site URL + redirect URL to the GitHub Pages address; disable sign-ups after creating the account
- [ ] Farms CRUD
- [ ] Machinery CRUD
- [ ] Crops CRUD (season, year, acres, harvest) + stage editor (add / rename / reorder / hide)
- [ ] Categories + items editor

## Phase 3 — Transactions
- [ ] Expense / income entry for crop (stage auto-suggest), farm and machinery — live per-acre
- [ ] Bill photo upload
- [ ] Transaction list with filters

## Phase 4 — Tasks
- [x] Migration 0003_tasks.sql (tasks replace crop_checklist) — tested + applied to Supabase
- [ ] Tasks per crop stage / farm / machine (add, tick, due date)
- [ ] Dashboard: due today / overdue

## Phase 5 — Reports
- [ ] Crop profit (v_crop_profit)
- [ ] Spend per stage chart (v_crop_stage_summary)
- [ ] Category summary (v_category_summary)
- [ ] Overall profit: crop + farm + machinery (v_overall_profit)

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
- 2026-11-03 — Data model v3 approved. Wrote 0001_init.sql (9 tables, triggers, RLS, 4 views, bills bucket) and 0002_seed_defaults.sql; local PGlite test passes (figures match owner's Excel). Feature folders renamed to farms / machinery / transactions.
- 2026-11-03 — Created Supabase project crop-season-app (Singapore region); applied 0001_init + 0002_seed_defaults; 9 tables, 4 views, 9 RLS tables, bills bucket verified; advisor: no issues.
- 2026-11-03 — Reviewed owner's reference app (pannai.marutham.com); wrote docs/ui-plan.md (shell, 10 screens, v1 exclusions).
- 2026-11-03 — Added tasks (crop stage / farm / machinery) via 0003_tasks.sql; guidance checklist now copied as tasks; applied to Supabase, advisor clean.
- 2026-11-03 — Standing rule added: responsive UI on every screen (CLAUDE.md › Responsive UI).
- 2026-11-03 — Step 1 done: login + responsive shell (lucide-react icons). Dev-only VITE_UI_PREVIEW=1 skips login for screenshot checks.
