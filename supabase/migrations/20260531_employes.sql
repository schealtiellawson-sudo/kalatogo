-- ============================================================
-- WOZALI — Sprint J/K : Espace Équipe
-- Table : wozali_employes
-- ============================================================

CREATE TABLE IF NOT EXISTS wozali_employes (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Recruteur
  recruteur_user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recruteur_prestataire_id  TEXT,                      -- ID Airtable du recruteur (optionnel)

  -- Origine
  candidature_id            TEXT,                      -- ID Airtable ou Supabase de la candidature
  offre_id                  TEXT,
  offre_titre               TEXT,

  -- Employé
  employe_user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  employe_nom               TEXT NOT NULL,
  employe_metier            TEXT,
  employe_whatsapp          TEXT,
  employe_photo             TEXT,
  employe_quartier          TEXT,
  employe_ville             TEXT,

  -- Contrat
  type_contrat              TEXT CHECK (type_contrat IN ('CDI','CDD','Freelance','Stage','Apprentissage','Journalier') OR type_contrat IS NULL),
  salaire_fcfa              INTEGER,
  date_embauche             DATE NOT NULL DEFAULT CURRENT_DATE,
  date_fin                  DATE,

  -- Suivi
  statut                    TEXT NOT NULL DEFAULT 'actif'
                            CHECK (statut IN ('actif','fin_contrat','suspendu')),
  notes                     TEXT,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_employes_recruteur
  ON wozali_employes(recruteur_user_id);
CREATE INDEX IF NOT EXISTS idx_employes_employe_user
  ON wozali_employes(employe_user_id);
CREATE INDEX IF NOT EXISTS idx_employes_statut
  ON wozali_employes(statut);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_employes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_employes_updated_at ON wozali_employes;
CREATE TRIGGER trg_employes_updated_at
  BEFORE UPDATE ON wozali_employes
  FOR EACH ROW EXECUTE FUNCTION update_employes_updated_at();

-- RLS
ALTER TABLE wozali_employes ENABLE ROW LEVEL SECURITY;

-- Recruteur : accès total à ses propres fiches
CREATE POLICY "recruteur_all_employes"
  ON wozali_employes FOR ALL
  USING (auth.uid() = recruteur_user_id)
  WITH CHECK (auth.uid() = recruteur_user_id);

-- Employé : lecture de sa propre fiche uniquement
CREATE POLICY "employe_self_read"
  ON wozali_employes FOR SELECT
  USING (auth.uid() = employe_user_id);
