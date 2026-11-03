# Crop Season Manager — Claude Code project memory

Responsive web app for one farmer (Bharath) to track **crop-wise expenses and cash profit**, **stage-wise spend**, and a **recommended-activity checklist per crop stage**. Paddy is the main crop (Villupuram, Tamil Nadu); the app must handle any crop.

## Read at the start of every session
1. `docs/progress.md` — what is done, in progress, next. **Update it at the end of every session.**
2. `docs/decisions.md` — settled decisions. Do not re-open them without asking.
3. `docs/requirements.md` — first-version scope (what is in and out).
4. `docs/data-model.md` — tables and views (status shown at top of file).
5. `docs/ui-plan.md` — screens and layout (modelled on the owner's reference app).

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
  - Project: `crop-season-app`, ref `pwplyirgvgcnzugutirc`, region ap-southeast-1, URL https://pwplyirgvgcnzugutirc.supabase.co
  - Apply new migrations with the Supabase MCP `apply_migration` (same file name), after `npm run test:db` passes
- Hosting: GitHub Pages, auto-deployed by `.github/workflows/deploy.yml` on every push to `main`

## Commands
- `npm run dev` — local dev server
- `npm run build` — type-check + production build (must pass before a step is marked done)
- `npm run lint` — oxlint
- `npm run test:db` — apply migrations to in-memory Postgres and check views, guards, RLS (run after any SQL change)

## Folder layout
```
src/
  app/            router and app-wide setup
  components/     shared UI (layout/, form controls, tables)
  features/       one folder per feature: farms, machinery, crops, stages,
                  transactions (expense + income entry), checklist, reports
                  (each holds its pages, components, and data hooks)
  lib/            supabase client, formatters (₹, dates), helpers
  pages/          generic pages (placeholder, not-found)
  types/          shared domain types
supabase/
  migrations/     SQL migrations, numbered: 0001_init.sql, 0002_...
  seed/           (unused — defaults load via seed_my_defaults() in 0002)
  tests/          schema-test.mjs (npm run test:db)
docs/             requirements, decisions, data model, progress, stage templates
.claude/commands/ project slash commands (/update-progress, /next-task)
```

## Domain glossary
- **Farm**: a land holding with its own acres. Has farm-level expenses and income (borewell, fencing, lease, tax).
- **Machinery**: an owned machine (tractor, power tiller…) on a farm. Has its own expenses (fuel, repair, EMI) and income (hire-out).
- **Crop**: one crop grown on one farm in one season (crop name + variety + season + year + acres + sowing date + harvest). Crop expenses and income are tagged with a stage.
- **Overall profit** = crop profit + farm net + machinery net.
- **Stage**: an ordered phase of a crop. Default list for every crop: Preparation → Seeding → Transplanting → Growing → Fruiting → Harvesting → Post Harvest → Sold. Each crop gets its own copy; the user can add, rename, reorder or deactivate stages per crop.
- **Cash profit**: income received − money paid out. Family labour and own-farm inputs are **not** costed (they may be logged by quantity only).
- **Seasons**: Kuruvai, Samba, Navarai, or custom.

## Conventions
- Money in INR, stored as `numeric(12,2)`; display with `₹` and Indian grouping (`en-IN`).
- Dates stored as `date` (ISO), displayed DD-MM-YYYY.
- Areas in acres.
- **Per-acre everywhere:** every money figure tied to a crop, farm or machine (expense, subsidy, net, income, totals, profit) is shown with its per-acre value = amount ÷ `crops.area_acres` (crop) or `farms.area_acres` (farm, machinery). In entry forms it updates live as the user types (e.g. 6 acres: ₹9,000 → ₹1,500 / acre). Use one shared helper/component (`lib/perAcre.ts`, `<AmountWithPerAcre>`).
- Table and column names in snake_case; TS types in camelCase.
- Every user-owned table has `user_id` + row-level security limiting rows to `auth.uid()`.
