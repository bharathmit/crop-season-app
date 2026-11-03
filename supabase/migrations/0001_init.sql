-- 0001_init.sql — Crop Season Manager schema (data model v3, approved 2026-11-03)
-- 9 tables, triggers, RLS, 4 report views, bills storage bucket.
-- Default lists (categories, items, stage guidance) are loaded per user by
-- public.seed_my_defaults() — see 0002_seed_defaults.sql.

-- ─────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────

create table public.farms (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid(),
  name          text not null,
  location      text,
  survey_no     text,
  area_acres    numeric(6,2) not null check (area_acres > 0),
  ownership     text check (ownership in ('owned','leased')),
  soil_type     text,
  water_source  text,
  created_at    timestamptz not null default now()
);

create table public.machinery (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid(),
  farm_id        uuid not null references public.farms(id) on delete restrict,
  name           text not null,
  type           text check (type in ('tractor','power tiller','sprayer','pump set','harvester','other')),
  purchase_date  date,
  purchase_cost  numeric(12,2),
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

create table public.crops (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid(),
  farm_id            uuid not null references public.farms(id) on delete restrict,
  crop_name          text not null,
  variety            text,
  season             text not null,              -- Kuruvai / Samba / Navarai / custom
  season_year        int  not null check (season_year between 2000 and 2100),
  area_acres         numeric(6,2) not null check (area_acres > 0),
  sowing_date        date,
  status             text not null default 'planned'
                     check (status in ('planned','active','harvested','closed')),
  harvest_date       date,
  gross_yield_qtl    numeric(10,2),
  moisture_loss_pct  numeric(5,2) not null default 5 check (moisture_loss_pct between 0 and 100),
  net_yield_qtl      numeric(10,2) generated always as
                     (round(gross_yield_qtl * (1 - moisture_loss_pct / 100), 2)) stored,
  created_at         timestamptz not null default now()
);

create table public.crop_stages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid(),
  crop_id     uuid not null references public.crops(id) on delete cascade,
  name        text not null,
  sort_order  int  not null,
  start_day   int,
  end_day     int,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (crop_id, name)
);

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid(),
  scope       text not null check (scope in ('crop','farm','machinery')),
  entry_type  text not null check (entry_type in ('expense','income')),
  name        text not null,
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (user_id, scope, entry_type, name)
);

create table public.items (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid(),
  category_id         uuid not null references public.categories(id) on delete restrict,
  name                text not null,
  default_stage_name  text,
  default_unit        text,
  sort_order          int  not null default 0,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  unique (category_id, name)
);

create table public.transactions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid(),
  entry_type     text not null check (entry_type in ('expense','income')),
  scope          text not null check (scope in ('crop','farm','machinery')),
  farm_id        uuid not null references public.farms(id) on delete restrict,
  crop_id        uuid references public.crops(id) on delete restrict,
  crop_stage_id  uuid references public.crop_stages(id) on delete restrict,
  machinery_id   uuid references public.machinery(id) on delete restrict,
  item_id        uuid not null references public.items(id) on delete restrict,
  start_date     date not null,
  end_date       date check (end_date is null or end_date >= start_date),
  quantity       numeric(10,2),
  unit           text,
  rate           numeric(12,2),
  amount         numeric(12,2) not null check (amount >= 0),
  govt_support   numeric(12,2) not null default 0 check (govt_support >= 0),
  net_amount     numeric(12,2) generated always as
                 (case when entry_type = 'expense' then amount - govt_support
                       else amount + govt_support end) stored,
  party          text,          -- supplier (expense) / buyer, mill (income)
  invoice_no     text,
  paid_by        text,
  paid_on        date,
  remarks        text,
  bill_path      text,          -- object path in the private 'bills' bucket
  created_at     timestamptz not null default now(),
  constraint transactions_scope_ids check (
       (scope = 'crop'      and crop_id is not null and crop_stage_id is not null and machinery_id is null)
    or (scope = 'farm'      and crop_id is null     and crop_stage_id is null     and machinery_id is null)
    or (scope = 'machinery' and machinery_id is not null and crop_id is null      and crop_stage_id is null)
  )
);

