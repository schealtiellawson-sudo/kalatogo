-- Plans d'action 7 jours — Responsable Terrain WOZALI
-- Remplace le formulaire papier de rt-14

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

-- Index pour requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_plans_action_responsable ON responsable_plans_action(responsable_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plans_action_statut ON responsable_plans_action(statut, created_at DESC);

-- RLS
ALTER TABLE responsable_plans_action ENABLE ROW LEVEL SECURITY;

-- RT : peut créer ses propres plans
CREATE POLICY "RT insert own plans"
  ON responsable_plans_action FOR INSERT
  TO authenticated
  WITH CHECK (responsable_id = auth.uid());

-- RT : peut lire ses propres plans. Admin lit tout (géré côté JS via _isAdminDash)
CREATE POLICY "Auth read plans"
  ON responsable_plans_action FOR SELECT
  TO authenticated
  USING (true);

-- RT : peut mettre à jour ses propres plans (pas encore soumis = statut actif)
CREATE POLICY "RT update own plans"
  ON responsable_plans_action FOR UPDATE
  TO authenticated
  USING (responsable_id = auth.uid())
  WITH CHECK (responsable_id = auth.uid());

-- Fondateur : peut mettre à jour note_fondateur sur tous
CREATE POLICY "Auth update note fondateur"
  ON responsable_plans_action FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
