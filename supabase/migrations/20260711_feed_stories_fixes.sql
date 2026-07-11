-- ════════════════════════════════════════════════════════════════
-- MIGRATION — Feed + Stories : compteurs par triggers, vues stories par RPC,
-- policies storage wozali-media
-- 2026-07-11
--
-- Contexte : RLS "posts_self_update" sur wozali_posts et "stories_update_self"
-- sur wozali_stories bloquaient silencieusement (0 ligne) les updates faits
-- par les non-auteurs : nb_likes, nb_commentaires et vue_par ne bougeaient
-- jamais. Les compteurs passent en triggers SECURITY DEFINER, les vues de
-- story en RPC. Le client n'update plus ces colonnes directement.
-- ════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- 1. Compteur nb_likes maintenu par trigger sur wozali_likes
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.wozali_posts_likes_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.wozali_posts SET nb_likes = COALESCE(nb_likes,0) + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.wozali_posts SET nb_likes = GREATEST(0, COALESCE(nb_likes,0) - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_wozali_likes_sync ON public.wozali_likes;
CREATE TRIGGER trg_wozali_likes_sync
  AFTER INSERT OR DELETE ON public.wozali_likes
  FOR EACH ROW EXECUTE FUNCTION public.wozali_posts_likes_sync();

-- ─────────────────────────────────────────────
-- 2. Compteur nb_commentaires maintenu par trigger sur wozali_commentaires
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.wozali_posts_commentaires_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.wozali_posts SET nb_commentaires = COALESCE(nb_commentaires,0) + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.wozali_posts SET nb_commentaires = GREATEST(0, COALESCE(nb_commentaires,0) - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_wozali_commentaires_sync ON public.wozali_commentaires;
CREATE TRIGGER trg_wozali_commentaires_sync
  AFTER INSERT OR DELETE ON public.wozali_commentaires
  FOR EACH ROW EXECUTE FUNCTION public.wozali_posts_commentaires_sync();

-- Resynchroniser les compteurs existants une fois
UPDATE public.wozali_posts p SET
  nb_likes = COALESCE((SELECT COUNT(*) FROM public.wozali_likes l WHERE l.post_id = p.id), 0),
  nb_commentaires = COALESCE((SELECT COUNT(*) FROM public.wozali_commentaires c WHERE c.post_id = p.id AND c.actif = true), 0);

-- ─────────────────────────────────────────────
-- 3. RPC : marquer une story comme vue (append auth.uid() dans vue_par)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.wozali_story_vue(p_story_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  UPDATE public.wozali_stories
     SET vue_par = array_append(vue_par, auth.uid())
   WHERE id = p_story_id
     AND NOT (auth.uid() = ANY(COALESCE(vue_par, '{}')));
END $$;

GRANT EXECUTE ON FUNCTION public.wozali_story_vue(UUID) TO authenticated;

-- ─────────────────────────────────────────────
-- 4. Policies storage pour le bucket wozali-media (déjà créé, public en lecture)
--    Upload réservé aux connectés, uniquement dans posts/<leur user_id>/...
-- ─────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='wozali_media_insert_own') THEN
    CREATE POLICY "wozali_media_insert_own" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'wozali-media' AND (storage.foldername(name))[1] = 'posts' AND (storage.foldername(name))[2] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='wozali_media_select_all') THEN
    CREATE POLICY "wozali_media_select_all" ON storage.objects
      FOR SELECT USING (bucket_id = 'wozali-media');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='wozali_media_delete_own') THEN
    CREATE POLICY "wozali_media_delete_own" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'wozali-media' AND (storage.foldername(name))[2] = auth.uid()::text);
  END IF;
END $$;
