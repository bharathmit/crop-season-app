# UI plan

Layout and flows modelled on the owner's reference app (pannai.marutham.com, reviewed 2026-11-03). Use it for structure only: no copied branding, logo, names or assets. Our features (stages, per-acre, subsidy, qty × rate, checklist, farm + machinery money) are added on top.

## Responsive rule
All screens follow the **Responsive UI** rules in `CLAUDE.md` (mobile-first; checked at 360, 768 and 1280 px wide).

## Shell
- **Desktop:** narrow left icon sidebar: Home, Crops, Farm, Machinery, Reports, Settings. Top bar: page title, search, user name.
- **Mobile:** same items as a bottom tab bar.
- **Global "+" button**: quick add for Expense, Income, Crop, Machine.
- Green / light theme, rounded cards, status chips.

## Screens
1. **Home / dashboard**
   - Farm card (name, acres) with a farm switcher.
   - Period filter: This month / Season / Year / Custom.
   - Summary tiles: Net profit, Income, Expense, each with **per acre**.
   - Expense vs income bar chart (by week or month).
   - Expense donut **by stage** (and a toggle to show by category).
   - Crops summary table: name, season, acres, expense, income, net profit, per acre.
   - Overall profit card: crop + farm + machinery.
2. **Crops list**
   - Stage filter chips with counts: All, Preparation … Sold, plus Closed.
   - Table / cards: name, variety, season, acres, crop age (days since sowing), current stage chip, sowing date.
3. **Crop detail** (side panel on desktop, full page on mobile)
   - Header: crop name, edit, close.
   - Info: crop, variety, season and year, farm, acres, age, current stage.
   - Tiles: Expense ₹ (per acre), Income ₹ (per acre), Yield (net qtl), Checklist (open / done).
   - Stage timeline: 8 stages with spend each; tap a stage → its expenses + checklist.
   - Edit stages: add, rename, reorder, hide.
4. **Expense / income list** for a crop, farm or machine
   - Crop: chips for All + each **stage** with ₹ total and per acre. Farm / machinery entries: period filter (This month / This year / Custom / All); the Farm and Machinery landing pages show current-year totals with no filter and a **category dropdown** listing only categories with entries, with ₹ totals (no per acre).
   - Rows: item, amount, per acre, stage chip, category, date, bill icon.
5. **Add expense / income** (modal on desktop, full screen on mobile)
   - Expense / Income toggle; scope: Crop · Farm · Machinery; pick the crop / farm / machine.
   - Stage chips (crop only, auto-suggested from crop age).
   - Category icon chips → item dropdown (stage pre-filled from item).
   - Qty × unit × rate → amount (or amount only), subsidy / govt bonus, **live net and per acre**.
   - Date (start, optional end), supplier / buyer, invoice no., paid by, remarks, bill photo.
   - Reset / Save.
6. **Machinery list**
   - Type chips (Tractor, Power tiller, Sprayer, Pump set, Harvester, Other).
   - Rows: name, type, purchase date, expense, income, net.
7. **Farm**: farm details, plus the farm's expense and income list (same pattern as 4).
8. **Checklist**: per crop and stage, Do / Watch / Save items with tick, date and note.
9. **Reports**: crop P&L (Excel summary metrics), stage summary, category summary, overall profit.
10. **Settings**: farms, categories and items, stage guidance; sign out.

8b. **Tasks**: per crop stage, farm and machine; add / tick / due date. Crop panel tile Open / Completed; dashboard Due today / Overdue.

## Not in v1 (seen in the reference)
Notes, Rain gauge, Farmers / Contacts, Inventory, Documents library, Machine hours driven.
