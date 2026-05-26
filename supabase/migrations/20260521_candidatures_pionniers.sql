-- ════════════════════════════════════════════════════════════════
-- MIGRATION — Table wozali_candidatures_pionniers
-- Remplace la table Airtable "Agents Terrain" (candidatures publiques)
-- pour l'espace de recrutement des Pionniers WOZALI
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wozali_candidatures_pionniers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prenom       TEXT NOT NULL,
  nom          TEXT NOT NULL,
  telephone    TEXT,
  email        TEXT,
  age          INT,
  genre        TEXT CHECK (genre IN ('H','F')),
  ville        TEXT CHECK (ville IN ('Lomé','Cotonou')),
  quartier     TEXT,
  disponibilite TEXT,
  photos       TEXT,       -- URLs séparées par \n
  pourquoi     TEXT,
  source       TEXT,
  statut       TEXT NOT NULL DEFAULT 'En attente' CHECK (statut IN ('En attente','Présélectionné','Validé','Refusé')),
  actif        BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cp_statut ON wozali_candidatures_pionniers(statut);
CREATE INDEX IF NOT EXISTS idx_cp_ville  ON wozali_candidatures_pionniers(ville);

ALTER TABLE wozali_candidatures_pionniers ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut soumettre une candidature (public form)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wozali_candidatures_pionniers' AND policyname='cp_insert_public') THEN
    CREATE POLICY "cp_insert_public" ON wozali_candidatures_pionniers FOR INSERT WITH CHECK (true);
  END IF;
  -- Seulement les admins peuvent lire et modifier (via service role en prod)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wozali_candidatures_pionniers' AND policyname='cp_select_auth') THEN
    CREATE POLICY "cp_select_auth" ON wozali_candidatures_pionniers FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wozali_candidatures_pionniers' AND policyname='cp_update_auth') THEN
    CREATE POLICY "cp_update_auth" ON wozali_candidatures_pionniers FOR UPDATE USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION wozali_cp_updated()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wozali_cp_updated ON wozali_candidatures_pionniers;
CREATE TRIGGER trg_wozali_cp_updated
  BEFORE UPDATE ON wozali_candidatures_pionniers
  FOR EACH ROW EXECUTE FUNCTION wozali_cp_updated();

DO $$ BEGIN
  RAISE NOTICE '✅ wozali_candidatures_pionniers créée';
END $$;
