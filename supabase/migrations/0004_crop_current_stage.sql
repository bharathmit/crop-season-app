-- 0004_crop_current_stage.sql — each crop tracks the stage it is in now.
-- Set to the first stage when the crop is created; the owner moves it forward
-- from the crop panel. Drives the stage chips on the crops list and the
-- default stage in expense entry.

alter table public.crops
  add column current_stage_id uuid references public.crop_stages(id) on delete set null;

-- Point existing crops at their first active stage.
update public.crops c
set current_stage_id = (select s.id from public.crop_stages s
                        where s.crop_id = c.id and s.is_active
                        order by s.sort_order limit 1)
where current_stage_id is null;

-- Current stage must belong to the same crop.
create or replace function public.crops_before_update()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.current_stage_id is not null and not exists (
       select 1 from public.crop_stages
       where id = new.current_stage_id and crop_id = new.id) then
    raise exception 'Current stage does not belong to this crop';
  end if;
  return new;
end $$;

create trigger crops_before_update
before update of current_stage_id on public.crops
for each row execute function public.crops_before_update();

-- New crop → default stages, guidance tasks, and current stage = first stage.
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

  update public.crops
  set current_stage_id = (select id from public.crop_stages
                          where crop_id = new.id order by sort_order limit 1)
  where id = new.id;

  return new;
end $$;
