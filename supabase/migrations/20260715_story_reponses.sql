-- ════════════════════════════════════════════════════════════════
-- RÉPONSES AUX STORIES — étape 6 Phase B (2026-07-15)
-- ════════════════════════════════════════════════════════════════
-- Décision fondateur : répondre à une story envoie un message dans la
-- messagerie interne WOZALI (Activité du prestataire), PAS sur WhatsApp.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.wozali_story_reponses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id     UUID,
  de_user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vers_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contenu      TEXT NOT NULL CHECK (char_length(contenu) BETWEEN 1 AND 500),
  lu           BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_story_rep_vers ON public.wozali_story_reponses (vers_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_rep_de   ON public.wozali_story_reponses (de_user_id, created_at DESC);

ALTER TABLE public.wozali_story_reponses ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wozali_story_reponses' AND policyname='story_rep_insert_self') THEN
    CREATE POLICY "story_rep_insert_self" ON public.wozali_story_reponses FOR INSERT TO authenticated
      WITH CHECK (de_user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wozali_story_reponses' AND policyname='story_rep_select_parties') THEN
    CREATE POLICY "story_rep_select_parties" ON public.wozali_story_reponses FOR SELECT TO authenticated
      USING (de_user_id = auth.uid() OR vers_user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wozali_story_reponses' AND policyname='story_rep_lu_destinataire') THEN
    CREATE POLICY "story_rep_lu_destinataire" ON public.wozali_story_reponses FOR UPDATE TO authenticated
      USING (vers_user_id = auth.uid())
      WITH CHECK (vers_user_id = auth.uid());
  END IF;
END $$;
