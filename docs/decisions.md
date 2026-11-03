# Decisions log

Newest first. Each entry: date, decision, reason. Change a decision only with the owner's approval and add a new entry.

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-11-03 | Crops track `current_stage_id`, moved by the owner from the crop panel | Needed for stage chips and default stage in entry (as in the reference app) |
| 2026-11-03 | Every screen responsive (phone / tablet / desktop), checked at 360, 768, 1280 px before done | Owner rule |
| 2026-11-03 | Tasks for crop stage / farm / machinery in one `tasks` table that also holds the stage guidance checklist (replaces crop_checklist) | Owner's request; one list instead of two; stays at 9 tables |
| 2026-11-03 | Data model v3 approved; `paid_by` kept as free text | Owner approved; Paid By meaning not specified |
| 2026-11-03 | Default lists load per user via `seed_my_defaults()` called once after first login | Rows are user-owned and editable; seed needs `auth.uid()` |
| 2026-11-03 | Data model v3: farms + machinery + crops each have expenses and income in one `transactions` table (scope crop / farm / machinery); crops, seasons, crop cycles and harvest merged into one `crops` table | Owner's request: fewer tables, farm and machinery costs in overall profit |
| 2026-11-03 | Show per-acre value beside every crop-cycle amount, live while typing in entry forms | Owner's request; compare costs across plots of different size |
| 2026-11-03 | Farm and machinery amounts shown without per acre; period filter (month / year / custom / all) on Farm, Machinery and their entries pages; category dropdown on farm / machine entries; Add / Edit opened from a crop, farm or machine hides the type and scope toggles | Owner request after first use |
| 2026-11-03 | Farm and Machinery landing pages: current-year totals, no period filter. Farms get is_active (0005); Farm page tabs In use / Not in use (like Machinery). Machinery tabs: In use / Not in use (replace type chips) | Owner request |
| 2026-11-03 | Coloured Expense / Income / Net tiles on Farm (current year), Machinery (current year) and Crops (all entries) lists. Home: Custom period; no per acre on Home; Crops summary of active crops drives the two charts | Owner request |
| 2026-11-03 | Default stages for all crops: Preparation, Seeding, Transplanting, Growing, Fruiting, Harvesting, Post Harvest, Sold; editable per crop | Owner's list; one simple list fits all crops |
| 2026-11-02 | Hosting: GitHub Pages via GitHub Actions, deploy on push to `main`; Supabase URL/key from repo secrets | Free, no extra account, automatic |
| 2026-11-02 | Frontend: React + TypeScript + Vite + Tailwind CSS v4 + React Router | Fast setup, typed code, mobile-first styling |
| 2026-11-02 | Backend: Supabase (Postgres, Auth, Storage, SQL views) — no custom API server | Least backend work; reports as SQL views |
| 2026-11-02 | First version scope: expenses, income, cash profit, stage checklist, spend per stage | Owner's choice; other reports later |
| 2026-11-02 | Existing Excel paddy tracker (v10) is reference only, not imported | Owner's choice |
| 2026-11-02 | Responsive web app for phone and desktop | Owner enters data on both |
| 2026-11-02 | Cash profit only — family labour and own-farm inputs not costed | Owner's choice |
| 2026-11-02 | Single user (owner only) — no roles or permissions | Owner is the only data entry person |
| 2026-11-02 | Multi-crop: crops and stages are master data, not code | App must handle any crop; paddy first |

Requirements analysis doc (source): https://claude.ai/artifact/7P3uv2edwX6jNvt5dtu9ub
