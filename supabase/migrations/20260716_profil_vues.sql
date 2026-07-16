-- ═══════════════════════════════════════════════════════════════
-- ÉTAPE 19 — QUI A VU TON PROFIL (2026-07-16)
-- Journal des vues de profil (modèle LinkedIn).
-- Gratuit  : compte de la semaine.
-- Pro      : liste détaillée, cliquable vers le profil du visiteur.
-- Le tracking est throttlé côté client (1 vue / visiteur / heure).
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.wozali_profil_vues (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profil_id       uuid NOT NULL REFERENCES public.wozali_prestataires(id) ON DELETE CASCADE, -- profil vu
  viewer_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,                          -- visiteur connecté (null si anonyme)
  viewer_prest_id uuid REFERENCES public.wozali_prestataires(id) ON DELETE SET NULL,          -- profil du visiteur (pour le lien)
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profil_vues_profil ON public.wozali_profil_vues(profil_id, created_at DESC);

ALTER TABLE public.wozali_profil_vues ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Seul le propriétaire du profil peut lire les vues de son propre profil.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wozali_profil_vues' AND policyname='profil_vues_select_owner') THEN
    CREATE POLICY "profil_vues_select_owner" ON public.wozali_profil_vues FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.wozali_prestataires p
        WHERE p.id = wozali_profil_vues.profil_id AND p.user_id = auth.uid()
      ));
  END IF;
  -- N'importe qui (même anonyme) peut enregistrer une vue, mais ne peut pas
  -- se faire passer pour un autre visiteur connecté.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wozali_profil_vues' AND policyname='profil_vues_insert') THEN
    CREATE POLICY "profil_vues_insert" ON public.wozali_profil_vues FOR INSERT
      WITH CHECK (viewer_id IS NULL OR viewer_id = auth.uid());
  END IF;
END $$;
