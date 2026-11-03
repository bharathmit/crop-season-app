# Progress

Update at the end of every session: tick what is done, set the current step, add a dated line to the session log.

**Current step:** Phase 6 — owner uses v1 for a season and reports fixes. All v1 screens built.

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
- [x] Farms CRUD (Farm page: cards, add / edit / delete)
- [x] Machinery CRUD (type chips, cards on phone / table md+)
- [x] Crops CRUD (season, year, acres, harvest) + stage chips list + crop panel (current stage, expense / income / tasks / yield tiles with per acre) + stage editor (add / rename / reorder / hide / delete)
- [x] Migration 0004_crop_current_stage.sql — crops.current_stage_id (first stage on insert) — tested + applied
- [x] Settings: Categories & items editor (crop / farm / machine × expense / income; rename, hide, delete if unused, usual stage, default unit, add), Stage checklist editor (per crop name; Do / Watch / Save lines; start a checklist for another crop), Account (email, sign out)

## Phase 3 — Transactions
- [x] Expense / income entry for crop (stage chips, item default stage, current stage), farm and machinery — qty × rate, subsidy / bonus, live net + per acre, new item inline, Save & add more (TransactionForm; quick add /add/expense, /add/income)
- [x] Bill photo upload (private bills/<uid>/… ; signed link to open)
- [x] Crop panel: expense by stage bars + entries list (tap to edit / delete)
- [x] Farm and machinery entry lists (Farm card totals + /farm/:id/entries; Machinery expense / income / net + /machinery/:id/entries)
- [x] Entries page (EntriesPage) for crop / farm / machine: expense / income / net tiles with per acre, type toggle, stage or category chips with ₹ and ₹/ac, cards on phone / table md+, bill link, tap to edit

## Phase 4 — Tasks
- [x] Migration 0003_tasks.sql (tasks replace crop_checklist) — tested + applied to Supabase
- [x] Tasks page (/tasks): Open / Overdue / Due today / Next 7 days / Done chips, All / Crops / Farm / Machines, grouped by crop › stage, farm, machine; tick; add / edit / delete (TaskForm; quick add /add/task); crop panel 'This stage's tasks' + tasks tile → /tasks?crop=
- [x] Dashboard (Home): farm card + switcher, This month / This year / All time, net profit / income / expense with per acre, crop / farm / machinery net, expense by stage or category, expense vs income last 6 months, crops summary, overdue & due-soon tasks

## Phase 5 — Reports
- [x] Reports page: crop P&L (revenue, expense, profit with per acre, ROI, cost-benefit, net yield, avg price, profit / qtl, break-even yield + price)
- [x] Expense by stage table (v_crop_stage_summary) + crop panel / dashboard bars
- [x] By category table (v_category_summary) + crops compared per acre
- [x] Overall profit by year: crop + farm + machinery (v_overall_profit)
- [x] CSV download per table + all entries CSV (Excel-ready, UTF-8 BOM); print layout (nav hidden)

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
- 2026-11-03 — Phase 2 screens: Farm, Machinery, Crops list + panel + stage editor; shared UI (Sheet, form, Chips, EmptyState, AmountWithPerAcre, lib/format, lib/perAcre, lib/useRows). Responsive check at 360/768/1280 with Playwright-mocked Supabase data; fixed stage editor wrap on phone and crop table columns.
- 2026-11-03 — Step 3: expense / income entry + crop panel spend by stage and entries. Live DB sample data loaded for the owner: Sorathur Farm (5 ac), Power Tiller, Paddy White Ponni Samba 2026 (5 ac, stage Seeding), 10 crop expenses from reference app / Excel (₹29,830), machinery diesel ₹2,000 + sample hire-out ₹3,000, sample farm land tax ₹600, 3 own tasks + 34 guidance tasks. Entries marked 'Sample entry' in remarks are invented.
- 2026-11-03 — Step 4: shared EntriesPage (crop / farm / machine), crop panel shows latest 5 + View all, Farm cards with farm totals, Machinery list with expense / income / net. Responsive check at 360/768/1280.
- 2026-11-03 — Step 5: Dashboard + Tasks. Tasks added to the sidebar (phone reaches it from Home and the crop panel). Responsive check at 360/768/1280.
- 2026-11-03 — Reports page with CSV export and print. Responsive check at 360/768/1280 (category table: badge under name, % hidden on phone).
- 2026-11-03 — Settings page done; v1 feature-complete. Responsive check at 360/768/1280 (fixed guidance row layout).
- 2026-11-03 — Fix: Edit expense/income sheet lost the saved item (category reset raced the lookups load). Known gap: entries whose item/category was deactivated still open with a blank item.
- 2026-11-03 — Owner changes: no per acre for farm / machinery; period filter (This month / This year / Custom / All, default This year) on Farm, Machinery and farm / machine entries; category dropdown replaces chips on farm / machine entries; entry form opened from a crop, farm or machine hides the Expense/Income and Crop/Farm/Machine toggles. Responsive check at 360/768/1280.
- 2026-11-03 — Landing pages: Farm / Machinery show current-year totals (period filter kept on entries pages only). 0005_farm_is_active applied to Supabase (advisor: only the existing leaked-password setting). Farm form has In use; Farm page shows active farms. Machinery tabs In use / Not in use. Responsive check at 360/768/1280.
- 2026-11-03 — Entry form farm picker lists farms in use only (plus the entry's own farm when editing / opened from that farm).
