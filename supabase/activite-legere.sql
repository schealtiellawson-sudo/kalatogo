-- ════════════════════════════════════════════════════════════
-- WOZALI — Suite pro légère (Transport, Maison, Conseil, Établissement, Packs)
-- SQL Editor → Run. Idempotent. Réutilise wozali_commandes + depenses/objectifs.
-- RLS pro select/update sur wozali_commandes déjà en place (boutique-ecran1.sql).
-- ════════════════════════════════════════════════════════════

-- Montant réellement facturé (saisi par le pro) — pour les prestations sans prix fixe
-- (course sur mesure, séance, réservation…). Sert au calcul du CA.
alter table wozali_commandes add column if not exists montant integer;

-- ✅ Fini.
