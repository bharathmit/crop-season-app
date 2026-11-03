-- 0003_tasks.sql — tasks for crop stages, farms and machinery (approved 2026-11-03).
-- Replaces crop_checklist: stage guidance is now copied in as tasks (source = 'guidance');
-- the owner adds their own tasks (source = 'manual'). Table count stays at 9.

create table public.tasks (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid(),
  scope          text not null check (scope in ('crop','farm','machinery')),
  farm_id        uuid not null references public.farms(id) on delete restrict,
  crop_id        uuid references public.crops(id) on delete cascade,
  crop_stage_id  uuid references public.crop_stages(id) on delete cascade,
  machinery_id   uuid references public.machinery(id) on delete cascade,
  title          text not null,
  notes          text,
  due_date       date,
  status         text not null default 'open' check (status in ('open','done')),
  done_on        date,
  source         text not null default 'manual' check (source in ('guidance','manual')),
  type           text check (type in ('do','watch','save')),
  sort_order     int  not null default 0,
  created_at     timestamptz not null default now(),
  constraint tasks_scope_ids check (
       (scope = 'crop'      and crop_id is not null and crop_stage_id is not null and machinery_id is null)
    or (scope = 'farm'      and crop_id is null     and crop_stage_id is null     and machinery_id is null)
    or (scope = 'machinery' and machinery_id is not null and crop_id is null      and crop_stage_id is null)
  )
);

create index on public.tasks (crop_stage_id, sort_order);
create index on public.tasks (farm_id, status, due_date);
create index on public.tasks (machinery_id);

alter table public.tasks enable row level security;
create policy own_rows on public.tasks for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Fill farm_id from crop / machine, check the stage belongs to the crop,
-- and stamp done_on when a task is completed.
create or replace function public.tasks_before_write()
returns trigger language plpgsql security invoker set search_path = public as $$
declare v_farm uuid;
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

  if new.status = 'done' and new.done_on is null then
    new.done_on := current_date;
  elsif new.status = 'open' then
    new.done_on := null;
  end if;

  return new;
end $$;

create trigger tasks_before_write
before insert or update on public.tasks
for each row execute function public.tasks_before_write();

-- Move any existing checklist rows into tasks, then drop the old table.
insert into public.tasks (user_id, scope, farm_id, crop_id, crop_stage_id, title, notes,
                          status, done_on, source, type, sort_order, created_at)
select k.user_id, 'crop', c.farm_id, c.id, k.crop_stage_id, k.text, k.note,
       case when k.is_done then 'done' else 'open' end, k.done_on,
       'guidance', k.type, k.sort_order, k.created_at
from public.crop_checklist k
join public.crop_stages s on s.id = k.crop_stage_id
join public.crops c       on c.id = s.crop_id;

drop table public.crop_checklist;

-- New crop → default stages + guidance copied in as open tasks.
create or replace function public.crops_after_insert()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  insert into public.crop_stages (user_id, crop_id, name, sort_order)
  select new.user_id, new.id, s.name, s.ord
  from unnest(array['Preparation','Seeding','Transplanting','Growing',
                    'Fruiting','Harvesting','Post Harvest','Sold'])
       with ordinality as s(name, ord);

  insert into public.tasks (user_id, scope, farm_id, crop_id, crop_stage_id,
                            title, source, type, sort_order)
  select new.user_id, 'crop', new.farm_id, new.id, cs.id,
         g.text, 'guidance', g.type, g.sort_order
  from public.crop_stages cs
  join public.stage_guidance g
    on g.user_id = new.user_id
   and lower(g.crop_name)  = lower(new.crop_name)
   and lower(g.stage_name) = lower(cs.name)
  where cs.crop_id = new.id;

  return new;
end $$;
