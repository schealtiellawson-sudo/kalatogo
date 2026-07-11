-- ════════════════════════════════════════════════════════════════
-- MIGRATION — Dashboard Responsable Terrain : accès équipe réel
-- 2026-07-11
--
-- Constat (testé avec une session du compte RT) :
-- 1. agents_terrain n'a QUE la policy self-select → le RT ne voit que
--    sa propre ligne. "Équipe agents", "KPI équipe", "Rémunération RT"
--    ne montreront jamais les agents qu'on ajoutera.
--    (La policy "le responsable voit tous les agents" n'existait qu'en
--    commentaire dans 20260627_responsable_terrain.sql, jamais en SQL.)
-- 2. agent_journaux_terrain : self-only → "Journaux de bord" vide pour le RT.
-- 3. responsable_plans_action : table jamais créée en prod (404) →
--    section "Plans d'action agents" morte.
-- ════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- 1. Fonction : l'utilisateur courant est-il Responsable Terrain actif ?
--    SECURITY DEFINER pour éviter la récursion RLS sur agents_terrain.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.wozali_is_responsable()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agents_terrain
    WHERE user_id = auth.uid() AND role = 'responsable' AND actif = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.wozali_is_responsable() TO authenticated;

-- ─────────────────────────────────────────────
-- 2. Le RT lit TOUTE l'équipe agents_terrain (lecture seule)
-- ─────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agents_terrain' AND policyname='agents_terrain_rt_select_all') THEN
    CREATE POLICY "agents_terrain_rt_select_all" ON public.agents_terrain
      FOR SELECT TO authenticated
      USING (public.wozali_is_responsable());
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 3. Le RT lit les journaux de bord de tous les agents
-- ─────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agent_journaux_terrain' AND policyname='agent_journaux_rt_select_all') THEN
    CREATE POLICY "agent_journaux_rt_select_all" ON public.agent_journaux_terrain
      FOR SELECT TO authenticated
      USING (public.wozali_is_responsable());
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 4. Table responsable_plans_action (migration 20260628 jamais appliquée)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS responsable_plans_action (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  responsable_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_nom   TEXT NOT NULL,
  ville       TEXT NOT NULL CHECK (ville IN ('Lomé', 'Cotonou')),
  semaine_du  DATE NOT NULL,
  semaine_au  DATE NOT NULL,
  blocage     TEXT NOT NULL,
  obj_inscrits INTEGER NOT NULL DEFAULT 0,
  obj_pros     INTEGER NOT NULL DEFAULT 0,
  changement_terrain TEXT,
  statut      TEXT DEFAULT 'actif' CHECK (statut IN ('actif', 'termine', 'annule')),
  note_fondateur TEXT
);

CREATE INDEX IF NOT EXISTS idx_plans_action_responsable ON responsable_plans_action(responsable_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plans_action_statut ON responsable_plans_action(statut, created_at DESC);

ALTER TABLE responsable_plans_action ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='responsable_plans_action' AND policyname='RT insert own plans') THEN
    CREATE POLICY "RT insert own plans" ON responsable_plans_action
      FOR INSERT TO authenticated WITH CHECK (responsable_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='responsable_plans_action' AND policyname='Auth read plans') THEN
    CREATE POLICY "Auth read plans" ON responsable_plans_action
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='responsable_plans_action' AND policyname='RT update own plans') THEN
    CREATE POLICY "RT update own plans" ON responsable_plans_action
      FOR UPDATE TO authenticated
      USING (responsable_id = auth.uid()) WITH CHECK (responsable_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='responsable_plans_action' AND policyname='Auth update note fondateur') THEN
    CREATE POLICY "Auth update note fondateur" ON responsable_plans_action
      FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
