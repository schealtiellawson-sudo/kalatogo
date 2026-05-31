-- ============================================================
-- WOZALI — Programme Ambassadeurs
-- Table : wozali_ambassadeurs
-- ============================================================

CREATE TABLE IF NOT EXISTS wozali_ambassadeurs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Infos candidature (depuis le formulaire ambassadeurs.html)
  tiktok_username       TEXT NOT NULL,
  tiktok_followers      INTEGER,
  instagram_username    TEXT,
  instagram_followers   INTEGER,

  -- Statut admin
  statut                TEXT NOT NULL DEFAULT 'en_attente'
                        CHECK (statut IN ('en_attente', 'valide', 'refuse')),
  notes_admin           TEXT,
  date_validation       TIMESTAMPTZ,
  valide_par            TEXT,

  -- Code affiliation unique (ex: AMB-MARCO-1234)
  code_affiliation      TEXT UNIQUE,

  -- Pro offert automatiquement à la validation
  pro_offert            BOOLEAN NOT NULL DEFAULT FALSE,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_wozali_ambassadeurs_user_id
  ON wozali_ambassadeurs(user_id);
CREATE INDEX IF NOT EXISTS idx_wozali_ambassadeurs_statut
  ON wozali_ambassadeurs(statut);
CREATE INDEX IF NOT EXISTS idx_wozali_ambassadeurs_code
  ON wozali_ambassadeurs(code_affiliation);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_ambassadeurs_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ambassadeurs_updated_at ON wozali_ambassadeurs;
CREATE TRIGGER trg_ambassadeurs_updated_at
  BEFORE UPDATE ON wozali_ambassadeurs
  FOR EACH ROW EXECUTE FUNCTION update_ambassadeurs_updated_at();

-- RLS
ALTER TABLE wozali_ambassadeurs ENABLE ROW LEVEL SECURITY;

-- Admin : accès total (via ADMIN_EMAILS vérifié côté API)
CREATE POLICY "admin_all_ambassadeurs"
  ON wozali_ambassadeurs FOR ALL
  USING (true)
  WITH CHECK (true);

-- Ambassadeur : lecture de sa propre ligne uniquement
CREATE POLICY "self_read_ambassadeur"
  ON wozali_ambassadeurs FOR SELECT
  USING (auth.uid() = user_id);

-- Insertion publique (candidature depuis la landing page)
CREATE POLICY "public_insert_ambassadeur"
  ON wozali_ambassadeurs FOR INSERT
  WITH CHECK (true);