create table public.stage_guidance (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid(),
  crop_name   text not null,
  stage_name  text not null,
  type        text not null check (type in ('do','watch','save')),
  text        text not null,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create table public.crop_checklist (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid(),
  crop_stage_id  uuid not null references public.crop_stages(id) on delete cascade,
  type           text not null check (type in ('do','watch','save')),
  text           text not null,
  sort_order     int  not null default 0,
  is_done        boolean not null default false,
  done_on        date,
  note           text,
  created_at     timestamptz not null default now()
);

-- Indexes for the common lookups
create index on public.machinery (farm_id);
create index on public.crops (farm_id, season_year);
create index on public.crop_stages (crop_id, sort_order);
create index on public.items (category_id);
create index on public.transactions (crop_id, crop_stage_id);
create index on public.transactions (farm_id, scope, start_date);
create index on public.transactions (machinery_id);
create index on public.stage_guidance (user_id, lower(crop_name), lower(stage_name));
create index on public.crop_checklist (crop_stage_id);

-- ─────────────────────────────────────────────────────────────
-- Triggers
-- ─────────────────────────────────────────────────────────────

-- New crop → copy the 8 default stages and matching stage guidance.
create or replace function public.crops_after_insert()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  insert into public.crop_stages (user_id, crop_id, name, sort_order)
  select new.user_id, new.id, s.name, s.ord
  from unnest(array['Preparation','Seeding','Transplanting','Growing',
                    'Fruiting','Harvesting','Post Harvest','Sold'])
       with ordinality as s(name, ord);

  insert into public.crop_checklist (user_id, crop_stage_id, type, text, sort_order)
  select new.user_id, cs.id, g.type, g.text, g.sort_order
  from public.crop_stages cs
  join public.stage_guidance g
    on g.user_id = new.user_id
   and lower(g.crop_name)  = lower(new.crop_name)
   and lower(g.stage_name) = lower(cs.name)
  where cs.crop_id = new.id;

  return new;
end $$;

create trigger crops_after_insert
after insert on public.crops
for each row execute function public.crops_after_insert();

-- Transaction checks: fill farm_id from crop / machine; stage belongs to crop;
-- item category matches scope and entry type; qty × rate fills amount.
create or replace function public.transactions_before_write()
returns trigger language plpgsql security invoker set search_path = public as $$
declare
  v_farm uuid;
  v_cat  record;
begin
  if new.scope = 'crop' then
    select farm_id into v_farm from public.crops where id = new.crop_id;
    if not exists (select 1 from public.crop_stages
                   where id = new.crop_stage_id and crop_id = new.crop_id) then
      raise exception 'Stage does not belong to this crop';
    end if;
  elsif new.scope = 'machinery' then
    select farm_id into v_farm from public.machinery where id = new.machinery_id;
  end if;

  if v_farm is not null then
    if new.farm_id is not null and new.farm_id <> v_farm then
      raise exception 'farm_id does not match the crop or machine farm';
    end if;
    new.farm_id := v_farm;
  end if;

  select c.scope, c.entry_type into v_cat
  from public.items i join public.categories c on c.id = i.category_id
  where i.id = new.item_id;
  if v_cat.scope <> new.scope or v_cat.entry_type <> new.entry_type then
    raise exception 'Item category (% %) does not match entry (% %)',
      v_cat.scope, v_cat.entry_type, new.scope, new.entry_type;
  end if;

  if new.quantity is not null and new.rate is not null
     and (new.amount is null or tg_op = 'INSERT' and new.amount = 0) then
    new.amount := round(new.quantity * new.rate, 2);
  end if;

  return new;
end $$;

create trigger transactions_before_write
before insert or update on public.transactions
for each row execute function public.transactions_before_write();

-- ─────────────────────────────────────────────────────────────
-- Row-level security: every row belongs to auth.uid()
-- ─────────────────────────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array['farms','machinery','crops','crop_stages','categories',
                           'items','transactions','stage_guidance','crop_checklist']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy own_rows on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────
-- Report views (security_invoker → RLS of the caller applies)
-- ─────────────────────────────────────────────────────────────

-- Expense per crop and stage, with per-acre and % share of the crop's expense.
create view public.v_crop_stage_summary with (security_invoker = true) as
select c.id as crop_id, c.crop_name, c.season, c.season_year, c.area_acres,
       s.id as crop_stage_id, s.name as stage_name, s.sort_order,
       coalesce(sum(t.net_amount), 0)                          as expense_net,
       round(coalesce(sum(t.net_amount), 0) / c.area_acres, 2) as expense_per_acre,
       round(100 * coalesce(sum(t.net_amount), 0)
             / nullif(sum(sum(t.net_amount)) over (partition by c.id), 0), 1) as share_pct
from public.crops c
join public.crop_stages s on s.crop_id = c.id
left join public.transactions t
       on t.crop_stage_id = s.id and t.entry_type = 'expense'
group by c.id, s.id;

-- Totals per scope and category; per-acre uses crop acres for crop rows,
-- farm acres for farm and machinery rows.
create view public.v_category_summary with (security_invoker = true) as
select t.farm_id, t.scope, t.entry_type, t.crop_id, t.machinery_id,
       cat.id as category_id, cat.name as category_name, cat.sort_order,
       sum(t.net_amount) as net_total,
       round(sum(t.net_amount) / max(coalesce(c.area_acres, f.area_acres)), 2) as net_per_acre,
       round(100 * sum(t.net_amount)
             / nullif(sum(sum(t.net_amount)) over
                 (partition by t.farm_id, t.scope, t.entry_type, t.crop_id, t.machinery_id), 0), 1) as share_pct
from public.transactions t
join public.items i        on i.id = t.item_id
join public.categories cat on cat.id = i.category_id
join public.farms f        on f.id = t.farm_id
left join public.crops c   on c.id = t.crop_id
group by t.farm_id, t.scope, t.entry_type, t.crop_id, t.machinery_id, cat.id;

-- Crop P&L (owner's Excel summary). Main-produce price = weighted average rate
-- of 'Produce Sales' income sold per Quintal.
create view public.v_crop_profit with (security_invoker = true) as
with sums as (
  select t.crop_id,
         coalesce(sum(t.net_amount) filter (where t.entry_type = 'income'),  0) as revenue,
         coalesce(sum(t.net_amount) filter (where t.entry_type = 'expense'), 0) as expense,
         sum(t.amount)   filter (where cat.name = 'Produce Sales' and lower(t.unit) = 'quintal') as produce_amount,
         sum(t.quantity) filter (where cat.name = 'Produce Sales' and lower(t.unit) = 'quintal') as produce_qtl
  from public.transactions t
  join public.items i        on i.id = t.item_id
  join public.categories cat on cat.id = i.category_id
  where t.scope = 'crop'
  group by t.crop_id
)
select c.id as crop_id, c.farm_id, c.crop_name, c.variety, c.season, c.season_year,
       c.area_acres, c.net_yield_qtl,
       coalesce(s.revenue, 0)                                  as revenue,
       coalesce(s.expense, 0)                                  as expense,
       coalesce(s.revenue, 0) - coalesce(s.expense, 0)         as profit,
       round(coalesce(s.revenue, 0) / c.area_acres, 2)         as revenue_per_acre,
       round(coalesce(s.expense, 0) / c.area_acres, 2)         as expense_per_acre,
       round((coalesce(s.revenue, 0) - coalesce(s.expense, 0)) / c.area_acres, 2) as profit_per_acre,
       round(100 * (coalesce(s.revenue, 0) - coalesce(s.expense, 0)) / nullif(s.expense, 0), 1) as roi_pct,
       round(coalesce(s.revenue, 0) / nullif(s.expense, 0), 2) as cost_benefit_ratio,
       round((coalesce(s.revenue, 0) - coalesce(s.expense, 0)) / nullif(c.net_yield_qtl, 0), 2) as profit_per_qtl,
       round(s.produce_amount / nullif(s.produce_qtl, 0), 2)   as produce_price_per_qtl,
       round((coalesce(s.expense, 0) / c.area_acres)
             / nullif(s.produce_amount / nullif(s.produce_qtl, 0), 0), 2) as breakeven_yield_qtl_per_acre,
       round(coalesce(s.expense, 0) / nullif(c.net_yield_qtl, 0), 2)     as breakeven_price_per_qtl
from public.crops c
left join sums s on s.crop_id = c.id;

-- Overall profit per farm and year: crops (by season year) + farm + machinery
-- (by transaction year). Per acre over the farm's acres.
create view public.v_overall_profit with (security_invoker = true) as
with lines as (
  select t.farm_id, t.scope,
         case when t.scope = 'crop' then c.season_year
              else extract(year from t.start_date)::int end as year,
         case when t.entry_type = 'income' then t.net_amount else -t.net_amount end as signed
  from public.transactions t
  left join public.crops c on c.id = t.crop_id
)
select l.farm_id, f.name as farm_name, l.year, f.area_acres,
       coalesce(sum(l.signed) filter (where l.scope = 'crop'),      0) as crop_net,
       coalesce(sum(l.signed) filter (where l.scope = 'farm'),      0) as farm_net,
       coalesce(sum(l.signed) filter (where l.scope = 'machinery'), 0) as machinery_net,
       coalesce(sum(l.signed), 0)                                      as overall_profit,
       round(coalesce(sum(l.signed), 0) / f.area_acres, 2)             as overall_per_acre
from lines l
join public.farms f on f.id = l.farm_id
group by l.farm_id, f.name, l.year, f.area_acres;

-- ─────────────────────────────────────────────────────────────
-- Storage: private 'bills' bucket, files under <user_id>/...
-- ─────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('bills', 'bills', false)
on conflict (id) do nothing;

create policy bills_own_files on storage.objects for all to authenticated
  using      (bucket_id = 'bills' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'bills' and (storage.foldername(name))[1] = (select auth.uid())::text);
