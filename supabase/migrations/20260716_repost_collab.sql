-- ═══════════════════════════════════════════════════════════════
-- ÉTAPE 17 PHASE D — REPOST INTERNE + POSTS COLLAB (2026-07-16)
-- repost_of : un repost est une ligne wozali_posts qui pointe vers
--   le post original (on affiche l'original + "partagé par X").
-- collab_prestataire_id : un post co-signé, visible sur les 2 profils.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.wozali_posts ADD COLUMN IF NOT EXISTS repost_of uuid REFERENCES public.wozali_posts(id) ON DELETE CASCADE;
ALTER TABLE public.wozali_posts ADD COLUMN IF NOT EXISTS collab_prestataire_id uuid REFERENCES public.wozali_prestataires(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_posts_repost_of ON public.wozali_posts(repost_of);
CREATE INDEX IF NOT EXISTS idx_posts_collab ON public.wozali_posts(collab_prestataire_id);

-- Un utilisateur ne repartage pas deux fois le même post
CREATE UNIQUE INDEX IF NOT EXISTS uniq_repost_par_auteur
  ON public.wozali_posts(auteur_id, repost_of) WHERE repost_of IS NOT NULL;
