-- ════════════════════════════════════════════════════════════════
-- MIGRATION — Boost offres d'emploi WOZALI Jobs
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.wozali_offres_emploi
  ADD COLUMN IF NOT EXISTS boost_until    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS boost_type     TEXT CHECK (boost_type IN ('7j','14j','30j','tete_liste')),
  ADD COLUMN IF NOT EXISTS boost_ref      TEXT,
  ADD COLUMN IF NOT EXISTS boost_statut   TEXT DEFAULT 'aucun' CHECK (boost_statut IN ('aucun','en_attente','actif','expire'));

CREATE INDEX IF NOT EXISTS idx_offres_boost_until ON public.wozali_offres_emploi(boost_until);

DO $$ BEGIN
  RAISE NOTICE '✅ Colonnes boost ajoutées à wozali_offres_emploi';
END $$;
