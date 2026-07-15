-- ════════════════════════════════════════════════════════════════
-- UNIFICATION SOCIAL — étape 5 roadmap UX (2026-07-15)
-- ════════════════════════════════════════════════════════════════
-- Avant : 2 systèmes de posts (wozali_posts moderne + wozali_posts_v2,
-- vue sur l'ancien wolo_posts_v2), 2 systèmes de suivi (wozali_suivis,
-- vue sur wolo_suivis + wozali_abonnements vide), likes en localStorage.
-- Après : UNE table wozali_posts (+ wozali_likes, wozali_commentaires,
-- triggers déjà en place), UNE table wozali_suivis réelle.
-- ════════════════════════════════════════════════════════════════

-- 1. wozali_posts : colonnes nécessaires à l'unification
--    prestataire_id = profil sur lequel le post est affiché (mur),
--    ordre = tri manuel des posts du profil.
ALTER TABLE public.wozali_posts ADD COLUMN IF NOT EXISTS prestataire_id UUID;
ALTER TABLE public.wozali_posts ADD COLUMN IF NOT EXISTS ordre INT;
CREATE INDEX IF NOT EXISTS idx_wozali_posts_prestataire ON public.wozali_posts (prestataire_id);

-- Backfill : les posts existants s'affichent sur le profil de leur auteur
UPDATE public.wozali_posts p SET prestataire_id = w.id
FROM public.wozali_prestataires w
WHERE p.prestataire_id IS NULL AND w.user_id = p.auteur_id;

-- 2. Likes : un seul like par personne et par post (le toggle frontend s'appuie dessus)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_wozali_likes_post_user
  ON public.wozali_likes (post_id, user_id);

-- 3. RPC partages : la RLS self_update bloque l'incrément par les non-auteurs
CREATE OR REPLACE FUNCTION public.wozali_post_partage(p_post_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.wozali_posts SET nb_partages = COALESCE(nb_partages,0) + 1 WHERE id = p_post_id;
END $$;
GRANT EXECUTE ON FUNCTION public.wozali_post_partage(UUID) TO authenticated, anon;

-- 4. Copier les posts de l'ancien système vers wozali_posts.
--    Source = la VUE wozali_posts_v2 (la table de base wolo_posts_v2 n'a pas
--    toutes les colonnes, ex. nb_partages : erreur 42703 à la 1re exécution).
--    La vue est supprimée à l'étape 6, APRÈS la copie.
INSERT INTO public.wozali_posts
  (auteur_id, prestataire_id, type, contenu, media_url, media_type, nb_likes, nb_partages, actif, created_at, ordre)
SELECT
  v.auteur_user_id,
  v.prestataire_id,
  'realisation',
  COALESCE(v.contenu, ''),
  NULLIF(v.image_url, ''),
  CASE WHEN v.media_type IN ('image','photo') THEN 'photo'
       WHEN v.media_type = 'video' THEN 'video'
       ELSE 'text' END,
  COALESCE(v.nb_likes, 0),
  COALESCE(v.nb_partages, 0),
  COALESCE(v.actif, true),
  v.created_at,
  v.ordre
FROM public.wozali_posts_v2 v
WHERE NOT EXISTS (
  SELECT 1 FROM public.wozali_posts p
  WHERE p.created_at = v.created_at AND COALESCE(p.contenu,'') = COALESCE(v.contenu,'')
);

-- 5. wozali_suivis : la vue devient une vraie table (même shape, le code ne change pas)
DROP VIEW IF EXISTS public.wozali_suivis;
CREATE TABLE IF NOT EXISTS public.wozali_suivis (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suiveur_user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suivi_prestataire_id UUID NOT NULL,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (suiveur_user_id, suivi_prestataire_id)
);
CREATE INDEX IF NOT EXISTS idx_wozali_suivis_suiveur ON public.wozali_suivis (suiveur_user_id);
CREATE INDEX IF NOT EXISTS idx_wozali_suivis_suivi   ON public.wozali_suivis (suivi_prestataire_id);

-- Copie best-effort depuis l'ancienne table (vide en pratique ; si son
-- schéma legacy diffère, on n'échoue pas toute la migration pour 0 ligne).
DO $$ BEGIN
  INSERT INTO public.wozali_suivis (suiveur_user_id, suivi_prestataire_id, created_at)
  SELECT suiveur_user_id, suivi_prestataire_id, created_at FROM public.wolo_suivis
  ON CONFLICT DO NOTHING;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Copie wolo_suivis ignorée : %', SQLERRM;
END $$;

ALTER TABLE public.wozali_suivis ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wozali_suivis' AND policyname='suivis_select_all') THEN
    CREATE POLICY "suivis_select_all" ON public.wozali_suivis FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wozali_suivis' AND policyname='suivis_insert_self') THEN
    CREATE POLICY "suivis_insert_self" ON public.wozali_suivis FOR INSERT TO authenticated
      WITH CHECK (suiveur_user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wozali_suivis' AND policyname='suivis_delete_self') THEN
    CREATE POLICY "suivis_delete_self" ON public.wozali_suivis FOR DELETE TO authenticated
      USING (suiveur_user_id = auth.uid());
  END IF;
END $$;

-- 6. Retirer les doublons de l'ancien système
--    (wolo_posts_v2 et wolo_suivis sont conservés en archive, plus jamais lus)
DROP VIEW IF EXISTS public.wozali_posts_v2;
DROP VIEW IF EXISTS public.wozali_abonnements;
DROP TABLE IF EXISTS public.wozali_abonnements;
