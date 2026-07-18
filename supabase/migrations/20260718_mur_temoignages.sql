-- ═══════════════════════════════════════════════════════════════
-- CHANTIER 8 DIGNITÉ — ÉTAPE 2 : MUR DES TÉMOIGNAGES ANONYMES
-- "Ce qu'on ne devrait plus jamais accepter" (2026-07-18)
--
-- Anonymat structurel : le user_id est stocké (traçabilité anti-abus
-- uniquement, jamais affiché nulle part, même pas à l'admin) mais la
-- table n'a AUCUNE policy SELECT : toutes les lectures passent par
-- les endpoints serveur qui ne renvoient que le texte et le mois.
-- Parcours : membre connecté écrit → filtre IA anti-noms (personnes,
-- entreprises, lieux identifiants) → file de modération → validation
-- fondateur → publication anonyme sur Notre Histoire.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.wozali_temoignages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  texte       text NOT NULL,
  statut      text NOT NULL DEFAULT 'en_attente',  -- en_attente / approuve / rejete
  ia_verdict  text,                                 -- ok / noms_detectes / hors_sujet
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_temoignages_statut ON public.wozali_temoignages(statut, created_at DESC);

ALTER TABLE public.wozali_temoignages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Écriture par le membre lui-même uniquement. AUCUNE lecture directe :
  -- l'anonymat est garanti par le serveur, pas par le client.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wozali_temoignages' AND policyname='temoignages_insert_self') THEN
    CREATE POLICY "temoignages_insert_self" ON public.wozali_temoignages FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
