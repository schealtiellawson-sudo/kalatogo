-- ================================================================
-- Index de scale pour wozali_prestataires
-- Garde la recherche, les vedettes et les KPI instantanés même avec
-- des dizaines de milliers de profils. Purement additif (aucun risque).
-- ================================================================

-- Recherche par mot-clé (ilike %x%) : index trigramme = rapide à l'échelle.
create extension if not exists pg_trgm;

-- Tri par défaut de toutes les listes (vedettes, recherche).
create index if not exists idx_prest_note
  on public.wozali_prestataires (note_moyenne desc nulls last);

-- Filtres de recherche.
create index if not exists idx_prest_ville      on public.wozali_prestataires (ville);
create index if not exists idx_prest_quartier   on public.wozali_prestataires (quartier);
create index if not exists idx_prest_metier     on public.wozali_prestataires (metier_principal);
create index if not exists idx_prest_pays       on public.wozali_prestataires (pays);
create index if not exists idx_prest_abonnement on public.wozali_prestataires (abonnement);
create index if not exists idx_prest_dispo      on public.wozali_prestataires (disponible_maintenant);

-- KPI terrain + Battle (parrainage, date d'inscription).
create index if not exists idx_prest_parrain    on public.wozali_prestataires (parrain_code);
create index if not exists idx_prest_created    on public.wozali_prestataires (created_at);

-- Recherche texte rapide (nom, métier, description).
create index if not exists idx_prest_nom_trgm
  on public.wozali_prestataires using gin (nom_complet gin_trgm_ops);
create index if not exists idx_prest_metier_trgm
  on public.wozali_prestataires using gin (metier_principal gin_trgm_ops);
create index if not exists idx_prest_desc_trgm
  on public.wozali_prestataires using gin (description_services gin_trgm_ops);
