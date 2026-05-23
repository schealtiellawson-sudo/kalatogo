-- ════════════════════════════════════════════════════════════════
-- MIGRATION — Table wozali_employes (Sprint J/K)
-- Fiche employé créée au moment du clic "Embaucher" sur une candidature
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.wozali_employes (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruteur_user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recruteur_prestataire_id TEXT,          -- ID Supabase ou Airtable du recruteur
  candidature_id           TEXT,          -- ID de la candidature source
  -- Données employé (copiées au moment de l'embauche)
  employe_user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  employe_nom              TEXT NOT NULL,
  employe_metier           TEXT,
  employe_whatsapp         TEXT,
  employe_photo            TEXT,
  employe_quartier         TEXT,
  employe_ville            TEXT,
  -- Données poste
  offre_id                 TEXT,
  offre_titre              TEXT,
  date_embauche            DATE NOT NULL DEFAULT CURRENT_DATE,
  date_fin                 DATE,
  type_contrat             TEXT CHECK (type_contrat IN ('CDI','CDD','Freelance','Stage','Apprentissage','Journalier')),
  salaire_fcfa             INTEGER,
  statut                   TEXT NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif','fin_contrat','suspendu')),
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour les requêtes recruteur
CREATE INDEX IF NOT EXISTS idx_employes_recruteur ON public.wozali_employes(recruteur_user_id);
CREATE INDEX IF NOT EXISTS idx_employes_statut    ON public.wozali_employes(statut);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_wozali_employes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_employes_updated_at ON public.wozali_employes;
CREATE TRIGGER trg_employes_updated_at
  BEFORE UPDATE ON public.wozali_employes
  FOR EACH ROW EXECUTE FUNCTION update_wozali_employes_updated_at();

-- RLS
ALTER TABLE public.wozali_employes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employe_select_recruteur" ON public.wozali_employes
  FOR SELECT USING (auth.uid() = recruteur_user_id);

CREATE POLICY "employe_insert_recruteur" ON public.wozali_employes
  FOR INSERT WITH CHECK (auth.uid() = recruteur_user_id);

CREATE POLICY "employe_update_recruteur" ON public.wozali_employes
  FOR UPDATE USING (auth.uid() = recruteur_user_id);

DO $$ BEGIN
  RAISE NOTICE '✅ Table wozali_employes créée avec RLS';
END $$;
