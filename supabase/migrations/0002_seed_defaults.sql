-- 0002_seed_defaults.sql — default categories, items and paddy stage guidance.
-- Generated from docs/seed/expense-items.md and docs/stage-templates/paddy.md.
-- The app calls  supabase.rpc('seed_my_defaults')  once after first login;
-- it inserts rows owned by the caller and does nothing if they already exist.

create or replace function public.seed_my_defaults()
returns void language plpgsql security invoker set search_path = public as $$
declare v_cat uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if exists (select 1 from public.categories where user_id = auth.uid()) then return; end if;

  insert into public.categories (scope, entry_type, name, sort_order) values ('crop', 'expense', 'Land Preparation', 1) returning id into v_cat;
  insert into public.items (category_id, name, default_stage_name, default_unit, sort_order) values
    (v_cat, 'Ploughing (Deep / Disc)', 'Preparation', null, 1),
    (v_cat, 'Rotavator / Puddling', 'Preparation', null, 2),
    (v_cat, 'Levelling / Laser Levelling', 'Preparation', null, 3),
    (v_cat, 'Bunding & Field Repair', 'Preparation', null, 4),
    (v_cat, 'Pre-sowing Irrigation', 'Preparation', null, 5);
  insert into public.categories (scope, entry_type, name, sort_order) values ('crop', 'expense', 'Seeds & Nursery', 2) returning id into v_cat;
  insert into public.items (category_id, name, default_stage_name, default_unit, sort_order) values
    (v_cat, 'Certified Paddy Seeds', 'Seeding', null, 1),
    (v_cat, 'Seed Treatment (Trichoderma / Bavistin)', 'Seeding', null, 2),
    (v_cat, 'Nursery Bed Preparation', 'Preparation', null, 3),
    (v_cat, 'Nursery Fertiliser (Urea)', 'Seeding', null, 4),
    (v_cat, 'Seedling / Mat Transport', 'Transplanting', null, 5);
  insert into public.categories (scope, entry_type, name, sort_order) values ('crop', 'expense', 'Transplanting', 3) returning id into v_cat;
  insert into public.items (category_id, name, default_stage_name, default_unit, sort_order) values
    (v_cat, 'Transplanting Labour (Manual)', 'Transplanting', null, 1),
    (v_cat, 'SRI / Line Transplanting Labour', 'Transplanting', null, 2),
    (v_cat, 'Transplanting Machine Hire', 'Transplanting', null, 3),
    (v_cat, 'Water Charges – Transplanting', 'Transplanting', null, 4);
  insert into public.categories (scope, entry_type, name, sort_order) values ('crop', 'expense', 'Fertilisers & Soil Amendments', 4) returning id into v_cat;
  insert into public.items (category_id, name, default_stage_name, default_unit, sort_order) values
    (v_cat, 'Urea (N) – 46%', 'Growing', null, 1),
    (v_cat, 'DAP (Di-Ammonium Phosphate)', 'Growing', null, 2),
    (v_cat, 'MOP / Potash (K)', 'Growing', null, 3),
    (v_cat, 'Zinc Sulphate (33%)', 'Transplanting', null, 4),
    (v_cat, 'Ammonium Sulphate', 'Growing', null, 5),
    (v_cat, 'Micronutrient Mix (TNAU blend)', 'Growing', null, 6),
    (v_cat, 'FYM / Farm Yard Manure', 'Preparation', null, 7),
    (v_cat, 'Vermicompost', 'Preparation', null, 8),
    (v_cat, 'Neem Cake', 'Preparation', null, 9),
    (v_cat, 'Bio-Fertiliser (Azolla / Blue-Green Algae)', 'Growing', null, 10);
  insert into public.categories (scope, entry_type, name, sort_order) values ('crop', 'expense', 'Plant Protection', 5) returning id into v_cat;
  insert into public.items (category_id, name, default_stage_name, default_unit, sort_order) values
    (v_cat, 'Herbicide – Pre-emergent (Butachlor / Pretilachlor)', 'Transplanting', null, 1),
    (v_cat, 'Herbicide – Post-emergent (Bispyribac)', 'Growing', null, 2),
    (v_cat, 'Insecticide – Stem Borer (Chlorpyrifos)', 'Growing', null, 3),
    (v_cat, 'Insecticide – BPH / Leaf Folder (Imidacloprid)', 'Growing', null, 4),
    (v_cat, 'Insecticide – Whorl Maggot', 'Growing', null, 5),
    (v_cat, 'Fungicide – Blast (Tricyclazole)', 'Fruiting', null, 6),
    (v_cat, 'Fungicide – Sheath Blight (Hexaconazole)', 'Growing', null, 7),
    (v_cat, 'Fungicide – False Smut', 'Fruiting', null, 8),
    (v_cat, 'Rodenticide / Rat Control', 'Fruiting', null, 9),
    (v_cat, 'Spraying Labour', 'Growing', null, 10),
    (v_cat, 'Power Sprayer Hire / Fuel', 'Growing', null, 11),
    (v_cat, 'Drone Spraying', 'Growing', null, 12);
  insert into public.categories (scope, entry_type, name, sort_order) values ('crop', 'expense', 'Irrigation', 6) returning id into v_cat;
  insert into public.items (category_id, name, default_stage_name, default_unit, sort_order) values
    (v_cat, 'Pump Set Diesel', 'Growing', null, 1),
    (v_cat, 'Electricity for Motor Pump', 'Growing', null, 2),
    (v_cat, 'Canal Water Charges (PWD)', 'Growing', null, 3),
    (v_cat, 'Bore Well / Well Maintenance', 'Growing', null, 4),
    (v_cat, 'Irrigation Labour', 'Growing', null, 5);
  insert into public.categories (scope, entry_type, name, sort_order) values ('crop', 'expense', 'Harvesting & Threshing', 7) returning id into v_cat;
  insert into public.items (category_id, name, default_stage_name, default_unit, sort_order) values
    (v_cat, 'Combine Harvester Hire', 'Harvesting', null, 1),
    (v_cat, 'Harvesting Labour (Manual)', 'Harvesting', null, 2),
    (v_cat, 'Threshing Machine / Rent', 'Harvesting', null, 3),
    (v_cat, 'Sacks / Gunny Bags (90 kg)', 'Harvesting', null, 4),
    (v_cat, 'Weighing & Loading Labour', 'Harvesting', null, 5),
    (v_cat, 'Transport to Procurement Centre / Mill', 'Sold', null, 6);
  insert into public.categories (scope, entry_type, name, sort_order) values ('crop', 'expense', 'Post-Harvest & Storage', 8) returning id into v_cat;
  insert into public.items (category_id, name, default_stage_name, default_unit, sort_order) values
    (v_cat, 'Sun Drying / Drying Labour', 'Post Harvest', null, 1),
    (v_cat, 'Milling Charges (Rice Mill)', 'Post Harvest', null, 2),
    (v_cat, 'Storage / Warehouse Rent', 'Post Harvest', null, 3),
    (v_cat, 'Gunny Bag Stitching & Weighment', 'Post Harvest', null, 4),
    (v_cat, 'Market Cess / Commission', 'Sold', null, 5),
    (v_cat, 'Quality Testing / Moisture Meter', 'Post Harvest', null, 6);
  insert into public.categories (scope, entry_type, name, sort_order) values ('crop', 'expense', 'Overheads & Miscellaneous', 9) returning id into v_cat;
  insert into public.items (category_id, name, default_stage_name, default_unit, sort_order) values
    (v_cat, 'Land Lease / Pattadari Rent', 'Preparation', null, 1),
    (v_cat, 'Crop Insurance Premium (PMFBY)', 'Preparation', null, 2),
    (v_cat, 'KCC Loan Interest', 'Sold', null, 3),
    (v_cat, 'Electricity (Misc.)', 'Growing', null, 4),
    (v_cat, 'Tool Repair & Maintenance', 'Growing', null, 5),
    (v_cat, 'Labour Welfare / Advance', 'Growing', null, 6),
    (v_cat, 'Contingency / Miscellaneous', 'Growing', null, 7);
  insert into public.categories (scope, entry_type, name, sort_order) values ('crop', 'income', 'Produce Sales', 10) returning id into v_cat;
  insert into public.items (category_id, name, default_stage_name, default_unit, sort_order) values
    (v_cat, 'Paddy Sale (net yield)', 'Sold', 'Quintal', 1),
    (v_cat, 'Bran / Husk Sale', 'Sold', 'Quintal', 2);
  insert into public.categories (scope, entry_type, name, sort_order) values ('crop', 'income', 'By-products', 11) returning id into v_cat;
  insert into public.items (category_id, name, default_stage_name, default_unit, sort_order) values
    (v_cat, 'Straw / Hay (Vaikal) Sale', 'Sold', 'Ton', 1),
    (v_cat, 'Other By-products', 'Sold', 'Lumpsum', 2);
  insert into public.categories (scope, entry_type, name, sort_order) values ('crop', 'income', 'Insurance & Other', 12) returning id into v_cat;
  insert into public.items (category_id, name, default_stage_name, default_unit, sort_order) values
    (v_cat, 'Crop Insurance Claim Received', 'Sold', 'Lumpsum', 1),
    (v_cat, 'Other Crop Income', 'Sold', 'Lumpsum', 2);
  insert into public.categories (scope, entry_type, name, sort_order) values ('farm', 'expense', 'Land Development', 13) returning id into v_cat;
  insert into public.items (category_id, name, default_stage_name, default_unit, sort_order) values
    (v_cat, 'Land levelling (one-time)', null, null, 1),
    (v_cat, 'Soil reclamation', null, null, 2),
    (v_cat, 'Bund construction', null, null, 3);
  insert into public.categories (scope, entry_type, name, sort_order) values ('farm', 'expense', 'Water & Irrigation Infrastructure', 14) returning id into v_cat;
  insert into public.items (category_id, name, default_stage_name, default_unit, sort_order) values
    (v_cat, 'Borewell drilling', null, null, 1),
    (v_cat, 'Pump / motor purchase', null, null, 2),
    (v_cat, 'Pipeline', null, null, 3),
    (v_cat, 'Drip / sprinkler', null, null, 4);
  insert into public.categories (scope, entry_type, name, sort_order) values ('farm', 'expense', 'Fencing & Buildings', 15) returning id into v_cat;
  insert into public.items (category_id, name, default_stage_name, default_unit, sort_order) values
    (v_cat, 'Fencing', null, null, 1),
    (v_cat, 'Farm shed', null, null, 2),
    (v_cat, 'Storage room', null, null, 3);
  insert into public.categories (scope, entry_type, name, sort_order) values ('farm', 'expense', 'Tools & Equipment', 16) returning id into v_cat;
  insert into public.items (category_id, name, default_stage_name, default_unit, sort_order) values
    (v_cat, 'Hand tools', null, null, 1),
    (v_cat, 'Spray tanks', null, null, 2),
    (v_cat, 'Tarpaulin', null, null, 3);
  insert into public.categories (scope, entry_type, name, sort_order) values ('farm', 'expense', 'Land Lease, Tax & Fees', 17) returning id into v_cat;
  insert into public.items (category_id, name, default_stage_name, default_unit, sort_order) values
    (v_cat, 'Land lease rent', null, null, 1),
    (v_cat, 'Land tax (kist)', null, null, 2),
    (v_cat, 'Patta / registration fees', null, null, 3);
  insert into public.categories (scope, entry_type, name, sort_order) values ('farm', 'expense', 'Utilities', 18) returning id into v_cat;
  insert into public.items (category_id, name, default_stage_name, default_unit, sort_order) values
    (v_cat, 'Electricity (farm)', null, null, 1),
    (v_cat, 'Water charges', null, null, 2);
  insert into public.categories (scope, entry_type, name, sort_order) values ('farm', 'expense', 'Other Farm Expense', 19) returning id into v_cat;
  insert into public.items (category_id, name, default_stage_name, default_unit, sort_order) values
    (v_cat, 'Farm labour (general)', null, null, 1),
    (v_cat, 'Miscellaneous', null, null, 2);
  insert into public.categories (scope, entry_type, name, sort_order) values ('farm', 'income', 'Farm Income', 20) returning id into v_cat;
  insert into public.items (category_id, name, default_stage_name, default_unit, sort_order) values
    (v_cat, 'Land lease received', null, null, 1),
    (v_cat, 'Coconut / tree produce', null, null, 2),
    (v_cat, 'Other farm income', null, null, 3);
  insert into public.categories (scope, entry_type, name, sort_order) values ('machinery', 'expense', 'Purchase & Loan', 21) returning id into v_cat;
  insert into public.items (category_id, name, default_stage_name, default_unit, sort_order) values
    (v_cat, 'Purchase cost', null, null, 1),
    (v_cat, 'Down payment', null, null, 2),
    (v_cat, 'Loan EMI', null, null, 3),
    (v_cat, 'Loan interest', null, null, 4);
  insert into public.categories (scope, entry_type, name, sort_order) values ('machinery', 'expense', 'Fuel', 22) returning id into v_cat;
  insert into public.items (category_id, name, default_stage_name, default_unit, sort_order) values
    (v_cat, 'Diesel', null, null, 1),
    (v_cat, 'Petrol', null, null, 2),
    (v_cat, 'Engine oil', null, null, 3);
  insert into public.categories (scope, entry_type, name, sort_order) values ('machinery', 'expense', 'Repair & Maintenance', 23) returning id into v_cat;
  insert into public.items (category_id, name, default_stage_name, default_unit, sort_order) values
    (v_cat, 'Service', null, null, 1),
    (v_cat, 'Spare parts', null, null, 2),
    (v_cat, 'Tyres', null, null, 3),
    (v_cat, 'Battery', null, null, 4);
  insert into public.categories (scope, entry_type, name, sort_order) values ('machinery', 'expense', 'Operator', 24) returning id into v_cat;
  insert into public.items (category_id, name, default_stage_name, default_unit, sort_order) values
    (v_cat, 'Driver / operator wages', null, null, 1);
  insert into public.categories (scope, entry_type, name, sort_order) values ('machinery', 'expense', 'Insurance & Tax', 25) returning id into v_cat;
  insert into public.items (category_id, name, default_stage_name, default_unit, sort_order) values
    (v_cat, 'Insurance', null, null, 1),
    (v_cat, 'Road tax / registration', null, null, 2);
  insert into public.categories (scope, entry_type, name, sort_order) values ('machinery', 'income', 'Machinery Income', 26) returning id into v_cat;
  insert into public.items (category_id, name, default_stage_name, default_unit, sort_order) values
    (v_cat, 'Hire-out income (per hour / per acre)', null, null, 1),
    (v_cat, 'Sale of machine', null, null, 2);

  insert into public.stage_guidance (crop_name, stage_name, type, text, sort_order) values
    ('Paddy', 'Preparation', 'do', 'Summer ploughing', 1),
    ('Paddy', 'Preparation', 'do', 'Sow and incorporate green manure (daincha / sunhemp) at flowering', 2),
    ('Paddy', 'Preparation', 'do', 'Apply FYM / compost', 3),
    ('Paddy', 'Preparation', 'do', 'Puddle and level well; repair bunds', 4),
    ('Paddy', 'Preparation', 'watch', 'Uneven levelling — patchy water, more weeds', 5),
    ('Paddy', 'Preparation', 'save', 'Green manure + FYM replace bought nutrients; good levelling cuts water and weeding cost', 6),
    ('Paddy', 'Seeding', 'do', 'Use certified or own selected seed; salt-water test', 1),
    ('Paddy', 'Seeding', 'do', 'Treat seed with Pseudomonas / Azospirillum', 2),
    ('Paddy', 'Seeding', 'do', 'Raise nursery near the water source', 3),
    ('Paddy', 'Seeding', 'watch', 'Over-aged seedlings (>25 days); nursery pests', 4),
    ('Paddy', 'Seeding', 'save', 'Lower seed rate (SRI / mat nursery); keep own seed for next season', 5),
    ('Paddy', 'Transplanting', 'do', '2–3 seedlings per hill at proper spacing (single young seedlings for SRI)', 1),
    ('Paddy', 'Transplanting', 'do', 'Keep shallow water 2–3 cm; fill gaps within 7–10 days', 2),
    ('Paddy', 'Transplanting', 'watch', 'Labour shortage delaying planting; planting too deep', 3),
    ('Paddy', 'Transplanting', 'save', 'Compare manual vs machine transplanting cost per acre', 4),
    ('Paddy', 'Growing', 'do', 'Weed at ~15 and ~30 days (cono / rotary weeder)', 1),
    ('Paddy', 'Growing', 'do', 'Apply Jeevamirtham through irrigation water; grow Azolla', 2),
    ('Paddy', 'Growing', 'do', 'Alternate wetting and drying; no water stress from panicle initiation', 3),
    ('Paddy', 'Growing', 'do', 'Foliar Panchagavyam at panicle initiation', 4),
    ('Paddy', 'Growing', 'watch', 'Stem borer, leaf folder, brown planthopper, sheath blight — set pheromone and light traps', 5),
    ('Paddy', 'Growing', 'save', 'Timely weeding is cheaper than late hand weeding; avoid excess nitrogen; spray only above pest threshold', 6),
    ('Paddy', 'Fruiting', 'do', 'Keep ~5 cm water at flowering; avoid spraying during morning flowering hours', 1),
    ('Paddy', 'Fruiting', 'do', 'Drain field 10–15 days before harvest; protect from rats and birds', 2),
    ('Paddy', 'Fruiting', 'watch', 'Neck blast, false smut, ear-head bug, lodging', 3),
    ('Paddy', 'Fruiting', 'save', 'Scout twice a week to avoid panic spraying; early drainage allows cheaper machine harvesting', 4),
    ('Paddy', 'Harvesting', 'do', 'Harvest at ~80% straw-coloured grains; book harvester early', 1),
    ('Paddy', 'Harvesting', 'watch', 'Grain losses from delayed harvest', 2),
    ('Paddy', 'Harvesting', 'save', 'Machine harvest vs manual — compare cost per acre', 3),
    ('Paddy', 'Post Harvest', 'do', 'Dry to 12–14% moisture; clean bags and storage', 1),
    ('Paddy', 'Post Harvest', 'watch', 'Storage pests; moisture build-up', 2),
    ('Paddy', 'Post Harvest', 'save', 'Proper drying avoids moisture cuts at the mill', 3),
    ('Paddy', 'Sold', 'do', 'Compare rates (mill, DPC, trader) before selling; record deductions', 1),
    ('Paddy', 'Sold', 'watch', 'Moisture cuts, commission, transport and hamali charges', 2),
    ('Paddy', 'Sold', 'save', 'Sell straw separately and record it as income', 3);
end $$;

grant execute on function public.seed_my_defaults() to authenticated;
