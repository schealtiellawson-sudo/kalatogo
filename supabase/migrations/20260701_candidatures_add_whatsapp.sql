-- ════════════════════════════════════════════════════════════════
-- Patch : ajouter la colonne whatsapp si elle n'existe pas déjà
-- La migration 20260521 a créé la table sans whatsapp,
-- la 20260526 utilisait CREATE TABLE IF NOT EXISTS (no-op).
-- ════════════════════════════════════════════════════════════════

ALTER TABLE wozali_candidatures_agents_terrain
  ADD COLUMN IF NOT EXISTS whatsapp TEXT;
