-- WOZALI — Table témoignages prestataires
-- Migration : 2026-05-25

CREATE TABLE IF NOT EXISTS wolo_temoignages (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  prestataire_id      TEXT        NOT NULL,
  prestataire_nom     TEXT,
  prestataire_metier  TEXT,
  prestataire_ville   TEXT,
  texte               TEXT        NOT NULL,
  note                INTEGER     DEFAULT 5 CHECK (note BETWEEN 1 AND 5),
  statut              TEXT        DEFAULT 'En attente'
                                  CHECK (statut IN ('En attente','Approuvé','Refusé','Publié')),
  type                TEXT        DEFAULT 'Écrit'
                                  CHECK (type IN ('Écrit','Vidéo')),
  candidat_video      BOOLEAN     DEFAULT FALSE,
  score_wozali        INTEGER,
  nb_avis             INTEGER,
  photo_profil        TEXT,
  note_admin          TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_temoignages_prestataire ON wolo_temoignages(prestataire_id);
CREATE INDEX IF NOT EXISTS idx_temoignages_statut      ON wolo_temoignages(statut);
CREATE INDEX IF NOT EXISTS idx_temoignages_candidat    ON wolo_temoignages(candidat_video);

-- RLS
ALTER TABLE wolo_temoignages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "temoignages_select_public"
  ON wolo_temoignages FOR SELECT
  USING (statut = 'Publié');

CREATE POLICY "temoignages_insert_own"
  ON wolo_temoignages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "temoignages_update_own"
  ON wolo_temoignages FOR UPDATE
  USING (true);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_temoignages_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER temoignages_updated_at
  BEFORE UPDATE ON wolo_temoignages
  FOR EACH ROW EXECUTE FUNCTION update_temoignages_updated_at();
