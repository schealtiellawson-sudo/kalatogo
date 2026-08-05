-- ════════════════════════════════════════════════════════════
-- WOZALI — Suite pro légère (Transport, Maison, Conseil, Établissement, Packs)
-- SQL Editor → Run. Idempotent. Réutilise wozali_commandes + depenses/objectifs.
-- RLS pro select/update sur wozali_commandes déjà en place (boutique-ecran1.sql).
-- ════════════════════════════════════════════════════════════

-- Montant réellement facturé (saisi par le pro) — pour les prestations sans prix fixe
-- (course sur mesure, séance, réservation…). Sert au calcul du CA.
alter table wozali_commandes add column if not exists montant integer;

-- La contrainte statut d'origine n'autorisait pas le workflow (confirmee/terminee/livree…).
-- On l'élargit à tous les statuts utilisés par les dashboards pro.
alter table wozali_commandes drop constraint if exists wozali_commandes_statut_check;
alter table wozali_commandes drop constraint if exists wolo_commandes_statut_check;
alter table wozali_commandes add constraint wozali_commandes_statut_check
  check (statut in ('recue','confirmee','livree','terminee','annulee','en_cours','prete','refusee'));

-- ✅ Fini.
