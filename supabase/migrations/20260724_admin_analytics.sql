-- ============================================================
-- WOZALI — Fondations Analytics / Pilotage Admin (2026-07-24)
-- Trafic + clics + funnel inscription + dernière connexion réelle.
-- 100% Supabase, zéro outil externe. Lecture admin via API service-role.
-- ============================================================

-- 1) VRAIE dernière connexion (remplace le proxy updated_at)
ALTER TABLE wozali_prestataires
  ADD COLUMN IF NOT EXISTS derniere_connexion timestamptz;

-- 2) Événements analytics : visiteurs anonymes ET connectés
--    event_type: 'page_view' | 'click' | 'login' | 'signup_step' | 'search' | ...
CREATE TABLE IF NOT EXISTS wozali_events (
  id          bigint generated always as identity primary key,
  event_type  text        not null,
  page        text,                 -- slug de page / section (ex: 'home', 'search', 'ds-faistoivoir')
  label       text,                 -- libellé du clic / étape / cible
  user_id     uuid,                 -- null si visiteur anonyme
  session_id  text,                 -- id de session (localStorage) pour relier les anonymes
  pays        text,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS idx_wzev_type_date ON wozali_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wzev_page      ON wozali_events(page);
CREATE INDEX IF NOT EXISTS idx_wzev_session   ON wozali_events(session_id);
CREATE INDEX IF NOT EXISTS idx_wzev_user      ON wozali_events(user_id);

-- 3) Funnel d'inscription : voir où les gens s'arrêtent
--    etape_max: 1=arrivée /inscription  2=step1 rempli  3=step2  4=step3  5=compte créé
CREATE TABLE IF NOT EXISTS wozali_inscription_funnel (
  session_id  text primary key,
  etape_max   int          not null default 1,
  genre       text,
  age         int,
  pays        text,
  ville       text,
  metier      text,
  complete    boolean      not null default false,
  user_id     uuid,
  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now()
);
CREATE INDEX IF NOT EXISTS idx_wzfun_etape ON wozali_inscription_funnel(etape_max);
CREATE INDEX IF NOT EXISTS idx_wzfun_date  ON wozali_inscription_funnel(created_at DESC);

-- 4) RLS : insertion ouverte (tracking anonyme), AUCUNE lecture publique.
--    La lecture admin passe par une API protégée (service_role + admin-verify).
ALTER TABLE wozali_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wzev_insert_all ON wozali_events;
CREATE POLICY wzev_insert_all ON wozali_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);

ALTER TABLE wozali_inscription_funnel ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wzfun_insert_all ON wozali_inscription_funnel;
CREATE POLICY wzfun_insert_all ON wozali_inscription_funnel
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS wzfun_update_all ON wozali_inscription_funnel;
CREATE POLICY wzfun_update_all ON wozali_inscription_funnel
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
