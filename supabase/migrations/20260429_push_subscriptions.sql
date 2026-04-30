-- ================================================================
-- WOLO Market — Notifications Push Web (PWA)
-- Date : 2026-04-29
-- Stocke les souscriptions Web Push (VAPID) par utilisateur.
-- 1 user peut avoir plusieurs souscriptions (mobile + desktop + autre).
-- ================================================================

CREATE TABLE IF NOT EXISTS wolo_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user
  ON wolo_push_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_push_subs_created
  ON wolo_push_subscriptions(created_at DESC);

-- ── RLS ─────────────────────────────────────────────────────────
ALTER TABLE wolo_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Un user voit uniquement ses propres souscriptions
DROP POLICY IF EXISTS push_subs_select_self ON wolo_push_subscriptions;
CREATE POLICY push_subs_select_self ON wolo_push_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Un user crée uniquement ses propres souscriptions
DROP POLICY IF EXISTS push_subs_insert_self ON wolo_push_subscriptions;
CREATE POLICY push_subs_insert_self ON wolo_push_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Un user met à jour uniquement ses propres souscriptions
DROP POLICY IF EXISTS push_subs_update_self ON wolo_push_subscriptions;
CREATE POLICY push_subs_update_self ON wolo_push_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Un user supprime uniquement ses propres souscriptions
DROP POLICY IF EXISTS push_subs_delete_self ON wolo_push_subscriptions;
CREATE POLICY push_subs_delete_self ON wolo_push_subscriptions
  FOR DELETE
  USING (auth.uid() = user_id);

-- ── Trigger updated_at ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION wolo_push_subs_touch()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_push_subs_touch ON wolo_push_subscriptions;
CREATE TRIGGER trg_push_subs_touch
  BEFORE UPDATE ON wolo_push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION wolo_push_subs_touch();

COMMENT ON TABLE wolo_push_subscriptions IS
  'Souscriptions Web Push (VAPID) — 1 user peut avoir plusieurs devices.';
