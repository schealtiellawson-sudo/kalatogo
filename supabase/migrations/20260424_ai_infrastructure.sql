-- ================================================================
-- AI Infrastructure — cache, quota logs, PII mapping
-- Consolide T1 IA Router + T2 Cache + T3 Anonymisation + T4 Rate limits
-- Date : 2026-04-24
-- ================================================================

-- Cache des réponses IA (TTL variable par tâche)
CREATE TABLE IF NOT EXISTS ai_cache (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_cache(expires_at);

-- Journal d'utilisation IA pour rate limits par plan + analytics
CREATE TABLE IF NOT EXISTS ai_quota_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  provider TEXT NOT NULL,
  task_type TEXT NOT NULL,
  tokens_used INT DEFAULT 0,
  cache_hit BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_quota_user_date ON ai_quota_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_quota_task ON ai_quota_log(task_type, created_at DESC);

-- Job de purge du cache expiré (cron Supabase ou appel manuel)
CREATE OR REPLACE FUNCTION purge_expired_ai_cache()
RETURNS INT AS $$
DECLARE
  removed INT;
BEGIN
  DELETE FROM ai_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$ LANGUAGE plpgsql;

-- RLS : seul le service_role peut lire/écrire (pas d'accès client direct)
ALTER TABLE ai_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_quota_log ENABLE ROW LEVEL SECURITY;

-- Policy lecture quota pour l'utilisateur (voir sa propre conso)
CREATE POLICY "Users can read own ai_quota_log"
  ON ai_quota_log FOR SELECT
  USING (auth.uid() = user_id);
