-- ================================================================
-- Score Mérite — Bourse de Croissance 100 000 FCFA × 5 (2026-07-15)
-- ================================================================
-- 1. Colonne score_merite sur bourse_croissance : le classement qui
--    désigne les 5 gagnants. Calculé par api/cron/eligibilite-bourse.js
--    (note bayésienne, avis vérifiés en log, clients récurrents,
--    réalisations, profil, constance. Zéro point pour les vues/abonnés).
ALTER TABLE bourse_croissance
  ADD COLUMN IF NOT EXISTS score_merite NUMERIC DEFAULT 0;

-- 2. Anti-fraude avis : un même client (numéro WhatsApp) ne peut noter
--    un prestataire qu'UNE fois par mois. EXTRACT sur DATE est immutable,
--    utilisable dans un index unique.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_avis_whatsapp_mois
  ON wozali_avis (
    prestataire_id,
    auteur_whatsapp,
    ((EXTRACT(YEAR FROM date_avis) * 100 + EXTRACT(MONTH FROM date_avis))::INT)
  )
  WHERE auteur_whatsapp IS NOT NULL AND auteur_whatsapp <> '';

-- 3. Même règle pour les comptes connectés (auteur_user_id).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_avis_user_mois
  ON wozali_avis (
    prestataire_id,
    auteur_user_id,
    ((EXTRACT(YEAR FROM date_avis) * 100 + EXTRACT(MONTH FROM date_avis))::INT)
  )
  WHERE auteur_user_id IS NOT NULL;
