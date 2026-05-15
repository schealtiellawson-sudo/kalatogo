-- ════════════════════════════════════════════════════════════════
-- Refonte Récompenses — 2026-05-15
-- Bourse des Mains d'Or (ex-Mur des Reines) + Bourse de Croissance
-- ════════════════════════════════════════════════════════════════
-- CHANGEMENTS :
-- 1) Ajout 2 colonnes booléennes TikTok dans wolo_prestataires (déclaratif honor system)
-- 2) Drop tables des jeux supprimés (duels, streaks, badges, boosts, partages)
-- 3) Drop fonctions et triggers associés
-- 4) Drop vues qui dépendent des champs points/streak
-- 5) Index sur les colonnes TikTok pour les requêtes d'éligibilité
-- ════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- 1) Ajouter colonnes TikTok dans wolo_prestataires
-- ────────────────────────────────────────────────────────────────
ALTER TABLE wolo_prestataires
  ADD COLUMN IF NOT EXISTS tiktok_suivi_wolomarket BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tiktok_suivi_schealtiel BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN wolo_prestataires.tiktok_suivi_wolomarket IS
  'Déclaration honor system : utilisateur a coché "Je suis @wolomarket sur TikTok" (condition récompenses)';
COMMENT ON COLUMN wolo_prestataires.tiktok_suivi_schealtiel IS
  'Déclaration honor system : utilisateur a coché "Je suis @schealtiellawson sur TikTok" (condition récompenses)';

-- ────────────────────────────────────────────────────────────────
-- 2) Drop tables jeux (cascade pour aussi nettoyer les FK)
-- ────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS duels_photos CASCADE;
DROP TABLE IF EXISTS duels_quartiers CASCADE;
DROP TABLE IF EXISTS duels_votes CASCADE;
DROP TABLE IF EXISTS streaks_wolo CASCADE;
DROP TABLE IF EXISTS badges_wolo CASCADE;
DROP TABLE IF EXISTS boosts_photos CASCADE;
DROP TABLE IF EXISTS partages_whatsapp CASCADE;

-- ────────────────────────────────────────────────────────────────
-- 3) Drop fonctions associées aux jeux
-- ────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS maj_streak_user(uuid) CASCADE;
DROP FUNCTION IF EXISTS calc_niveau_user(uuid) CASCADE;
DROP FUNCTION IF EXISTS update_feed_duel_stats() CASCADE;

-- ────────────────────────────────────────────────────────────────
-- 4) Drop vues dépendantes
-- ────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS hall_of_fame CASCADE;
DROP VIEW IF EXISTS leaderboard_quartier_7j CASCADE;
DROP VIEW IF EXISTS leaderboard_ville_mois CASCADE;

-- ────────────────────────────────────────────────────────────────
-- 5) Index pour requêtes d'éligibilité (par pays + TikTok)
-- ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_prestataires_tiktok_wolo
  ON wolo_prestataires(tiktok_suivi_wolomarket)
  WHERE tiktok_suivi_wolomarket = TRUE;

CREATE INDEX IF NOT EXISTS idx_prestataires_tiktok_fondateur
  ON wolo_prestataires(tiktok_suivi_schealtiel)
  WHERE tiktok_suivi_schealtiel = TRUE;

-- ────────────────────────────────────────────────────────────────
-- 6) Vérification finale
-- ────────────────────────────────────────────────────────────────
-- Doit afficher 2 colonnes (tiktok_suivi_wolomarket, tiktok_suivi_schealtiel)
SELECT column_name, data_type, column_default
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'wolo_prestataires'
   AND column_name IN ('tiktok_suivi_wolomarket', 'tiktok_suivi_schealtiel');

-- Doit afficher 0 ligne (tables jeux supprimées)
SELECT table_name
  FROM information_schema.tables
 WHERE table_schema = 'public'
   AND table_name IN ('duels_photos','duels_quartiers','duels_votes','streaks_wolo','badges_wolo','boosts_photos','partages_whatsapp');
