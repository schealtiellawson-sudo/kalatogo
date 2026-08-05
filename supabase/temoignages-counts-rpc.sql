-- ════════════════════════════════════════════════════════════
-- WOZALI — Fonctions d'agrégation compteurs (évite le plafond 1000 lignes)
-- SQL Editor → Run. Idempotent (create or replace).
-- ════════════════════════════════════════════════════════════

create or replace function public.wozali_temo_reaction_counts(ids uuid[])
returns table(temoignage_id uuid, type text, n bigint)
language sql stable as $$
  select temoignage_id, type, count(*) as n
  from public.wozali_temoignage_reactions
  where temoignage_id = any(ids)
  group by temoignage_id, type;
$$;

create or replace function public.wozali_temo_reponse_counts(ids uuid[])
returns table(temoignage_id uuid, n bigint)
language sql stable as $$
  select temoignage_id, count(*) as n
  from public.wozali_temoignage_reponses
  where temoignage_id = any(ids) and statut = 'approuve'
  group by temoignage_id;
$$;

grant execute on function public.wozali_temo_reaction_counts(uuid[]) to anon, authenticated, service_role;
grant execute on function public.wozali_temo_reponse_counts(uuid[]) to anon, authenticated, service_role;

-- ✅ Fini.
