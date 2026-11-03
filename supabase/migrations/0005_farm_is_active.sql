-- 0005_farm_is_active.sql — farms can be marked not in use (hidden on the Farm page).
-- Existing farms stay active.

alter table public.farms
  add column is_active boolean not null default true;
