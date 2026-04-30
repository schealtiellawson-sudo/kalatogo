-- ================================================================
-- WOLO Market — Monitoring & Alerting
-- Date : 2026-04-29
-- Objectif : Capturer les erreurs frontend / backend / cron pour ne pas
--            voler à l''aveugle après le lancement du 8 juin 2026.
--            Stocker les métriques de santé agrégées par heure.
-- ================================================================

-- ╔═══════════════════════════════════════════════════════════════╗
-- ║ 1. wolo_errors_log — log brut des erreurs                      ║
-- ║ Sources : ''frontend'' | ''backend'' | ''cron''                ║
-- ╚═══════════════════════════════════════════════════════════════╝
CREATE TABLE IF NOT EXISTS wolo_errors_log (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID,                            -- nullable (anonyme autorisé)
  source       TEXT NOT NULL CHECK (source IN ('frontend','backend','cron')),
  error_msg    TEXT NOT NULL,
  stack        TEXT,
  url          TEXT,
  user_agent   TEXT,
  context      JSONB DEFAULT '{}'::jsonb,       -- email, prest_id, action handler, etc.
  ip           TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_errors_created_desc ON wolo_errors_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_errors_source_date  ON wolo_errors_log(source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_errors_user         ON wolo_errors_log(user_id, created_at DESC);

-- ╔═══════════════════════════════════════════════════════════════╗
-- ║ 2. wolo_health_metrics — agrégat horaire d''indicateurs santé  ║
-- ╚═══════════════════════════════════════════════════════════════╝
CREATE TABLE IF NOT EXISTS wolo_health_metrics (
  id          BIGSERIAL PRIMARY KEY,
  metric      TEXT NOT NULL,                    -- ex: ''inscription'', ''message_envoye'', ''photo_postee'', ''erreur_frontend'', ''erreur_backend''
  count       INT  NOT NULL DEFAULT 0,
  hour        TIMESTAMPTZ NOT NULL,             -- début de l''heure (date_trunc(''hour'', ts))
  meta        JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (metric, hour)
);

CREATE INDEX IF NOT EXISTS idx_health_metric_hour ON wolo_health_metrics(metric, hour DESC);
CREATE INDEX IF NOT EXISTS idx_health_hour        ON wolo_health_metrics(hour DESC);

-- ╔═══════════════════════════════════════════════════════════════╗
-- ║ 3. RLS                                                         ║
-- ║ - SELECT : interdit côté client (admin only via service_role)  ║
-- ║ - INSERT errors : public (frontend log anonyme)                ║
-- ║ - INSERT metrics : service_role uniquement (cron)              ║
-- ╚═══════════════════════════════════════════════════════════════╝
ALTER TABLE wolo_errors_log    ENABLE ROW LEVEL SECURITY;
ALTER TABLE wolo_health_metrics ENABLE ROW LEVEL SECURITY;

-- Errors : insert public (anon role) — log frontend
DROP POLICY IF EXISTS "anyone can insert error log"   ON wolo_errors_log;
CREATE POLICY "anyone can insert error log"
  ON wolo_errors_log FOR INSERT
  WITH CHECK (source IN ('frontend','backend','cron'));

-- Errors : aucune lecture par défaut (service_role bypasse)
-- (pas de policy SELECT publique)

-- Health metrics : aucune lecture/écriture publique
-- (gérée exclusivement via service_role côté cron)

-- ╔═══════════════════════════════════════════════════════════════╗
-- ║ 4. Helper : purge errors > 30 jours (à appeler depuis le cron) ║
-- ╚═══════════════════════════════════════════════════════════════╝
CREATE OR REPLACE FUNCTION purge_old_errors(retention_days INT DEFAULT 30)
RETURNS INT AS $$
DECLARE
  removed INT;
BEGIN
  DELETE FROM wolo_errors_log WHERE created_at < NOW() - (retention_days || ' days')::interval;
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$ LANGUAGE plpgsql;
