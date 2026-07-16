-- ═══════════════════════════════════════════════════════════════
-- ÉTAPE 15 PHASE D — SONDAGES DANS LES STORIES (2026-07-16)
-- 3 colonnes sur la story (question + 2 choix) + table de votes
-- (1 vote par personne par story).
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.wozali_stories ADD COLUMN IF NOT EXISTS sondage_question text;
ALTER TABLE public.wozali_stories ADD COLUMN IF NOT EXISTS sondage_opt1 text;
ALTER TABLE public.wozali_stories ADD COLUMN IF NOT EXISTS sondage_opt2 text;

CREATE TABLE IF NOT EXISTS public.wozali_story_votes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id    uuid NOT NULL REFERENCES public.wozali_stories(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  choix       smallint NOT NULL CHECK (choix IN (1, 2)),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_story_votes_story ON public.wozali_story_votes(story_id);

ALTER TABLE public.wozali_story_votes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wozali_story_votes' AND policyname='story_votes_select_all') THEN
    CREATE POLICY "story_votes_select_all" ON public.wozali_story_votes FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wozali_story_votes' AND policyname='story_votes_insert_self') THEN
    CREATE POLICY "story_votes_insert_self" ON public.wozali_story_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
