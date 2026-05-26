-- ══════════════════════════════════════════════════════════════════════════
-- Migration : wozali_candidatures_pionniers_v2
-- Date      : 2026-05-26
-- Objectif  : Colonnes supplémentaires pour enrichissement candidature
--             situation, transport, reseau_quartier, comment_trouve
-- ══════════════════════════════════════════════════════════════════════════

ALTER TABLE wozali_candidatures_pionniers
  ADD COLUMN IF NOT EXISTS situation       TEXT,
  ADD COLUMN IF NOT EXISTS transport       TEXT,
  ADD COLUMN IF NOT EXISTS reseau_quartier TEXT,
  ADD COLUMN IF NOT EXISTS comment_trouve  TEXT;
