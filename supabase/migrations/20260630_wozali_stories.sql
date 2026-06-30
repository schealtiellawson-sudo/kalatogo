-- Migration : Stories 24h (wozali_stories)
-- 2026-06-30

CREATE TABLE IF NOT EXISTS wozali_stories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prestataire_id UUID REFERENCES wozali_prestataires(id) ON DELETE SET NULL,
  media_url    TEXT NOT NULL,
  media_type   TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image','video')),
  vue_par      UUID[] DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wozali_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stories_select_all" ON wozali_stories
  FOR SELECT USING (true);

CREATE POLICY "stories_insert_self" ON wozali_stories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "stories_update_self" ON wozali_stories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "stories_delete_self" ON wozali_stories
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_wozali_stories_created ON wozali_stories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wozali_stories_user ON wozali_stories(user_id);

-- Auto-nettoyage stories > 24h via cron (appliquer manuellement si pas de cron Vercel)
-- DELETE FROM wozali_stories WHERE created_at < NOW() - INTERVAL '24 hours';
