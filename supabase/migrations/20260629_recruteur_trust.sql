-- WOZALI — Score de confiance recruteur (SHIFT 3)
-- Migration : 2026-06-29
--
-- Objectif : relier les temoignages_abus a un recruteur specifique
-- pour calculer son score de confiance et afficher des badges.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Colonne recruteur_user_id dans temoignages_abus
--    Identifie le recruteur vise par le signalement (Supabase UUID)
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE temoignages_abus
  ADD COLUMN IF NOT EXISTS recruteur_user_id UUID
  REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index pour requetes trust score rapides
CREATE INDEX IF NOT EXISTS idx_temo_abus_recruteur
  ON temoignages_abus(recruteur_user_id, statut)
  WHERE recruteur_user_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Vue agrégée : score de confiance par recruteur
--    Exposée en SELECT public (RLS herite de temoignages_abus)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW recruteur_trust_scores AS
SELECT
  recruteur_user_id,
  COUNT(*) FILTER (WHERE statut = 'publie') AS signalements_publies,
  COUNT(*) AS signalements_total,
  (COUNT(*) FILTER (WHERE statut = 'publie') = 0) AS is_trusted,
  (COUNT(*) FILTER (WHERE statut = 'publie') >= 3) AS is_flagged,
  MAX(updated_at) AS derniere_mise_a_jour
FROM temoignages_abus
WHERE recruteur_user_id IS NOT NULL
GROUP BY recruteur_user_id;

-- RLS : SELECT ouvert (nécessaire pour afficher les badges publics)
-- La vue herite des politiques de temoignages_abus mais on expose
-- uniquement les comptes agreges, pas le contenu des temoignages.
