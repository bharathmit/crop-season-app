# Crop Season Manager

Track crop-wise expenses, cash profit, stage-wise spend and a stage checklist. React + TypeScript + Vite + Tailwind + Supabase.

## Run locally
```bash
npm install
cp .env.example .env.local   # fill in Supabase URL and publishable key
npm run dev
```

## Working with Claude Code
- Project memory: `CLAUDE.md` (auto-loaded) and `docs/`
- Start a session with `/next-task`; end it with `/update-progress`
- Progress: `docs/progress.md` · Decisions: `docs/decisions.md`
