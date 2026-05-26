-- Migration : ajout colonne mode_emploi sur wozali_prestataires
-- À appliquer dans Supabase SQL Editor

ALTER TABLE wozali_prestataires
  ADD COLUMN IF NOT EXISTS mode_emploi BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pays TEXT;
