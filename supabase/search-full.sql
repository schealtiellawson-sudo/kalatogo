-- ════════════════════════════════════════════════════════════
-- WOZALI — Recherche globale (prestataires + TOUS les catalogues métier)
-- SQL Editor → Run. Idempotent (CREATE OR REPLACE).
--
-- Problème résolu : la recherche par mot-clé ne regardait que
-- nom_complet / metier_principal / description_services du prestataire.
-- Un pro dont le MÉTIER est « Plombier » mais qui a créé un SERVICE
-- « Ménage complet » dans sa vitrine ne sortait PAS sur « ménage ».
--
-- Cette fonction balaie en un seul appel le prestataire + les 10 tables
-- catalogue (items boutique, prestations, menu, modèles, séances, packs,
-- formules, courses, biens). Tout item nommé « ménage » ramène son pro.
-- ════════════════════════════════════════════════════════════

create or replace function public.wozali_search(term text)
returns setof public.wozali_prestataires
language sql
stable
as $$
  select p.*
  from public.wozali_prestataires p
  where term is null or btrim(term) = '' or (
       p.nom_complet         ilike '%'||term||'%'
    or p.metier_principal    ilike '%'||term||'%'
    or p.description_services ilike '%'||term||'%'
    or p.quartier            ilike '%'||term||'%'
    or p.ville               ilike '%'||term||'%'
    or exists (select 1 from public.wozali_items       x where (x.prestataire_id = p.id or x.user_id = p.user_id) and (x.nom ilike '%'||term||'%' or x.description ilike '%'||term||'%'))
    or exists (select 1 from public.wozali_prestations x where (x.prestataire_id = p.id or x.user_id = p.user_id) and x.nom ilike '%'||term||'%')
    or exists (select 1 from public.wozali_menu        x where (x.prestataire_id = p.id or x.user_id = p.user_id) and x.nom ilike '%'||term||'%')
    or exists (select 1 from public.wozali_modeles     x where (x.prestataire_id = p.id or x.user_id = p.user_id) and (x.nom ilike '%'||term||'%' or x.description ilike '%'||term||'%'))
    or exists (select 1 from public.wozali_seances     x where (x.prestataire_id = p.id or x.user_id = p.user_id) and x.nom ilike '%'||term||'%')
    or exists (select 1 from public.wozali_packs       x where (x.prestataire_id = p.id or x.user_id = p.user_id) and x.nom ilike '%'||term||'%')
    or exists (select 1 from public.wozali_formules    x where (x.prestataire_id = p.id or x.user_id = p.user_id) and x.nom ilike '%'||term||'%')
    or exists (select 1 from public.wozali_courses     x where (x.prestataire_id = p.id or x.user_id = p.user_id) and x.nom ilike '%'||term||'%')
    or exists (select 1 from public.wozali_biens       x where (x.prestataire_id = p.id or x.user_id = p.user_id) and (x.titre ilike '%'||term||'%' or x.description ilike '%'||term||'%'))
  );
$$;

grant execute on function public.wozali_search(text) to anon, authenticated;

-- ✅ Fini. Test rapide dans le SQL Editor :
--   select nom_complet, metier_principal from wozali_search('ménage');
