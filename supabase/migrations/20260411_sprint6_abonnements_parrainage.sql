-- ════════════════════════════════════════════════════════════════
-- SPRINT 6 — Parrainage : code auto + taux 40% + colonnes profiles
-- (les tables parrainages/commissions/abonnements existent déjà
--  depuis Sprint 3 · 20260409_wolo_pay_infra.sql)
-- ════════════════════════════════════════════════════════════════

-- 1) Colonne code_parrainage sur profiles
alter table public.profiles add column if not exists code_parrainage text unique;

-- 2) Fonction génération code WOLO-XXXXXX
create or replace function public.generate_code_parrainage() returns text
language plpgsql as $$
declare
  code text;
  c int;
begin
  loop
    code := 'WOLO-' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    select count(*) into c from public.profiles where code_parrainage = code;
    exit when c = 0;
  end loop;
  return code;
end $$;

-- 3) Trigger : auto-générer code_parrainage à l'insert profile
create or replace function public.trg_set_code_parrainage() returns trigger
language plpgsql as $$
begin
  if new.code_parrainage is null then
    new.code_parrainage := public.generate_code_parrainage();
  end if;
  return new;
end $$;

drop trigger if exists profiles_set_code_parrainage on public.profiles;
create trigger profiles_set_code_parrainage
  before insert on public.profiles
  for each row execute function public.trg_set_code_parrainage();

-- 4) Backfill : tous les profils existants reçoivent un code
update public.profiles
   set code_parrainage = public.generate_code_parrainage()
 where code_parrainage is null;

-- 5) Taux de commission par défaut → 40% (était 10% depuis Sprint 3)
alter table public.parrainages
  alter column taux_commission set default 0.40;

-- 6) Met à jour les parrainages existants qui ont encore 0.10
update public.parrainages
   set taux_commission = 0.40
 where taux_commission = 0.10;
