-- ═══════════════════════════════════════════════════════════════
-- ÉTAPE 18 (complément) — POSTS ENREGISTRÉS (2026-07-16)
-- Le signet façon Insta/TikTok : garder un post pour le retrouver
-- dans le dashboard (section "Enregistrés").
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.wozali_posts_enregistres (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id     uuid NOT NULL REFERENCES public.wozali_posts(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_posts_enregistres_user ON public.wozali_posts_enregistres(user_id);

ALTER TABLE public.wozali_posts_enregistres ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wozali_posts_enregistres' AND policyname='enregistres_select_self') THEN
    CREATE POLICY "enregistres_select_self" ON public.wozali_posts_enregistres FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wozali_posts_enregistres' AND policyname='enregistres_insert_self') THEN
    CREATE POLICY "enregistres_insert_self" ON public.wozali_posts_enregistres FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wozali_posts_enregistres' AND policyname='enregistres_delete_self') THEN
    CREATE POLICY "enregistres_delete_self" ON public.wozali_posts_enregistres FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;
