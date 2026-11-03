// Local schema test: applies migrations to in-memory Postgres (PGlite) with Supabase auth/storage stubs,
// seeds defaults, inserts sample data matching the owner Excel sheet, prints the report views,
// and checks the guards and RLS. Run: npm run test:db
import { PGlite } from '@electric-sql/pglite'
import fs from 'fs'
const dir = process.argv[2]
const db = new PGlite()
const run = (s) => db.exec(s)
const q = async (s, label) => { const r = await db.query(s); if (label) { console.log('--', label); console.table(r.rows) } return r.rows }
await run(`
create role authenticated; 
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean);
create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
grant usage on schema public, auth, storage to authenticated;
`)
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) { await run(fs.readFileSync(`${dir}/${f}`, 'utf8')); console.log('applied', f) }
await run(`grant all on all tables in schema public to authenticated;`)
const U1 = '11111111-1111-1111-1111-111111111111', U2 = '22222222-2222-2222-2222-222222222222'
await run(`set role authenticated; set request.jwt.claim.sub = '${U1}';`)
await run(`select seed_my_defaults(); select seed_my_defaults();`)
await q(`select (select count(*) from categories) cats, (select count(*) from items) items, (select count(*) from stage_guidance) guidance`, 'seeded (idempotent)')
const [farm] = await q(`insert into farms (name, area_acres) values ('Villupuram', 10) returning id`)
const [crop] = await q(`insert into crops (farm_id, crop_name, variety, season, season_year, area_acres, gross_yield_qtl) values ('${farm.id}','paddy','White Ponni','Samba',2026,5.5,150) returning id, net_yield_qtl`, 'crop')
await q(`select c.crop_name, s.name current_stage from crops c join crop_stages s on s.id=c.current_stage_id`, 'current stage on insert')
await q(`select s.sort_order, s.name, count(k.id) guidance_tasks from crop_stages s left join tasks k on k.crop_stage_id=s.id where s.crop_id='${crop.id}' group by s.id order by s.sort_order`, 'auto stages + guidance tasks')
const [mach] = await q(`insert into machinery (farm_id, name, type) values ('${farm.id}','Tractor','tractor') returning id`)
const item = (n) => `(select id from items where name='${n}')`
const stage = (n) => `(select id from crop_stages where crop_id='${crop.id}' and name='${n}')`
await run(`
insert into transactions (entry_type, scope, crop_id, crop_stage_id, item_id, start_date, quantity, unit, rate, amount) values
 ('expense','crop','${crop.id}',${stage('Seeding')},${item('Certified Paddy Seeds')},'2026-10-01',3,'bag',3000,9000),
 ('expense','crop','${crop.id}',${stage('Preparation')},${item('Nursery Bed Preparation')},'2026-10-01',null,null,null,500),
 ('expense','crop','${crop.id}',${stage('Transplanting')},${item('Zinc Sulphate (33%)')},'2026-11-02',25,'kg',90,2250);
insert into transactions (entry_type, scope, crop_id, crop_stage_id, item_id, start_date, amount, govt_support) values
 ('expense','crop','${crop.id}',${stage('Transplanting')},${item('Herbicide – Pre-emergent (Butachlor / Pretilachlor)')},'2026-11-02',2000,0);
insert into transactions (entry_type, scope, crop_id, crop_stage_id, item_id, start_date, quantity, unit, rate, amount, govt_support) values
 ('income','crop','${crop.id}',${stage('Sold')},${item('Paddy Sale (net yield)')},'2027-01-20',142.5,'Quintal',2450,349125,1000);
insert into transactions (entry_type, scope, farm_id, item_id, start_date, amount) values
 ('expense','farm','${farm.id}',${item('Fencing')},'2026-06-01',20000);
insert into transactions (entry_type, scope, machinery_id, item_id, start_date, amount) values
 ('expense','machinery','${mach.id}',${item('Diesel')},'2026-10-05',3000),
 ('income','machinery','${mach.id}',${item('Hire-out income (per hour / per acre)')},'2026-10-10',8000);
`)
await run(`
insert into tasks (scope, crop_id, crop_stage_id, title, due_date) values ('crop','${crop.id}',${stage('Growing')},'Book weeder for day 15','2026-01-01');
insert into tasks (scope, farm_id, title, due_date) values ('farm','${farm.id}','Pay land tax (kist)','2999-01-01');
insert into tasks (scope, machinery_id, title, status) values ('machinery','${mach.id}','Service power tiller','done');
update tasks set status='done' where title='Summer ploughing';
`)
await q(`select scope, source, title, status, done_on is not null as stamped, (farm_id is not null) has_farm, (due_date < current_date and status='open') overdue from tasks where source='manual' or title='Summer ploughing' order by scope, title`, 'tasks (manual + one guidance done)')
await q(`select stage_name, expense_net, expense_per_acre, share_pct from v_crop_stage_summary where crop_id='${crop.id}' order by sort_order`, 'v_crop_stage_summary')
await q(`select scope, entry_type, category_name, net_total, net_per_acre, share_pct from v_category_summary order by scope, entry_type, sort_order`, 'v_category_summary')
await q(`select revenue, expense, profit, profit_per_acre, roi_pct, cost_benefit_ratio, profit_per_qtl, produce_price_per_qtl, breakeven_yield_qtl_per_acre, breakeven_price_per_qtl from v_crop_profit`, 'v_crop_profit')
await q(`select year, crop_net, farm_net, machinery_net, overall_profit, overall_per_acre from v_overall_profit order by year`, 'v_overall_profit')
// negative checks
for (const [label, sql] of [
  ['wrong scope item', `insert into transactions (entry_type, scope, farm_id, item_id, start_date, amount) values ('expense','farm','${farm.id}',${item('Diesel')},'2026-01-01',1)`],
  ['task stage from other crop', `insert into tasks (scope, crop_id, crop_stage_id, title) values ('crop','${crop.id}',(select id from crop_stages where crop_id<>'${crop.id}' limit 1),'x')`],
  ['current stage from other crop', `update crops set current_stage_id=gen_random_uuid() where id='${crop.id}'`],
  ['crop without stage', `insert into transactions (entry_type, scope, crop_id, item_id, start_date, amount) values ('expense','crop','${crop.id}',${item('Pump Set Diesel')},'2026-01-01',1)`],
  ['delete used stage', `delete from crop_stages where id=${stage('Seeding')}`],
]) { try { await run(sql); console.log('FAIL (allowed):', label) } catch (e) { console.log('blocked OK:', label, '→', e.message.split('\n')[0]) } }
await run(`set request.jwt.claim.sub = '${U2}';`)
await q(`select (select count(*) from farms) farms, (select count(*) from transactions) tx, (select count(*) from v_overall_profit) overall`, 'other user sees (RLS)')
