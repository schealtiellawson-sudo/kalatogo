-- ================================================================
-- Badge Top 50 — colonne de classement (D7, 2026-07-22)
-- Mécanique de visibilité INDÉPENDANTE de la Bourse de Croissance,
-- recalculée chaque jour par api/cron/eligibilite-bourse.js.
-- Classement sur score_merite, Pro uniquement, par pays.
-- NULL = hors du Top 50 ce mois (badge éteint côté front).
-- ================================================================
ALTER TABLE wozali_prestataires ADD COLUMN IF NOT EXISTS rang_top_50 INTEGER;

CREATE INDEX IF NOT EXISTS idx_wozali_prestataires_pays_rang_top_50
  ON wozali_prestataires (pays, rang_top_50)
  WHERE rang_top_50 IS NOT NULL;
