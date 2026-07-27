-- ============================================================
-- WOZALI — Prestations & tarifs (Module "Mes prestations")
-- (2026-07-27) Prestataires de type RDV (coiffure, beauté, soins…)
--   affichent une grille de prestations + tarifs sur leur profil public.
--   Le client clique "Réserver" → calendrier de créneaux → réservation
--   créée EN INTERNE (jamais WhatsApp), le pro notifié via wozali_notifications.
--
-- Colonnes calées EXACTEMENT sur l'insert front (savePrestation) :
--   user_id, prestataire_id, nom, groupe, prix_min, prix_max, duree_min,
--   actif, ordre
--
-- Réservations : on RÉUTILISE la table existante `wozali_rdv`
--   (renommée depuis wolo_rdv en migration 20260519_b). Elle contient déjà
--   prestataire_id / prestataire_user_id / client_user_id / client_nom /
--   date_rdv / heure_rdv / service / message / statut. On lui ajoute juste
--   deux colonnes pour tracer la prestation réservée.
-- ============================================================

-- ── 1) Table catalogue de prestations ────────────────────────
CREATE TABLE IF NOT EXISTS public.wozali_prestations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestataire_id UUID,                       -- wozali_prestataires.id (pas de FK stricte volontairement)
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nom            TEXT NOT NULL,
  groupe         TEXT,                        -- regroupement optionnel : "Coiffure", "Soins visage"…
  prix_min       INTEGER,
  prix_max       INTEGER,
  duree_min      INTEGER,                     -- durée en minutes
  actif          BOOLEAN DEFAULT TRUE,
  ordre          INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prestations_user_ordre ON public.wozali_prestations(user_id, ordre);
CREATE INDEX IF NOT EXISTS idx_prestations_actif      ON public.wozali_prestations(actif);

-- ── RLS : lecture publique des prestations actives, écriture réservée au propriétaire ──
ALTER TABLE public.wozali_prestations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prestations_public_read" ON public.wozali_prestations;
DROP POLICY IF EXISTS "prestations_self_insert" ON public.wozali_prestations;
DROP POLICY IF EXISTS "prestations_self_update" ON public.wozali_prestations;
DROP POLICY IF EXISTS "prestations_self_delete" ON public.wozali_prestations;

CREATE POLICY "prestations_public_read" ON public.wozali_prestations FOR SELECT
  USING (actif = true OR auth.uid() = user_id);
CREATE POLICY "prestations_self_insert" ON public.wozali_prestations FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "prestations_self_update" ON public.wozali_prestations FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "prestations_self_delete" ON public.wozali_prestations FOR DELETE
  USING (auth.uid() = user_id);

-- ── 2) Réservations : on réutilise wozali_rdv (compatible), on l'enrichit ──
--    Idempotent : ADD COLUMN IF NOT EXISTS, table cible protégée par IF EXISTS.
ALTER TABLE IF EXISTS public.wozali_rdv
  ADD COLUMN IF NOT EXISTS prestation_id  UUID;
ALTER TABLE IF EXISTS public.wozali_rdv
  ADD COLUMN IF NOT EXISTS prestation_nom TEXT;
