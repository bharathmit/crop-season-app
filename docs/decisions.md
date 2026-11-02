# Decisions log

Newest first. Each entry: date, decision, reason. Change a decision only with the owner's approval and add a new entry.

| Date | Decision | Reason |
| --- | --- | --- |
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
