# Crop Season Manager — Claude Code project memory

Responsive web app for one farmer (Bharath) to track **crop-wise expenses and cash profit**, **stage-wise spend**, and a **recommended-activity checklist per crop stage**. Paddy is the main crop (Villupuram, Tamil Nadu); the app must handle any crop.

## Read at the start of every session
1. `docs/progress.md` — what is done, in progress, next. **Update it at the end of every session.**
2. `docs/decisions.md` — settled decisions. Do not re-open them without asking.
3. `docs/requirements.md` — first-version scope (what is in and out).
4. `docs/data-model.md` — tables and views (status shown at top of file).

## Working rules (owner preferences)
- Plan first, then build. Ask before any large or unrequested change.
- Make targeted, minimal changes. Do not refactor unrelated code.
- Work in small steps across sessions; leave the repo buildable at the end of each step.
- Never commit secrets. Supabase keys live in `.env.local` (git-ignored).

## Stack
- React 19 + TypeScript + Vite
- Tailwind CSS v4 (via `@tailwindcss/vite`), mobile-first
- React Router (`src/app/router.tsx`)
- Supabase: Postgres, Auth (single user), Storage (bill photos), SQL views for reports
- Hosting: GitHub Pages, auto-deployed by `.github/workflows/deploy.yml` on every push to `main`

## Commands
- `npm run dev` — local dev server
- `npm run build` — type-check + production build (must pass before a step is marked done)
- `npm run lint` — oxlint

## Folder layout
```
src/
  app/            router and app-wide setup
  components/     shared UI (layout/, form controls, tables)
  features/       one folder per feature: plots, seasons, crops, stages,
                  crop-cycles, expenses, income, checklist, reports
                  (each holds its pages, components, and data hooks)
  lib/            supabase client, formatters (₹, dates), helpers
  pages/          generic pages (placeholder, not-found)
  types/          shared domain types
supabase/
  migrations/     SQL migrations, numbered: 0001_init.sql, 0002_...
  seed/           seed data (paddy stage template + checklist)
docs/             requirements, decisions, data model, progress, stage templates
.claude/commands/ project slash commands (/update-progress, /next-task)
```

## Domain glossary
- **Crop cycle**: one crop on one plot in one season (plot + season + crop + variety + area + sowing date). Every expense, income and checklist tick belongs to a crop cycle.
- **Stage**: an ordered phase of a crop. Default list for every crop: Preparation → Seeding → Transplanting → Growing → Fruiting → Harvesting → Post Harvest → Sold. Each crop gets its own copy; the user can add, rename, reorder or deactivate stages per crop.
- **Cash profit**: income received − money paid out. Family labour and own-farm inputs are **not** costed (they may be logged by quantity only).
- **Seasons**: Kuruvai, Samba, Navarai, or custom.

## Conventions
- Money in INR, stored as `numeric(12,2)`; display with `₹` and Indian grouping (`en-IN`).
- Dates stored as `date` (ISO), displayed DD-MM-YYYY.
- Areas in acres.
- Table and column names in snake_case; TS types in camelCase.
- Every user-owned table has `user_id` + row-level security limiting rows to `auth.uid()`.
